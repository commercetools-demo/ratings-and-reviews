/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { IntlShape } from 'react-intl';
import type { useShowNotification } from '@commercetools-frontend/actions-global';
import { DOMAINS } from '@commercetools-frontend/constants';
import messages from './messages';

export type ErrorKind = 'conflict' | 'forbidden' | 'network' | 'unknown';

type ErrorLike = {
  graphQLErrors?: ReadonlyArray<{
    message?: string;
    extensions?: { code?: string } & Record<string, unknown>;
  }>;
  networkError?: unknown;
};

const FORBIDDEN_CODES = [
  'access_denied',
  'insufficient_scope',
  'forbidden',
  'Forbidden',
];

/** Maps an Apollo or GraphQL error to what the user needs to know. */
export function classifyError(error: unknown): ErrorKind {
  const { graphQLErrors, networkError } = (error ?? {}) as ErrorLike;
  const codes = (graphQLErrors ?? []).map((e) => e.extensions?.code);
  if (codes.includes('ConcurrentModification')) return 'conflict';
  if (codes.some((code) => code && FORBIDDEN_CODES.includes(code))) {
    return 'forbidden';
  }
  const networkStatus = (networkError as { statusCode?: number } | undefined)
    ?.statusCode;
  if (networkStatus === 403) return 'forbidden';
  if (networkError && !(graphQLErrors && graphQLErrors.length)) {
    return 'network';
  }
  return 'unknown';
}

export const isConflict = (error: unknown): boolean =>
  classifyError(error) === 'conflict';

export function describeError(intl: IntlShape, error: unknown): string {
  switch (classifyError(error)) {
    case 'conflict':
      return intl.formatMessage(messages.errorConflict);
    case 'forbidden':
      return intl.formatMessage(messages.errorForbidden);
    case 'network':
      return intl.formatMessage(messages.errorNetwork);
    default:
      return intl.formatMessage(messages.errorUnknown);
  }
}

type ShowNotification = ReturnType<typeof useShowNotification>;

/** Wraps a mutation's failure: a readable notification, never a raw error. */
export function graphQLErrorHandler(
  showNotification: ShowNotification,
  intl: IntlShape
) {
  return (error: unknown) => {
    showNotification({
      domain: DOMAINS.SIDE,
      kind: 'error',
      text: describeError(intl, error),
    });
  };
}
