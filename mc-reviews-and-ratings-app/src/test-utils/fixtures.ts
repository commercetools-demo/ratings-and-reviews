/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type {
  RawComment,
  RawState,
} from '../hooks/use-comments-connector/conversion';

export const PENDING: RawState = {
  id: 'state-pending',
  key: 'pending-approval',
  name: 'Pending approval',
};
export const APPROVED: RawState = {
  id: 'state-approved',
  key: 'approved',
  name: 'Approved',
};
export const REJECTED: RawState = {
  id: 'state-rejected',
  key: 'rejected',
  name: 'Rejected',
};

/** The default graph: Pending approval to Approved or Rejected; those two to each other. */
export const GRAPH: Record<string, string[] | null> = {
  [PENDING.id]: [APPROVED.id, REJECTED.id],
  [APPROVED.id]: [REJECTED.id],
  [REJECTED.id]: [APPROVED.id],
};

export const RAW_STATES = [
  { ...PENDING, initial: true },
  { ...APPROVED, initial: false },
  { ...REJECTED, initial: false },
];

let counter = 0;

export const buildRawComment = (
  overrides: Partial<RawComment> = {}
): RawComment => {
  counter += 1;
  const n = String(counter).padStart(3, '0');
  return {
    id: `review-${n}`,
    version: 1,
    title: `Title ${n}`,
    text: `Text of comment ${n}`,
    rating: 4,
    locale: 'en',
    authorName: `Reviewer ${n}`,
    includedInStatistics: false,
    createdAt: `2026-10-${String(1 + (counter % 28)).padStart(
      2,
      '0'
    )}T10:00:00.000Z`,
    lastModifiedAt: '2026-10-29T10:00:00.000Z',
    target: {
      id: 'product-1',
      masterData: { current: { name: 'Coffee mug' } },
    },
    customer: {
      email: `reviewer${n}@example.com`,
      firstName: 'Re',
      lastName: n,
    },
    state: PENDING,
    ...overrides,
  };
};

export const resetFixtureCounter = () => {
  counter = 0;
};
