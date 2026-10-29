#!/usr/bin/env node
/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/**
 * Seeds random product reviews (rating, title, text, reviewer, language) for
 * trying out the Reviews and Ratings app.
 *
 *   node scripts/seed-reviews.mjs [--count 100] [--spread] [--seed 7] [--apply]
 *   node scripts/seed-reviews.mjs --delete [--apply]
 *
 * - Dry run by default: prints what would be created, writes nothing.
 * - Reviews go on random existing products and start in `pending-approval`
 *   (run seed-review-states.mjs first). With --spread, about 30 % are then
 *   approved and 15 % rejected, so every tab of the app has something.
 * - Every seeded review has a key `seed-review-NNN`, so a rerun only tops up to
 *   --count, and --delete removes only reviews with that key prefix.
 * - --seed N makes the content repeatable (the same N gives the same reviews).
 *
 * Reads the CTP_* settings like seed-review-states.mjs; the client needs
 * manage_products, view_products and view_states (CTP_SCOPES overrides).
 */

import { createClient, loadEnv } from './ctp.mjs';

export const KEY_PREFIX = 'seed-review-';
const PENDING = 'pending-approval';

/** Small seeded random generator, so `--seed` gives repeatable reviews. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (random, list) => list[Math.floor(random() * list.length)];

const NAMES = [
  'Anna Müller', 'Ben Schmidt', 'Clara Weber', 'David Fischer', 'Eva Becker',
  'Felix Hoffmann', 'Greta Wagner', 'Hannes Koch', 'Ida Richter', 'Jonas Klein',
  'Kira Wolf', 'Lukas Neumann', 'Mia Schwarz', 'Noah Braun', 'Olivia Hartmann',
  'Paul Lange', 'Quinn Murphy', 'Rosa Silva', 'Sam Carter', 'Tara Singh',
];

/** Texts per rating band and language: [titles, bodies]. */
const CONTENT = {
  en: {
    high: [
      ['Love it', 'Exactly what I hoped for', 'Great quality', 'Highly recommend', 'Perfect'],
      ['Arrived quickly and looks even better in real life.', 'Great value for the price, I would buy it again.', 'Well made and easy to use. Very happy with it.', 'My whole family likes it. Five stars from me.'],
    ],
    mid: [
      ['Decent', 'Okay for the price', 'Does the job', 'Mixed feelings'],
      ['Works as described, but nothing special.', 'Good in some ways, a bit disappointing in others.', 'Fine overall, the finish could be better.', 'Average quality. Fair for the price.'],
    ],
    low: [
      ['Disappointed', 'Not as described', 'Broke quickly', 'Would not buy again'],
      ['It stopped working after a few days.', 'The quality is much lower than the photos suggest.', 'Arrived damaged and support was slow to answer.', 'Too expensive for what you get.'],
    ],
  },
  de: {
    high: [
      ['Begeistert', 'Genau wie erhofft', 'Tolle Qualität', 'Sehr zu empfehlen', 'Perfekt'],
      ['Schnell geliefert und in echt noch schöner.', 'Sehr gutes Preis-Leistungs-Verhältnis, ich kaufe es wieder.', 'Gut verarbeitet und einfach zu benutzen. Sehr zufrieden.', 'Die ganze Familie mag es. Fünf Sterne von mir.'],
    ],
    mid: [
      ['Ganz okay', 'Für den Preis in Ordnung', 'Erfüllt seinen Zweck', 'Gemischte Gefühle'],
      ['Funktioniert wie beschrieben, aber nichts Besonderes.', 'In manchem gut, in anderem etwas enttäuschend.', 'Insgesamt in Ordnung, die Verarbeitung könnte besser sein.', 'Durchschnittliche Qualität. Für den Preis fair.'],
    ],
    low: [
      ['Enttäuscht', 'Nicht wie beschrieben', 'Schnell kaputt', 'Würde ich nicht nochmal kaufen'],
      ['Nach wenigen Tagen ging es nicht mehr.', 'Die Qualität ist deutlich schlechter als auf den Fotos.', 'Beschädigt angekommen und der Support war langsam.', 'Zu teuer für das, was man bekommt.'],
    ],
  },
};

/** Ratings 1 to 5, skewed to the high end like real review data. */
const RATING_WEIGHTS = [
  [5, 38],
  [4, 27],
  [3, 15],
  [2, 10],
  [1, 10],
];

const pickRating = (random) => {
  let roll = random() * 100;
  for (const [rating, weight] of RATING_WEIGHTS) {
    roll -= weight;
    if (roll < 0) return rating;
  }
  return 5;
};

const band = (rating) => (rating >= 4 ? 'high' : rating === 3 ? 'mid' : 'low');

/** The key for the n-th seeded review, `seed-review-001`. */
export const keyFor = (n) => `${KEY_PREFIX}${String(n).padStart(3, '0')}`;

/**
 * The drafts for the reviews numbered `from` to `to` (inclusive), each with the
 * final state it should end in: `pending-approval`, or with `spread` about
 * 30 % `approved` and 15 % `rejected`.
 */
export function buildReviews({ from, to, productIds, random, spread }) {
  const reviews = [];
  for (let n = from; n <= to; n += 1) {
    const rating = pickRating(random);
    const locale = random() < 0.65 ? 'en' : 'de';
    const [titles, bodies] = CONTENT[locale][band(rating)];
    const roll = random();
    reviews.push({
      draft: {
        key: keyFor(n),
        target: { typeId: 'product', id: pick(random, productIds) },
        rating,
        title: pick(random, titles),
        text: pick(random, bodies),
        authorName: pick(random, NAMES),
        locale,
        state: { typeId: 'state', key: PENDING },
      },
      finalState: spread ? (roll < 0.3 ? 'approved' : roll < 0.45 ? 'rejected' : PENDING) : PENDING,
    });
  }
  return reviews;
}

/** Highest number among the existing seeded keys (0 when there are none). */
export const highestSeeded = (keys) =>
  keys
    .filter((key) => key?.startsWith(KEY_PREFIX))
    .map((key) => Number(key.slice(KEY_PREFIX.length)))
    .filter(Number.isInteger)
    .reduce((max, n) => Math.max(max, n), 0);

export function summarize(reviews) {
  const byRating = {};
  const byState = {};
  for (const { draft, finalState } of reviews) {
    byRating[draft.rating] = (byRating[draft.rating] ?? 0) + 1;
    byState[finalState] = (byState[finalState] ?? 0) + 1;
  }
  return { byRating, byState };
}

const POOL = 5;

/** Runs `task` for every item, a few at a time. */
async function pool(items, task) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(POOL, items.length) }, async () => {
      while (next < items.length) {
        const item = items[next];
        next += 1;
        await task(item);
      }
    })
  );
}

export function reviewApi(call) {
  return {
    listSeeded: async () => {
      const found = [];
      for (let offset = 0; offset < 10000; offset += 500) {
        const page = await call('GET', `/reviews?limit=500&offset=${offset}&sort=createdAt%20asc`);
        found.push(...page.results.filter((review) => review.key?.startsWith(KEY_PREFIX)));
        if (page.results.length < 500) break;
      }
      return found;
    },
    listProductIds: async () =>
      (await call('GET', '/products?limit=500')).results.map((product) => product.id),
    listStateKeys: async () =>
      (await call('GET', `/states?where=${encodeURIComponent('type="ReviewState"')}&limit=500`)).results.map(
        (state) => state.key
      ),
    create: (draft) => call('POST', '/reviews', draft),
    transition: (key, version, stateKey) =>
      call('POST', `/reviews/key=${encodeURIComponent(key)}`, {
        version,
        actions: [{ action: 'transitionState', state: { typeId: 'state', key: stateKey } }],
      }),
    remove: (key, version) => call('DELETE', `/reviews/key=${encodeURIComponent(key)}?version=${version}`),
  };
}

export async function run(api, { count = 100, spread = false, seed = Date.now(), apply = false, remove = false, log = console.log }) {
  const existing = await api.listSeeded();
  log(`Found ${existing.length} seeded review(s) (key ${KEY_PREFIX}*).`);

  if (remove) {
    log(`To delete: ${existing.length} seeded review(s).`);
    if (!apply) return log('Dry run. Nothing deleted; run with --apply to delete.');
    await pool(existing, (review) => api.remove(review.key, review.version));
    return log(`Deleted ${existing.length}.`);
  }

  const missing = count - existing.length;
  if (missing <= 0) return log(`Already ${existing.length} (wanted ${count}). Nothing to create.`);

  const [productIds, stateKeys] = await Promise.all([api.listProductIds(), api.listStateKeys()]);
  if (productIds.length === 0) throw new Error('The project has no products to review.');
  if (!stateKeys.includes(PENDING)) {
    throw new Error(`The state "${PENDING}" does not exist. Run scripts/seed-review-states.mjs --apply first.`);
  }

  const from = highestSeeded(existing.map((review) => review.key)) + 1;
  const reviews = buildReviews({ from, to: from + missing - 1, productIds, random: rng(seed), spread });
  const { byRating, byState } = summarize(reviews);
  log(`To create: ${reviews.length} review(s) on ${productIds.length} product(s), seed ${seed}.`);
  log(`  by rating: ${JSON.stringify(byRating)}`);
  log(`  by final state: ${JSON.stringify(byState)}`);
  if (!apply) return log('Dry run. Nothing written; run with --apply to write.');

  let failed = 0;
  await pool(reviews, async ({ draft, finalState }) => {
    try {
      const created = await api.create(draft);
      if (finalState !== PENDING) await api.transition(draft.key, created.version, finalState);
    } catch (error) {
      failed += 1;
      log(`Failed ${draft.key}: ${error.message}`);
    }
  });
  log(`Created ${reviews.length - failed} of ${reviews.length}${failed ? ` (${failed} failed)` : ''}.`);
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  const valueOf = (flag, fallback) => {
    const at = args.indexOf(flag);
    return at === -1 ? fallback : Number(args[at + 1]);
  };
  try {
    const settings = loadEnv();
    const { call } = createClient({
      ...settings,
      defaultScopes: (key) => `manage_products:${key} view_products:${key} view_states:${key}`,
    });
    await run(reviewApi(call), {
      count: valueOf('--count', 100),
      seed: valueOf('--seed', Date.now()),
      spread: args.includes('--spread'),
      apply: args.includes('--apply'),
      remove: args.includes('--delete'),
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
