/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineMessages } from 'react-intl';

export default defineMessages({
  errorConflict: {
    id: 'ReviewsAndRatings.errors.conflict',
    defaultMessage:
      'This comment has already changed since you last viewed it. Its current state is shown.',
  },
  errorForbidden: {
    id: 'ReviewsAndRatings.errors.forbidden',
    defaultMessage: 'You do not have permission to do this.',
  },
  errorNetwork: {
    id: 'ReviewsAndRatings.errors.network',
    defaultMessage:
      'The Merchant Center could not be reached. Check your connection and try again.',
  },
  errorUnknown: {
    id: 'ReviewsAndRatings.errors.unknown',
    defaultMessage: 'Something went wrong. Please try again.',
  },
});
