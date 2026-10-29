/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { toReviewStates, useReviewStates } from './review-states-connector';
import { createFakeBackend } from '../../test-utils/fake-backend';
import { RAW_STATES } from '../../test-utils/fixtures';
import { renderComments, screen, setupMockServer } from '../../test-utils';

describe('toReviewStates', () => {
  it('puts initial states first and falls back to the key for a label', () => {
    expect(
      toReviewStates([
        { id: 'b', key: 'b-key', initial: false, name: 'B' },
        { id: 'a', key: 'a-key', initial: true, name: null },
      ])
    ).toEqual([
      { id: 'a', key: 'a-key', label: 'a-key', initial: true },
      { id: 'b', key: 'b-key', label: 'B', initial: false },
    ]);
  });
});

const server = setupMockServer();

const Probe = () => {
  const { states, loading } = useReviewStates();
  return loading ? (
    <p>loading</p>
  ) : (
    <p>{states.map((s) => s.label).join(',')}</p>
  );
};

it('reads the project review states through the proxy', async () => {
  server.use(
    ...createFakeBackend({ reviews: [], states: RAW_STATES }).handlers
  );
  renderComments(<Probe />);
  expect(
    await screen.findByText('Pending approval,Approved,Rejected')
  ).toBeInTheDocument();
});
