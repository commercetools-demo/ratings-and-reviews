/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { fireEvent } from '@testing-library/react';
import { graphql } from 'msw';
import { createFakeBackend } from '../../test-utils/fake-backend';
import {
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
import CommentsList from './comments-list';

const server = setupMockServer();
beforeEach(() => resetFixtureCounter());

const seed = () => [
  buildRawComment({
    state: PENDING,
    title: 'Needs one',
    authorName: 'Anna',
  }),
  buildRawComment({ state: PENDING, title: 'Needs two' }),
  buildRawComment({
    state: APPROVED,
    title: 'Approved one',
    includedInStatistics: true,
  }),
  buildRawComment({ state: REJECTED, title: 'Rejected one' }),
];

const tab = (name: RegExp) => screen.findByRole('tab', { name });

describe('CommentsList', () => {
  it('lists every comment with its fields and a count per state', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);

    expect(await screen.findByText('Needs one')).toBeInTheDocument();
    expect(screen.getByText('Approved one')).toBeInTheDocument();
    expect(screen.getByText('Rejected one')).toBeInTheDocument();
    expect(screen.getAllByText('Coffee mug').length).toBe(4);
    expect(screen.getByText('Anna')).toBeInTheDocument();

    expect(await tab(/^All\s*4$/)).toBeInTheDocument();
    expect(await tab(/^Pending approval\s*2$/)).toBeInTheDocument();
    expect(await tab(/^Approved\s*1$/)).toBeInTheDocument();
    expect(await tab(/^Rejected\s*1$/)).toBeInTheDocument();
  });

  it('asks for one count per tab with limit 0 queries', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);
    await tab(/^Rejected\s*1$/);
    const wheres = backend.calls.count.map((call) => call.where);
    expect(wheres).toEqual(
      expect.arrayContaining([
        undefined,
        `state(id = "${PENDING.id}")`,
        `state(id = "${APPROVED.id}")`,
        `state(id = "${REJECTED.id}")`,
      ])
    );
  });

  it('narrows the list to one state and keeps the counts', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);
    await screen.findByText('Needs one');

    fireEvent.click(await tab(/^Approved/));

    await waitFor(() =>
      expect(screen.queryByText('Needs one')).not.toBeInTheDocument()
    );
    expect(screen.getByText('Approved one')).toBeInTheDocument();
    expect(await tab(/^All\s*4$/)).toBeInTheDocument();
    expect(backend.calls.list.at(-1)).toMatchObject({
      where: `state(id = "${APPROVED.id}")`,
      sort: ['createdAt desc'],
      limit: 20,
      offset: 0,
    });
  });

  it('shows a message when there are no comments at all', async () => {
    server.use(...createFakeBackend({ reviews: [] }).handlers);
    renderComments(<CommentsList />);
    expect(
      await screen.findByText('Nothing to moderate yet')
    ).toBeInTheDocument();
  });

  it('shows a filtered-empty message with a reset', async () => {
    const backend = createFakeBackend({
      reviews: [buildRawComment({ state: PENDING })],
    });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);
    await screen.findByText('Title 001');

    fireEvent.click(await tab(/^Rejected/));
    expect(
      await screen.findByText('No comments match the current filter or search.')
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Reset search and filter' })
    );
    expect(await screen.findByText('Title 001')).toBeInTheDocument();
  });

  it('shows an error with a retry when the list cannot be loaded', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(
      graphql.query('CommentsList', (_req, res, ctx) =>
        res.once(ctx.errors([{ message: 'x', extensions: { code: 'Other' } }]))
      ),
      ...backend.handlers
    );
    renderComments(<CommentsList />);
    expect(
      await screen.findByText('The comments could not be loaded')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Needs one')).toBeInTheDocument();
  });

  it('degrades with labels when product, reviewer and rating are missing', async () => {
    server.use(
      ...createFakeBackend({
        reviews: [
          buildRawComment({
            title: null,
            authorName: null,
            customer: null,
            rating: null,
            target: null,
            state: null,
          }),
        ],
      }).handlers
    );
    renderComments(<CommentsList />);
    expect(await screen.findByText('No title')).toBeInTheDocument();
    const table = screen.getByTestId('comments-table');
    expect(within(table).getByText('Unknown reviewer')).toBeInTheDocument();
    expect(within(table).getByText('Unavailable product')).toBeInTheDocument();
    expect(within(table).getByText('Not rated')).toBeInTheDocument();
    expect(within(table).getByText('No state')).toBeInTheDocument();
  });

  it('marks the app view only without Manage permission', async () => {
    server.use(...createFakeBackend({ reviews: seed() }).handlers);
    renderComments(<CommentsList />, { canManage: false });
    expect(await screen.findByText('View only')).toBeInTheDocument();
  });

  it('shows the German UI', async () => {
    server.use(...createFakeBackend({ reviews: [] }).handlers);
    renderComments(<CommentsList />, { locale: 'de' });
    expect(
      await screen.findByText('Noch nichts zu moderieren')
    ).toBeInTheDocument();
  });
});
