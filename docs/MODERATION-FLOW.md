# Comment moderation: states and flow

How a comment travels from a shopper's submission to a decision, which states exist, and how the Reviews and Ratings app reads and changes them. The state model follows the commercetools [review approval process](https://docs.commercetools.com/guides/review-ratings#review-approval-process), extended by a `rejected` state. Setup of the states: [`SETUP.md`](./SETUP.md), behavior: [`../FEATURES.md`](../FEATURES.md), specification: [`../specs/001-comment-moderation/spec.md`](../specs/001-comment-moderation/spec.md).

## 1. The states

A comment is a commercetools **Review**. Its moderation state is a **State** of type `ReviewState`. They belong to the project, not to the app.

| Key | Shown as | Initial | Role | May move to | Counts toward the product rating |
|---|---|---|---|---|---|
| `pending-approval` | Pending approval | yes | none | Approved, Rejected | no |
| `approved` | Approved | no | `ReviewIncludedInStatistics` | Rejected | yes |
| `rejected` | Rejected | no | none | Approved | no |

A comment never goes back to *Pending approval* once it has left it. Whether a review counts toward its product's rating (`includedInStatistics`) follows from the role of the state it moves to.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> PendingApproval: shopper submits a review
    PendingApproval: Pending approval
    Approved: Approved - counts toward the rating
    Rejected: Rejected
    PendingApproval --> Approved: approve
    PendingApproval --> Rejected: reject
    Approved --> Rejected: reject
    Rejected --> Approved: approve
```

The app does **not** hardcode this graph. Each comment offers exactly the transitions it reads from its own state (`state.transitions`), and the tabs are the project's `ReviewState` States. A project with other names or another graph works without a code change.

| The comment's state has ... | The app offers |
|---|---|
| transitions set, for example `[approved, rejected]` | exactly those |
| an empty list `[]` | nothing |
| no transitions set (the platform then allows any) | every other review state |
| no state at all | the initial state(s) |

## 2. The app at a glance

```mermaid
flowchart LR
    subgraph Storefront
        S[Shopper writes a review]
    end
    subgraph Project[commercetools project]
        R[(Reviews)]
        ST[(Review States)]
    end
    subgraph MC[Merchant Center]
        subgraph App[Reviews and Ratings app]
            Q[Queue: state tabs, counts,<br/>paging, sort, search]
            D[Detail side panel]
            B[Bulk bar]
        end
        P[GraphQL proxy<br/>user's own permissions]
    end
    S -- "created in pending-approval" --> R
    Q -- "reviews, counts" --> P
    D -- "one review" --> P
    P --> R
    P --> ST
    Q -. opens .-> D
    Q -. selection .-> B
    D -- "transitionState" --> P
    B -- "transitionState per review" --> P
```

The app owns no data and no API client. Every read and write goes through the Merchant Center GraphQL proxy under the signed-in user's permissions.

## 3. What happens when someone moderates

### One comment

```mermaid
sequenceDiagram
    actor U as Moderator
    participant A as Reviews and Ratings app
    participant P as MC GraphQL proxy
    participant C as commercetools

    U->>A: open the queue
    A->>P: ReviewStates, CommentsList (page), CommentCount per tab
    P->>C: states, reviews (where, sort, limit, offset)
    C-->>A: states, page of reviews, totals
    U->>A: click a row
    A->>U: side panel with the full comment and one button per transition
    U->>A: "Move to Approved"
    A->>P: TransitionComment (id, version, stateId)
    P->>C: updateReview / transitionState
    alt version is current
        C-->>A: updated review (new state, version)
        A->>A: notify, refresh list and counts
        A->>U: comment leaves a tab it no longer matches
    else version is stale (changed by someone else)
        C-->>A: ConcurrentModification
        A->>A: notify "already changed", reload the comment
        A->>U: panel shows the current state, nothing overwritten
    end
```

### Several comments

```mermaid
flowchart TD
    A[Select rows on the page] --> B[Pick a target state<br/>one button per non-initial state]
    B --> C{For each selected comment:<br/>is the target in its transitions<br/>and not its current state?}
    C -- no --> D[skipped]
    C -- yes --> E[TransitionComment<br/>up to 4 at a time]
    E -- ok --> F[changed]
    E -- error --> G[failed]
    D --> H[Notification: N changed, M skipped, K failed]
    F --> H
    G --> H
    H --> I[Refresh list and counts<br/>failed comments stay selected]
```

### Where the list data comes from

```mermaid
flowchart LR
    T[State tab, sort,<br/>page, page size] --> L[CommentsList<br/>where, sort, limit, offset]
    T --> N[CommentCount per tab<br/>limit 0]
    X[Search term] -->|"loads up to 500<br/>of the active filter"| L2[CommentsList<br/>limit 500, newest first]
    L2 --> M[match reviewer, title, text<br/>sort and page in the browser]
```

Query predicates match exactly, so partial-text search cannot run on the server. Paging, sorting, the state filter and the counts stay on the server; search looks at the 500 newest comments of the active filter and says so when more exist.

## 4. Permissions

| Permission | Effect |
|---|---|
| View (`view_products`, `view_customers`, `view_states`) | the app renders; the queue and detail are readable |
| Manage (`manage_products`) | transitions work, single and bulk |
| View without Manage | every transition control is shown **disabled**, never hidden, and the page shows a "View only" badge |

## 5. Screenshots

| | |
|---|---|
| The queue with the state tabs and counts | ![The comment queue](./screenshots/list.png) |
| One state (Pending approval) | ![Pending approval tab](./screenshots/tab-pending.png) |
| The detail side panel with the allowed transitions | ![Detail side panel](./screenshots/detail.png) |
| Two comments selected, with the bulk bar | ![Bulk bar](./screenshots/bulk.png) |
| Search, and the no-match state with a way to reset | ![Search](./screenshots/search.png) |

They are regenerated with [`../mc-reviews-and-ratings-app/scripts/screenshots`](../mc-reviews-and-ratings-app/scripts/screenshots) and never change a comment.
