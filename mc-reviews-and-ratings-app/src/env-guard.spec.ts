/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import fs from 'fs';
import path from 'path';

describe('environment guard', () => {
  const srcDir = __dirname;
  const production: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (
        /\.(ts|tsx)$/.test(entry.name) &&
        !/\.spec\.(ts|tsx)$/.test(entry.name) &&
        !full.includes(`${path.sep}test-utils${path.sep}`) &&
        !full.includes(`${path.sep}types${path.sep}generated`)
      ) {
        production.push(full);
      }
    }
  };
  walk(srcDir);

  it('only constants.ts reads process.env', () => {
    const offenders = production
      .filter((file) => /process\.env/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.basename(file))
      .filter((name) => name !== 'constants.ts');
    expect(offenders).toEqual([]);
  });
});
