/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type FC,
  type ReactNode,
} from 'react';
import {
  DEFAULT_QUERY,
  queryReducer,
  type QueryAction,
  type QueryState,
} from '../domain/query-state';

type QueryContextValue = {
  query: QueryState;
  dispatch: Dispatch<QueryAction>;
};

const QueryContext = createContext<QueryContextValue | null>(null);

type CommentsQueryProviderProps = {
  children: ReactNode;
  initial?: QueryState;
};

/**
 * Holds page, size, state filter, search and sort above the list and the
 * detail panel, so they survive opening and closing a comment (FR-018).
 */
const CommentsQueryProvider: FC<CommentsQueryProviderProps> = ({
  children,
  initial = DEFAULT_QUERY,
}) => {
  const [query, dispatch] = useReducer(queryReducer, initial);
  const value = useMemo(() => ({ query, dispatch }), [query]);
  return (
    <QueryContext.Provider value={value}>{children}</QueryContext.Provider>
  );
};

export const useCommentsQuery = (): QueryContextValue => {
  const value = useContext(QueryContext);
  if (!value) {
    throw new Error('useCommentsQuery needs a CommentsQueryProvider');
  }
  return value;
};

export { CommentsQueryProvider };
