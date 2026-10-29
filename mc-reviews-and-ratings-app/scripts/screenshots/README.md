# Screenshot scripts

Regenerate the screenshots in `docs/screenshots/` (used by the top-level docs) against a real, signed-in Merchant Center session, headlessly, with Playwright.

## Prerequisites

- Reviews in all three states in the target project (`docs/SETUP.md`, "Sample reviews"). The script only navigates, selects and sorts; it never moves a comment to another state and never changes data.
- The dev server in another terminal: `cd mc-reviews-and-ratings-app && npm start` (default `http://localhost:3001`).
- The Custom Application is registered and installed for the project (`docs/SETUP.md`, step 2).

## Usage

```shell
cd mc-reviews-and-ratings-app/scripts/screenshots
npm install
npm run login      # opens a headed browser: sign in by hand; the session is saved to
                   # auth-state.json (gitignored, never commit it)
npm run capture    # headless; writes to ../../../docs/screenshots, overwriting in place
```

Override the target with environment variables:

```shell
MC_PROJECT_KEY=other-project MC_PORT=3002 SEARCH_TERM=coffee npm run capture
```

## Notes

- `playwright` is pinned in `package.json`; `npx playwright install chromium` fetches the browser that version needs.
- Chromium runs with `--disable-features=ViewTransition,ViewTransitionOnNavigation`. Without it the start-up View Transition stalls frame production and every `page.screenshot()` times out.
- The signed-in user's picture is masked in every image. Check the result before committing: the Merchant Center's markup can change.
- `auth-state.json` is a browser session, unrelated to the API credentials used by `scripts/seed-*.mjs`.
