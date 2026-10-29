# Research: Comment Moderation

Facts checked on 2026-10-29 with the `commercetools-knowledge` MCP (GraphQL schema `gql-sphere-Review`, documentation search, `commercetools-graphql-validate`).

## R1 — Scaffold and data access

- **Decision**: scaffold with `@commercetools-frontend/create-mc-app` (`--template starter-typescript`), add `@commercetools/nimbus`, wrap the app in `NimbusProvider`, delete the template's UI Kit demo code. Read and write only through `useMcQuery` / `useMcMutation` from `@commercetools-frontend/application-shell`, `context: { target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM }`.
- **Rationale**: constitution II and IX; the package and hook locations were confirmed against a generated scaffold (the hooks come from `@commercetools-frontend/application-shell`, the scaffold tool is `@commercetools-frontend/create-mc-app`).
- **Alternatives**: own BFF with an API client (rejected: second credential, constitution IX); `commercetools-uikit` (rejected: constitution I).
- **Structure**: the app lives in `mc-reviews-and-ratings-app/` because Connect requires each `deployAs` name to match a root folder.

## R2 — Scopes

- **Finding**: `view_products` covers viewing Reviews, `manage_products` covers create, update and delete of Reviews (docs, Scopes > Products). `view_customers` is needed for the reviewer's email. Reading a review's `state` with its `transitions` and listing `ReviewState` States reads the States resource.
- **Decision**: view `view_products`, `view_customers`, `view_states`; manage `manage_products`. States are only read, so no `manage_states`. `transitionState` needs `manage_products` only; the target State is a reference. The exact need for `view_states` (whether the MC proxy checks it for nested State fields) is verified in task T-research at first run against a real project; remove it from the config and `SETUP.md` if reading works without it.
- **Alternatives**: `manage_states` (rejected: more than the UI uses).

## R3 — Querying reviews

- **Finding**: `reviews(where, sort, limit, offset)` returns `total`, `count`, `offset`, `results`. Query predicates compare exactly ("does not perform substring match"); there is no `like` / `contains` for strings. Available: `=`, `!=`, `in`, `is defined`, nested `state(id = "...")`, `includedInStatistics = true`, `target(typeId = "product" and id = "...")`.
- **Decision**:
  - State filter: `where: state(id = :id)` (input variables are the documented way to keep predicates stable). "All" sends no `where`.
  - Sort: `createdAt desc` (default), `rating asc|desc`, `authorName asc|desc` as the `sort` argument.
  - Paging: `limit` (page size 20/50/100) and `offset`.
  - Counts: one `reviews(where, limit: 0) { total }` per state tab plus one for all; `limit: 0` returns the total only (query validated).
  - Search: **capped client-side** (spec clarification): while a term is entered, fetch up to 500 comments of the active filter, newest first (500 is the API maximum for `limit`), filter in the browser over reviewer, title and text, page the result locally, notice when `total > 500`.
- **Alternatives**: exact-match reviewer search server-side (rejected by the user); Product Search (indexes products, not reviews); a separate search index (out of scope, would need a connector).
- **Risk**: offset paging past 10,000 results is rejected by the platform; the spec's target volumes are below that, and the list shows a notice and stops paging there (see `ct-bulk-data` guidance); keyset paging is a later change if needed.

## R4 — State machine

- **Finding**: `TransitionReviewState` with `state` (resource identifier) and optional `force`. If the review's current State has `transitions` set, only a direct transition is allowed; if `transitions` is unset, nothing is validated. A review without a State can only move to an initial State. The target State's `ReviewIncludedInStatistics` role decides `includedInStatistics`, which is *not* recalculated if the role changes later.
- **Decision**: never send `force`. Offer exactly `review.state.transitions`; the three tabs are the project's `ReviewState` States read from `states(where: type = "ReviewState")` (ordered initial first), not hardcoded keys. A State whose `transitions` is unset means "any transition allowed" in the API; the app then offers the other ReviewState States, minus the current one (decided in /speckit-analyze; an empty list `[]` offers nothing, and `conversion.ts` keeps `null` and `[]` apart).
- **Review without a State**: shown in the "all" view with a "No state" label; the app offers the initial State(s) only. Not counted in a state tab.
- **Seeding**: the three States and their transitions are project data (see `docs/SETUP.md`, following the commercetools review approval process); this app never creates them. `SETUP.md` lists what must exist.

## R5 — Reviewer, product and display data

- **Finding**: `Review.authorName`, `title`, `text`, `rating`, `locale`, `createdAt`, `lastModifiedAt`, `includedInStatistics` exist. `target` is an interface (`ReviewTarget`); `... on Product { masterData { current { name(locale) } } }` resolves the product name (validated; `ProductData` is not a valid spread on `ReviewTarget`, a correction over the first draft). `customer { email firstName lastName }` is optional.
- **Decision**: show `authorName`, fall back to the customer's name, then to a translated generic label. Product name by the user's data locale with fallback to the first available language; target of another type (`Channel`) or missing: translated "Unavailable product" label.
- **Locale**: pass `$acceptLanguage` (the MC `dataLocale` first, then the project's languages), never a hardcoded locale and never together with `locale`: the API requires exactly one of the two on a localized field. It answers `InvalidInput` otherwise, which the schema cannot show; found on the first run against a real project and now guarded by `graphql-documents.spec.ts`.

## R6 — Concurrency and bulk

- **Finding**: `updateReview(id, version, actions)`; a stale `version` is a `ConcurrentModification` error (code in the GraphQL error `extensions`).
- **Decision**: send the version last read; on `ConcurrentModification` refetch that review and tell the user (FR-014). Bulk: one mutation per selected review run with limited concurrency (4), each with its own version; reviews whose `transitions` lack the target are skipped (not an error); the result is "N changed, M skipped, K failed" with the failed ones kept selected. No bulk transition API exists.
- **Cache**: the mutation returns the review's state, so Apollo updates the normalized review in place (constitution data-layer rule); lists and counts are then refetched because membership changes (the one allowed use of `refetch`, since a review may leave the filtered page and the page needs backfilling).

## R7 — i18n, permissions, tests, deployment

- **Decision**: constitution IV (react-intl, `en.json` extracted, `de.json` by hand); constitution III (`useIsAuthorized` with `PERMISSIONS.View` / `Manage`; disabled, never hidden); tests with `msw` against the GraphQL layer (constitution workflow); deployment on Connect with Netlify for previews from one bundle (`connect.yaml`, `netlify.toml`, CI with build, lint, typecheck, test).
- **Entry point**: `comments`, main menu "Comments" (de, en), icon from `@commercetools-frontend/assets`.

## R8 — Bulk targets and performance check

- **Bulk targets**: one action per non-initial ReviewState, named by the State (decided in /speckit-analyze).
- **Performance**: SC-007 and SC-009 are verified by one manual measurement (task T053) against a project with thousands of reviews; results are recorded here.
