import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

async function addCivic(page: Page) {
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await page.getByLabel('Description').fill('Daily driver');
  await page.getByLabel('Make').fill('Honda');
  await page.getByLabel('Model').fill('Civic');
  await page.getByLabel('Year').fill('2010');
  await page.getByLabel('Mileage').fill('8000');
  await page.getByLabel('Body type').selectOption('car');
  await page.getByRole('button', { name: 'Save vehicle' }).click();
}

async function logFill(page: Page, odometer: string, gallons: string, cost: string) {
  await page.getByRole('button', { name: 'Log fill-up' }).click();
  await page.getByLabel('Odometer').fill(odometer);
  await page.getByLabel('Gallons').fill(gallons);
  await page.getByLabel('Fuel cost').fill(cost);
  await page.getByRole('button', { name: 'Save fill-up' }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('logs a vehicle, service, and fuel, then keeps them after reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await page.getByLabel('Description').fill('Daily driver');
  await page.getByLabel('Year').fill('2010');
  await page.getByLabel('Make').fill('Honda');
  await page.getByLabel('Model').fill('Civic');
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

test('edits a fill-up, exports a signed backup, and restores it', async ({ page }) => {
  await addCivic(page);
  await logFill(page, '8000', '12', '30');
  await logFill(page, '8300', '10', '31');
  await logFill(page, '8620', '8', '32');
  await expect(page.getByLabel('Average fuel economy')).toHaveText('34.4 mpg');

  await page.getByRole('button', { name: /Edit fill-up .*8,300/ }).click();
  await expect(page.getByLabel('Odometer')).toHaveValue('8300');
  await expect(page.getByLabel('Gallons')).toHaveValue('10');
  await expect(page.getByLabel('Fuel cost')).toHaveValue('31');
  await page.getByLabel('Gallons').fill('20');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByLabel('Average fuel economy')).toHaveText('22.1 mpg');
  const edited = page.getByRole('row').filter({ hasText: '8,300' });
  await expect(edited.getByRole('cell').nth(2)).toHaveText('20');
  await expect(edited.getByRole('cell').nth(4)).toHaveText('15.0 mpg');
  await expect(edited.getByRole('cell').nth(5)).toHaveText('15.0 mpg');

  await page.getByRole('button', { name: 'Export' }).click();
  await page.getByLabel('Passphrase').fill('open-sesame');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const download = await downloadPromise;
  const backupPath = join(mkdtempSync(join(tmpdir(), 'garage-backup-')), 'garage-backup.json');
  await download.saveAs(backupPath);

  const saved = JSON.parse(readFileSync(backupPath, 'utf8')) as { version: number; payload: { vehicles: { description: string }[] }; signature: string };
  expect(saved.version).toBe(1);
  expect(saved.signature).toMatch(/^[0-9a-f]{64}$/);
  expect(saved.payload.vehicles[0]?.description).toBe('Daily driver');
  expect(readFileSync(backupPath, 'utf8')).not.toContain('open-sesame');

  await page.getByRole('button', { name: /^Edit$/ }).click();
  await page.getByLabel('Description').fill('Loaner');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.getByRole('button', { name: /Edit fill-up .*8,300/ }).click();
  await page.getByLabel('Gallons').fill('5');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('heading', { name: 'Loaner' })).toBeVisible();
  await expect(page.getByLabel('Average fuel economy')).toHaveText('47.7 mpg');

  await page.getByRole('button', { name: 'Import' }).click();
  await page.getByLabel('Backup file').setInputFiles(backupPath);
  await page.getByLabel('Passphrase').fill('wrong passphrase');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('The passphrase is wrong or the file was changed. The garage was left unchanged.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replace garage' })).toHaveCount(0);
  await expect(page.getByLabel('Average fuel economy')).toHaveText('47.7 mpg');

  await page.getByLabel('Passphrase').fill('open-sesame');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Replace garage' }).click();

  await expect(page.getByRole('heading', { name: 'Daily driver' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Loaner' })).toHaveCount(0);
  await expect(page.getByLabel('Average fuel economy')).toHaveText('22.1 mpg');
  const restored = page.getByRole('row').filter({ hasText: '8,300' });
  await expect(restored.getByRole('cell').nth(2)).toHaveText('20');
  await expect(restored.getByRole('cell').nth(4)).toHaveText('15.0 mpg');
  await expect(restored.getByRole('cell').nth(5)).toHaveText('15.0 mpg');
});

test('saves insurance and keeps it after reload', async ({ page }) => {
  await addCivic(page);
  await page.getByRole('button', { name: 'Add insurance' }).click();
  await page.getByLabel('Company').fill('Acme Mutual');
  await page.getByLabel('Policy number').fill('POL-100');
  await page.getByLabel('Expiration').fill('2027-06-01');
  await page.getByLabel('Phone').fill('555-0100');
  await page.getByLabel('Notes').fill('Full coverage');
  await page.getByRole('button', { name: 'Save insurance' }).click();

  const insurance = page.getByRole('region', { name: 'Insurance' });
  await expect(insurance).toContainText('Acme Mutual');
  await expect(insurance).toContainText('POL-100');
  await expect(insurance).toContainText('555-0100');
  await expect(insurance).toContainText('Full coverage');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Daily driver' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Insurance' })).toContainText('Acme Mutual');
  await expect(page.getByRole('region', { name: 'Insurance' })).toContainText('POL-100');
  await expect(page.getByRole('region', { name: 'Insurance' })).toContainText('555-0100');
  await expect(page.getByRole('region', { name: 'Insurance' })).toContainText('Jun 1, 2027');

  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflows).toBe(false);
});
