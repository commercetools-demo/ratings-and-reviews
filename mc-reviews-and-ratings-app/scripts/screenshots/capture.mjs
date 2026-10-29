/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Captures the documentation screenshots against the local dev server, reusing
// the session saved by login.mjs. It only navigates and selects: it never moves
// a comment to another state and never changes data. The project needs reviews
// in the three states (see docs/SETUP.md, "Sample reviews").
//
// Usage: `npm start` in mc-reviews-and-ratings-app (another terminal), then
//   npm install && npm run login && npm run capture

import { fileURLToPath } from 'url';
import path from 'path';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_KEY = process.env.MC_PROJECT_KEY || 'tech-sales-good-store';
const PORT = process.env.MC_PORT || 3001;
const BASE = `http://localhost:${PORT}/${PROJECT_KEY}/reviews-and-ratings`;
const AUTH_STATE_PATH = path.join(__dirname, 'auth-state.json');
const OUTPUT_DIR = path.join(__dirname, '..', '..', '..', 'docs', 'screenshots');
const SEARCH_TERM = process.env.SEARCH_TERM || 'quality';

// The shell and Nimbus start a View Transition on startup; in Chromium the
// skipped transition leaves the page without further frames, so every
// page.screenshot() times out. Disabling the feature avoids that.
const browser = await chromium.launch({
  headless: true,
  args: ['--disable-features=ViewTransition,ViewTransitionOnNavigation'],
});
const context = await browser.newContext({
  storageState: AUTH_STATE_PATH,
  viewport: { width: 1440, height: 900 },
  locale: 'en-GB',
});
const page = await context.newPage();
page.on('pageerror', (err) => console.log('[pageerror]', err.message));

// The signed-in user's picture must not end up in the documentation: it is
// made invisible (not boxed over, which would also show through an open panel).
const PERSONAL =
  '[data-testid*="avatar" i], [class*="avatar" i], img[alt*="avatar" i], img[alt*="profile" i], [data-testid="user-settings-menu"]';
const hidePersonal = () =>
  page.addStyleTag({ content: `${PERSONAL} { visibility: hidden !important; }` });

async function settle() {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function shot(name) {
  await settle();
  const hidden = await page.locator(PERSONAL).count();
  await page.screenshot({ path: path.join(OUTPUT_DIR, name) });
  console.log('shot:', name, `| hid ${hidden} personal element(s)`);
}

async function attempt(name, task) {
  try {
    await task();
  } catch (error) {
    console.log(`${name} FAILED:`, error.message.split('\n')[0]);
  }
}

const firstDataRow = () => page.locator('[role="row"]').nth(1);

// A fresh context's first navigation must be the app root; a deep link as the
// first request can be bounced before the shell's silent sign-in completes.
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
await settle();
await firstDataRow().waitFor({ state: 'visible', timeout: 20000 });
await hidePersonal();
await shot('list.png');

// Tabs: states are ordered initial first, so tab 1 is the pending state.
await attempt('tab-pending', async () => {
  await page.getByRole('tab').nth(1).click();
  await settle();
  await shot('tab-pending.png');
});

// Detail side panel of the first comment of that tab.
await attempt('detail', async () => {
  await firstDataRow().click();
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForTimeout(1200);
  await shot('detail.png');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10000 });
});

// Bulk selection: two rows, nothing is applied.
await attempt('bulk', async () => {
  await firstDataRow().getByRole('checkbox').check({ force: true });
  await page.locator('[role="row"]').nth(2).getByRole('checkbox').check({ force: true });
  await page.getByTestId('bulk-bar').waitFor({ state: 'visible', timeout: 10000 });
  await shot('bulk.png');
  await firstDataRow().getByRole('checkbox').uncheck({ force: true });
  await page.locator('[role="row"]').nth(2).getByRole('checkbox').uncheck({ force: true });
});

// Back to all comments, sorted by rating.
await attempt('sorted', async () => {
  await page.getByRole('tab').first().click();
  await settle();
  await page.getByRole('columnheader', { name: /rating|bewertung/i }).click();
  await settle();
  await shot('sorted.png');
});

// Search and no-match.
await attempt('search', async () => {
  const box = page.getByRole('searchbox').first();
  await box.fill(SEARCH_TERM);
  await page.waitForTimeout(1500); // debounce
  await shot('search.png');
  await box.fill('zzzzzz-no-match');
  await page.waitForTimeout(1500);
  await shot('no-match.png');
});

await browser.close();
console.log('DONE');
