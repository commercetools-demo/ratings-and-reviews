/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { ReviewStateInfo } from '../../types/comment';
import {
  acceptLanguages,
  availableTransitions,
  toComment,
  type RawComment,
} from './conversion';

const states: ReviewStateInfo[] = [
  {
    id: 'n',
    key: 'pending-approval',
    label: 'Pending approval',
    initial: true,
  },
  { id: 'r', key: 'approved', label: 'Approved', initial: false },
  { id: 'h', key: 'rejected', label: 'Rejected', initial: false },
];

const raw = (overrides: Partial<RawComment> = {}): RawComment => ({
  id: 'c1',
  version: 3,
  title: 'Great',
  text: 'Loved it',
  rating: 5,
  locale: 'en',
  authorName: 'Anna',
  includedInStatistics: false,
  createdAt: '2026-10-01T10:00:00.000Z',
  lastModifiedAt: '2026-10-02T10:00:00.000Z',
  target: { id: 'p1', masterData: { current: { name: 'Mug' } } },
  customer: { email: 'a@x.com', firstName: 'Anna', lastName: 'B' },
  state: {
    id: 'n',
    key: 'pending-approval',
    name: 'Pending approval',
    transitions: [
      { id: 'r', key: 'approved', name: 'Approved' },
      { id: 'h', key: 'rejected', name: null },
    ],
  },
  ...overrides,
});

describe('availableTransitions', () => {
  it('offers exactly the transitions of the state', () => {
    expect(
      availableTransitions(raw().state, states).map((state) => state.key)
    ).toEqual(['approved', 'rejected']);
  });

  it('offers nothing for an empty list', () => {
    expect(
      availableTransitions({ id: 'x', key: 'x', transitions: [] }, states)
    ).toEqual([]);
  });

  it('offers every other state when transitions are unset', () => {
    expect(
      availableTransitions(
        { id: 'r', key: 'approved', transitions: null },
        states
      ).map((state) => state.id)
    ).toEqual(['n', 'h']);
  });

  it('offers the initial states for a review without a state', () => {
    expect(availableTransitions(null, states).map((state) => state.id)).toEqual(
      ['n']
    );
  });

  it('labels a transition from the known state, else its name, else its key', () => {
    const [approved, rejected] = availableTransitions(raw().state, states);
    expect(approved.label).toBe('Approved');
    expect(rejected.label).toBe('Rejected');
    expect(
      availableTransitions(
        {
          id: 'a',
          key: 'a',
          transitions: [{ id: 'zz', key: 'zz-key', name: null }],
        },
        states
      )[0].label
    ).toBe('zz-key');
  });
});

describe('toComment', () => {
  it('maps the fields', () => {
    expect(toComment(raw(), states)).toMatchObject({
      id: 'c1',
      version: 3,
      title: 'Great',
      text: 'Loved it',
      rating: 5,
      authorName: 'Anna',
      customerEmail: 'a@x.com',
      productName: 'Mug',
      includedInStatistics: false,
      state: { id: 'n', label: 'Pending approval' },
    });
  });

  it('falls back for missing data instead of failing', () => {
    const comment = toComment(
      raw({
        title: null,
        text: null,
        rating: null,
        authorName: null,
        customer: null,
        target: null,
        state: null,
      }),
      states
    );
    expect(comment).toMatchObject({
      title: '',
      text: '',
      rating: null,
      authorName: null,
      customerEmail: null,
      productName: null,
      state: null,
    });
  });

  it('uses the customer name when the review has no author name', () => {
    expect(toComment(raw({ authorName: '  ' }), states).authorName).toBe(
      'Anna B'
    );
  });

  it('treats an empty product name as unavailable', () => {
    expect(
      toComment(
        raw({ target: { id: 'p', masterData: { current: { name: '' } } } }),
        states
      ).productName
    ).toBeNull();
  });
});

describe('acceptLanguages', () => {
  it('puts the data locale first without duplicates', () => {
    expect(acceptLanguages('de', ['en', 'de', 'fr'])).toEqual([
      'de',
      'en',
      'fr',
    ]);
  });
});
