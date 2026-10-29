/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import {
  useMcMutation,
  useMcQuery,
} from '@commercetools-frontend/application-shell';
import { SEARCH_CAP } from '../../constants';
import { planBulk, runBulk, type BulkResult } from '../../domain/bulk-plan';
import {
  pageOf,
  searchComments,
  sortComments,
} from '../../domain/comment-search';
import {
  ALL_STATES,
  isSearching,
  stateWhere,
  toListVariables,
} from '../../domain/query-state';
import type { Comment, ReviewStateInfo } from '../../types/comment';
import { useCommentsQuery } from '../query-state-context';
import { mcApiContext } from '../shared/mc-api-context';
import { useLocaleVariables } from '../use-review-states-connector';
import { toComment, type RawComment } from './conversion';
import CommentsListQuery from './fetch-all.graphql';
import CommentCountQuery from './count.graphql';
import CommentQuery from './fetch.graphql';
import TransitionMutation from './transition.graphql';

type CommentsListData = {
  reviews: { total: number; results: RawComment[] };
};

/** The comments of the current page (normal mode). */
export function useComments(states: ReviewStateInfo[]) {
  const { query } = useCommentsQuery();
  const localeVariables = useLocaleVariables();
  const variables = useMemo(
    () => ({ ...toListVariables(query), ...localeVariables }),
    [query, localeVariables]
  );
  const { data, loading, error, refetch } = useMcQuery<CommentsListData>(
    CommentsListQuery,
    {
      variables,
      context: mcApiContext,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );
  const searching = isSearching(query);
  const loaded: Comment[] = useMemo(
    () =>
      (data?.reviews.results ?? []).map((raw: RawComment) =>
        toComment(raw, states)
      ),
    [data, states]
  );
  // Search mode: the server returned the newest `SEARCH_CAP` comments of the
  // state filter; search, sort and page happen here (research R3).
  const searched = useMemo(
    () =>
      searching
        ? sortComments(searchComments(loaded, query.search), query.sort)
        : loaded,
    [searching, loaded, query.search, query.sort]
  );
  const comments = useMemo(
    () => (searching ? pageOf(searched, query.page, query.pageSize) : searched),
    [searching, searched, query.page, query.pageSize]
  );
  const serverTotal = data?.reviews.total ?? 0;
  return {
    comments,
    total: searching ? searched.length : serverTotal,
    /** More comments exist than the search could look at. */
    capped: searching && serverTotal > SEARCH_CAP,
    loading,
    error,
    hasData: Boolean(data),
    refetch: () => refetch(),
  };
}

export type CommentCounts = Record<string, number>;

/**
 * Live counts for the whole project: `all` and one per state, each a
 * `limit: 0` query (research R3).
 */
export function useCommentCounts(states: ReviewStateInfo[]) {
  const client = useApolloClient();
  const [counts, setCounts] = useState<CommentCounts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const stateKey = states.map((state) => state.id).join('|');

  const refresh = useCallback(async () => {
    const targets = [
      { id: ALL_STATES },
      ...(stateKey ? stateKey.split('|').map((id) => ({ id })) : []),
    ];
    try {
      const totals = await Promise.all(
        targets.map(async ({ id }) => {
          const result = await client.query<{ reviews: { total: number } }>({
            query: CommentCountQuery,
            variables: { where: stateWhere(id) },
            context: mcApiContext,
            fetchPolicy: 'network-only',
          });
          return [id, result.data.reviews.total] as const;
        })
      );
      setCounts(Object.fromEntries(totals));
      setError(null);
    } catch (countError) {
      setError(countError);
    } finally {
      setLoading(false);
    }
  }, [client, stateKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { counts, loading, error, refresh };
}

/** One comment with its customer details; the list's data shows meanwhile. */
export function useComment(id: string | null, states: ReviewStateInfo[]) {
  const localeVariables = useLocaleVariables();
  const { data, loading, error, refetch } = useMcQuery<{
    review: RawComment | null;
  }>(CommentQuery, {
    variables: { id, ...localeVariables },
    skip: id === null,
    context: mcApiContext,
    fetchPolicy: 'cache-and-network',
  });
  const comment = useMemo(
    () => (data?.review ? toComment(data.review, states) : null),
    [data, states]
  );
  return { comment, loading, error, refetch: () => refetch() };
}

/**
 * The only write of the app: `transitionState` with the version last read and
 * a target taken from the comment's own transitions. Resolves to the updated
 * comment; the mutation's response replaces the cached review in place.
 */
export function useTransitionComment(states: ReviewStateInfo[]) {
  const localeVariables = useLocaleVariables();
  const [mutate, { loading }] = useMcMutation<{ updateReview: RawComment }>(
    TransitionMutation,
    { context: mcApiContext }
  );
  const transition = useCallback(
    async (comment: Comment, stateId: string): Promise<Comment> => {
      const result = await mutate({
        variables: {
          id: comment.id,
          version: comment.version,
          stateId,
          ...localeVariables,
        },
      });
      return toComment(
        (result.data as { updateReview: RawComment }).updateReview,
        states
      );
    },
    [mutate, localeVariables, states]
  );
  return { transition, loading };
}

/** Moves many comments to one state: one transition each (research R6). */
export function useBulkTransition(states: ReviewStateInfo[]) {
  const { transition } = useTransitionComment(states);
  return useCallback(
    (comments: Comment[], targetStateId: string): Promise<BulkResult> =>
      runBulk(planBulk(comments, targetStateId), (comment) =>
        transition(comment, targetStateId)
      ),
    [transition]
  );
}
