/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createFakeBackend } from '../../test-utils/fake-backend';
import {
  GRAPH,
  REJECTED,
  PENDING,
  APPROVED,
  buildRawComment,
  resetFixtureCounter,
} from '../../test-utils/fixtures';
import {
  renderComments,
  screen,
  setupMockServer,
  waitFor,
  within,
} from '../../test-utils';
import CommentsList from '../comments-list/comments-list';

const server = setupMockServer();
beforeEach(() => resetFixtureCounter());

const seed = () => [
  buildRawComment({
    state: PENDING,
    title: 'Needs one',
    text: 'Full text of the first comment',
    rating: 2,
  }),
  buildRawComment({
    state: APPROVED,
    title: 'Approved one',
    includedInStatistics: true,
  }),
  buildRawComment({ state: REJECTED, title: 'Rejected one' }),
];

const open = async (title: string) => {
  await screen.findByText(title);
  await userEvent.click(
    screen.getByRole('row', { name: new RegExp(`^${title}`) })
  );
  return within(await screen.findByRole('dialog'));
};

describe('CommentDetail', () => {
  it('shows the full comment with its context and both actions for Pending approval', async () => {
    server.use(...createFakeBackend({ reviews: seed() }).handlers);
    renderComments(<CommentsList />);

    const dialog = await open('Needs one');
    expect(
      dialog.getByText('Full text of the first comment')
    ).toBeInTheDocument();
    expect(
      await dialog.findByText('reviewer001@example.com')
    ).toBeInTheDocument();
    expect(dialog.getByText('Coffee mug')).toBeInTheDocument();
    expect(
      dialog.getByText('Counts toward the product rating')
    ).toBeInTheDocument();
    expect(
      dialog.getByRole('button', { name: 'Move to Approved' })
    ).toBeEnabled();
    expect(
      dialog.getByRole('button', { name: 'Move to Rejected' })
    ).toBeEnabled();
  });

  it('offers only Rejected for a Approved comment and only Approved for a Rejected one', async () => {
    server.use(...createFakeBackend({ reviews: seed() }).handlers);
    renderComments(<CommentsList />);

    let dialog = await open('Approved one');
    expect(
      dialog
        .getAllByRole('button', { name: /^Move to/ })
        .map((b) => b.textContent)
    ).toEqual(['Move to Rejected']);
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );

    dialog = await open('Rejected one');
    expect(
      dialog
        .getAllByRole('button', { name: /^Move to/ })
        .map((b) => b.textContent)
    ).toEqual(['Move to Approved']);
  });

  it('moves the comment, sends the version read, and updates list and counts', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);
    await screen.findByRole('tab', { name: /^Pending approval\s*1$/ });
    fireEvent.click(
      await screen.findByRole('tab', { name: /^Pending approval/ })
    );
    const dialog = await open('Needs one');

    fireEvent.click(
      await dialog.findByRole('button', { name: 'Move to Approved' })
    );

    await waitFor(() => expect(backend.calls.transition).toHaveLength(1));
    expect(backend.calls.transition[0]).toMatchObject({
      id: 'review-001',
      version: 1,
      stateId: APPROVED.id,
    });
    // The comment left the Pending approval tab and the counts moved (the open
    // panel hides the page behind it from the accessibility tree).
    expect(
      await screen.findByRole('tab', {
        name: /^Pending approval\s*0$/,
        hidden: true,
      })
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('tab', { name: /^Approved\s*2$/, hidden: true })
    ).toBeInTheDocument();
    // The panel shows the new state: only Rejected is offered now.
    await waitFor(() =>
      expect(
        dialog
          .getAllByRole('button', { name: /^Move to/ })
          .map((b) => b.textContent)
      ).toEqual(['Move to Rejected'])
    );
  });

  it('closing without a choice changes nothing', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);
    const dialog = await open('Needs one');
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(backend.calls.transition).toEqual([]);
    expect(
      await screen.findByRole('tab', { name: /^Pending approval\s*1$/ })
    ).toBeInTheDocument();
  });

  it('reports a conflict and shows the comment as it is now', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);
    const dialog = await open('Needs one');
    await dialog.findByRole('button', { name: 'Move to Approved' });

    backend.changeElsewhere('review-001', REJECTED);
    fireEvent.click(dialog.getByRole('button', { name: 'Move to Approved' }));

    // Rejected elsewhere: the panel now offers only the way back to Approved.
    await waitFor(() =>
      expect(
        dialog
          .getAllByRole('button', { name: /^Move to/ })
          .map((b) => b.textContent)
      ).toEqual(['Move to Approved'])
    );
    expect(backend.reviews.find((r) => r.id === 'review-001')?.state?.id).toBe(
      REJECTED.id
    );
  });

  it('shows the actions disabled, not hidden, without Manage permission', async () => {
    server.use(...createFakeBackend({ reviews: seed() }).handlers);
    renderComments(<CommentsList />, { canManage: false });
    const dialog = await open('Needs one');
    expect(
      await dialog.findByRole('button', { name: 'Move to Approved' })
    ).toBeDisabled();
    expect(
      dialog.getByRole('button', { name: 'Move to Rejected' })
    ).toBeDisabled();
  });

  it('offers nothing when the state has no transitions', async () => {
    server.use(
      ...createFakeBackend({
        reviews: seed(),
        graph: { ...GRAPH, [PENDING.id]: [] },
      }).handlers
    );
    renderComments(<CommentsList />);
    const dialog = await open('Needs one');
    expect(
      await dialog.findByText('No state change is available for this comment.')
    ).toBeInTheDocument();
    expect(
      dialog.queryByRole('button', { name: /^Move to/ })
    ).not.toBeInTheDocument();
  });

  it('offers every other state when the transitions are unset', async () => {
    server.use(
      ...createFakeBackend({
        reviews: seed(),
        graph: { ...GRAPH, [APPROVED.id]: null },
      }).handlers
    );
    renderComments(<CommentsList />);
    const dialog = await open('Approved one');
    expect(
      (await dialog.findAllByRole('button', { name: /^Move to/ })).map(
        (b) => b.textContent
      )
    ).toEqual(['Move to Pending approval', 'Move to Rejected']);
  });

  it('shows the detail in German', async () => {
    server.use(...createFakeBackend({ reviews: seed() }).handlers);
    renderComments(<CommentsList />, { locale: 'de' });
    const dialog = await open('Needs one');
    expect(
      await dialog.findByRole('button', { name: 'Nach Approved verschieben' })
    ).toBeInTheDocument();
  });
});
