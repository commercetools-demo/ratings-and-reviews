# Reviews and Ratings

> Freely available, **AS IS and UNSUPPORTED** reference code (MIT). See [`SUPPORT.md`](./SUPPORT.md) and [`LICENSE`](./LICENSE).

A Merchant Center custom application for moderating product review comments: list reviews by state, search and sort them, read one in detail and approve or reject it, singly or in bulk.

A comment is a commercetools Review; its moderation state is a `ReviewState` State. The app reads reviews and runs the `transitionState` update action through the Merchant Center GraphQL proxy. It owns no data and no API client.

![The comment queue](docs/screenshots/list.png)

- What the app does: [`FEATURES.md`](./FEATURES.md)
- Specification, plan and tasks: [`specs/`](./specs/)
- States and flow with diagrams: [`docs/MODERATION-FLOW.md`](./docs/MODERATION-FLOW.md)
- Setup, registration and both deploy paths: [`docs/SETUP.md`](./docs/SETUP.md)
- Project rules: [`.specify/memory/constitution.md`](./.specify/memory/constitution.md), working notes for Claude Code: [`CLAUDE.md`](./CLAUDE.md)
- The app will live in `mc-reviews-and-ratings-app/`, its own npm project (Connect requires the folder name to match `connect.yaml`).

```shell
cd mc-reviews-and-ratings-app
npm install
npm start
npm test
```

Contributing: [`CONTRIBUTING.md`](./CONTRIBUTING.md). Setting up your own project (states, sample reviews, registration): [`docs/SETUP.md`](./docs/SETUP.md).
