/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildReviews, highestSeeded, keyFor, rng, run, summarize } from './seed-reviews.mjs';

const build = (overrides = {}) =>
  buildReviews({ from: 1, to: 100, productIds: ['p1', 'p2', 'p3'], random: rng(7), spread: false, ...overrides });

test('builds 100 valid reviews with unique, numbered keys', () => {
  const reviews = build();
  assert.equal(reviews.length, 100);
  assert.equal(new Set(reviews.map((r) => r.draft.key)).size, 100);
  assert.equal(reviews[0].draft.key, 'seed-review-001');
  assert.equal(reviews[99].draft.key, 'seed-review-100');
  for (const { draft } of reviews) {
    assert.ok(draft.rating >= 1 && draft.rating <= 5);
    assert.ok(['en', 'de'].includes(draft.locale));
    assert.ok(draft.title && draft.text && draft.authorName);
    assert.equal(draft.target.typeId, 'product');
    assert.ok(['p1', 'p2', 'p3'].includes(draft.target.id));
    assert.deepEqual(draft.state, { typeId: 'state', key: 'pending-approval' });
  }
});

test('the same seed gives the same reviews, another seed different ones', () => {
  assert.deepEqual(build(), build());
  assert.notDeepEqual(build(), build({ random: rng(8) }));
});

test('ratings are skewed to the high end and use every value', () => {
  const { byRating } = summarize(build({ to: 1000 }));
  assert.ok(byRating[5] > byRating[1]);
  for (const rating of [1, 2, 3, 4, 5]) assert.ok(byRating[rating] > 0);
});

test('low ratings get a critical text, high ratings a positive one', () => {
  const reviews = build({ to: 400 });
  const low = reviews.find((r) => r.draft.rating === 1 && r.draft.locale === 'en').draft;
  const high = reviews.find((r) => r.draft.rating === 5 && r.draft.locale === 'en').draft;
  assert.notEqual(low.text, high.text);
});

test('without --spread everything stays pending, with it all three states appear', () => {
  assert.deepEqual(Object.keys(summarize(build()).byState), ['pending-approval']);
  const spread = summarize(build({ spread: true, to: 300 })).byState;
  assert.ok(spread.approved > 0 && spread.rejected > 0 && spread['pending-approval'] > 0);
});

test('numbering continues after the highest existing seeded key', () => {
  assert.equal(highestSeeded([]), 0);
  assert.equal(highestSeeded(['seed-review-007', 'seed-review-012', 'other', undefined]), 12);
  assert.equal(keyFor(5), 'seed-review-005');
});

const fakeApi = (existing = []) => {
  const calls = [];
  return {
    calls,
    listSeeded: async () => existing,
    listProductIds: async () => ['p1', 'p2'],
    listStateKeys: async () => ['pending-approval', 'approved', 'rejected'],
    create: async (draft) => {
      calls.push(['create', draft.key]);
      return { version: 1 };
    },
    transition: async (key, version, state) => calls.push(['transition', key, version, state]),
    remove: async (key, version) => calls.push(['remove', key, version]),
  };
};
const quiet = { log: () => {} };

test('dry run writes nothing', async () => {
  const api = fakeApi();
  await run(api, { count: 100, seed: 1, ...quiet });
  assert.equal(api.calls.length, 0);
});

test('apply creates the missing reviews and transitions only with --spread', async () => {
  const plain = fakeApi();
  await run(plain, { count: 10, seed: 1, apply: true, ...quiet });
  assert.equal(plain.calls.filter((c) => c[0] === 'create').length, 10);
  assert.equal(plain.calls.filter((c) => c[0] === 'transition').length, 0);

  const spread = fakeApi();
  await run(spread, { count: 60, seed: 1, spread: true, apply: true, ...quiet });
  assert.ok(spread.calls.some((c) => c[0] === 'transition' && c[3] === 'approved'));
  assert.ok(spread.calls.every((c) => c[0] !== 'transition' || c[2] === 1));
});

test('tops up to the wanted count and never recreates existing keys', async () => {
  const api = fakeApi([{ key: 'seed-review-001', version: 1 }, { key: 'seed-review-002', version: 1 }]);
  await run(api, { count: 5, seed: 1, apply: true, ...quiet });
  assert.deepEqual(api.calls.map((c) => c[1]).sort(), ['seed-review-003', 'seed-review-004', 'seed-review-005']);
  const full = fakeApi(Array.from({ length: 5 }, (_, i) => ({ key: keyFor(i + 1), version: 1 })));
  await run(full, { count: 5, apply: true, ...quiet });
  assert.equal(full.calls.length, 0);
});

test('--delete removes only the seeded reviews it found, and only with --apply', async () => {
  const seeded = [{ key: 'seed-review-001', version: 3 }, { key: 'seed-review-002', version: 1 }];
  const dry = fakeApi(seeded);
  await run(dry, { remove: true, ...quiet });
  assert.equal(dry.calls.length, 0);
  const real = fakeApi(seeded);
  await run(real, { remove: true, apply: true, ...quiet });
  assert.deepEqual(real.calls.sort(), [['remove', 'seed-review-001', 3], ['remove', 'seed-review-002', 1]].sort());
});

test('fails clearly without the pending-approval state or without products', async () => {
  const noState = { ...fakeApi(), listStateKeys: async () => [] };
  await assert.rejects(run(noState, { count: 1, ...quiet }), /seed-review-states/);
  const noProducts = { ...fakeApi(), listProductIds: async () => [] };
  await assert.rejects(run(noProducts, { count: 1, ...quiet }), /no products/);
});
