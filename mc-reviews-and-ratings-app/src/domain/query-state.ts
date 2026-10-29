/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  DEFAULT_PAGE_SIZE,
  MAX_OFFSET_RESULTS,
  SEARCH_CAP,
} from '../constants';

export type SortKey = 'createdAt' | 'rating' | 'authorName';
export type SortDirection = 'asc' | 'desc';
export type SortState = { key: SortKey; direction: SortDirection };

export const ALL_STATES = 'all';

export type QueryState = {
  /** A state id, or `all`. */
  stateId: string;
  search: string;
  sort: SortState;
  page: number;
  pageSize: number;
};

export const DEFAULT_SORT: SortState = { key: 'createdAt', direction: 'desc' };

export const DEFAULT_QUERY: QueryState = {
  stateId: ALL_STATES,
  search: '',
  sort: DEFAULT_SORT,
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
};

export type QueryAction =
  | { type: 'selectState'; stateId: string }
  | { type: 'search'; search: string }
  | { type: 'sort'; key: SortKey }
  | { type: 'page'; page: number }
  | { type: 'pageSize'; pageSize: number }
  | { type: 'reset' };

const FIRST_DIRECTION: Record<SortKey, SortDirection> = {
  createdAt: 'desc',
  rating: 'desc',
  authorName: 'asc',
};

export const isSearching = (query: QueryState): boolean =>
  query.search.trim() !== '';

/** The last page the platform lets us reach by offset. */
export const lastReachablePage = (pageSize: number): number =>
  Math.max(1, Math.floor(MAX_OFFSET_RESULTS / pageSize));

export function queryReducer(
  query: QueryState,
  action: QueryAction
): QueryState {
  switch (action.type) {
    case 'selectState':
      return { ...query, stateId: action.stateId, page: 1 };
    case 'search':
      return { ...query, search: action.search, page: 1 };
    case 'sort':
      return {
        ...query,
        page: 1,
        sort:
          query.sort.key === action.key
            ? {
                key: action.key,
                direction: query.sort.direction === 'asc' ? 'desc' : 'asc',
              }
            : { key: action.key, direction: FIRST_DIRECTION[action.key] },
      };
    case 'page':
      return {
        ...query,
        page: Math.min(
          Math.max(1, action.page),
          lastReachablePage(query.pageSize)
        ),
      };
    case 'pageSize':
      return { ...query, pageSize: action.pageSize, page: 1 };
    case 'reset':
      return { ...DEFAULT_QUERY, pageSize: query.pageSize };
  }
}

const quote = (value: string) => `"${value.replace(/["\\]/g, '\\$&')}"`;

export const stateWhere = (stateId: string): string | undefined =>
  stateId === ALL_STATES ? undefined : `state(id = ${quote(stateId)})`;

export type ListVariables = {
  where?: string;
  sort: string[];
  limit: number;
  offset: number;
};

/**
 * Variables of the list query. With a search term the app loads the newest
 * `SEARCH_CAP` comments of the state filter and searches them locally.
 */
export function toListVariables(query: QueryState): ListVariables {
  const where = stateWhere(query.stateId);
  if (isSearching(query)) {
    return { where, sort: ['createdAt desc'], limit: SEARCH_CAP, offset: 0 };
  }
  return {
    where,
    sort: [`${query.sort.key} ${query.sort.direction}`],
    limit: query.pageSize,
    offset: (query.page - 1) * query.pageSize,
  };
}
