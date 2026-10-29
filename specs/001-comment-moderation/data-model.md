# Data Model: Comment Moderation

The app owns no data. Every entity is a commercetools resource read through the Merchant Center GraphQL proxy; the only write is `transitionState` on a Review. In-memory UI state: active state tab, search term, sort, page and size, selection.

## Review (read, transitioned; never created or deleted here)

`Review` fields used: `id`, `version`, `title?`, `text?`, `rating?: Int`, `locale?`, `authorName?`, `includedInStatistics: Boolean!`, `createdAt`, `lastModifiedAt`, `customer?{ id email firstName lastName }`, `target?` (Product), `state?{ id key name transitions }`.

App boundary type (`src/types/comment.ts`):

```ts
export type CommentState = { id: string; key: string; label: string };
export type Comment = {
  id: string;
  version: number;
  title: string;                // '' when null
  text: string;                 // '' when null
  rating: number | null;        // null → "not rated"
  locale: string | null;
  authorName: string | null;    // fallback chain in conversion.ts, label added by the component
  customerEmail: string | null;
  productName: string | null;   // null → "Unavailable product" label
  includedInStatistics: boolean;
  createdAt: string;
  lastModifiedAt: string;
  state: CommentState | null;   // null → "No state"
  transitions: CommentState[];  // exactly state.transitions, never derived elsewhere
};
```

Rules:
- Offered actions = `transitions`. `conversion.ts` expands an unset (`null`) `state.transitions` to the other ReviewState States; `[]` offers nothing; a review without a state gets the initial States.
- A bulk action's target is a State id; a review takes part only if the target is in its `transitions`.
- `version` is the value last read for that review; replaced by each successful mutation response.

## ReviewState (read-only)

`State` with `type = ReviewState`: `id`, `key`, `initial`, `roles` (`ReviewIncludedInStatistics`), `name(locale)`, `transitions{ id key }`. Read once per session (`ReviewStates`) to build the state tabs (initial first, then creation order). Never modified here.

## Counts

`Record<stateId | 'all', number>` from `reviews(where, limit: 0){ total }`; refreshed after each transition (single or bulk) and on tab changes.

## List query state (URL-independent, kept in a React context so it survives opening and closing the detail panel)

| Field | Values | Default |
|---|---|---|
| `stateId` | state id or `all` | `all` |
| `search` | string | `''` |
| `sort` | `createdAt` \| `rating` \| `authorName` + `asc`\|`desc` | `createdAt desc` |
| `page`, `pageSize` | 1.., 20\|50\|100 | 1, 20 |
| `selection` | set of review ids on the current page | empty |

Search active (`search !== ''`) switches the list to the capped path (research R3): fetch ≤ 500, filter and sort locally, `page` applies to the local result.

## Customer, Product (read-only display context)

Only `customer.email/firstName/lastName` and `Product.masterData.current.name` are read.
