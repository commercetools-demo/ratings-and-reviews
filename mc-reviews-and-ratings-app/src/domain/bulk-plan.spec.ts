/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { Comment } from '../types/comment';
import { planBulk, runBulk } from './bulk-plan';

const s = (id: string) => ({ id, key: id, label: id });
const comment = (id: string, stateId: string, to: string[]): Comment => ({
  id,
  version: 1,
  title: id,
  text: '',
  rating: null,
  locale: null,
  authorName: null,
  customerEmail: null,
  productName: null,
  includedInStatistics: false,
  createdAt: '',
  lastModifiedAt: '',
  state: s(stateId),
  transitions: to.map(s),
});

describe('planBulk', () => {
  const items = [
    comment('a', 'pending', ['approved', 'rejected']),
    comment('b', 'approved', ['rejected']),
    comment('c', 'rejected', ['approved']),
  ];

  it('changes the comments that may move to the target', () => {
    const plan = planBulk(items, 'rejected');
    expect(plan.changeable.map((c) => c.id)).toEqual(['a', 'b']);
    expect(plan.skipped.map((c) => c.id)).toEqual(['c']);
  });

  it('skips comments already in the target state', () => {
    expect(planBulk(items, 'approved').skipped.map((c) => c.id)).toEqual(['b']);
  });

  it('skips a comment whose project does not allow the move', () => {
    expect(planBulk([comment('d', 'x', [])], 'rejected').changeable).toEqual(
      []
    );
  });
});

describe('runBulk', () => {
  const items = ['a', 'b', 'c', 'd', 'e'].map((id) => comment(id, 'x', ['t']));

  it('collects changed and failed without stopping on a failure', async () => {
    const result = await runBulk(
      { changeable: items, skipped: [] },
      async (c) => {
        if (c.id === 'c') throw new Error('boom');
      }
    );
    expect(result.changed.map((c) => c.id).sort()).toEqual([
      'a',
      'b',
      'd',
      'e',
    ]);
    expect(result.failed.map((f) => f.comment.id)).toEqual(['c']);
  });

  it('runs at most the given number of moves at once', async () => {
    let running = 0;
    let peak = 0;
    await runBulk(
      { changeable: items, skipped: [] },
      async () => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running -= 1;
      },
      2
    );
    expect(peak).toBe(2);
  });

  it('does nothing for an empty plan', async () => {
    const move = jest.fn();
    const result = await runBulk({ changeable: [], skipped: [items[0]] }, move);
    expect(move).not.toHaveBeenCalled();
    expect(result.skipped).toHaveLength(1);
  });
});
