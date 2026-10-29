/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DESIRED, localizedName, nameFor, plan, run } from './seed-review-states.mjs';

const LANGUAGES = ['en-US', 'en-GB', 'de-DE', 'es-ES', 'fr-FR', 'it-IT', 'pt-PT', 'nl-NL', 'ja-JP'];

const fake = (initial = [], languages = LANGUAGES) => {
  const states = initial.map((s) => ({ id: `id-${s.key}`, version: 1, type: 'ReviewState', transitions: [], roles: [], ...s }));
  const calls = [];
  return {
    calls,
    states,
    getLanguages: async () => languages,
    listReviewStates: async () => states.map((s) => ({ ...s })),
    createState: async (draft) => {
      calls.push(['create', draft.key, draft]);
      states.push({ id: `id-${draft.key}`, version: 1, type: 'ReviewState', transitions: [], ...draft });
    },
    update: async (key, version, actions) => {
      calls.push(['update', key, actions]);
      const s = states.find((x) => x.key === key);
      for (const a of actions) {
        if (a.action === 'setTransitions') s.transitions = a.transitions;
        if (a.action === 'setName') s.name = a.name;
      }
    },
  };
};
const quiet = { log: () => {} };
const wanted = (key) => DESIRED.find((s) => s.key === key);

test('a locale gets its base language text, English when there is none', () => {
  assert.equal(nameFor(wanted('approved'), 'de-DE'), 'Freigegeben');
  assert.equal(nameFor(wanted('approved'), 'en-GB'), 'Approved');
  assert.equal(nameFor(wanted('approved'), 'es-ES'), 'Aprobada');
  assert.equal(nameFor(wanted('approved'), 'ja-JP'), 'Approved');
  assert.equal(nameFor(wanted('rejected'), 'DE'), 'Abgelehnt');
});

test('the name covers every language of the project', () => {
  const name = localizedName(wanted('pending-approval'), LANGUAGES);
  assert.deepEqual(Object.keys(name), LANGUAGES);
  assert.equal(name['en-US'], 'Pending approval');
  assert.equal(name['nl-NL'], 'In afwachting van goedkeuring');
  assert.equal(name['ja-JP'], 'Pending approval');
});

test('an empty project: dry run writes nothing', async () => {
  const client = fake();
  const steps = await run(client, { apply: false, ...quiet });
  assert.deepEqual(steps.create, ['approved', 'rejected', 'pending-approval']);
  assert.equal(client.calls.length, 0);
});

test('an empty project: apply creates all three with names in every language and sets every transition', async () => {
  const client = fake();
  await run(client, { apply: true, ...quiet });
  const created = client.calls.filter((c) => c[0] === 'create');
  assert.deepEqual(created.map((c) => c[1]), ['approved', 'rejected', 'pending-approval']);
  for (const [, , draft] of created) assert.deepEqual(Object.keys(draft.name), LANGUAGES);
  assert.deepEqual(created[0][2].roles, ['ReviewIncludedInStatistics']);
  assert.equal(created[2][2].initial, true);
  const transitions = Object.fromEntries(
    client.calls
      .filter((c) => c[0] === 'update')
      .map((c) => [c[1], c[2].find((a) => a.action === 'setTransitions').transitions.map((t) => t.id)])
  );
  assert.deepEqual(transitions['pending-approval'], ['id-approved', 'id-rejected']);
  assert.deepEqual(transitions.approved, ['id-rejected']);
  assert.deepEqual(transitions.rejected, ['id-approved']);
});

test('running again changes nothing', async () => {
  const client = fake();
  await run(client, { apply: true, ...quiet });
  client.calls.length = 0;
  const steps = await run(client, { apply: true, ...quiet });
  assert.deepEqual(steps, { create: [], setTransitions: [], addNames: {}, report: [] });
  assert.equal(client.calls.length, 0);
});

test('states with only en and de names get the missing languages, existing text is kept', async () => {
  const graph = { approved: ['rejected'], rejected: ['approved'], 'pending-approval': ['approved', 'rejected'] };
  const client = fake(
    DESIRED.map((d) => ({
      key: d.key,
      initial: d.initial,
      roles: d.roles,
      name: { en: `${d.names.en}!`, de: d.names.de },
      transitions: graph[d.key].map((k) => ({ typeId: 'state', id: `id-${k}` })),
    }))
  );
  await run(client, { apply: true, ...quiet });
  const updates = client.calls.filter((c) => c[0] === 'update');
  assert.equal(updates.length, 3);
  for (const [, key, actions] of updates) {
    assert.deepEqual(actions.map((a) => a.action), ['setName']);
    const name = actions[0].name;
    assert.equal(name.en, `${wanted(key).names.en}!`); // untouched
    assert.deepEqual(Object.keys(name).sort(), ['de', 'en', ...LANGUAGES].filter((v, i, a) => a.indexOf(v) === i).sort());
  }
  const approved = client.states.find((s) => s.key === 'approved').name;
  assert.equal(approved['fr-FR'], 'Approuvé');
  assert.equal(approved['de-DE'], 'Freigegeben');
});

test('a differing role or initial flag is reported, not changed', () => {
  const full = (d) => ({ name: localizedName(d, LANGUAGES) });
  const steps = plan(
    [
      { id: 'a', key: 'approved', type: 'ReviewState', initial: false, roles: [], transitions: [{ id: 'r' }], ...full(wanted('approved')) },
      { id: 'r', key: 'rejected', type: 'ReviewState', initial: true, roles: [], transitions: [{ id: 'a' }], ...full(wanted('rejected')) },
      { id: 'p', key: 'pending-approval', type: 'ReviewState', initial: true, roles: [], transitions: [{ id: 'a' }, { id: 'r' }], ...full(wanted('pending-approval')) },
    ],
    LANGUAGES
  );
  assert.equal(steps.report.length, 2);
  assert.deepEqual(steps.create, []);
  assert.deepEqual(steps.setTransitions, []);
  assert.deepEqual(steps.addNames, {});
});

test('wrong transitions are set; the desired graph is the documented one', () => {
  const steps = plan(
    [
      { id: 'a', key: 'approved', type: 'ReviewState', roles: ['ReviewIncludedInStatistics'], transitions: [] },
      { id: 'r', key: 'rejected', type: 'ReviewState', roles: [], transitions: [{ id: 'a' }] },
      { id: 'p', key: 'pending-approval', type: 'ReviewState', initial: true, roles: [], transitions: [{ id: 'a' }, { id: 'r' }] },
    ],
    []
  );
  assert.deepEqual(steps.setTransitions, ['approved']);
  assert.deepEqual(DESIRED.map((s) => s.key), ['approved', 'rejected', 'pending-approval']);
});
