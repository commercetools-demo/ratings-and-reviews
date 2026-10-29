/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { createIntl } from 'react-intl';
import {
  classifyError,
  describeError,
  graphQLErrorHandler,
} from './error-handling';

const intl = createIntl({ locale: 'en' });
const gql = (code: string) => ({
  graphQLErrors: [{ message: 'x', extensions: { code } }],
});

describe('classifyError', () => {
  it('recognises a stale version', () => {
    expect(classifyError(gql('ConcurrentModification'))).toBe('conflict');
  });
  it('recognises missing permission', () => {
    expect(classifyError(gql('access_denied'))).toBe('forbidden');
    expect(classifyError({ networkError: { statusCode: 403 } })).toBe(
      'forbidden'
    );
  });
  it('recognises an unreachable network', () => {
    expect(classifyError({ networkError: new Error('offline') })).toBe(
      'network'
    );
  });
  it('falls back to unknown', () => {
    expect(classifyError(gql('Other'))).toBe('unknown');
    expect(classifyError(undefined)).toBe('unknown');
  });
});

describe('describeError', () => {
  it('never shows the raw error', () => {
    expect(describeError(intl, gql('Other'))).toBe(
      'Something went wrong. Please try again.'
    );
    expect(describeError(intl, gql('ConcurrentModification'))).toMatch(
      /already changed/
    );
  });
});

describe('graphQLErrorHandler', () => {
  it('shows an error notification with a readable text', () => {
    const show = jest.fn();
    graphQLErrorHandler(show, intl)(gql('ConcurrentModification'));
    expect(show).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'error',
        text: expect.stringMatching(/already changed/),
      })
    );
  });
});
