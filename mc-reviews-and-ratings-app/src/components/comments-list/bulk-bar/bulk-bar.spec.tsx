/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import userEvent from '@testing-library/user-event';
import { createFakeBackend } from '../../../test-utils/fake-backend';
import {
  REJECTED,
  PENDING,
  APPROVED,
  buildRawComment,
  resetFixtureCounter,
} from '../../../test-utils/fixtures';
import {
  renderComments,
  screen,
  setupMockServer,
  waitFor,
  within,
} from '../../../test-utils';
import CommentsList from '../comments-list';

const server = setupMockServer();
beforeEach(() => resetFixtureCounter());

const seed = () => [
  buildRawComment({ state: PENDING, title: 'Needs one' }),
  buildRawComment({ state: PENDING, title: 'Needs two' }),
  buildRawComment({
    state: APPROVED,
    title: 'Approved one',
    includedInStatistics: true,
  }),
  buildRawComment({ state: REJECTED, title: 'Rejected one' }),
];

const select = async (...titles: string[]) => {
  for (const title of titles) {
    await screen.findByText(title);
    const row = screen.getByRole('row', { name: new RegExp(`^${title}`) });
    await userEvent.click(within(row).getByRole('checkbox'));
  }
};

const bar = () => within(screen.getByTestId('bulk-bar'));

describe('BulkBar', () => {
  it('shows no bulk controls without a selection', async () => {
    server.use(...createFakeBackend({ reviews: seed() }).handlers);
    renderComments(<CommentsList />);
    await screen.findByText('Needs one');
    expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument();
  });

  it('moves every selected comment whatever its starting state, then clears the selection', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);

    await select('Needs one', 'Approved one');
    expect(bar().getByText('2 comments selected')).toBeInTheDocument();
    await userEvent.click(
      bar().getByRole('button', { name: 'Move selected to Rejected' })
    );

    await waitFor(() => expect(backend.calls.transition).toHaveLength(2));
    expect(backend.calls.transition.map((c) => c.stateId)).toEqual([
      REJECTED.id,
      REJECTED.id,
    ]);
    await waitFor(() =>
      expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument()
    );
    expect(
      await screen.findByRole('tab', { name: /^Rejected\s*3$/ })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('tab', { name: /^Approved\s*0$/ })
    ).toBeInTheDocument();
  });

  it('leaves comments already in the target state alone', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);

    await select('Needs one', 'Rejected one');
    await userEvent.click(
      bar().getByRole('button', { name: 'Move selected to Rejected' })
    );

    await waitFor(() => expect(backend.calls.transition).toHaveLength(1));
    expect(backend.calls.transition[0]).toMatchObject({
      id: 'review-001',
      stateId: REJECTED.id,
    });
    await waitFor(() =>
      expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument()
    );
  });

  it('keeps the comments that failed selected', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    backend.failTransition('review-002');
    server.use(...backend.handlers);
    renderComments(<CommentsList />);

    await select('Needs one', 'Needs two');
    await userEvent.click(
      bar().getByRole('button', { name: 'Move selected to Approved' })
    );

    await waitFor(() => expect(backend.calls.transition).toHaveLength(2));
    await waitFor(() =>
      expect(bar().getByText('1 comment selected')).toBeInTheDocument()
    );
    expect(
      within(screen.getByRole('row', { name: /^Needs two/ })).getByRole(
        'checkbox'
      )
    ).toBeChecked();
  });

  it('offers one action per non-initial state, disabled without Manage', async () => {
    server.use(...createFakeBackend({ reviews: seed() }).handlers);
    renderComments(<CommentsList />, { canManage: false });
    await select('Needs one');
    expect(
      bar().getByRole('button', { name: 'Move selected to Approved' })
    ).toBeDisabled();
    expect(
      bar().getByRole('button', { name: 'Move selected to Rejected' })
    ).toBeDisabled();
    expect(
      bar().queryByRole('button', { name: /Pending approval/ })
    ).not.toBeInTheDocument();
  });

  it('clears the selection when the filter changes', async () => {
    server.use(...createFakeBackend({ reviews: seed() }).handlers);
    renderComments(<CommentsList />);
    await select('Needs one');
    await userEvent.click(
      await screen.findByRole('tab', { name: /^Rejected/ })
    );
    await waitFor(() =>
      expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument()
    );
  });
});
