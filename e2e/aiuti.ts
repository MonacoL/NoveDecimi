import { expect, type Locator, type Page } from '@playwright/test';

/** Raccoglie gli errori della pagina; il test li controlla alla fine. */
export function raccogliErrori(page: Page): string[] {
  const errori: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errori.push(m.text());
  });
  page.on('pageerror', (e) => errori.push(String(e)));
  return errori;
}

/** La pagina non scorre in orizzontale. */
export async function senzaScorrimentoOrizzontale(page: Page): Promise<void> {
  const eccesso = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(eccesso, 'la pagina scorre in orizzontale').toBeLessThanOrEqual(0);
}

/** L'elemento sta per intero nello schermo, senza bisogno di scorrere. */
export async function interoNelloSchermo(page: Page, el: Locator): Promise<void> {
  const box = await el.boundingBox();
  const vista = page.viewportSize();
  expect(box, 'elemento non visibile').not.toBeNull();
  expect(vista).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(vista!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vista!.height + 1);
}

/** Inizia una sessione di 5 parole dalla pagina dell'esercizio. */
export async function iniziaSessioneDiCinque(page: Page): Promise<void> {
  await page.goto('parole/');
  await page.getByRole('button', { name: 'Meno parole' }).click();
  await page.getByRole('button', { name: 'Meno parole' }).click();
  await expect(page.locator('#count-display')).toHaveText('5');
  await page.getByRole('button', { name: 'Inizia' }).click();
  await expect(page.locator('#prog-label')).toHaveText('Parola 1 di 5');
}
