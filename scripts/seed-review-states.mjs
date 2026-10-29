#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/**
 * Seeds the three ReviewState States the Reviews and Ratings app moderates with
 * (docs/SETUP.md, docs/MODERATION-FLOW.md), following the commercetools review
 * approval process plus a `rejected` state:
 *
 *   pending-approval (initial)  -> approved, rejected
 *   approved (ReviewIncludedInStatistics) -> rejected
 *   rejected                    -> approved
 *
 * Every state gets a name for every language of the project (the Merchant Center
 * shows the name in the user's data locale, for example en-GB or de-DE). A
 * language gets the translation of its base language (en, de, es, fr, it, pt,
 * nl) and English otherwise. Existing names are never overwritten, only missing
 * languages are added.
 *
 * Idempotent: creates what is missing, adds missing names, sets the transitions
 * that differ and only reports (never changes) any other difference. Dry run by
 * default.
 *
 *   node scripts/seed-review-states.mjs [--apply]
 *
 * Reads CTP_PROJECT_KEY, CTP_CLIENT_ID and CTP_CLIENT_SECRET, and optionally
 * CTP_AUTH_URL, CTP_API_URL, CTP_SCOPES (or CTP_REGION instead of the URLs),
 * from the environment or from `.env.local` in the repository root (gitignored).
 *
 * Needs its own API client; manage_states, view_states and view_project_settings
 * (to read the languages) are enough (never the
 * storefront's client and never the Merchant Center session).
 */

import { createClient as createHttpClient, loadEnv } from './ctp.mjs';

/** The desired states, in creation order (targets before their sources). */
export const DESIRED = [
  {
    key: 'approved',
    names: {
      en: 'Approved',
      de: 'Freigegeben',
      es: 'Aprobada',
      fr: 'Approuvé',
      it: 'Approvata',
      pt: 'Aprovada',
      nl: 'Goedgekeurd',
    },
    initial: false,
    roles: ['ReviewIncludedInStatistics'],
    transitions: ['rejected'],
  },
  {
    key: 'rejected',
    names: {
      en: 'Rejected',
      de: 'Abgelehnt',
      es: 'Rechazada',
      fr: 'Rejeté',
      it: 'Rifiutata',
      pt: 'Rejeitada',
      nl: 'Afgewezen',
    },
    initial: false,
    roles: [],
    transitions: ['approved'],
  },
  {
    key: 'pending-approval',
    names: {
      en: 'Pending approval',
      de: 'Ausstehende Freigabe',
      es: 'Pendiente de aprobación',
      fr: "En attente d'approbation",
      it: 'In attesa di approvazione',
      pt: 'Aguarda aprovação',
      nl: 'In afwachting van goedkeuring',
    },
    initial: true,
    roles: [],
    transitions: ['approved', 'rejected'],
  },
];

/** The name of a state in one locale: its base language's text, else English. */
export const nameFor = (wanted, locale) =>
  wanted.names[locale.split('-')[0].toLowerCase()] ?? wanted.names.en;

/** The name for every language of the project, for a state that has none yet. */
export const localizedName = (wanted, languages) =>
  Object.fromEntries(languages.map((locale) => [locale, nameFor(wanted, locale)]));

const sameSet = (a = [], b = []) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

/**
 * Compares the project's ReviewState States with DESIRED.
 * `existing` is the API result list (transitions as references with ids).
 * `languages` are the project's languages.
 * Returns the steps to do and the differences that are only reported.
 */
export function plan(existing, languages = ['en', 'de']) {
  const byKey = new Map(existing.map((state) => [state.key, state]));
  const idToKey = new Map(existing.map((state) => [state.id, state.key]));
  const create = [];
  const setTransitions = [];
  /** key -> the names to add (only languages the state has no name for). */
  const addNames = {};
  const report = [];

  for (const wanted of DESIRED) {
    const found = byKey.get(wanted.key);
    if (!found) {
      create.push(wanted.key);
      setTransitions.push(wanted.key); // after everything exists
      continue;
    }
    if (found.type !== 'ReviewState') {
      report.push(`${wanted.key}: exists with type ${found.type}, not ReviewState`);
    }
    if (Boolean(found.initial) !== wanted.initial) {
      report.push(`${wanted.key}: initial is ${Boolean(found.initial)}, expected ${wanted.initial}`);
    }
    if (!sameSet(found.roles ?? [], wanted.roles)) {
      report.push(`${wanted.key}: roles are [${(found.roles ?? []).join(', ')}], expected [${wanted.roles.join(', ')}]`);
    }
    const current = (found.transitions ?? []).map((t) => idToKey.get(t.id) ?? t.id);
    if (!sameSet(current, wanted.transitions)) setTransitions.push(wanted.key);

    const missing = languages.filter((locale) => !found.name?.[locale]);
    if (missing.length) {
      addNames[wanted.key] = Object.fromEntries(missing.map((locale) => [locale, nameFor(wanted, locale)]));
    }
  }
  return { create, setTransitions, addNames, report };
}

export function createClient(settings) {
  const { call } = createHttpClient(settings);
  return {
    getLanguages: async () => (await call('GET', '')).languages,
    listReviewStates: async () =>
      (await call('GET', `/states?where=${encodeURIComponent('type="ReviewState"')}&limit=500`)).results,
    createState: (draft) => call('POST', '/states', draft),
    update: (key, version, actions) =>
      call('POST', `/states/key=${encodeURIComponent(key)}`, { version, actions }),
  };
}

export async function run(client, { apply, log = console.log }) {
  const [existing, languages] = await Promise.all([client.listReviewStates(), client.getLanguages()]);
  const steps = plan(existing, languages);
  const nameKeys = Object.keys(steps.addNames);
  log(`Project languages: ${languages.join(', ')}`);
  log(`Found ${existing.length} ReviewState state(s): ${existing.map((s) => s.key).join(', ') || 'none'}`);
  log(`To create: ${steps.create.join(', ') || 'nothing'}`);
  log(`To add names to: ${nameKeys.map((key) => `${key} (${Object.keys(steps.addNames[key]).join(', ')})`).join('; ') || 'nothing'}`);
  log(`To set transitions on: ${steps.setTransitions.join(', ') || 'nothing'}`);
  for (const line of steps.report) log(`Not changed, please check: ${line}`);
  if (!apply) {
    log('Dry run. Nothing written; run with --apply to write.');
    return steps;
  }

  for (const key of steps.create) {
    const wanted = DESIRED.find((state) => state.key === key);
    await client.createState({
      key,
      type: 'ReviewState',
      name: localizedName(wanted, languages),
      initial: wanted.initial,
      roles: wanted.roles,
    });
    log(`Created ${key}`);
  }

  const states = steps.create.length ? await client.listReviewStates() : existing;
  const idOf = new Map(states.map((state) => [state.key, state.id]));
  const keys = [...new Set([...nameKeys, ...steps.setTransitions])];
  for (const key of keys) {
    const wanted = DESIRED.find((state) => state.key === key);
    const current = states.find((state) => state.key === key);
    const actions = [];
    if (steps.addNames[key]) {
      actions.push({ action: 'setName', name: { ...(current.name ?? {}), ...steps.addNames[key] } });
    }
    if (steps.setTransitions.includes(key)) {
      actions.push({
        action: 'setTransitions',
        transitions: wanted.transitions.map((target) => ({ typeId: 'state', id: idOf.get(target) })),
      });
    }
    await client.update(key, current.version, actions);
    log(`Updated ${key}: ${actions.map((a) => a.action).join(', ')}`);
  }
  log('Done.');
  return steps;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  try {
    await run(
      createClient({
        ...loadEnv(),
        defaultScopes: (key) => `manage_states:${key} view_states:${key} view_project_settings:${key}`,
      }),
      { apply: process.argv.includes('--apply') }
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
