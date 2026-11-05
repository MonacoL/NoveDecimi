import { expect, test, type Page, type Route } from '@playwright/test';
import { raccogliErrori } from './aiuti';

// Google Identity Services e Drive finti: lo script di Google dà subito un
// token, e le API di Drive rispondono da una memoria nel processo dei test.
// I test girano solo se il sito è stato compilato con VITE_GOOGLE_CLIENT_ID.

const GIS_FINTO = `window.google = { accounts: { oauth2: {
  initTokenClient: (c) => ({ requestAccessToken: () => setTimeout(() => c.callback({ access_token: 'token-finto', expires_in: 3600 }), 0) }),
  revoke: (t, fatto) => fatto && fatto(),
} } };`;

interface File {
  id: string;
  name: string;
  mimeType: string;
  parents: string[];
  contenuto: string;
}

class DriveFinto {
  files: File[] = [];
  private n = 0;

  crea(meta: Partial<File>, contenuto = ''): File {
    const f: File = { id: `f${++this.n}`, name: meta.name!, mimeType: meta.mimeType ?? 'text/plain', parents: meta.parents ?? [], contenuto };
    this.files.push(f);
    return f;
  }

  nome(id: string): string | undefined {
    return this.files.find((f) => f.id === id)?.name;
  }

  storico(): { sessioni: { ts: number }[] } | null {
    const f = this.files.find((x) => x.name === 'storico-novedecimi.json');
    return f ? JSON.parse(f.contenuto) : null;
  }

  documenti(cartella: string): File[] {
    return this.files.filter((f) => f.mimeType === 'application/vnd.google-apps.document' && this.nome(f.parents[0]!) === cartella);
  }

  async gestisci(route: Route): Promise<void> {
    const req = route.request();
    const url = new URL(req.url());
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    const json = (body: unknown) => route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });

    if (url.pathname === '/oauth2/v3/userinfo') return json({ sub: '123', email: 'luca@example.org' });

    if (url.pathname === '/drive/v3/files' && req.method() === 'GET') {
      const q = url.searchParams.get('q') ?? '';
      const nome = /name = '([^']*)'/.exec(q)?.[1];
      const genitore = /'([^']*)' in parents/.exec(q)?.[1];
      const mime = /mimeType = '([^']*)'/.exec(q)?.[1];
      const trovati = this.files.filter(
        (f) => f.name === nome && (!genitore || f.parents.includes(genitore)) && (!mime || f.mimeType === mime),
      );
      return json({ files: trovati.map((f) => ({ id: f.id })) });
    }
    if (url.pathname === '/drive/v3/files' && req.method() === 'POST') {
      return json({ id: this.crea(req.postDataJSON() as Partial<File>).id });
    }
    const media = /^\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
    if (media && url.searchParams.get('alt') === 'media') {
      return route.fulfill({ status: 200, headers: cors, body: this.files.find((f) => f.id === media[1])!.contenuto });
    }
    const aggiorna = /^\/upload\/drive\/v3\/files\/([^/]+)$/.exec(url.pathname);
    if (aggiorna && req.method() === 'PATCH') {
      this.files.find((f) => f.id === aggiorna[1])!.contenuto = req.postData() ?? '';
      return json({ id: aggiorna[1] });
    }
    if (url.pathname === '/upload/drive/v3/files' && req.method() === 'POST') {
      const corpo = req.postData() ?? '';
      const parti = corpo.split(/--novedecimi\w+/).filter((p) => p.includes('\r\n\r\n'));
      const contenutoDi = (p: string) => p.slice(p.indexOf('\r\n\r\n') + 4).replace(/\r\n$/, '');
      const f = this.crea(JSON.parse(contenutoDi(parti[0]!)) as Partial<File>, contenutoDi(parti[1]!));
      return json({ id: f.id, webViewLink: `https://docs.google.com/document/d/${f.id}/edit` });
    }
    return route.fulfill({ status: 404, headers: cors, body: 'non previsto' });
  }
}

async function preparaGoogle(page: Page, drive: DriveFinto): Promise<void> {
  await page.route('https://accounts.google.com/gsi/client', (r) => r.fulfill({ contentType: 'text/javascript', body: GIS_FINTO }));
  await page.route('https://www.googleapis.com/**', (r) => drive.gestisci(r));
  await page.goto('account/');
  test.skip(await page.locator('#google').isHidden(), 'sito compilato senza VITE_GOOGLE_CLIENT_ID');
}

async function sessioneDiCinque(page: Page): Promise<void> {
  await page.goto('parole/');
  for (let i = 0; i < 2; i++) await page.getByRole('button', { name: 'Meno parole' }).click();
  await page.getByRole('button', { name: 'Inizia' }).click();
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Avanti' }).click();
    await page.waitForTimeout(350);
  }
  await expect(page.getByRole('heading', { name: 'Sessione completata' })).toBeVisible();
}

test('con l\'account lo storico e i documenti vanno su Drive e tornano dopo l\'uscita', async ({ page }) => {
  const errori = raccogliErrori(page);
  const drive = new DriveFinto();
  await preparaGoogle(page, drive);

  await page.getByRole('button', { name: 'Accedi con Google' }).click();
  await expect(page.locator('#google-avviso')).toHaveText('Accesso fatto. Storico allineato con Drive.');
  await expect(page.locator('#google-email')).toHaveText('luca@example.org');
  await expect(page.getByRole('link', { name: 'Apri la cartella su Drive' })).toBeVisible();

  await sessioneDiCinque(page);
  await expect(page.locator('#summary-status')).toHaveText('Sessione e riepilogo salvati su Drive.');
  expect(drive.storico()!.sessioni).toHaveLength(1);
  const [riepilogo] = drive.documenti('Riepiloghi');
  expect(riepilogo!.name).toMatch(/^Riepilogo parole, .+, ore \d{2}\.\d{2}$/);
  expect(riepilogo!.contenuto).toContain('<b>Esercizio parole</b>');
  expect(drive.nome(drive.files.find((f) => f.id === riepilogo!.parents[0])!.parents[0]!)).toBe('Novedecimi');

  await page.goto('resoconto/');
  await page.getByRole('button', { name: 'Salva su Drive' }).click();
  await expect(page.locator('#resoconto-status')).toHaveText('Resoconto salvato su Drive.');
  await expect(page.getByRole('link', { name: 'Apri il resoconto su Drive' })).toHaveAttribute('href', /docs\.google\.com/);
  expect(drive.documenti('Resoconti')).toHaveLength(1);

  await page.goto('account/');
  await page.getByRole('button', { name: "Esci dall'account" }).click();
  await expect(page.locator('#locali-stato')).toHaveText('Nessuna sessione registrata su questo dispositivo.');
  await page.getByRole('button', { name: 'Accedi con Google' }).click();
  await expect(page.locator('#google-avviso')).toHaveText('Accesso fatto. 1 sessione arrivata da Drive.');

  expect(errori).toEqual([]);
});

test('con l\'accesso scaduto il riepilogo resta in coda finché non si tocca Carica su Drive', async ({ page }) => {
  const drive = new DriveFinto();
  await preparaGoogle(page, drive);
  await page.getByRole('button', { name: 'Accedi con Google' }).click();
  await expect(page.locator('#google-email')).toHaveText('luca@example.org');

  await page.evaluate(() => sessionStorage.clear());
  await sessioneDiCinque(page);
  await expect(page.locator('#summary-status')).toHaveText('Il riepilogo è in coda per Drive.');
  expect(drive.documenti('Riepiloghi')).toHaveLength(0);

  await page.getByRole('button', { name: 'Carica su Drive' }).click();
  await expect(page.locator('#summary-status')).toHaveText('Sessione e riepilogo salvati su Drive.');
  await expect(page.getByRole('button', { name: 'Carica su Drive' })).toBeHidden();
  expect(drive.documenti('Riepiloghi')).toHaveLength(1);
  expect(drive.storico()!.sessioni).toHaveLength(1);
});
