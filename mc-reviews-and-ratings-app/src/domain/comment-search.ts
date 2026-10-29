/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { SortState } from './query-state';
import type { Comment } from '../types/comment';

/** Case- and accent-insensitive form of a text for matching. */
export const normalize = (text: string): string =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** A comment matches when every word of the term is in the reviewer, title or text. */
export function matchesSearch(comment: Comment, term: string): boolean {
  const words = normalize(term).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalize(
    [comment.authorName ?? '', comment.title, comment.text].join(' ')
  );
  return words.every((word) => haystack.includes(word));
}

export const searchComments = (comments: Comment[], term: string): Comment[] =>
  comments.filter((comment) => matchesSearch(comment, term));

/** Sorts like the server does for the paged list; missing values go last. */
export function sortComments(comments: Comment[], sort: SortState): Comment[] {
  const factor = sort.direction === 'asc' ? 1 : -1;
  const value = (comment: Comment): string | number | null =>
    sort.key === 'rating'
      ? comment.rating
      : sort.key === 'authorName'
      ? comment.authorName?.trim() || null
      : comment.createdAt;
  return [...comments].sort((a, b) => {
    const left = value(a);
    const right = value(b);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    if (typeof left === 'string' && typeof right === 'string') {
      return (
        factor * left.localeCompare(right, undefined, { sensitivity: 'base' })
      );
    }
    return factor * (Number(left) - Number(right));
  });
}

export const pageOf = <T>(items: T[], page: number, pageSize: number): T[] =>
  items.slice((page - 1) * pageSize, page * pageSize);
