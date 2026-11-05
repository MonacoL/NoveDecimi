import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { raccogliErrori, senzaScorrimentoOrizzontale } from './aiuti';

const parola = (word: string, ok: boolean, inFrase: string[] = []) => ({
  word,
  ok,
  type: ok ? [] : ['blocco'],
  when: ok ? null : 'prima',
  where: ok ? [] : ['gola'],
  inFrase,
});

test('il resoconto mostra il periodo scelto e si scarica in RTF', async ({ page }) => {
  const errori = raccogliErrori(page);
  const ieri = new Date();
  ieri.setDate(ieri.getDate() - 1);
  ieri.setHours(18, 0, 0, 0);
  const sessioni = [
    { ts: ieri.getTime(), date: '', total: 2, ok: 1, diff: 1, pct: 50, focusMode: false, modalita: 'parola', words: [parola('pane', true), parola('casa', false)] },
    { ts: ieri.getTime() + 60000, date: '', total: 2, ok: 1, diff: 1, pct: 50, focusMode: false, modalita: 'frase', words: [parola('sole', true), parola('<b>tetto</b>', false, ['altra'])] },
  ];
  await page.goto('resoconto/');
  await page.evaluate((s) => localStorage.setItem('novedecimi.sessions', JSON.stringify(s)), sessioni);
  await page.reload();

  const anteprima = page.getByRole('article', { name: 'Anteprima del resoconto' });
  await expect(anteprima.getByRole('heading', { name: 'Parola singola' })).toBeVisible();
  await expect(anteprima.getByRole('heading', { name: 'Parola in una frase' })).toBeVisible();
  await expect(anteprima).toContainText('<b>tetto</b>');
  await expect(anteprima.locator('b')).toHaveCount(0);
  await senzaScorrimentoOrizzontale(page);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Scarica il resoconto (.rtf)' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^resoconto-\d{4}-\d{2}-\d{2}-\d{4}-\d{2}-\d{2}\.rtf$/);
  const rtf = await readFile((await file.path())!, 'latin1');
  expect(rtf).toContain('\\trowd');
  expect(rtf).toContain('Parola in una frase');

  // Il periodo successivo parte dal giorno dopo la fine di questo.
  await page.reload();
  await expect(anteprima).toContainText('Nessuna sessione in questo periodo.');

  expect(errori).toEqual([]);
});

test('una data di inizio dopo la fine viene segnalata', async ({ page }) => {
  await page.goto('resoconto/');
  await page.locator('#da').fill('2026-11-05');
  await page.locator('#a').fill('2026-11-01');
  await expect(page.locator('#resoconto-status')).toHaveText('La data di inizio viene dopo quella di fine.');
  await expect(page.getByRole('button', { name: 'Scarica il resoconto (.rtf)' })).toBeDisabled();
});
