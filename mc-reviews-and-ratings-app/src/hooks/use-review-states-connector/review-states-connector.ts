/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useMemo } from 'react';
import { useMcQuery } from '@commercetools-frontend/application-shell';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import type { ReviewStateInfo } from '../../types/comment';
import { acceptLanguages } from '../use-comments-connector/conversion';
import { mcApiContext } from '../shared/mc-api-context';
import ReviewStatesQuery from './fetch-all.graphql';

type RawReviewState = {
  id: string;
  key: string;
  initial: boolean;
  name?: string | null;
};

/** Initial states first, then the order the project created them in. */
export function toReviewStates(results: RawReviewState[]): ReviewStateInfo[] {
  const states = results.map((raw) => ({
    id: raw.id,
    key: raw.key,
    label: raw.name || raw.key,
    initial: raw.initial,
  }));
  return [
    ...states.filter((state) => state.initial),
    ...states.filter((state) => !state.initial),
  ];
}

/**
 * The language variable every localized read needs. The API takes exactly one
 * of `locale` and `acceptLanguage` per localized field; `acceptLanguage` also
 * falls back through the project's languages.
 */
export function useLocaleVariables() {
  const dataLocale = useApplicationContext((context) => context.dataLocale);
  const languages = useApplicationContext(
    (context) => context.project?.languages
  );
  return useMemo(
    () => ({
      acceptLanguage: acceptLanguages(dataLocale ?? 'en', languages ?? []),
    }),
    [dataLocale, languages]
  );
}

export function useReviewStates() {
  const variables = useLocaleVariables();
  const { data, loading, error, refetch } = useMcQuery<{
    states: { results: RawReviewState[] };
  }>(ReviewStatesQuery, {
    variables,
    context: mcApiContext,
  });
  const states = useMemo(
    () => toReviewStates(data?.states.results ?? []),
    [data]
  );
  return { states, loading, error, refetch };
}
