# Contract: GraphQL operations (via the Merchant Center proxy)

No REST or BFF contract. All operations run through `useMcQuery` / `useMcMutation` from `@commercetools-frontend/application-shell`, `context: { target: GRAPHQL_TARGETS.COMMERCETOOLS_PLATFORM }`, under the signed-in user's permissions. Every document below was checked with `commercetools-graphql-validate` on 2026-10-29 (all `valid: true`). They live as `.graphql` files under `src/hooks/use-comments-connector/` and are re-validated against `schemas/ctp.json` in CI.

## Query `ReviewStates` (once per session)

```graphql
query ReviewStates($acceptLanguage: [Locale!]) {
  states(where: "type = \"ReviewState\"", limit: 50, sort: ["createdAt asc"]) {
    results {
      id
      key
      initial
      roles
      name(acceptLanguage: $acceptLanguage)
      transitions { id key }
    }
  }
}
```

## Query `CommentsList`

```graphql
query CommentsList($where: String, $sort: [String!], $limit: Int, $offset: Int, $acceptLanguage: [Locale!]) {
  reviews(where: $where, sort: $sort, limit: $limit, offset: $offset) {
    total
    count
    offset
    results {
      id
      version
      title
      text
      rating
      locale
      authorName
      includedInStatistics
      createdAt
      lastModifiedAt
      customer { id email firstName lastName }
      target {
        id
        ... on Product { masterData { current { name(acceptLanguage: $acceptLanguage) } } }
      }
      state {
        id
        key
        name(acceptLanguage: $acceptLanguage)
        transitions { id key name(acceptLanguage: $acceptLanguage) }
      }
    }
  }
}
```

Fields are split into a base fragment (columns of the list) and a detail fragment (adds `text`, `customer`, `lastModifiedAt`, `includedInStatistics`) per the constitution; the document above is the union for readability.

- `where`: `state(id = "<id>")` for a state tab, absent for all. `sort`: `["createdAt desc"]`, `["rating asc"]`, `["authorName desc"]`, …
- Normal mode: `limit` = page size, `offset` = (page-1) × size.
- Search mode: `limit: 500`, `offset: 0`, `sort: ["createdAt desc"]`; filtering and re-sorting happen in the browser (research R3).
- `acceptLanguage` is the MC `dataLocale` followed by the project's languages. A localized field takes exactly one of `locale` and `acceptLanguage` (the API answers `InvalidInput` otherwise, which the schema cannot express), so only `acceptLanguage` is used; it also gives the fallback through the project's languages. `graphql-documents.spec.ts` guards this.

## Query `CommentCount` (once per tab, `limit: 0`)

```graphql
query CommentCount($where: String) {
  reviews(where: $where, limit: 0) { total }
}
```

Run in parallel for `all` (no `where`) and every ReviewState tab; results cached by `where`.

## Mutation `TransitionComment`

```graphql
mutation TransitionComment($id: String!, $version: Long!, $stateId: String!, $acceptLanguage: [Locale!]) {
  updateReview(
    id: $id
    version: $version
    actions: [{ transitionState: { state: { typeId: "state", id: $stateId } } }]
  ) {
    id
    version
    lastModifiedAt
    includedInStatistics
    state { id key name(acceptLanguage: $acceptLanguage) transitions { id key name(acceptLanguage: $acceptLanguage) } }
  }
}
```

- `$stateId` comes from the review's own `transitions`. `force` is never sent.
- Bulk: this mutation once per eligible review, concurrency 4; per-review outcome `changed | skipped | failed`.
- Errors go through `graphQLErrorHandler`; `ConcurrentModification` → refetch the review and show the "already changed" notification (FR-014).

## Not used

No REST calls to `api.{region}.commercetools.com`; no `createReview`, `deleteReview`, `setText` or any other update action.
