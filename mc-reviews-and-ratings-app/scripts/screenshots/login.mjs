/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Opens a headed browser against the local dev server so you can sign in to the
// Merchant Center by hand, then saves the session (cookies and localStorage) to
// auth-state.json (gitignored) for capture.mjs to reuse headlessly.
//
// Usage: `npm start` in mc-reviews-and-ratings-app (another terminal), then
//   npm install && npm run login

import { fileURLToPath } from 'url';
import path from 'path';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_KEY = process.env.MC_PROJECT_KEY || 'tech-sales-good-store';
const PORT = process.env.MC_PORT || 3001;
const BASE = `http://localhost:${PORT}/${PROJECT_KEY}/reviews-and-ratings`;
const AUTH_STATE_PATH = path.join(__dirname, 'auth-state.json');

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch((e) => {
  console.log('goto error:', e.message);
});

// Wait until we have left for the identity provider before waiting for the way
// back, otherwise a transient localhost hit during the first redirect matches.
try {
  await page.waitForURL((url) => url.hostname !== 'localhost', { timeout: 15000 });
  console.log('Redirected to sign-in at', page.url());
} catch {
  console.log('Did not leave localhost, maybe already signed in:', page.url());
}

console.log('Please sign in in the opened browser window. Waiting up to 10 minutes ...');

try {
  await page.waitForURL((url) => url.hostname === 'localhost', { timeout: 10 * 60 * 1000 });
} catch (e) {
  console.log('Timed out waiting for the sign-in redirect:', e.message);
  await browser.close();
  process.exit(1);
}

// The shell finishes loading (project selection, chrome) shortly after the redirect.
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(3000);
console.log('Back on localhost:', page.url());

await page.context().storageState({ path: AUTH_STATE_PATH });
console.log('Saved the session to', AUTH_STATE_PATH);

await browser.close();
