/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { ReactElement } from 'react';
import { IntlProvider } from 'react-intl';
import { setupServer } from 'msw/node';
import { createApolloClient } from '@commercetools-frontend/application-shell';
import {
  mapResourceAccessToAppliedPermissions,
  renderAppWithRedux,
  screen,
  waitFor,
  within,
} from '@commercetools-frontend/application-shell/test-utils';
import { NimbusProvider } from '@commercetools/nimbus';
import { PERMISSIONS, entryPointUriPath } from '../constants';
import { CommentsQueryProvider } from '../hooks/query-state-context';
import de from '../i18n/data/de.json';
import en from '../i18n/data/en.json';

export const PROJECT_KEY = 'reviews-and-ratings-test';
export const APP_ROOT = `/${PROJECT_KEY}/${entryPointUriPath}`;

export type RenderCommentsOptions = {
  /** Manage permission (View is always granted). Defaults to true. */
  canManage?: boolean;
  /** UI language. */
  locale?: string;
  /** Merchant Center data locale. Defaults to `locale`. */
  dataLocale?: string;
  languages?: string[];
};

/** Renders a component with the app's providers in the Merchant Center test shell. */
export function renderComments(
  ui: ReactElement,
  options: RenderCommentsOptions = {}
) {
  const locale = options.locale ?? 'en';
  const permissions = [
    PERMISSIONS.View,
    ...(options.canManage === false ? [] : [PERMISSIONS.Manage]),
  ];
  return renderAppWithRedux(
    <IntlProvider locale={locale} messages={locale.startsWith('de') ? de : en}>
      <NimbusProvider locale={locale} loadFonts={false}>
        <CommentsQueryProvider>{ui}</CommentsQueryProvider>
      </NimbusProvider>
    </IntlProvider>,
    {
      route: APP_ROOT,
      locale,
      dataLocale: options.dataLocale ?? locale,
      environment: { entryPointUriPath },
      apolloClient: createApolloClient(),
      project: {
        key: PROJECT_KEY,
        languages: options.languages ?? ['en', 'de'],
        allAppliedPermissions:
          mapResourceAccessToAppliedPermissions(permissions),
      },
      user: { language: locale },
    }
  );
}

/** One msw server per spec file; unhandled requests fail the test. */
export function setupMockServer() {
  const server = setupServer();
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  return server;
}

export { screen, waitFor, within };
