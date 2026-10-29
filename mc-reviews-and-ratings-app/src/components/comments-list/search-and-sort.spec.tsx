/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    title: 'Lovely mug',
    authorName: 'Anna',
    rating: 5,
    text: 'Keeps coffee hot',
  }),
  buildRawComment({
    state: PENDING,
    title: 'Cracked',
    authorName: 'Bob',
    rating: 1,
    text: 'Arrived broken',
  }),
  buildRawComment({
    state: APPROVED,
    title: 'Fine',
    authorName: 'Anna',
    rating: 3,
    text: 'Does the job',
  }),
  buildRawComment({
    state: REJECTED,
    title: 'Spam',
    authorName: 'Cleo',
    rating: 4,
    text: 'Buy now',
  }),
];

const header = (name: string) =>
  screen.findByRole('columnheader', { name: new RegExp(name) });
const titlesInOrder = () =>
  screen
    .getAllByRole('row')
    .map(
      (row) => /Lovely mug|Cracked|Fine|Spam/.exec(row.textContent ?? '')?.[0]
    )
    .filter(Boolean);

describe('sorting', () => {
  it('sorts by rating on the server and reverses on a second click', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);
    await screen.findByText('Lovely mug');

    await userEvent.click(await header('Rating'));
    await waitFor(() =>
      expect(backend.calls.list.at(-1)?.sort).toEqual(['rating desc'])
    );
    await waitFor(() =>
      expect(titlesInOrder()).toEqual(['Lovely mug', 'Spam', 'Fine', 'Cracked'])
    );

    await userEvent.click(await header('Rating'));
    await waitFor(() =>
      expect(backend.calls.list.at(-1)?.sort).toEqual(['rating asc'])
    );
    await waitFor(() =>
      expect(titlesInOrder()).toEqual(['Cracked', 'Fine', 'Spam', 'Lovely mug'])
    );
  });

  it('sorts by reviewer and by submission date', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);
    await screen.findByText('Lovely mug');

    await userEvent.click(await header('Reviewer'));
    await waitFor(() =>
      expect(backend.calls.list.at(-1)?.sort).toEqual(['authorName asc'])
    );
    await userEvent.click(await header('Submitted'));
    await waitFor(() =>
      expect(backend.calls.list.at(-1)?.sort).toEqual(['createdAt desc'])
    );
  });
});

describe('search', () => {
  const search = async (term: string) =>
    userEvent.type(
      await screen.findByRole('searchbox', { name: 'Search comments' }),
      term
    );

  it('filters by reviewer, title and text, loading up to 500 comments', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);
    await screen.findByText('Lovely mug');

    await search('anna');
    await waitFor(() =>
      expect(screen.queryByText('Cracked')).not.toBeInTheDocument()
    );
    expect(backend.calls.list.at(-1)).toMatchObject({
      limit: 500,
      offset: 0,
      sort: ['createdAt desc'],
    });
    expect(screen.getByText('Lovely mug')).toBeInTheDocument();
    expect(screen.getByText('Fine')).toBeInTheDocument();
    expect(screen.getByTestId('comments-total')).toHaveTextContent(
      '2 comments'
    );
  });

  it('finds text and combines with the state filter', async () => {
    server.use(...createFakeBackend({ reviews: seed() }).handlers);
    renderComments(<CommentsList />);
    await screen.findByText('Lovely mug');

    await search('broken');
    await waitFor(() =>
      expect(screen.queryByText('Lovely mug')).not.toBeInTheDocument()
    );
    expect(screen.getByText('Cracked')).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('tab', { name: /^Rejected/ }));
    expect(
      await screen.findByText('No comments match the current filter or search.')
    ).toBeInTheDocument();
  });

  it('resets search and filter from the no-match message', async () => {
    server.use(...createFakeBackend({ reviews: seed() }).handlers);
    renderComments(<CommentsList />);
    await screen.findByText('Lovely mug');

    await search('zzzz');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Reset search and filter' })
    );
    expect(await screen.findByText('Lovely mug')).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Search comments' })
    ).toHaveValue('');
  });

  it('says when more comments exist than the search can look at', async () => {
    const many = Array.from({ length: 501 }, () => buildRawComment());
    server.use(...createFakeBackend({ reviews: many }).handlers);
    renderComments(<CommentsList />);
    expect(await screen.findByTestId('comments-total')).toHaveTextContent(
      '501 comments'
    );
    expect(
      screen.queryByText(/The search looks at the 500 newest/)
    ).not.toBeInTheDocument();

    await search('title');
    expect(
      await screen.findByText(
        /The search looks at the 500 newest comments of this filter/
      )
    ).toBeInTheDocument();
  });
});

describe('query state', () => {
  it('survives opening and closing the detail', async () => {
    const backend = createFakeBackend({ reviews: seed() });
    server.use(...backend.handlers);
    renderComments(<CommentsList />);
    await screen.findByText('Lovely mug');

    fireEvent.click(
      await screen.findByRole('tab', { name: /^Pending approval/ })
    );
    await userEvent.click(await header('Rating'));
    await waitFor(() =>
      expect(titlesInOrder()).toEqual(['Lovely mug', 'Cracked'])
    );

    await userEvent.click(screen.getByRole('row', { name: /^Cracked/ }));
    const dialog = within(await screen.findByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );

    expect(titlesInOrder()).toEqual(['Lovely mug', 'Cracked']);
    expect(
      screen.getByRole('tab', { name: /^Pending approval/, selected: true })
    ).toBeInTheDocument();
    expect(backend.calls.list.at(-1)).toMatchObject({
      where: `state(id = "${PENDING.id}")`,
      sort: ['rating desc'],
    });
  });
});
