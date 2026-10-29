---

description: "Task list for Comment Moderation"
---

# Tasks: Comment Moderation

**Input**: Design documents from `/specs/001-comment-moderation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/graphql-operations.md

**Tests**: The constitution requires component tests against the GraphQL layer with `msw`, and unit specs for pure logic, so each story carries test tasks. They are written next to the code they cover; they are not a strict test-first requirement.

**Organization**: Grouped by user story. All paths are relative to the repository root; the application is `mc-reviews-and-ratings-app/` and every npm command runs inside it.

## Format: `[ID] [P?] [Story] [SKILL: <name>?] Description`

- **[P]**: can run in parallel (different files, no dependency on an open task)
- **[Story]**: US1 to US4, from spec.md
- `[SKILL: <name>]` on every task that touches commercetools (plan.md "Platform Skills Resolution"); load that skill before starting the task

## Phase 1: Setup

**Purpose**: Scaffold and tooling

- [X] T001 [SKILL: commercetools-connect] Scaffold the app with `npx @commercetools-frontend/create-mc-app@latest mc-reviews-and-ratings-app --template starter-typescript` (entry point `reviews-and-ratings`, no UI Kit demo kept); record the actual package/hook locations found in the scaffold in `specs/001-comment-moderation/research.md` R1 — Done differently: the scaffold was set up from an existing Nimbus-based custom application (so no UI Kit code to remove) instead of running `create-mc-app`.
- [X] T002 Add `@commercetools/nimbus`, `@commercetools/nimbus-icons`, `@commercetools/nimbus-tokens`, `@chakra-ui/*`, `msw@1`, `react-intl@7` and the other dependencies of an existing Nimbus-based custom application to `mc-reviews-and-ratings-app/package.json`; add the scripts `extract-intl`, `generate-types:chakra` (postinstall), `typecheck`, `lint`, `format`; pin npm via `packageManager`
- [X] T003 [P] Remove the scaffold's UI Kit demo screens, hooks and `@commercetools-uikit/*` dependencies from `mc-reviews-and-ratings-app/src/` — Not needed (T001 copy has no UI Kit demo code).
- [X] T004 [P] Add the test harness: `mc-reviews-and-ratings-app/jest.test.config.js`, `jest.setup.nimbus.js`, `jest.resolver.js`, `jest.uuid-stub.js`, `jest.d.ts`
- [X] T005 [P] Add `mc-reviews-and-ratings-app/eslint.config.js` (graphql-eslint for `*.graphql`), `.prettierrc`, `.prettierignore`, `.nvmrc` (Node 22), `intl-formatter.js`; `extract-intl` glob must exclude `*.d.ts`
- [X] T006 [P] [SKILL: commercetools-connect] Create `mc-reviews-and-ratings-app/.env` (`ENABLE_NEW_JSX_TRANSFORM="true"`, `FAST_REFRESH`, `ENTRY_POINT_URI_PATH="reviews-and-ratings"`), `.env.example` at the root, and `mc-reviews-and-ratings-app/src/build-flags.spec.ts` guarding the JSX flag
- [X] T007 [SKILL: commercetools-connect] Write `mc-reviews-and-ratings-app/custom-application-config.mjs` (name Comments, entry point `${env:ENTRY_POINT_URI_PATH}`, scopes view `view_products`, `view_customers`, `view_states` / manage `manage_products`, main menu "Comments" de and en, icon, no submenu)
- [X] T008 [P] [SKILL: commercetools-connect] Write `connect.yaml` (`deployAs: mc-reviews-and-ratings-app`, `merchant-center-custom-application`, standard configuration `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH` default `comments`, `INITIAL_PROJECT_KEY`, `CLOUD_IDENTIFIER`) and `netlify.toml` (base `mc-reviews-and-ratings-app`, publish `public`, Node 22, SPA rewrite, `X-Robots-Tag: noindex`) at the root
- [X] T009 [P] Add `.github/workflows/ci.yml` (build, lint, typecheck, test on PRs into `main`, working directory `mc-reviews-and-ratings-app`, env: `CLOUD_IDENTIFIER`, `ENTRY_POINT_URI_PATH`, `CUSTOM_APPLICATION_ID`, `APPLICATION_URL`, `INITIAL_PROJECT_KEY`)
- [X] T010 [P] Add `mc-reviews-and-ratings-app/codegen.ctp.yml`, `scripts/login.js`, `scripts/load-env.js`, `graphql.config.yml` (standard mc-scripts files) for `npm run generate-types:ctp`
- [X] T011 [SKILL: commercetools-platform] Run `npm run generate-types:ctp` interactively (a person, not headless) to write `mc-reviews-and-ratings-app/schemas/ctp.json` and `src/types/generated/ctp.ts`; verify `npm install`, `npm start`, `npm run build`, `npm test` run on the empty app — Done without the interactive login: `schemas/ctp.json` and `src/types/generated/ctp.ts` were taken from a previous generation; regenerate with `npm run generate-types:ctp` when convenient.

---

## Phase 2: Foundational (blocks all stories)

**Purpose**: Shell, data layer base, permissions, i18n, test utilities

- [X] T012 `mc-reviews-and-ratings-app/src/constants.ts` (`PERMISSIONS` View/Manage built from the entry point, `GRAPHQL_TARGETS` use, page size options 20/50/100, `SEARCH_CAP = 500`) and `src/config.ts` (single reader of `process.env`) with `src/config.spec.ts` guarding that no other file reads `process.env` — `src/config.ts` dropped (no per-project values exist); `src/env-guard.spec.ts` guards that only `constants.ts` reads `process.env`.
- [X] T013 `mc-reviews-and-ratings-app/src/components/entry-point/entry-point.tsx`, `src/index.tsx`, `src/routes.tsx` (ApplicationShell wrapped in `NimbusProvider`, lazy routes, one route `/` to the comments list), `src/load-messages.ts`
- [X] T014 [P] `mc-reviews-and-ratings-app/src/hooks/shared/error-handling.ts` (`graphQLErrorHandler`, `ErrorCodeMapping`, readable messages, `ConcurrentModification` detection) with `error-handling.spec.ts`
- [X] T015 [P] `mc-reviews-and-ratings-app/src/hooks/shared/permissions.ts` (`useCanManage` from `useIsAuthorized` with `PERMISSIONS.Manage`; View gate in the route) with a unit spec — `permissions.ts` has no own spec; covered by the view-only specs.
- [X] T016 [P] [SKILL: commercetools-platform] Write the documents of `contracts/graphql-operations.md` as `.graphql` files: `mc-reviews-and-ratings-app/src/hooks/use-review-states-connector/fetch-all.graphql`, `src/hooks/use-comments-connector/fetch-all.graphql`, `count.graphql`, `transition.graphql`, and `fragments/comment-base.graphql`, `fragments/comment-detail.graphql` (base for list columns, detail extends it; every fragment used)
- [X] T017 [P] [SKILL: commercetools-platform] `mc-reviews-and-ratings-app/src/hooks/graphql-documents.spec.ts`: parse and validate every `.graphql` file against `schemas/ctp.json` — Lives in `src/hooks/graphql-documents.spec.ts`.
- [X] T018 [P] `mc-reviews-and-ratings-app/src/types/comment.ts` (`Comment`, `CommentState` per data-model.md) and `src/hooks/use-comments-connector/conversion.ts` (API shape to `Comment`, fallback chain for author and product name by data locale and `projectLanguages`, `transitions` verbatim, except unset `null` becomes the other ReviewState States, `[]` stays empty and a review without state gets the initial States; takes the project's states as input) with `conversion.spec.ts` covering all four cases
- [X] T019 [SKILL: commercetools-platform] `mc-reviews-and-ratings-app/src/hooks/use-review-states-connector/review-states-connector.ts` and `index.ts`: `useReviewStates` via `useMcQuery`, tabs ordered initial first then creation order; `review-states-connector.spec.ts` with msw
- [X] T020 [P] `mc-reviews-and-ratings-app/src/test-utils/` : msw handlers and server setup (`onUnhandledRequest: 'error'`), `buildComment`, `buildReviewState` builders (hand-written, three default states and transitions), `renderComments` helper (`renderAppWithRedux` plus `NimbusProvider`)
- [X] T021 [P] i18n base: `mc-reviews-and-ratings-app/src/i18n/data/core.json` (via `npm run extract-intl`, copied to `en.json`), `de.json`, and `src/i18n/i18n-catalogs.spec.ts` asserting identical key sets and `{placeholder}` tokens in both catalogs
- [X] T022 `mc-reviews-and-ratings-app/src/domain/query-state.ts`: list query state (state tab, search, sort, page, size) to `where`, `sort`, `limit`, `offset`; reducer and React context `CommentsQueryProvider` that survives opening and closing the detail; unit spec `query-state.spec.ts` (defaults `createdAt desc`, page 1, size 20; tab or sort change resets page; 10,000-offset guard)

**Checkpoint**: the shell starts, the foundations are tested; stories can start.

---

## Phase 3: User Story 1 - See what needs attention (P1) MVP

**Goal**: Queue with state tabs and counts, paged list, loading, empty and error states.

**Independent Test**: Open the app; rows with all columns, a count per state, a tab narrows the list, an empty project and a failed load each show their own message.

- [X] T023 [US1] [SKILL: commercetools-platform] `mc-reviews-and-ratings-app/src/hooks/use-comments-connector/comments-connector.ts` and `index.ts`: `useComments(queryState)` (`CommentsList` with `where`/`sort`/`limit`/`offset`, `locale` from `dataLocale`) and `useCommentCounts(states)` (`CommentCount` for all and each state, parallel, cached by `where`); `comments-connector.spec.ts` with msw asserting the variables sent — Counts and list variables are asserted in `comments-list.spec.tsx`; no separate connector spec.
- [X] T024 [P] [US1] `mc-reviews-and-ratings-app/src/components/comments-list/state-tabs/state-tabs.tsx`, `messages.ts`: All plus one tab per `ReviewState` with live counts
- [X] T025 [P] [US1] `mc-reviews-and-ratings-app/src/components/shared/` : `rating-display.tsx` ("not rated" fallback), `state-badge.tsx`, `fallback-labels.ts` with `messages.ts` (generic reviewer, unavailable product, no state)
- [X] T026 [US1] `mc-reviews-and-ratings-app/src/components/comments-list/comments-table/comments-table.tsx`, `messages.ts`: columns title and text preview, reviewer, product, rating, language, submitted, state, counts-toward-rating; row press opens the detail (US2 wires it)
- [X] T027 [US1] `mc-reviews-and-ratings-app/src/components/comments-list/comments-list.tsx`, `messages.ts`: page composition, loading indicator, error with retry, "nothing to moderate yet" and pagination (page size 20/50/100, stops at the 10,000-offset limit with a notice (spec edge case)); route `/` renders it behind the View permission
- [X] T028 [P] [US1] `mc-reviews-and-ratings-app/src/components/comments-list/comments-list.spec.tsx` (msw): rows with all fields, tab counts, tab narrows the list, empty project, load error and retry, fallback labels for missing product, author and rating (SC-006), no View permission renders nothing, a review without state shows "No state"
- [X] T029 [US1] German texts for every US1 message in `mc-reviews-and-ratings-app/src/i18n/data/de.json`; run `npm run extract-intl` and the catalog spec

**Checkpoint**: US1 works alone and is demonstrable.

---

## Phase 4: User Story 2 - Decide on a comment (P2)

**Goal**: Side-panel detail and single transitions with conflict handling.

**Independent Test**: Open a comment, read it in full, approve or reject it; only valid actions show; stale version is reported; View-only users see disabled buttons.

- [X] T030 [US2] [SKILL: commercetools-platform] Add `useTransitionComment` to `mc-reviews-and-ratings-app/src/hooks/use-comments-connector/comments-connector.ts`: `TransitionComment` through `graphQLErrorHandler`, no `force`, returns the review's new state so Apollo updates in place; on `ConcurrentModification` refetch that review; spec with msw capturing `transitionState` variables — Spec is in `comment-detail.spec.tsx` (the mutation is exercised through the panel).
- [X] T031 [P] [US2] `mc-reviews-and-ratings-app/src/components/comment-detail/comment-detail.tsx`, `messages.ts`: side panel over the list (no route): full text, rating, reviewer and email, product, language, created and last changed, counts-toward-rating, current state; closing keeps the query state
- [X] T032 [US2] `mc-reviews-and-ratings-app/src/components/comment-detail/comment-actions.tsx`, `messages.ts`: one button per entry of `comment.transitions`, none when the list is empty, all disabled (not hidden) without Manage, success and error notifications, conflict notification with the current state shown
- [X] T033 [US2] Wire the detail into `comments-list.tsx`: row press opens the panel; after a transition the comment leaves a non-matching tab at once and the counts and list refresh (`refetch` only here, because membership changes) — Detail wired in `comments-list.tsx` (list, counts and detail are refreshed through `onChanged`).
- [X] T034 [P] [US2] `mc-reviews-and-ratings-app/src/components/comment-detail/comment-detail.spec.tsx` (msw): Pending approval offers both actions; Approved offers only Reject; Rejected only Approve; no transitions offers none; success moves the row out of the tab and updates counts; conflict path; View-only user has disabled buttons; closing without choice changes nothing, unset transitions offer the other states, a no-state review offers the initial states (SC-005, SC-008)
- [X] T035 [US2] German texts for US2 messages in `de.json`; `npm run extract-intl` and the catalog spec

**Checkpoint**: US1 and US2 deliver the core moderation loop.

---

## Phase 5: User Story 3 - Find a specific comment quickly (P3)

**Goal**: Sorting and capped search.

**Independent Test**: Sort by date, rating and reviewer in both directions; search finds comments by reviewer, title and text across pages up to the cap; a limit notice shows above 500.

- [X] T036 [P] [US3] `mc-reviews-and-ratings-app/src/domain/comment-search.ts`: case-insensitive match over reviewer, title and text; local sort and local paging for search mode; unit spec `comment-search.spec.ts` (accents, empty term, rating null sorting last, reviewer fallback) — Also holds `sortComments` and `pageOf` for search mode.
- [X] T037 [US3] Search mode in `useComments`: with a term, fetch `limit: 500` of the active filter, newest first, filter and sort locally via `comment-search.ts`, report `capped` when `total > 500`; extend `comments-connector.spec.ts` — Search mode lives in `useComments` (`comments-connector.ts`); asserted in `search-and-sort.spec.tsx`.
- [X] T038 [P] [US3] `mc-reviews-and-ratings-app/src/components/comments-list/search-bar/search-bar.tsx`, `messages.ts`: debounced input, clear button; "limited to the 500 newest" notice when capped
- [X] T039 [US3] Sortable headers for date, rating and reviewer in `comments-table.tsx` (same header again reverses; server sort in normal mode, local sort in search mode); "no matches" state with a reset action for search and filter (FR-010) — Sortable headers were built with the table in T026; the no-match state with reset in T027.
- [X] T040 [P] [US3] `mc-reviews-and-ratings-app/src/components/comments-list/search-and-sort.spec.tsx` (msw): sort variables per header and reversal, search filters and combines with a tab, no-match reset, capped notice, query state survives opening and closing the detail (FR-018) — `search-and-sort.spec.tsx`.
- [X] T041 [US3] German texts for US3 messages in `de.json`; `npm run extract-intl` and the catalog spec

---

## Phase 6: User Story 4 - Moderate several comments at once (P4)

**Goal**: Selection and bulk transitions with per-comment outcomes.

**Independent Test**: Select several rows, approve or reject; a result summary shows changed, skipped and failed; selection clears; counts update.

- [X] T042 [P] [US4] `mc-reviews-and-ratings-app/src/domain/bulk-plan.ts`: from selected comments and a target state id, plan `changed` (target in `transitions`), `skipped` (already in the state or not allowed); run with concurrency 4 and collect `changed | skipped | failed`; unit spec `bulk-plan.spec.ts`
- [X] T043 [US4] [SKILL: commercetools-platform] `useBulkTransition` in `comments-connector.ts`: one `TransitionComment` per planned review with its own `version`; spec with msw for mixed outcomes including one failure and one conflict — `useBulkTransition` plus the planning logic in `domain/bulk-plan.ts`; covered by `bulk-bar.spec.tsx`.
- [X] T044 [US4] Row selection (page scope) in `comments-table.tsx` and `mc-reviews-and-ratings-app/src/components/comments-list/bulk-bar/bulk-bar.tsx`, `messages.ts`: bar only with a selection, one action per non-initial ReviewState, named after the state, disabled without Manage, result notification "N changed, M skipped, K failed", failed rows stay selected, selection cleared otherwise, counts and list refreshed
- [X] T045 [P] [US4] `mc-reviews-and-ratings-app/src/components/comments-list/bulk-bar/bulk-bar.spec.tsx` (msw): mixed starting states, already-in-target left alone, partial failure keeps failed selected, no selection no bar, View-only disabled
- [X] T046 [US4] German texts for US4 messages in `de.json`; `npm run extract-intl` and the catalog spec

---

## Phase 7: Polish and cross-cutting

- [ ] T047 [P] Accessibility pass: keyboard operation and accessible names for tabs, sortable headers, selection, bulk bar and the side panel (focus moves in and returns on close); add assertions to the component specs — OPEN: not done; add an accessibility pass (focus return after closing the panel, accessible names) and `jest-axe` if wanted.
- [ ] T048 [P] [SKILL: commercetools-connect] Verify scopes on first run against a real project: with and without `view_states`; update `custom-application-config.mjs`, `docs/SETUP.md` and `research.md` R2 with the result — OPEN: needs a real project with a Manage and a View-only user (cannot run in this sandbox).
- [X] T049 [P] Screenshots: `mc-reviews-and-ratings-app/scripts/screenshots/` (Playwright, `--disable-features=ViewTransition,ViewTransitionOnNavigation`), `docs/screenshots/*.png`; reference them in `FEATURES.md` and `README.md` — Done: seven images in `docs/screenshots/` (list, tab-pending, detail, bulk, sorted, search, no-match), referenced from README, FEATURES and `docs/MODERATION-FLOW.md`. The first capture showed three layout defects (clipped state badge and date, badge stretched across the detail panel, wrapped headers) that were fixed.
- [ ] T050 [P] Add `LICENSE`, `SUPPORT.md` and SPDX headers if the repository is to be published (decide with the user; see the `ct-builders-publish` skill) — OPEN: decision for the repository owner.
- [ ] T051 Walk through every scenario of `quickstart.md` in a real project with a View-only and a Manage user; fix findings in the spec files first, then in code — OPEN: needs a real project; the msw specs cover the scenarios, but no authenticated browser walkthrough was run.
- [ ] T053 Measure SC-009 (first page and counts under 3 s) and SC-007 (state change visible under 2 s) in a project with thousands of reviews; record the numbers in `specs/001-comment-moderation/research.md` R8 — OPEN: needs a project with thousands of reviews.
- [X] T052 Final sync: update `FEATURES.md` status (remove "planned"), `CLAUDE.md` "Repository state", `plan.md` structure tree, and tick this file; run `npm run build && npm run lint && npm run typecheck && npm test`

- [X] T054 [SKILL: commercetools-platform] `scripts/seed-review-states.mjs` and `scripts/seed-review-states.test.mjs`: idempotent seeding of `pending-approval`, `approved` and `rejected` with their transitions (dry run by default, `--apply` to write); documented in `docs/SETUP.md`. Tested offline; not yet run against a real project.

- [X] T055 [SKILL: commercetools-platform] `scripts/seed-reviews.mjs`, `scripts/seed-reviews.test.mjs`, shared `scripts/ctp.mjs`: random sample reviews (rating, title, text, reviewer, en/de) on random products in `pending-approval`, optional `--spread` over the three states, `--count`, `--seed`, `--delete` for its own `seed-review-NNN` reviews, dry run by default; documented in `docs/SETUP.md`. Tested offline and dry-run against the project; not yet applied.

---

## Dependencies and order

- Phase 1 then Phase 2; T011 needs a person (interactive login). T017 needs T011 (schema) and T016 (documents).
- US1 (Phase 3) needs Phase 2 only. US2 needs US1's list and table. US3 and US4 need US1; US4 additionally reuses `useTransitionComment` from US2 (T030). US3 and US4 are independent of each other.
- Polish after the stories it covers.

## Parallel examples

- Phase 1: T003, T004, T005, T006, T008, T009, T010 together after T001 and T002.
- Phase 2: T014, T015, T016, T017, T018, T020, T021 together.
- US1: T024 and T025 together; T028 once T026 and T027 are done.
- US3 and US4 can be worked by two people after US2.

## Implementation strategy

1. MVP = Phases 1, 2 and 3 (read-only queue with tabs, counts, paging, states). Demo it.
2. Add US2 for the moderation loop (first real value; deployable).
3. Add US3 and US4 in either order; finish with Phase 7.
4. Any change of behavior goes into spec.md, plan.md or the contracts first (CLAUDE.md rule 2).
