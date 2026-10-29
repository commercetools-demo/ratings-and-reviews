/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import fs from 'fs';
import path from 'path';
import {
  buildClientSchema,
  parse,
  validate,
  type GraphQLSchema,
  type IntrospectionQuery,
} from 'graphql';

const HOOKS_DIR = __dirname;
const SCHEMA_FILE = path.resolve(__dirname, '../../schemas/ctp.json');

const graphqlFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return graphqlFiles(full);
    return entry.name.endsWith('.graphql') ? [full] : [];
  });

/** The file's text followed by the text of every `#import`ed file. */
function resolveImports(file: string, seen = new Set<string>()): string {
  if (seen.has(file)) return '';
  seen.add(file);
  const source = fs.readFileSync(file, 'utf8');
  const imported = [...source.matchAll(/^#import\s+"([^"]+)"/gm)].map((match) =>
    resolveImports(path.resolve(path.dirname(file), match[1]), seen)
  );
  return [source, ...imported].join('\n');
}

const files = graphqlFiles(HOOKS_DIR);

describe('GraphQL documents under src/hooks', () => {
  it('finds documents', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  // The platform rejects a localized field that gets both `locale` and
  // `acceptLanguage` ("Exactly one of the arguments is required") at runtime,
  // while the schema marks both as optional, so validation cannot catch it.
  it('never passes both locale and acceptLanguage to one field', () => {
    const offenders = files
      .filter((file) =>
        /\(\s*[^)]*\blocale:[^)]*\bacceptLanguage:|\(\s*[^)]*\bacceptLanguage:[^)]*\blocale:/.test(
          fs.readFileSync(file, 'utf8')
        )
      )
      .map((file) => path.relative(HOOKS_DIR, file));
    expect(offenders).toEqual([]);
  });

  it.each(files.map((file) => [path.relative(HOOKS_DIR, file), file]))(
    'parses %s with its imports',
    (_name, file) => {
      expect(() => parse(resolveImports(file))).not.toThrow();
    }
  );

  const schemaAvailable = fs.existsSync(SCHEMA_FILE);
  const validation = schemaAvailable ? it.each : it.skip.each;
  let schema: GraphQLSchema | undefined;
  if (schemaAvailable) {
    const parsed = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));
    schema = buildClientSchema((parsed.data ?? parsed) as IntrospectionQuery);
  } else {
    console.info(
      'schemas/ctp.json is missing: documents are parsed but not validated against the schema.'
    );
  }

  const operations = files.filter(
    (file) => !file.includes(`${path.sep}fragments${path.sep}`)
  );
  validation(operations.map((file) => [path.relative(HOOKS_DIR, file), file]))(
    'validates %s against schemas/ctp.json',
    (_name, file) => {
      const errors = validate(
        schema as GraphQLSchema,
        parse(resolveImports(file))
      );
      expect(errors.map((error) => error.message)).toEqual([]);
    }
  );
});
