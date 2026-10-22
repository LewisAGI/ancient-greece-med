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
  await expect(page.locator('.pin')).toHaveCount(17);
  await expect(page.locator('.pin[data-place="s8"]')).toHaveCount(1);
  await expect(page.locator('.pin[data-place="s31"]')).toHaveCount(1);
  await expect(page.locator('.pin[data-place="s36"]')).toHaveCount(1);
  await expect(page.locator('.pin[data-place="s14"]')).toHaveCount(0);
  await expect(page.locator('.pin[data-place="s33"]')).toHaveCount(0);
  const covered = await page.evaluate(() => {
    const time = document.querySelector('.time')?.getBoundingClientRect();
    const tools = document.querySelector('.key-wrap')?.getBoundingClientRect();
    const height = window.innerHeight;
    const width = window.innerWidth;
    return [...document.querySelectorAll('.pin')]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const underTime = Boolean(time) && rect.bottom > time!.top + 1;
        const underTools = Boolean(
          tools &&
            rect.left < tools.right - 2 &&
            rect.right > tools.left + 2 &&
            rect.top < tools.bottom - 2 &&
            rect.bottom > tools.top + 2,
        );
        const offscreen = rect.bottom < 0 || rect.top > height || rect.right < 0 || rect.left > width;
        return underTime || underTools || offscreen;
      })
      .map((element) => element.getAttribute('data-place'));
  });
  expect(covered).toEqual([]);
  const blocked = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.pin')].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      if (hit === element || (hit != null && element.contains(hit))) return [];
      return [element.dataset.place ?? 'pin'];
    }),
  );
  expect(blocked).toEqual([]);
  await expect(page.locator('body')).not.toContainText('Example data');
  await expect(page.locator('body')).not.toContainText('Pharos lighthouse');
  await expect(page.locator('body')).not.toContainText('Palaiapolis');
  await expect(page.locator('body')).not.toContainText('Protis and Gyptis');
  await expectNoHorizontalScroll(page);
  for (const name of [
    'Play',
    'Zoom in',
    'Zoom out',
    'Places',
    'Gods',
    'Search',
    'Filter',
    'Readings',
    'Timeline',
    'Knowledge',
    'Index',
    'Sources',
    'Previous year',
    'Next year',
    'Playback',
  ]) {
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
  await expect(knowledge).not.toContainText('Pharos lighthouse');
  await expect(knowledge.locator('[data-entry="pe1"]')).toHaveCount(0);
  await expect(knowledge.locator('[data-entry="tl7"]')).toHaveCount(0);
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
  await expect(notice).toContainText('Alexandria, Emporion, and Massalia are left out');

  await page.getByRole('button', { name: 'Gods', exact: true }).click();
  await page.getByRole('button', { name: 'Apollo', exact: true }).click();
  await expect(page.locator('.event-sheet, .maplibregl-popup')).toContainText('birthplace of Apollo');
});

test('timeline, search, glossary, compare, and story pages', async ({ page }) => {
  const before = await page.locator('#app').getAttribute('data-year');
  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  await expect(page.locator('[data-entry="tl1"]')).toHaveAttribute('data-in-range', 'false');
  await expect(page.locator('[data-entry="tl10"]')).toHaveAttribute('data-in-range', 'true');
  await page.locator('[data-entry="tl1"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-year', before ?? '');
  await expect(page.locator('.event-sheet')).toContainText('Minoan');
  await page.locator('.sheet-close').click();

  await page.getByRole('button', { name: 'Timeline', exact: true }).click();
  await page.locator('[data-entry="tl10"]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-year', '-510');
  await expect(page.locator('.event-sheet, .maplibregl-popup')).toHaveCount(0);

  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.locator('#search-input').fill('Abu Mena');
  await page.locator('#search-panel [data-entry="s31"]').click();
  const card = page.locator('.event-sheet, .maplibregl-popup');
  await expect(card).toContainText('Abu Mena');
  await page.locator('.sheet-close, .maplibregl-popup-close-button').click();

  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('button', { name: 'West', exact: true }).click();
  await expect(page.locator('.pin[data-place="s36"]')).toHaveCount(1);
  await expect(page.locator('.pin[data-place="s1"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Filter', exact: true }).click();
  await page.getByRole('button', { name: 'All places', exact: true }).click();
  await expect(page.locator('.pin')).toHaveCount(17);

  await page.getByRole('button', { name: 'Index', exact: true }).click();
  await page.getByRole('button', { name: 'Glossary', exact: true }).click();
  await expect(page.locator('.event-sheet')).toContainText('Delphi');
  await expect(page.locator('.event-sheet')).not.toContainText('Example data');
  await page.locator('.sheet-close').click();

  await page.getByRole('button', { name: 'Index', exact: true }).click();
  await page.getByRole('button', { name: 'People', exact: true }).click();
  await expect(page.locator('[data-entry="pe1"]')).toContainText('Homer');
  await page.locator('.sheet-close').click();

  await page.getByRole('button', { name: 'Index', exact: true }).click();
  await page.getByRole('button', { name: 'Further reading', exact: true }).click();
  await expect(page.locator('[data-entry="fr5"]')).toContainText('Princeton Encyclopedia');
  await page.locator('.sheet-close').click();

  await page.getByRole('button', { name: 'Index', exact: true }).click();
  await page.getByRole('button', { name: 'Compare', exact: true }).click();
  await page.locator('#compare-input').fill('Archaic');
  await page.locator('#compare-panel [data-entry="per2"]').click();
  await page.getByRole('button', { name: 'Second', exact: true }).click();
  await page.locator('#compare-input').fill('Classical');
  await page.locator('#compare-panel [data-entry="per3"]').click();
  await expect(page.locator('#compare-panel')).toContainText('480 BCE');
  await page.locator('.sheet-close').click();

  await page.goto('/#/story/m27');
  await page.locator('#app[data-ready="true"]').waitFor();
  const story = page.locator('.event-sheet, .maplibregl-popup');
  await expect(story).toContainText('Castalia');
  await expect(story).toContainText('Paus. 10.8.9');
  await expect(story.locator('.badge[data-label="evidence"]').first()).toHaveText('Evidence');
  await story.locator('[data-link="s2"]').click();
  await expect(page.locator('.event-sheet, .maplibregl-popup')).toContainText('oracle of the Pythia');

  await page.goto('/#/story/m10');
  await page.locator('#app[data-ready="true"]').waitFor();
  await expect(page.locator('.badge[data-label="inference"]').first()).toHaveText('Inference');
  await expect(page.locator('.badge[data-label="evidence"]').first()).toHaveText('Evidence');
});

test('the published bundle omits excluded entry text', async ({ page }) => {
  const html = await (await page.request.get('/')).text();
  const seen = new Set<string>();
  const queue = [...html.matchAll(/\/assets\/[A-Za-z0-9._-]+/g)].map((match) => match[0]);
  expect(queue.length).toBeGreaterThan(0);
  while (queue.length > 0) {
    const src = queue.pop();
    if (!src || seen.has(src)) continue;
    seen.add(src);
    const response = await page.request.get(src);
    expect(response.ok(), src).toBe(true);
    const text = await response.text();
    expect(text, src).not.toContain('Pharos lighthouse');
    expect(text, src).not.toContain('Palaiapolis');
    expect(text, src).not.toContain('Protis and Gyptis');
    if (!src.endsWith('.js')) continue;
    for (const match of text.matchAll(/\/assets\/[A-Za-z0-9._-]+/g)) {
      if (!seen.has(match[0])) queue.push(match[0]);
    }
  }
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
