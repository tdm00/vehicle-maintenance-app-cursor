import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('logs a vehicle, service, and fuel, then keeps them after reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await page.getByLabel('Description').fill('Daily driver');
  await page.getByLabel('Make').fill('Honda');
  await page.getByLabel('Model').fill('Civic');
  await page.getByLabel('Year').fill('2010');
  await page.getByLabel('Mileage').fill('8000');
  await page.getByLabel('Body type').selectOption('car');
  await page.getByRole('button', { name: 'Save vehicle' }).click();

  await expect(page.getByRole('heading', { name: 'Daily driver' })).toBeVisible();
  const tasks = page.getByRole('region', { name: 'Garage tasks' });
  await expect(tasks.getByRole('button', { name: /Oil change/ })).toBeVisible();

  await page.getByRole('button', { name: 'Log service' }).click();
  await page.getByRole('checkbox', { name: 'Oil change' }).check();
  await page.getByRole('button', { name: 'Save service' }).click();
  await expect(tasks.getByRole('button', { name: /Oil change/ })).toHaveCount(0);
  await expect(tasks.getByRole('button', { name: /Tire rotation/ })).toBeVisible();

  await page.getByRole('button', { name: 'Log fill-up' }).click();
  await page.getByLabel('Odometer').fill('8000');
  await page.getByLabel('Gallons').fill('10');
  await page.getByLabel('Fuel cost').fill('32');
  await page.getByRole('button', { name: 'Save fill-up' }).click();

  await page.getByRole('button', { name: 'Log fill-up' }).click();
  await page.getByLabel('Odometer').fill('8300');
  await page.getByLabel('Gallons').fill('10');
  await page.getByLabel('Fuel cost').fill('33');
  await page.getByRole('button', { name: 'Save fill-up' }).click();

  await expect(page.getByLabel('Average fuel economy')).toHaveText('30.0 mpg');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Daily driver' })).toBeVisible();
  await expect(page.getByLabel('Average fuel economy')).toHaveText('30.0 mpg');
  await expect(tasks.getByRole('button', { name: /Oil change/ })).toHaveCount(0);
  await expect(tasks.getByRole('button', { name: /Tire rotation/ })).toBeVisible();

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflows).toBe(false);
});
