import { test, expect } from '@playwright/test';

test('editar hero e ativar banner', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.fill('input[name=usuario]', process.env.ADMIN_USER ?? 'admin');
  await page.fill('input[name=senha]', process.env.E2E_PASSWORD ?? 'teste');
  await page.click('button:has-text("Entrar")');
  await expect(page).toHaveURL(/\/admin$/);

  const titulo = `Teste E2E ${Date.now()}`;
  await page.goto('/admin/secao/hero');
  const original = await page.inputValue('input[name=titulo]');
  await page.fill('input[name=titulo]', titulo);
  await page.click('button:has-text("Guardar")');
  await expect(page.getByRole('status')).toBeVisible();

  await page.goto('/admin/banner');
  await page.check('input[name=ativo]');
  await page.check('input[value=faixa]');
  await page.fill('input[name=titulo]', 'Promo E2E');
  await page.fill('input[name=inicio]', '');
  await page.fill('input[name=fim]', '');
  await page.click('button:has-text("Guardar")');
  await expect(page.getByRole('status')).toBeVisible();

  const site = await page.context().newPage();
  await site.goto('/');
  await expect(site.locator('h1')).toContainText(titulo);
  await expect(site.locator('#promo')).toContainText('Promo E2E');

  // repor
  await page.goto('/admin/secao/hero');
  await page.fill('input[name=titulo]', original);
  await page.click('button:has-text("Guardar")');
  await expect(page.getByRole('status')).toBeVisible();
  await page.goto('/admin/banner');
  await page.uncheck('input[name=ativo]');
  await page.click('button:has-text("Guardar")');
  await expect(page.getByRole('status')).toBeVisible();
});
