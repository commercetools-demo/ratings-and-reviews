/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import core from './data/core.json';
import de from './data/de.json';
import en from './data/en.json';

const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{\s*(\w+)\s*[,}]/g)].map((match) => match[1]).sort();

describe('message catalogs', () => {
  it('keep en.json identical to core.json (extract-intl writes both)', () => {
    expect(en).toEqual(core);
  });

  const enKeys = Object.keys(en).sort();
  const deKeys = Object.keys(de).sort();

  it('carry the same keys in English and German', () => {
    expect(deKeys).toEqual(enKeys);
  });

  it('carry the same placeholders for every key', () => {
    const mismatched = enKeys.filter(
      (key) =>
        JSON.stringify(placeholders((en as Record<string, string>)[key])) !==
        JSON.stringify(placeholders((de as Record<string, string>)[key] ?? ''))
    );
    expect(mismatched).toEqual([]);
  });

  it('have no empty translation', () => {
    const empty = deKeys.filter(
      (key) => !(de as Record<string, string>)[key]?.trim()
    );
    expect(empty).toEqual([]);
  });
});
