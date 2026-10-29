/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type {
  Comment,
  CommentState,
  ReviewStateInfo,
} from '../../types/comment';

type RawLocalized = string | null | undefined;

export type RawState = {
  id: string;
  key: string;
  name?: RawLocalized;
  transitions?: RawState[] | null;
};

export type RawComment = {
  id: string;
  version: number;
  title?: string | null;
  text?: string | null;
  rating?: number | null;
  locale?: string | null;
  authorName?: string | null;
  includedInStatistics: boolean;
  createdAt: string;
  lastModifiedAt: string;
  target?: {
    id: string;
    masterData?: { current?: { name?: RawLocalized } | null } | null;
  } | null;
  customer?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  state?: RawState | null;
};

const toState = (raw: RawState): CommentState => ({
  id: raw.id,
  key: raw.key,
  label: raw.name || raw.key,
});

const toPlain = ({ id, key, label }: ReviewStateInfo): CommentState => ({
  id,
  key,
  label,
});

/**
 * The states a review may move to, and only those:
 * - no state: the initial state(s);
 * - transitions unset (`null`): the platform allows any, so every other state;
 * - transitions set (also `[]`): exactly those, `[]` offers nothing.
 */
export function availableTransitions(
  raw: RawState | null | undefined,
  states: ReviewStateInfo[]
): CommentState[] {
  if (!raw) {
    return states.filter((state) => state.initial).map(toPlain);
  }
  if (raw.transitions == null) {
    return states.filter((state) => state.id !== raw.id).map(toPlain);
  }
  return raw.transitions.map((transition) => {
    const known = states.find((state) => state.id === transition.id);
    return known ? toPlain(known) : toState(transition);
  });
}

/** The name to show for the reviewer: the review's own, else the customer's. */
export function reviewerName(raw: RawComment): string | null {
  if (raw.authorName?.trim()) return raw.authorName.trim();
  const full = [raw.customer?.firstName, raw.customer?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
  return full || null;
}

export function toComment(raw: RawComment, states: ReviewStateInfo[]): Comment {
  return {
    id: raw.id,
    version: raw.version,
    title: raw.title ?? '',
    text: raw.text ?? '',
    rating: raw.rating ?? null,
    locale: raw.locale ?? null,
    authorName: reviewerName(raw),
    customerEmail: raw.customer?.email ?? null,
    productName: raw.target?.masterData?.current?.name || null,
    includedInStatistics: raw.includedInStatistics,
    createdAt: raw.createdAt,
    lastModifiedAt: raw.lastModifiedAt,
    state: raw.state ? toState(raw.state) : null,
    transitions: availableTransitions(raw.state, states),
  };
}

/** Languages to fall back through for localized names: data locale first. */
export const acceptLanguages = (
  dataLocale: string,
  projectLanguages: string[] = []
): string[] => [
  dataLocale,
  ...projectLanguages.filter((language) => language !== dataLocale),
];
