/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { graphql } from 'msw';
import type {
  RawComment,
  RawState,
} from '../hooks/use-comments-connector/conversion';
import { GRAPH, REJECTED, RAW_STATES, APPROVED } from './fixtures';

type StateRecord = (typeof RAW_STATES)[number];

export type FakeBackendOptions = {
  reviews: RawComment[];
  states?: StateRecord[];
  /** state id -> allowed target ids; `null` means transitions unset. */
  graph?: Record<string, string[] | null>;
};

/** Captured by the handlers so specs can assert what the app sent. */
export type FakeBackend = ReturnType<typeof createFakeBackend>;

const stateIdFromWhere = (where?: string | null): string | undefined =>
  where?.match(/^state\(id = "(.*)"\)$/)?.[1];

/**
 * An in-memory stand-in for the Merchant Center GraphQL proxy: the operations
 * of `contracts/graphql-operations.md`, with the platform's version check.
 */
export function createFakeBackend(options: FakeBackendOptions) {
  const reviews = options.reviews.map((review) => ({ ...review }));
  const states = options.states ?? RAW_STATES;
  const graph = options.graph ?? GRAPH;
  const calls = {
    list: [] as Array<Record<string, unknown>>,
    count: [] as Array<Record<string, unknown>>,
    transition: [] as Array<Record<string, unknown>>,
  };
  const failures = new Set<string>();

  const withTransitions = (state: RawState | null | undefined) => {
    if (!state) return state;
    const targets = graph[state.id];
    return {
      ...state,
      transitions:
        targets === null || targets === undefined
          ? null
          : targets.map((id) => {
              const target = states.find((s) => s.id === id) as StateRecord;
              return { id: target.id, key: target.key, name: target.name };
            }),
    };
  };
  const out = (review: RawComment) => ({
    __typename: 'Review',
    ...review,
    target: review.target
      ? {
          __typename: 'Product',
          ...review.target,
          masterData: review.target.masterData
            ? {
                __typename: 'ProductCatalogData',
                ...review.target.masterData,
                current: review.target.masterData.current
                  ? {
                      __typename: 'ProductData',
                      ...review.target.masterData.current,
                    }
                  : null,
              }
            : null,
        }
      : null,
    customer: review.customer
      ? {
          __typename: 'Customer',
          id: `customer-${review.id}`,
          ...review.customer,
        }
      : null,
    state: review.state
      ? { __typename: 'State', ...withTransitions(review.state) }
      : null,
  });
  const matching = (where?: string | null) => {
    const id = stateIdFromWhere(where);
    return id ? reviews.filter((review) => review.state?.id === id) : reviews;
  };
  const sorted = (list: RawComment[], sort?: string[] | null) => {
    const [key, direction] = (sort?.[0] ?? 'createdAt desc').split(' ');
    const factor = direction === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const left = (a as Record<string, unknown>)[key] as
        | string
        | number
        | null;
      const right = (b as Record<string, unknown>)[key] as
        | string
        | number
        | null;
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      return left < right ? -factor : left > right ? factor : 0;
    });
  };

  const handlers = [
    graphql.query('ReviewStates', (_req, res, ctx) =>
      res(
        ctx.data({
          states: {
            results: states.map((state) => ({
              __typename: 'State',
              id: state.id,
              key: state.key,
              initial: state.initial,
              name: state.name,
            })),
          },
        })
      )
    ),
    graphql.query('CommentsList', (req, res, ctx) => {
      const { where, sort, limit, offset } = req.variables;
      calls.list.push(req.variables);
      const all = sorted(matching(where), sort);
      const page = all.slice(offset ?? 0, (offset ?? 0) + (limit ?? 20));
      return res(
        ctx.data({
          reviews: {
            __typename: 'ReviewQueryResult',
            total: all.length,
            count: page.length,
            offset: offset ?? 0,
            results: page.map(out),
          },
        })
      );
    }),
    graphql.query('CommentCount', (req, res, ctx) => {
      calls.count.push(req.variables);
      return res(
        ctx.data({
          reviews: {
            __typename: 'ReviewQueryResult',
            total: matching(req.variables.where).length,
          },
        })
      );
    }),
    graphql.query('Comment', (req, res, ctx) => {
      const review = reviews.find((r) => r.id === req.variables.id);
      return res(ctx.data({ review: review ? out(review) : null }));
    }),
    graphql.mutation('TransitionComment', (req, res, ctx) => {
      const { id, version, stateId } = req.variables;
      calls.transition.push(req.variables);
      const review = reviews.find((r) => r.id === id);
      if (!review || failures.has(id)) {
        return res(
          ctx.errors([
            { message: 'boom', extensions: { code: 'InternalServerError' } },
          ])
        );
      }
      if (review.version !== version) {
        return res(
          ctx.errors([
            {
              message: 'version mismatch',
              extensions: { code: 'ConcurrentModification' },
            },
          ])
        );
      }
      const target = states.find((s) => s.id === stateId) as StateRecord;
      review.state = { id: target.id, key: target.key, name: target.name };
      review.version += 1;
      review.includedInStatistics = target.key === APPROVED.key;
      review.lastModifiedAt = '2026-10-30T10:00:00.000Z';
      return res(ctx.data({ updateReview: out(review) }));
    }),
  ];

  return {
    handlers,
    calls,
    reviews,
    /** Another user changes a review behind the app's back. */
    changeElsewhere: (id: string, target: RawState = REJECTED) => {
      const review = reviews.find((r) => r.id === id) as RawComment;
      review.state = target;
      review.version += 1;
    },
    /** Makes the transition of this review fail with a server error. */
    failTransition: (id: string) => failures.add(id),
  };
}
