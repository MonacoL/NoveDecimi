import { expect, test } from '@playwright/test';
import { interoNelloSchermo, raccogliErrori, senzaScorrimentoOrizzontale } from './aiuti';

const PAGINE = ['./', 'parole/', 'storico/', 'account/'];

for (const pagina of PAGINE) {
  test(`il menù si apre e si chiude in ${pagina}`, async ({ page }) => {
    const errori = raccogliErrori(page);
    await page.goto(pagina);
    await senzaScorrimentoOrizzontale(page);
    const apri = page.getByRole('button', { name: 'Menù' });
    await interoNelloSchermo(page, apri);
    await apri.click();

    const menu = page.getByRole('dialog', { name: 'Menù' });
    await expect(menu).toBeVisible();
    await page.waitForTimeout(300); // fine dell'animazione di entrata
    await interoNelloSchermo(page, menu.getByRole('link', { name: 'Backup' }));
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(apri).toBeFocused();

    await apri.click();
    await menu.getByRole('button', { name: 'Chiudi il menù' }).click();
    await expect(menu).toBeHidden();
    expect(errori).toEqual([]);
  });
}

test('dalla home il menù porta allo storico e all\'account', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Menù' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Storico' }).click();
  await expect(page).toHaveURL(/\/storico\/$/);
  await expect(page.getByRole('heading', { name: 'Storico' })).toBeVisible();

  await page.getByRole('button', { name: 'Menù' }).click();
  const menu = page.getByRole('dialog');
  await expect(menu.getByRole('link', { name: 'Storico' })).toHaveAttribute('aria-current', 'page');
  await menu.getByRole('link', { name: 'Backup' }).click();
  await expect(page).toHaveURL(/\/account\/#backup$/);
  await expect(page.getByRole('heading', { name: 'Backup' })).toBeVisible();
});
