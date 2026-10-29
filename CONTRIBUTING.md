# Contributing

This is **AS IS and UNSUPPORTED** reference code (see [`SUPPORT.md`](./SUPPORT.md)). Issues and pull requests are welcome but may not be answered.

## How the project works

It is built spec-first with [GitHub Spec Kit](https://github.com/github/spec-kit). The constitution (`.specify/memory/constitution.md`) holds the rules, `specs/001-comment-moderation/` the specification, plan and tasks, and [`CLAUDE.md`](./CLAUDE.md) the working notes. A change of behavior goes into the spec files first, then into the code.

## Running it

```shell
cd mc-reviews-and-ratings-app
npm install
npm test            # jest, GraphQL layer mocked with msw
npm run lint
npm run typecheck
npm run build
npm start           # needs a Merchant Center project, see docs/SETUP.md
```

The seed scripts in `scripts/` have their own tests: `node --test scripts/*.test.mjs`.

## Pull requests

- Run build, lint, typecheck and tests (CI does the same on pull requests into `main`).
- Every UI text goes through react-intl with an English default (`messages.ts`) and a German text in `src/i18n/data/de.json`; run `npm run extract-intl`.
- Controls are disabled, never hidden, without Manage permission.
- New source files carry the SPDX header used by the existing ones; contributions are made under the MIT license of this repository.
- Never commit credentials: `.env.local` files are ignored; use `.env.example` files for placeholders.
