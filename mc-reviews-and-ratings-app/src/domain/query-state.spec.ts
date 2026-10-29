/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  DEFAULT_QUERY,
  lastReachablePage,
  queryReducer,
  toListVariables,
} from './query-state';

describe('query state', () => {
  it('starts on all comments, newest first, page 1 of 20', () => {
    expect(DEFAULT_QUERY).toMatchObject({
      stateId: 'all',
      search: '',
      sort: { key: 'createdAt', direction: 'desc' },
      page: 1,
      pageSize: 20,
    });
  });

  it('resets the page when the state, search, sort or size changes', () => {
    const onPage3 = { ...DEFAULT_QUERY, page: 3 };
    expect(
      queryReducer(onPage3, { type: 'selectState', stateId: 's1' }).page
    ).toBe(1);
    expect(queryReducer(onPage3, { type: 'search', search: 'x' }).page).toBe(1);
    expect(queryReducer(onPage3, { type: 'sort', key: 'rating' }).page).toBe(1);
    expect(queryReducer(onPage3, { type: 'pageSize', pageSize: 50 }).page).toBe(
      1
    );
  });

  it('sorts a new column in its first direction and reverses on the same column', () => {
    const byRating = queryReducer(DEFAULT_QUERY, {
      type: 'sort',
      key: 'rating',
    });
    expect(byRating.sort).toEqual({ key: 'rating', direction: 'desc' });
    expect(
      queryReducer(byRating, { type: 'sort', key: 'rating' }).sort
    ).toEqual({
      key: 'rating',
      direction: 'asc',
    });
    expect(
      queryReducer(DEFAULT_QUERY, { type: 'sort', key: 'authorName' }).sort
    ).toEqual({ key: 'authorName', direction: 'asc' });
  });

  it('keeps the page inside what the platform can page to', () => {
    expect(lastReachablePage(20)).toBe(500);
    expect(lastReachablePage(100)).toBe(100);
    expect(queryReducer(DEFAULT_QUERY, { type: 'page', page: 9999 }).page).toBe(
      500
    );
    expect(queryReducer(DEFAULT_QUERY, { type: 'page', page: 0 }).page).toBe(1);
  });

  it('builds paged variables with the state filter and sort', () => {
    expect(
      toListVariables({
        ...DEFAULT_QUERY,
        stateId: 'abc',
        sort: { key: 'rating', direction: 'asc' },
        page: 3,
        pageSize: 50,
      })
    ).toEqual({
      where: 'state(id = "abc")',
      sort: ['rating asc'],
      limit: 50,
      offset: 100,
    });
    expect(toListVariables(DEFAULT_QUERY).where).toBeUndefined();
  });

  it('loads up to the search cap, newest first, while searching', () => {
    expect(
      toListVariables({ ...DEFAULT_QUERY, search: 'anna', page: 4 })
    ).toEqual({
      where: undefined,
      sort: ['createdAt desc'],
      limit: 500,
      offset: 0,
    });
  });

  it('escapes quotes in a state id', () => {
    expect(toListVariables({ ...DEFAULT_QUERY, stateId: 'a"b' }).where).toBe(
      'state(id = "a\\"b")'
    );
  });

  it('reset keeps the page size', () => {
    expect(
      queryReducer(
        { ...DEFAULT_QUERY, search: 'x', pageSize: 100, page: 2 },
        { type: 'reset' }
      )
    ).toEqual({ ...DEFAULT_QUERY, pageSize: 100 });
  });
});
