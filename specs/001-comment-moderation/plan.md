# Implementation Plan: Comment Moderation

**Branch**: `001-comment-moderation` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-comment-moderation/spec.md`

## Summary

A Merchant Center custom application `mc-reviews-and-ratings-app/` (entry point `reviews-and-ratings`) on Nimbus, in which business users moderate product review comments: state tabs with live counts, server-side paging, sorting and filtering, a capped client-side search, a side-panel detail, and single and bulk state transitions. A comment is a commercetools `Review`; its state is a `ReviewState` State. The app owns no data and no API client: it reads reviews and States and runs `transitionState` through the Merchant Center GraphQL proxy, and the offered actions are always the review's own `state.transitions`.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.2, Node 22 (`.nvmrc`)

**Primary Dependencies**: `@commercetools-frontend/*` 27.x (application-shell, application-components, permissions, i18n, mc-scripts), `@commercetools/nimbus` ^3.6, `@commercetools/platform-sdk` (types), `@apollo/client` 3.13, `react-intl` 7, `react-router-dom` 5, `graphql` 16

**Storage**: N/A, commercetools `Review` and `State` resources only; UI state in memory

**Testing**: Jest 30 with `@commercetools-frontend/jest-preset-mc-app/typescript`, Nimbus fixes (`jest.setup.nimbus.js`, `jest.resolver.js`), `msw` 1.x for the GraphQL layer, Testing Library

**Target Platform**: Merchant Center shell (browser); hosted on Connect (production) or Netlify (preview) from one bundle

**Project Type**: Merchant Center custom application (single npm project in `mc-reviews-and-ratings-app/`)

**Performance Goals**: first page and counts within 3 s with thousands of reviews (SC-009), state change visible within 2 s (SC-007)

**Constraints**: constitution I–IX; no `commercetools-uikit`; no own API client; offset paging only up to the platform's 10,000 results; search capped at 500 comments; `limit` maximum 500

**Scale/Scope**: one main-menu entry, one list route with a detail side panel, one write operation (`transitionState`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | How |
|---|---|---|
| I Nimbus-first | Pass | Nimbus only; the scaffold's UI Kit demo code is removed (research R1) |
| II MC platform constraints | Pass | Application shell, `dataLocale`/`projectLanguages`, MC notifications, `ctp` GraphQL proxy |
| III View/Manage (non-negotiable) | Pass | `view_*` scopes render the app; every transition control disabled, never hidden, without Manage (FR-012, SC-008) |
| IV Localization | Pass | All text via react-intl, `core.json` extracted and copied to `en.json`, `de.json` by hand, key-set diff check; state and product names by data locale; no localized-string inputs exist, so no empty-translation rule applies |
| V Concurrency & minimal updates | Pass | `version` sent; stale version surfaced, never retried; a transition to the current state makes no call (skipped) |
| VI Key validation | N/A | The app creates no keyed resource |
| VII Feedback & errors | Pass | Notifications for every outcome, `graphQLErrorHandler`, loading and retry states (FR-015, FR-017) |
| VIII List conventions | Pass | Paginated (FR-018), sortable (FR-005), empty and filtered-empty states, row opens the detail |
| IX Live state machine, least privilege | Pass | Actions from `state.transitions`, tabs from `ReviewState` States, scopes `view_products`, `view_customers`, `view_states` / `manage_products` |

Principle V note: the app sends one fixed `transitionState` action, so no `sync-actions` diff or REST-to-GraphQL action bridge exists. Post-design re-check: no violations. One deviation to note, not a violation: "Complexity Tracking" is empty.

<!-- commercetools-spec-extension:begin v=1 id=platform-skills-resolution -->
## Platform Skills Resolution (commercetools)

| Area / component | Skill | Why |
|---|---|---|
| Scaffold, `custom-application-config.mjs`, scopes, `connect.yaml`, deploy (Connect, Netlify), registration | `commercetools-connect` | Custom application contract; entry point, scopes and Connect folder naming |
| Custom application creation, registration and install in organizations | `commercetools-custom-application` | Registration and nav entry steps documented in `docs/SETUP.md` |
| `Review` and `State` GraphQL shapes, predicates, update action `transitionState`, optimistic concurrency | `commercetools-platform` | Query shapes validated with `commercetools-graphql-validate` (contracts) |

Every implementation task generated from this plan MUST inherit its area's skill
as a `[SKILL: <name>]` annotation.
<!-- commercetools-spec-extension:end id=platform-skills-resolution -->

## Project Structure

### Documentation (this feature)

```text
specs/001-comment-moderation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── graphql-operations.md
├── checklists/
│   └── requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
connect.yaml                         # deployAs mc-reviews-and-ratings-app
netlify.toml
.env.example
.github/workflows/ci.yml             # build, lint, typecheck, test
docs/SETUP.md
mc-reviews-and-ratings-app/
├── custom-application-config.mjs    # entry point `reviews-and-ratings`, scopes, menu
├── package.json, tsconfig.json, eslint.config.js, jest.*.js, intl-formatter.js, codegen.ctp.yml
├── .env, .nvmrc
├── schemas/ctp.json                 # introspection, for graphql validate
├── scripts/                         # login.js, load-env.js (screenshots/ to come)
└── src/
    ├── index.tsx, routes.tsx, constants.ts, load-messages.ts
    ├── components/
    │   ├── entry-point/             # ApplicationShell + NimbusProvider
    │   ├── comments-list/           # page, state-tabs/, comments-table/, search-bar/, bulk-bar/
    │   ├── comment-detail/          # side panel (Drawer), comment-actions
    │   └── shared/                  # fallback labels, rating, state badge
    ├── hooks/
    │   ├── use-comments-connector/  # *.graphql, fragments/, comments-connector.ts, conversion.ts, index.ts
    │   ├── use-review-states-connector/
    │   ├── shared/                  # error-handling.ts, permissions.ts, mc-api-context.ts
    │   └── query-state-context.tsx  # page, size, filter, search, sort above list and panel
    ├── domain/                      # query-state, comment-search, bulk-plan (pure, with specs)
    ├── i18n/data/{core,en,de}.json   # core: extracted, en: copy of core, de: by hand
    ├── test-utils/                  # fake-backend (msw), fixtures, renderComments
    └── types/                       # comment.ts, generated/ctp.ts
```

**Structure Decision**: one npm project in `mc-reviews-and-ratings-app/` (Connect folder-name rule, no workspaces). `domain/` holds the pure rules (bulk planning from `transitions`, capped search, query-state to `where`/`sort`/`offset`) so they are unit-tested without rendering.

## Complexity Tracking

No constitution violations to justify.
