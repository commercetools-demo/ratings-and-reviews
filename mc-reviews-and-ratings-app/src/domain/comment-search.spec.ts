/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { Comment } from '../types/comment';
import { DEFAULT_SORT } from './query-state';
import {
  matchesSearch,
  normalize,
  pageOf,
  searchComments,
  sortComments,
} from './comment-search';

const comment = (overrides: Partial<Comment>): Comment => ({
  id: 'c',
  version: 1,
  title: '',
  text: '',
  rating: null,
  locale: 'en',
  authorName: null,
  customerEmail: null,
  productName: null,
  includedInStatistics: false,
  createdAt: '2026-10-01T00:00:00.000Z',
  lastModifiedAt: '2026-10-01T00:00:00.000Z',
  state: null,
  transitions: [],
  ...overrides,
});

describe('search', () => {
  const anna = comment({
    id: 'a',
    authorName: 'Anna Müller',
    title: 'Lovely',
    text: 'Café quality',
  });
  const bob = comment({
    id: 'b',
    authorName: null,
    title: 'Meh',
    text: 'Broke after a week',
  });

  it('matches reviewer, title and text, ignoring case and accents', () => {
    expect(matchesSearch(anna, 'muller')).toBe(true);
    expect(matchesSearch(anna, 'LOVELY')).toBe(true);
    expect(matchesSearch(anna, 'cafe')).toBe(true);
    expect(matchesSearch(anna, 'week')).toBe(false);
  });

  it('needs every word to match', () => {
    expect(matchesSearch(bob, 'broke week')).toBe(true);
    expect(matchesSearch(bob, 'broke month')).toBe(false);
  });

  it('matches everything for an empty term', () => {
    expect(searchComments([anna, bob], '  ')).toEqual([anna, bob]);
  });

  it('normalizes accents', () => {
    expect(normalize('Crème Brûlée')).toBe('creme brulee');
  });
});

describe('sortComments', () => {
  const items = [
    comment({
      id: '1',
      rating: 3,
      authorName: 'bea',
      createdAt: '2026-10-02T00:00:00.000Z',
    }),
    comment({
      id: '2',
      rating: null,
      authorName: null,
      createdAt: '2026-10-03T00:00:00.000Z',
    }),
    comment({
      id: '3',
      rating: 5,
      authorName: 'Anna',
      createdAt: '2026-10-01T00:00:00.000Z',
    }),
  ];
  const ids = (list: Comment[]) => list.map((c) => c.id);

  it('sorts by date in both directions', () => {
    expect(ids(sortComments(items, DEFAULT_SORT))).toEqual(['2', '1', '3']);
    expect(
      ids(sortComments(items, { key: 'createdAt', direction: 'asc' }))
    ).toEqual(['3', '1', '2']);
  });

  it('puts missing ratings last in either direction', () => {
    expect(
      ids(sortComments(items, { key: 'rating', direction: 'desc' }))
    ).toEqual(['3', '1', '2']);
    expect(
      ids(sortComments(items, { key: 'rating', direction: 'asc' }))
    ).toEqual(['1', '3', '2']);
  });

  it('sorts reviewers ignoring case, unnamed last', () => {
    expect(
      ids(sortComments(items, { key: 'authorName', direction: 'asc' }))
    ).toEqual(['3', '1', '2']);
  });
});

describe('pageOf', () => {
  it('slices a page', () => {
    expect(pageOf([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(pageOf([1, 2, 3], 3, 2)).toEqual([]);
  });
});
