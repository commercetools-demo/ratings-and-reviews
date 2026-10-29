# Setting up Reviews and Ratings

Reviews and Ratings is a Merchant Center custom application. Registering it, installing it and giving teams access are manual steps in the Merchant Center. The app is built once and can be hosted on **Connect** (production) or **Netlify** (development, preview); both serve the same bundle and only environment variables differ.

> The application is not scaffolded yet; this describes the target setup. Check the scopes against `mc-reviews-and-ratings-app/custom-application-config.mjs` once it exists.

## 1. Prerequisites in the project (once per project)

The app moderates existing data and creates none (the flow is drawn in [`MODERATION-FLOW.md`](./MODERATION-FLOW.md)). The states follow the [review approval process](https://docs.commercetools.com/guides/review-ratings#review-approval-process) of the commercetools documentation, extended by a `rejected` state:

| Key | Name (en) | Initial | Role | Transitions to |
|---|---|---|---|---|
| `pending-approval` | Pending approval | yes | none | `approved`, `rejected` |
| `approved` | Approved | no | `ReviewIncludedInStatistics` | `rejected` |
| `rejected` | Rejected | no | none | `approved` |

All three have `"type": "ReviewState"`. Create them in this order with `POST /{projectKey}/states`. Give each a localized `name` **for every language of the project** (for example `en-GB` and `de-DE`, not just `en` and `de`): the app shows the name for the user's data locale, falls back through the project's languages, and shows the key (`pending-approval`) when none matches.

1. `approved` with `"roles": ["ReviewIncludedInStatistics"]` and `rejected` (no role, no transitions yet).
2. `pending-approval` with `"initial": true` and `transitions` to `approved` and `rejected` (ids from step 1).
3. `setTransitions` on `approved` (to `rejected`) and on `rejected` (to `approved`).

**Seed them with the script** `scripts/seed-review-states.mjs` (Node 22, no dependencies). It needs its own API client with the scopes `manage_states` and `view_states`; use neither the storefront's client nor a Merchant Center session. It is idempotent: it creates what is missing, gives every state a name for every language of the project (the translation of the base language, English otherwise; existing names are never overwritten), sets the transitions that differ, and only reports (never changes) a differing role or initial flag. It reads the project languages, so the client also needs `view_project_settings`.

```shell
cp scripts/.env.example .env.local   # repository root, gitignored; fill in the CTP_* values
# (or export them; CTP_REGION=gcp-eu|gcp-us|aws-eu|aws-us can replace the two URLs)
node scripts/seed-review-states.mjs            # dry run: prints the plan, writes nothing
node scripts/seed-review-states.mjs --apply    # creates the states and sets the transitions
node --test scripts/seed-review-states.test.mjs   # the script's own tests (no network)
```

Storefront reviews are created in `pending-approval` (`"state": {"key": "pending-approval"}`), so they do not count toward the product rating until approved. The app does not hardcode these keys: it offers exactly the transitions it reads from each review's own state, and shows one tab per `ReviewState` State of the project, so other names or graphs work too.

### Sample reviews (optional)

`scripts/seed-reviews.mjs` creates random reviews (rating, title, text, reviewer, English or German) on random existing products, to try out the app. It needs the states above and a client with `manage_products`, `view_products` and `view_states` (`CTP_SCOPES` overrides the default). Dry run by default.

```shell
node scripts/seed-reviews.mjs                    # dry run: counts per rating and state, writes nothing
node scripts/seed-reviews.mjs --apply            # 100 reviews, all in pending-approval
node scripts/seed-reviews.mjs --apply --spread   # also approves about 30 % and rejects about 15 %
node scripts/seed-reviews.mjs --count 250 --seed 7 --apply   # another amount; the same seed gives the same content
node scripts/seed-reviews.mjs --delete --apply   # removes only the reviews it created (key seed-review-NNN)
node --test scripts/                             # tests of both scripts (no network)
```

Seeded reviews have the key `seed-review-NNN`: a rerun only tops up to `--count`, and `--delete` never touches other reviews. The creation time cannot be set through the API, so all seeded reviews are dated now.

## 2. Register the application (Organization admin)

1. Merchant Center, profile icon, "Manage organizations & teams", the Organization, tab "Custom Applications", "Configure Custom Applications". Verify the contact email once.
2. "Add a Custom Application": name "Reviews and Ratings", entry point URI path `reviews-and-ratings`, main menu label "Reviews and ratings" (en) / "Bewertungen und Rezensionen" (de), and these OAuth scopes:
   - View: `view_products`, `view_customers`, `view_states`
   - Manage: `manage_products`

   Reviews and the product names are read under the products scopes, the reviewer's contact under `view_customers`. `view_states` is for the review states and their transitions; the plan (research R2) verifies on first run whether the proxy needs it and drops it if not. Use a placeholder Application URL until the first deploy. Note the Application ID (`CUSTOM_APPLICATION_ID`).
3. After the first deploy: set the Application URL, move the state to "Ready", install it for the project.
4. Teams: give moderators **Manage**, others **View**.

## 3a. Deploy on Connect (production)

1. `connect.yaml` in the repository root holds one application `mc-reviews-and-ratings-app` of type `merchant-center-custom-application`; the folder `mc-reviews-and-ratings-app/` matches that name.
2. Create the Connect deployment with the standard configuration `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH` (default `reviews-and-ratings`), `INITIAL_PROJECT_KEY`, `CLOUD_IDENTIFIER` (`gcp-eu`, `gcp-us`, `aws-eu`, `aws-us`). Connect provides `APPLICATION_URL`.
3. Use the URL Connect gives the application as the Application URL.

## 3b. Deploy on Netlify (development, preview)

1. New site from the repository; `netlify.toml` sets base `mc-reviews-and-ratings-app`, build `npm run build`, publish `public`, Node 22, a rewrite of every path to the entry page and the header `X-Robots-Tag: noindex`.
2. Set the environment variables `CUSTOM_APPLICATION_ID`, `ENTRY_POINT_URI_PATH`, `APPLICATION_URL`, `INITIAL_PROJECT_KEY`, `CLOUD_IDENTIFIER`.
3. Do not put the site behind a password gate: the Merchant Center loads it through its own proxy.

## 4. Local development

```shell
cd mc-reviews-and-ratings-app
npm install            # also generates the Nimbus theme types
cp ../.env.example .env.local   # set INITIAL_PROJECT_KEY, CLOUD_IDENTIFIER, ...
npm start              # dev server, opens the Merchant Center
```

`npm run generate-types:ctp` (interactive browser login) must be run by a person, not in a headless job.

## 5. Permissions check

With View only, the queue and detail render and every transition control is disabled, not hidden. With Manage, transitions work. Without View, the app does not render.
