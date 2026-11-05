import { expect, test } from '@playwright/test';
import { raccogliErrori, senzaScorrimentoOrizzontale } from './aiuti';

test('la home mostra lo schema dell\'iceberg e porta all\'esercizio', async ({ page }) => {
  const errori = raccogliErrori(page);
  await page.goto('./');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nove decimi stanno sotto la superficie');
  await expect(page.getByRole('img', { name: "L'iceberg della balbuzie" })).toBeVisible();
  await senzaScorrimentoOrizzontale(page);

  await page.getByRole('link', { name: /Lettura di parole/ }).click();
  await expect(page).toHaveURL(/\/NoveDecimi\/parole\/$/);
  await expect(page.getByRole('heading', { name: 'Lettura di parole' })).toBeVisible();

  await page.getByRole('link', { name: 'Novedecimi' }).click();
  await expect(page).toHaveURL(/\/NoveDecimi\/$/);

  expect(errori).toEqual([]);
});

test('i blocchi di testo della home hanno la stessa larghezza del resto del contenuto', async ({ page }) => {
  await page.goto('./');
  const larghezza = async (selettore: string) => (await page.locator(selettore).boundingBox())!.width;
  const riferimento = await larghezza('.schede');
  for (const selettore of ['.parti', '.ponte', '.piede p']) {
    expect(Math.abs((await larghezza(selettore)) - riferimento), selettore).toBeLessThanOrEqual(1);
  }
  const marca = (await page.locator('.brand').boundingBox())!.x;
  const contenuto = (await page.locator('.schede').boundingBox())!.x;
  expect(Math.abs(marca - contenuto), 'il nome in alto non è allineato al contenuto').toBeLessThanOrEqual(1);
});
