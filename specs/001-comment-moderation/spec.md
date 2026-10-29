# Feature Specification: Comment Moderation

**Feature Branch**: `001-comment-moderation`

**Created**: 2026-10-29

**Status**: Draft

**Input**: User description: "Build a Merchant Center custom application, entry point 'comments', using the Nimbus design system, that lets business users moderate product review comments. Comments have three moderation states: Pending approval, Approved, Rejected. A moderator moves Pending approval to Approved or Rejected, and back and forth between Approved and Rejected. List all comments, filter by state with live counts, search, sort, a detail view per comment, bulk actions, graceful fallbacks, conflict handling, View/Manage permissions, English and German."

## Clarifications

### Session 2026-10-29

- Q: Load all comments and filter/search/sort in the browser, or page, search and sort on the server? → A: Server-side paging, search, sorting and filtering, with per-state counts from separate count queries.
- Q: After a state change, does a comment that no longer matches the active state tab leave the list at once or stay until refresh? → A: It leaves the list at once and the counts update; a notification confirms the change.
- Q: Does a comment's detail open as a side panel or as its own page with an address? → A: A side panel over the list with no address of its own; the list's page, filter, search and ordering stay as they are.
- Q: Which States do the bulk buttons target? → A: One button per non-initial ReviewState, named after the project's State (by default "Approved" and "Rejected").
- Q: What if a review's State has no transitions set? → A: The API then allows any transition, so the other ReviewState States are offered; an empty list offers nothing.
- Q: The server cannot match partial text in reviews; how does search work? → A: Capped client-side search: while a search term is entered, the app loads up to 500 comments of the active state filter (newest first), filters them in the browser and shows a notice when more exist. Paging, sorting, state filter and counts stay server-side.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See what needs attention (Priority: P1)

A business user opens the app and immediately sees every customer comment left on a product, how many are waiting for a decision, and can narrow the list to the comments in one state.

**Why this priority**: It is the entry point of the app and the only way a business user gets visibility into pending comments. It delivers value on its own, before any decision can be made.

**Independent Test**: Open the app and confirm it lists real comments with their current state and a count per state, and that selecting a state narrows the list to that state.

**Acceptance Scenarios**:

1. **Given** the app is opened, **When** it loads, **Then** it shows every comment with at least its title or text preview, who wrote it, the product, its star rating, its language, when it was submitted and its current state.
2. **Given** comments in more than one state, **When** the user views the app, **Then** they see a count per state and an "all" view showing every comment.
3. **Given** the user selects a state, **When** the list updates, **Then** only comments in that state are shown and the counts stay visible and accurate.
4. **Given** no comments exist, **When** the app loads, **Then** a clear message says there is nothing to moderate yet.
5. **Given** the comments cannot be loaded, **When** the app loads, **Then** an error is shown with a way to retry, not a blank screen.

---

### User Story 2 - Decide on a comment (Priority: P2)

A business user opens one comment, reads it in full and decides to approve or reject it, or, if already decided, reverses the decision.

**Why this priority**: This is the purpose of the app. It ranks below the list only because it needs the list to select a comment from.

**Independent Test**: Open a comment's detail, confirm full text and context are shown, choose a state change and confirm the state updates correctly.

**Acceptance Scenarios**:

1. **Given** a comment in "Pending approval", **When** the user opens its detail, **Then** they see its full text, rating, reviewer name and contact, product, language, submission time, last-changed time, whether it counts toward the product's overall rating, and may approve or reject it.
2. **Given** the user applies a state change, **When** it succeeds, **Then** the comment shows its new state everywhere (list, counts, detail) without a manual refresh, and a success notification appears.
3. **Given** a comment in "Approved", **When** its detail is opened, **Then** only "reject" is offered, never "approve" and never "back to Pending approval".
4. **Given** a comment in "Rejected", **When** its detail is opened, **Then** only "approve" is offered.
5. **Given** the detail is closed without a choice, **When** the user returns to the list, **Then** the comment's state is unchanged.
6. **Given** a user without Manage permission, **When** they open a detail, **Then** the comment is readable and the action buttons are shown disabled, not hidden.

---

### User Story 3 - Find a specific comment quickly (Priority: P3)

A business user searches or reorders a long list to find a comment, for example one from a particular reviewer or the lowest-rated recent ones.

**Why this priority**: Valuable as volume grows; the app is usable without it for a few comments.

**Independent Test**: Type a term matching a known comment's reviewer, title or text and confirm only matches remain; reorder by date, rating and reviewer and confirm the order, including reversal.

**Acceptance Scenarios**:

1. **Given** a list of comments, **When** the user types a term matching a reviewer name, title or text, **Then** only matching comments are shown, combined with any active state filter.
2. **Given** a search or filter that matches nothing, **When** the result is shown, **Then** a "no matches" message offers a way to clear search and filter.
3. **Given** a list, **When** the user orders by submission date, rating or reviewer, **Then** the list re-orders, and choosing the same ordering again reverses its direction.

---

### User Story 4 - Moderate several comments at once (Priority: P4)

A business user selects several comments and applies the same decision (approve, or reject) to all of them in one action.

**Why this priority**: An efficiency gain for busy days; every outcome is already possible one by one via User Story 2.

**Independent Test**: Select several comments, apply a bulk action and confirm every selected comment updates and the selection clears.

**Acceptance Scenarios**:

1. **Given** one or more selected comments, **When** the user applies "approve" or "reject", **Then** every selected comment that can move to that state does, regardless of its starting state.
2. **Given** a bulk action has finished, **When** the user looks at the list, **Then** the selection is cleared and counts and list reflect the new states.
3. **Given** no selection, **When** the user views the list, **Then** no bulk-action controls are shown.
4. **Given** a bulk action where some comments fail, **When** it finishes, **Then** the user is told how many succeeded and how many failed, and the failed ones stay selected or are identifiable.
5. **Given** a user without Manage permission, **When** they select comments, **Then** the bulk-action controls are disabled, not hidden.

---

### Edge Cases

- A comment's product no longer exists or cannot be found: the comment still displays, with a fallback label instead of the product name.
- A comment has no reviewer name: a generic fallback label is shown.
- A comment has no star rating: a neutral "not rated" indication is shown.
- Two users change the same comment at nearly the same time: the second action is told the comment has already changed and is shown its current state; nothing is silently overwritten.
- A bulk action includes comments already in the target state: they are left as they are and the action does not fail because of them.
- A search runs while the active state filter has more than 500 comments: the result covers the 500 newest and a notice says so.
- A comment has no state: it shows a "No state" label and may only move to an initial state.
- The list is paged beyond the platform's limit of 10,000 results: paging stops there and a notice says to narrow the filter.
- A comment has no available transitions: the detail shows no action buttons rather than guessing.
- The project's states are named in a language the user's locale lacks: a readable fallback label is shown.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST list every product review comment with at least: title and text (or a preview), reviewer name and contact identifier, product, star rating, written language, submission time and current moderation state.
- **FR-002**: System MUST treat the project's review moderation states as given project data; by default these are "Pending approval", "Approved" and "Rejected". The app creates, edits and deletes neither states nor comments.
- **FR-003**: System MUST allow narrowing the list to a single state or all states, and MUST show a live, accurate count per state for the whole project, not only for the page on screen.
- **FR-004**: System MUST allow searching by reviewer name, comment title or comment text (partial, case-insensitive), combinable with the state filter. Search covers up to the 500 newest comments of the active state filter; when more exist the app MUST say that the search is limited and how to narrow it (state filter).
- **FR-005**: System MUST allow ordering by submission date, star rating or reviewer name, in either direction, with a way to reverse the current ordering; the ordering applies to all comments, not only the page on screen.
- **FR-006**: System MUST provide a detail view per comment, opened as a side panel over the list (no separate page), showing its complete text, star rating, reviewer name and contact identifier, product, language, submission time, last-changed time, whether it counts toward the product's overall rating, and its current state.
- **FR-007**: System MUST offer, per comment, exactly the state changes the project allows from its current state (read from the comment itself, not assumed). By default "Pending approval" may become "Approved" or "Rejected", "Approved" may become "Rejected", "Rejected" may become "Approved", and no comment returns to "Pending approval". When a state defines no transitions, the project allows any, so every other review state is offered; when it defines an empty list, nothing is offered. A comment with no state may only move to an initial state.
- **FR-008**: A state change MUST take effect immediately and be reflected everywhere the comment appears (list, counts, detail) without a manual refresh. A comment that no longer matches the active state filter MUST leave the list at once, and the per-state counts MUST update.
- **FR-009**: System MUST let a user select several comments on the current page and apply one target state to all of them in one action. The bulk bar offers one action per non-initial review state, named after the state. Comments already in the target state, or for which the target is not allowed, are left unchanged and counted as skipped; failures are reported per count and the failed comments stay selected.
- **FR-010**: System MUST show a clear message, with a way to reset search and filter, when nothing matches, and a distinct message when there are no comments at all.
- **FR-011**: System MUST indicate per comment whether it currently counts toward its product's overall rating.
- **FR-012**: Access MUST follow the Merchant Center permission model: viewing requires View permission; every state change requires Manage permission. Without Manage, state-change controls MUST be shown disabled, never hidden. The app introduces no login or role system of its own.
- **FR-013**: System MUST degrade gracefully, with a fallback label, when a comment lacks a product, reviewer name or rating.
- **FR-014**: System MUST detect when a comment changed since it was loaded, surface this clearly, and show the current state instead of overwriting the other change.
- **FR-015**: Every success and failure of a state change MUST be reported to the user in readable language, never as a raw error.
- **FR-016**: All text in the app MUST be available in English and German; product and state names follow the user's data locale.
- **FR-017**: System MUST show a loading indication while comments load and an error with a retry when loading fails.
- **FR-018**: The list MUST be paginated with a selectable page size; page, size, state filter, search and ordering MUST survive opening a comment and closing the detail.

### Key Entities

- **Comment**: A shopper's star rating and written text about one product. Carries author, language, submission and last-changed time, current moderation state and whether it counts toward the product's rating. A product can have any number of comments in any mix of states.
- **Moderation State**: One of "Pending approval", "Approved" or "Rejected", each with its allowed next states. Defined in the project, outside this app.
- **Product**: The item a comment is about; identified for display only.
- **Business User**: A Merchant Center user with access to the app; identity and permissions come from the Merchant Center.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A business user sees how many comments wait for a decision the moment the app opens, without searching or filtering.
- **SC-002**: A user can narrow the list by state or search by reviewer, title or text and see updated results without a page reload.
- **SC-003**: A user can change one comment's state in two actions or fewer from the list (open detail, choose action).
- **SC-004**: A user can apply one decision to many comments in a single action.
- **SC-005**: 100% of the state changes offered to a user are valid ones; the app never offers a change the project does not allow.
- **SC-006**: 0% of comments with missing product, reviewer name or rating produce a broken or blank row or detail view.
- **SC-007**: A state change is visible everywhere in the app within 2 seconds, with no manual refresh.
- **SC-008**: Without Manage permission, 100% of state-change controls are visible and disabled.
- **SC-009**: With thousands of comments, the first page and the state counts appear within 3 seconds.

## Assumptions

- Comments are commercetools product reviews and the three states and their allowed transitions already exist in the project (created by the storefront and by project setup); this feature is the moderation interface only.
- A "business user" is an existing Merchant Center user; access is granted through the Merchant Center's team and permission system.
- Only signed-in customers can submit comments, so every comment normally has an author; the app still degrades gracefully when it does not.
- Selection for bulk actions applies to the comments on the current page (in search mode, the current page of the search result). Paging, state filtering, ordering and counts are done by the server (the platform cannot match partial text, so search is the capped exception above), so the app works at any comment volume; selection for bulk actions applies to the comments on the current page.
- Scope is product review comments only, not other content.
- "Last changed" is the review's last-modified time; no separate audit trail is in scope.
- Names of products and states are shown in the user's data locale, falling back to another available language.
- The visual layout follows a reference moderation design (state tabs with counts, sortable table, selection with bulk bar, detail drawer over the list); exact choices beyond that are for planning.
- Out of scope: creating, editing or deleting comments; editing the state graph; replying to comments; notifying reviewers.
