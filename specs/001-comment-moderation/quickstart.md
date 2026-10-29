# Quickstart: validating Comment Moderation

## Prerequisites

- A commercetools project with Reviews in different states and the three `ReviewState` States with transitions (Pending approval → Approved, Rejected; Approved ↔ Rejected). `docs/SETUP.md` section 1 lists them; this app does not create them.
- The app registered as a Custom Application with the scopes of `custom-application-config.mjs` (`docs/SETUP.md`), installed in the project; a user with View and a user with Manage.
- `mc-reviews-and-ratings-app/.env.local` from `.env.example` (`INITIAL_PROJECT_KEY`, `CLOUD_IDENTIFIER`).

## Run

```shell
cd mc-reviews-and-ratings-app
npm install
npm start          # dev server, opens the Merchant Center on port 3001
npm test && npm run lint && npm run typecheck && npm run build
```

## Scenarios (map to the spec)

1. **Queue (US1)**: open Comments; tabs show All and one per state with counts; select a tab; the list narrows and counts stay. Empty project → "nothing to moderate" message. Break the network → error with retry.
2. **Decide (US2)**: open a "Pending approval" comment: both actions. Approve: notification, row leaves the "Pending approval" tab, counts update. Open a Approved comment: only "Reject". Open a Rejected one: only "Approve". As a View-only user: buttons visible and disabled.
3. **Conflict (FR-014)**: open a comment in two browsers; change in one; change in the other → "already changed" notification and current state.
4. **Find (US3)**: sort by date, rating, reviewer (second click reverses); change page size; open and close a detail: page, filter and sort are kept. Type a term: results come from up to 500 comments; with more than 500 in the filter a limit notice shows.
5. **Bulk (US4)**: select rows on a page, "Approve": result summary (changed/skipped/failed), selection cleared, counts updated. No selection: no bulk bar.
6. **Fallbacks**: a review with no product, no author name, no rating renders labels, not blanks.
7. **Languages**: switch the MC user language to German: every text is German.

Query shapes: [`contracts/graphql-operations.md`](./contracts/graphql-operations.md); data: [`data-model.md`](./data-model.md).
