# CLAUDE.md

Guidance for Claude Code (claude.ai/code) in this repository.

## Repository state

`specs/001-comment-moderation/` is implemented in `mc-reviews-and-ratings-app/` (queue with state tabs and counts, server-side paging and sorting, capped client-side search, detail side panel, single and bulk transitions, English and German). Build, lint, typecheck and 90 msw/unit specs pass. **Not yet run against a live project**: the authenticated browser walkthrough (`quickstart.md`), the `view_states` scope check, screenshots and the performance measurement are open (tasks T047–T051 and T053). Check each `tasks.md` checkbox before assuming something is done.

## Rules for any change

1. **Spec is the source of truth.** Before editing code read the feature's `spec.md`, `plan.md`, `data-model.md` and `contracts/`. Honor the functional requirements (`FR-*`), success criteria (`SC-*`) and the decisions in `research.md`.
2. **Document first, then implement.** A change of behavior, scope or a prior decision goes into the spec files first; on a real fork ask the user before touching code. Code never runs ahead of the spec.
3. **Keep plan and code in sync both ways.** When a task's code moves or its scope changes, update that line of `tasks.md` (and its `[SKILL: <name>]` annotation). Update `plan.md`'s project structure and `FEATURES.md` when a feature's shape or state changes.
4. **Stay within the structure.** Keep the Spec Kit layout per feature (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`, `checklists/`). Add a feature with `/speckit-specify`.
5. **Constitution first.** `.specify/memory/constitution.md` is canonical. Amend it with `/speckit-constitution`, never by drift.
6. **Verify the commercetools API surface** with the `commercetools-knowledge` MCP (`commercetools-graphql-validate`, `commercetools-graphql-schemata`) before writing a query, and load the matching `commercetools-*` skill (`commercetools-connect` for the app and deployment, `commercetools-platform` for GraphQL shapes). Tasks carry `[SKILL: <name>]`.

Docs: [`docs/MODERATION-FLOW.md`](./docs/MODERATION-FLOW.md) holds the state graph and flow diagrams; update it with any change to states, transitions or the read/write flow.

Seeding the project's review states: `scripts/seed-review-states.mjs` (dry run by default, `--apply` to write; needs its own `manage_states` API client, see `docs/SETUP.md` section 1). Change the state graph in `docs/MODERATION-FLOW.md` first, then in the script. `scripts/seed-reviews.mjs` creates random sample reviews (keys `seed-review-NNN`, dry run by default); both scripts share `scripts/ctp.mjs` and are tested with `node --test scripts/*.test.mjs`.

## Layout

The repository root holds `connect.yaml`, `netlify.toml`, `.env.example`, `specs/` (Spec Kit), `docs/`, `FEATURES.md` and `README.md`. The application is the **`mc-reviews-and-ratings-app/`** subdirectory, its own npm project (no workspaces): Connect requires each `deployAs` name to match a root-level folder and builds from inside it. **Run every command from inside `mc-reviews-and-ratings-app/`.**

## Commands (once the app exists)

```shell
npm install                 # postinstall generates the Nimbus theme types
npm start                   # mc-scripts dev server
npm run build               # production build
npm test                    # jest (jest.test.config.js)
npm test -- path/to/file.spec.tsx
npm run lint                # eslint, prettier rules included
npm run format              # prettier --write
npm run typecheck           # tsc --noEmit
npm run extract-intl        # messages (English defaults) into src/i18n/data/core.json, copied to en.json
npm run generate-types:ctp  # interactive browser login, then graphql-codegen; do not run headless
```

CI (`.github/workflows/ci.yml`) runs build, lint, typecheck and test on PRs into `main`.

`generate-types:ctp` runs `scripts/login.js` (opens a browser) and then `graphql-codegen`, which writes `schemas/ctp.json` and the generated types. There is no `documents:` config: `.graphql` operation files are not validated by codegen. Validate them with `graphql`'s `parse`/`validate` against `schemas/ctp.json` or with the `commercetools-knowledge` MCP.

## Architecture

- **Merchant Center custom application** on Nimbus (`@commercetools/nimbus`, never `commercetools-uikit`), React 19, deployed via Connect (production) or Netlify (development, preview) from the same bundle. Entry point path `comments`.
- **Scaffold** with `@commercetools-frontend/create-mc-app` (not `@commercetools/create-mc-app`). The template ships `@commercetools-uikit/*`: add Nimbus, wrap the app in `NimbusProvider` and remove the template's UI Kit demo code instead of leaving two component libraries.
- **No server tier, no own commercetools client.** Data goes through the Merchant Center GraphQL proxy (`ctp` target, `GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM`) with `useMcQuery` / `useMcMutation` from `@commercetools-frontend/application-shell` (not `application-shell-connectors`), under the signed-in user's own permissions.
- **A comment is a commercetools `Review`**, moderated through `ReviewState` States (default keys `pending-approval`, `approved`, `rejected`; the `ReviewIncludedInStatistics` role marks the state that counts toward the product rating). The app creates and deletes nothing: it reads reviews and runs `transitionState`. The offered actions are always the review's own `state.transitions`, never a hardcoded graph (constitution IX).
- **Connectors** follow the shape in the constitution (`src/hooks/use-<feature>-connector/`: `.graphql` files, `fragments/`, `<feature>-connector.ts`, `conversion.ts`, `index.ts`). Updates return the same shape as the detail fetch so Apollo's cache updates in place; no `refetch()` after a same-entity update. Mutations go through `graphQLErrorHandler` (`src/hooks/shared/error-handling.ts`).
- **Configuration** has no per-project values; `src/constants.ts` is the only file that reads `process.env` (guarded by `src/env-guard.spec.ts`).
- **Rules from the constitution**: View/Manage with controls disabled, never hidden; every UI string through react-intl in English and German (`messages.ts` next to the component holds the English defaults, `src/i18n/data/core.json` is extracted from them (and copied to `en.json`), `src/i18n/data/de.json` holds the German texts; run `npm run extract-intl`, add German by hand, diff the key sets and placeholders programmatically; `extract-intl`'s glob must exclude `*.d.ts`); updates send the current `version` and make no call when nothing changed; every outcome notifies through the MC notification system.
- **Components** are arrow functions typed with `FC`, props in a `type <Name>Props` above them: `const CommentRow: FC<CommentRowProps> = ({ comment }) => { ... };` (define a component before the one that uses it; default exports as `export default Name;` after the definition).

## Testing

- Jest preset `@commercetools-frontend/jest-preset-mc-app/typescript` plus Nimbus fixes: `jest.setup.nimbus.js` (polyfills `ResizeObserver` etc.) and `jest.resolver.js` (Nimbus CJS packaging bug, ESM-only transitive deps).
- Component tests mock the GraphQL layer with `msw` (`setupServer`, `graphql.query`, `graphql.mutation`, `onUnhandledRequest: 'error'`), never the connector hooks. Capture mutation variables in the handler and assert the update actions sent. Pure logic (conversions, update actions, column definitions via `createIntl`, `graphQLErrorHandler`) has plain unit specs next to the source.
- Nimbus `Select` has no `isReadOnly`, and `isDisabled` on `Select.Root` inside a `FormField` is overridden by the field's state: put `isDisabled` on `FormField.Root` and assert `disabled`.
- Nimbus injects a theme-bootstrapping `<script>` into the render container: assert through `screen`, not `container.textContent`.
- Lookup queries that only feed validation use `fetchPolicy: 'no-cache'` so a narrow selection does not overwrite what the open page cached.

## Environment notes

- `mc-reviews-and-ratings-app/.env` is tracked and holds only non-secret build flags: `ENABLE_NEW_JSX_TRANSFORM="true"` (without it the build succeeds and the browser fails with "React is not defined"; a spec guards it), `FAST_REFRESH`, `ENTRY_POINT_URI_PATH`. Per-project values go into `.env.local` (copy of `.env.example`, gitignored, wins).
- `MC_API_URL` / `MC_ACCESS_TOKEN` for codegen come from `~/.commercetools/mc-credentials.json` (written by `mc-scripts login`), not from `.env`.
- `tsconfig` `typeRoots` includes `@types-extensions`; TypeScript loads every folder in a type root, so a stray empty folder there aborts `tsc` with `Cannot find type definition file`.
- Behind a TLS-inspecting proxy run npm with `NODE_OPTIONS=--use-system-ca`.
- Docs screenshots: `mc-reviews-and-ratings-app/scripts/screenshots/` (own npm project, Playwright, see its README) regenerates `docs/screenshots/*.png`. `npm run login` (headed, manual Merchant Center login, needs `npm start` running on port 3001) saves a gitignored `auth-state.json`; `npm run capture` then runs headless against the dev server and needs the seeded sample reviews. It only navigates and selects (nothing is moved to another state), and hides the signed-in user's picture. Chromium runs with `--disable-features=ViewTransition,ViewTransitionOnNavigation`, otherwise every screenshot times out. Behind a TLS-inspecting proxy install with `NODE_OPTIONS=--use-system-ca npm install`.
