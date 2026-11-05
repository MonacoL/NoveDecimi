import { expect, test } from '@playwright/test';
import { raccogliErrori } from './aiuti';

const sessione = (ts: number, word: string) => ({
  ts,
  date: '',
  total: 1,
  ok: 0,
  diff: 1,
  pct: 0,
  focusMode: false,
  words: [{ word, ok: false, type: 'blocco', when: 'prima', where: null }],
});

async function importa(page: import('@playwright/test').Page, nome: string, contenuto: string) {
  await page.locator('#import-file').setInputFiles({ name: nome, mimeType: 'application/json', buffer: Buffer.from(contenuto) });
}

test.beforeEach(async ({ page }) => {
  await page.goto('parole/');
  await page.getByRole('button', { name: 'Storico' }).click();
  await expect(page.locator('#storico-subtitle')).toHaveText('Nessuna sessione registrata su questo dispositivo.');
});

test('un backup importato compare nello storico e i suoi dati restano testo', async ({ page }) => {
  const errori = raccogliErrori(page);
  let dialoghi = 0;
  page.on('dialog', (d) => {
    dialoghi++;
    void d.dismiss();
  });

  const backup = { app: 'novedecimi', versione: 2, sessioni: [sessione(1762100000000, '<img src=x onerror=alert(1)>')] };
  await importa(page, 'backup.json', JSON.stringify(backup));

  await expect(page.locator('#storico-status')).toHaveText('Backup importato: 1 sessione aggiunta.');
  await expect(page.locator('.day-card')).toHaveCount(1);
  await expect(page.locator('.word-pill strong')).toHaveText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#storico-list img')).toHaveCount(0);
  expect(dialoghi).toBe(0);

  // Lo stesso backup importato due volte non duplica le sessioni.
  await importa(page, 'backup.json', JSON.stringify(backup));
  await expect(page.locator('#storico-status')).toHaveText('Backup importato: 0 sessioni aggiunte, 1 già presente o non valida.');
  await expect(page.locator('.day-card')).toHaveCount(1);

  expect(errori).toEqual([]);
});

test('un file che non è un backup viene rifiutato con un messaggio', async ({ page }) => {
  await importa(page, 'altro.json', '{"sessioni": []}');
  await expect(page.locator('#storico-status')).toHaveText('Il file non è un backup di Novedecimi.');
  await expect(page.locator('.day-card')).toHaveCount(0);
});

test('il backup scaricato si reimporta su un dispositivo vuoto', async ({ page }) => {
  const backup = { app: 'novedecimi', versione: 1, sessioni: [sessione(1762100000000, 'casa'), sessione(1762200000000, 'porta')] };
  await importa(page, 'backup.json', JSON.stringify(backup));
  await expect(page.locator('.day-card')).toHaveCount(2);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Scarica il backup (.json)' }).click();
  const file = await (await download).path();

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'Storico' }).click();
  await expect(page.locator('.day-card')).toHaveCount(0);

  await page.locator('#import-file').setInputFiles(file!);
  await expect(page.locator('#storico-status')).toHaveText('Backup importato: 2 sessioni aggiunte.');
  await expect(page.locator('.day-card')).toHaveCount(2);
});
