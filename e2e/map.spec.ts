import { expect, type Page, test } from '@playwright/test';

declare global {
  interface Window {
    __greece: {
      map: {
        getProjection: () => { type: string };
        isMoving: () => boolean;
        isSourceLoaded: (id: string) => boolean;
      };
      places: { id: string; title: string }[];
    };
  }
}

const APP_ORIGIN = 'http://127.0.0.1:4173';
let faults: string[] = [];

test.beforeEach(async ({ page }) => {
  faults = [];
  page.on('pageerror', (error) => faults.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (ignorableConsole(text)) return;
    faults.push(`console: ${text}`);
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    const url = response.url();
    if (!isAppAsset(url)) return;
    faults.push(`http ${response.status()}: ${url}`);
  });
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (!isAppAsset(url)) return;
    faults.push(`failed: ${url} ${request.failure()?.errorText ?? ''}`);
  });
  await page.goto('/');
  await page.locator('#app[data-ready="true"]').waitFor();
  await page.waitForFunction(() => window.__greece.map.getProjection().type === 'globe');
  await page.waitForFunction(() => window.__greece.map.isSourceLoaded('land'));
  await page.waitForFunction(() => !window.__greece.map.isMoving());
});

test.afterEach(() => {
  expect(faults, faults.join('\n')).toEqual([]);
});

test('globe, sourced pins, and icon labels', async ({ page }) => {
  await expect(page.locator('#map canvas')).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('data-projection', 'globe');
  await expect(page.locator('.maplibregl-ctrl-attrib')).toContainText('NASA Blue Marble');
  await expect(page.locator('.pin')).toHaveCount(15);
  await expect(page.locator('.pin[data-place="s8"]')).toHaveCount(1);
  await expect(page.locator('.pin[data-place="s14"]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Example data');
  await expectNoHorizontalScroll(page);
  for (const name of ['Play', 'Zoom in', 'Zoom out', 'Places', 'Gods', 'Readings', 'Knowledge', 'Sources', 'Previous year', 'Next year', 'Playback']) {
    const button = page.getByRole('button', { name, exact: true });
    await expect(button).toHaveAttribute('aria-label', name);
    await expect(button).toHaveAttribute('title', name);
  }
  const boxes = await page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)?.getBoundingClientRect();
      if (!rect) return null;
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    return { zoom: box('.zoom'), time: box('.time'), tools: box('.key-wrap') };
  });
  expect(boxes.zoom && boxes.time && boxes.tools).toBeTruthy();
  expect(overlaps(boxes.zoom!, boxes.time!)).toBe(false);
  expect(overlaps(boxes.zoom!, boxes.tools!)).toBe(false);
  expect(overlaps(boxes.time!, boxes.tools!)).toBe(false);
});

test('year slider, the year-zero step, and playback', async ({ page }) => {
  await expect(page.locator('#app')).toHaveAttribute('data-year', '-480');
  await page.locator('#slider').fill('800');
  await expect(page.locator('#app')).toHaveAttribute('data-year', '-100');
  await page.locator('#year-button').click();
  const periods = page.locator('.event-sheet');
  await expect(periods).toContainText('Hellenistic');
  await expect(periods).toContainText('Roman');
  await page.locator('.sheet-close').click();

  await page.locator('#slider').fill('899');
  await page.locator('#app').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#app')).toHaveAttribute('data-year', '1');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#app')).toHaveAttribute('data-year', '-1');

  await page.locator('#slider').fill('420');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(async () => Number(await page.locator('#app').getAttribute('data-year'))).toBeGreaterThan(-480);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-playing', '0');
});

test('myth card, outside-Greece pin, unpinned site, readings, and sources', async ({ page }, testInfo) => {
  const sheet = testInfo.project.name !== 'desktop';
  await page.locator('.pin[data-place="s2"]').click();
  const card = sheet ? page.locator('.event-sheet') : page.locator('.maplibregl-popup');
  await expect(card).toBeVisible();
  await expect(card).toContainText('oracle of the Pythia');
  await expect(card.locator('.badge[data-label="evidence"]').first()).toHaveText('Evidence');
  await expect(card).toContainText('H.G. Evelyn-White · Project Gutenberg');
  await page.locator(sheet ? '.sheet-close' : '.maplibregl-popup-close-button').click();
  await expect(card).toHaveCount(0);

  await page.locator('.pin[data-place="s8"]').click();
  await expect(card).toContainText('Samuel Butler · Project Gutenberg');
  await page.locator(sheet ? '.sheet-close' : '.maplibregl-popup-close-button').click();

  await page.getByRole('button', { name: 'Knowledge', exact: true }).click();
  const knowledge = page.locator('.event-sheet');
  await expect(knowledge.locator('[data-entry="s14"]')).toContainText('Carthage');
  await knowledge.locator('[data-entry="s14"]').click();
  await expect(page.locator('.event-sheet')).toContainText('Punic metropolis');
  await expect(page.locator('.pin[data-place="s14"]')).toHaveCount(0);
  await page.locator('.sheet-close').click();

  await page.getByRole('button', { name: 'Readings', exact: true }).click();
  await expect(page.locator('.event-sheet')).toContainText('Project Gutenberg');
  await page.locator('.sheet-close').click();

  await page.getByRole('button', { name: 'Sources', exact: true }).click();
  const notice = page.locator('#sources-notice');
  await expect(notice).toContainText('Project Gutenberg');
  await expect(notice).toContainText('UNESCO');
  await expect(notice).toContainText('Evelyn-White');

  await page.getByRole('button', { name: 'Gods', exact: true }).click();
  await page.getByRole('button', { name: 'Apollo', exact: true }).click();
  await expect(page.locator('.event-sheet, .maplibregl-popup')).toContainText('birthplace of Apollo');
});

async function expectNoHorizontalScroll(page: Page) {
  const widths = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth + 1);
}

function overlaps(
  a: { left: number; right: number; top: number; bottom: number },
  b: { left: number; right: number; top: number; bottom: number },
): boolean {
  return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
}

function isAppAsset(url: string): boolean {
  try {
    return new URL(url).origin === APP_ORIGIN;
  } catch {
    return false;
  }
}

function ignorableConsole(text: string): boolean {
  if (/Worker failed to load/i.test(text)) return false;
  if (/gibs\.earthdata\.nasa\.gov/i.test(text)) return true;
  return /^Failed to load resource: /i.test(text) && !/127\.0\.0\.1|\/assets\//.test(text);
}
