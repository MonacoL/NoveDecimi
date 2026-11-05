import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { iniziaSessioneDiCinque, interoNelloSchermo, raccogliErrori, senzaScorrimentoOrizzontale } from './aiuti';

test('una sessione completa arriva al riepilogo, allo storico e all\'esportazione', async ({ page }) => {
  const errori = raccogliErrori(page);
  await iniziaSessioneDiCinque(page);

  const avanti = page.getByRole('button', { name: 'Avanti' });
  const balbuzie = page.getByRole('button', { name: 'Balbuzie' });
  const progresso = page.locator('#prog-label');

  await avanti.click();
  await expect(progresso).toHaveText('Parola 2 di 5');

  // Due tocchi rapidi contano come una sola parola.
  await avanti.click();
  await avanti.click();
  await expect(progresso).toHaveText('Parola 3 di 5');
  await page.waitForTimeout(500);
  await expect(progresso).toHaveText('Parola 3 di 5');

  await balbuzie.click();
  const pannello = page.getByRole('dialog', { name: "Annota l'episodio di balbuzie" });
  const conferma = pannello.getByRole('button', { name: 'Conferma' });
  await expect(conferma).toBeDisabled();
  await pannello.getByRole('button', { name: 'Blocco' }).click();
  await expect(conferma).toBeDisabled();
  await pannello.getByRole('button', { name: 'Durante' }).click();
  // Tipo e zona sono a scelta multipla; un secondo tocco toglie la scelta.
  await pannello.getByRole('button', { name: 'Ripetizione' }).click();
  await pannello.getByRole('button', { name: 'Labbra' }).click();
  await pannello.getByRole('button', { name: 'Gola' }).click();
  await pannello.getByRole('button', { name: 'Petto' }).click();
  await pannello.getByRole('button', { name: 'Petto' }).click();
  await expect(pannello.getByRole('button', { name: 'Petto' })).toHaveAttribute('aria-pressed', 'false');
  await expect(pannello.getByRole('button', { name: 'Gola' })).toHaveAttribute('aria-pressed', 'true');
  await expect(conferma).toBeEnabled();
  await conferma.click();
  await expect(progresso).toHaveText('Parola 4 di 5');

  await avanti.click();
  await expect(progresso).toHaveText('Parola 5 di 5');
  await avanti.click();

  await expect(page.getByRole('heading', { name: 'Sessione completata' })).toBeVisible();
  await expect(page.locator('#ring-pct')).toHaveText('80%');
  await expect(page.locator('#s-ok')).toHaveText('4');
  await expect(page.locator('#s-diff')).toHaveText('1');

  const rtf = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Scarica il riepilogo (.rtf)' }).click();
  expect((await rtf).suggestedFilename()).toMatch(/^parole-\d{4}-\d{2}-\d{2}\.rtf$/);

  await page.getByRole('button', { name: 'Storico' }).click();
  await expect(page.locator('#storico-subtitle')).toHaveText('1 giorno, 1 sessione');
  await expect(page.locator('.day-card')).toHaveCount(1);
  await expect(page.locator('.day-pct')).toHaveText('80%');
  await expect(page.locator('.word-pill .pill-ann')).toHaveText('ripetizione, blocco, durante, labbra, gola');

  const csv = page.waitForEvent('download');
  await page.getByRole('button', { name: "Scarica l'esportazione (.csv)" }).click();
  const contenuto = await readFile((await (await csv).path())!, 'utf8');
  expect(contenuto).toContain('Data,Sessioni,Parole totali,Fluenti,Con balbuzie,Parole fluenti %');
  expect(contenuto).toMatch(/\d{4}-\d{2}-\d{2},1,5,4,1,80%/);
  expect(contenuto).toContain('PAROLE CON BALBUZIE');

  await page.getByRole('button', { name: 'Torna al riepilogo' }).click();
  await expect(page.getByRole('heading', { name: 'Sessione completata' })).toBeVisible();

  expect(errori).toEqual([]);
});

test('ogni schermata sta nella larghezza e i comandi principali restano nello schermo', async ({ page }) => {
  await page.goto('parole/');
  await senzaScorrimentoOrizzontale(page);
  await interoNelloSchermo(page, page.getByRole('button', { name: 'Inizia' }));

  await iniziaSessioneDiCinque(page);
  // Una delle parole più lunghe delle liste, per il caso peggiore.
  await page.locator('#word-text').evaluate((el) => (el.textContent = 'tranquillo'));
  await senzaScorrimentoOrizzontale(page);
  await interoNelloSchermo(page, page.getByRole('button', { name: 'Avanti' }));
  await interoNelloSchermo(page, page.getByRole('button', { name: 'Balbuzie' }));
  await interoNelloSchermo(page, page.locator('#word-text'));

  await page.getByRole('button', { name: 'Balbuzie' }).click();
  const pannello = page.getByRole('dialog');
  await page.waitForTimeout(400); // fine dell'animazione di apertura
  await interoNelloSchermo(page, pannello.getByRole('button', { name: 'Conferma' }));
  await interoNelloSchermo(page, pannello.getByRole('button', { name: 'Annulla' }));
  await senzaScorrimentoOrizzontale(page);
  await pannello.getByRole('button', { name: 'Annulla' }).click();
  await expect(pannello).toBeHidden();

  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Avanti' }).click();
    await page.waitForTimeout(350);
  }
  await expect(page.getByRole('heading', { name: 'Sessione completata' })).toBeVisible();
  await senzaScorrimentoOrizzontale(page);

  await page.getByRole('button', { name: 'Storico' }).click();
  await expect(page.locator('.day-card')).toHaveCount(1);
  await senzaScorrimentoOrizzontale(page);
});
