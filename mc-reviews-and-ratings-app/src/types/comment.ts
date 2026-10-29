/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

export type CommentState = { id: string; key: string; label: string };

/** A project review state, as read from the `states` resource. */
export type ReviewStateInfo = CommentState & { initial: boolean };

export type Comment = {
  id: string;
  version: number;
  /** '' when the review has no title. */
  title: string;
  /** '' when the review has no text. */
  text: string;
  /** null means "not rated". */
  rating: number | null;
  locale: string | null;
  /** Reviewer name; the fallback label is added by the component. */
  authorName: string | null;
  customerEmail: string | null;
  /** null means "unavailable product". */
  productName: string | null;
  includedInStatistics: boolean;
  createdAt: string;
  lastModifiedAt: string;
  /** null means the review has no state. */
  state: CommentState | null;
  /** The states this review may move to; never derived anywhere else. */
  transitions: CommentState[];
};
