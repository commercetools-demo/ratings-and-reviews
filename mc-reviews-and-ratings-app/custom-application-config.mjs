/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { PERMISSIONS } from './src/constants';

/**
 * @type {import('@commercetools-frontend/application-config').ConfigOptionsForCustomApplication}
 */
const config = {
  name: 'Reviews and Ratings',
  description: 'Moderate product reviews and ratings',
  entryPointUriPath: '${env:ENTRY_POINT_URI_PATH}',
  cloudIdentifier: '${env:CLOUD_IDENTIFIER}',
  env: {
    development: {
      initialProjectKey: '${env:INITIAL_PROJECT_KEY}',
    },
    production: {
      applicationId: '${env:CUSTOM_APPLICATION_ID}',
      url: '${env:APPLICATION_URL}',
    },
  },
  // Reviews and product names: products scopes; reviewer email: customers;
  // review states and their transitions: states (research R2, task T048).
  // The registration in the Merchant Center must carry the same list.
  oAuthScopes: {
    view: ['view_products', 'view_customers', 'view_states'],
    manage: ['manage_products'],
  },
  icon: '${path:@commercetools-frontend/assets/application-icons/star.svg}',
  mainMenuLink: {
    defaultLabel: 'Reviews and ratings',
    labelAllLocales: [
      { locale: 'de', value: 'Bewertungen und Rezensionen' },
      { locale: 'en', value: 'Reviews and ratings' },
    ],
    permissions: [PERMISSIONS.View],
  },
  submenuLinks: [],
};

export default config;
