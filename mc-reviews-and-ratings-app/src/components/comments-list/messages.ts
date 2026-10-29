/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineMessages } from 'react-intl';

export default defineMessages({
  loadErrorTitle: {
    id: 'ReviewsAndRatings.list.loadErrorTitle',
    defaultMessage: 'The comments could not be loaded',
  },
  statesErrorTitle: {
    id: 'ReviewsAndRatings.list.statesErrorTitle',
    defaultMessage: 'The comment states could not be loaded',
  },
  emptyTitle: {
    id: 'ReviewsAndRatings.list.emptyTitle',
    defaultMessage: 'Nothing to moderate yet',
  },
  emptyBody: {
    id: 'ReviewsAndRatings.list.emptyBody',
    defaultMessage: 'Comments that shoppers write will show up here.',
  },
  emptyFiltered: {
    id: 'ReviewsAndRatings.list.emptyFiltered',
    defaultMessage: 'No comments match the current filter or search.',
  },
  resetFilters: {
    id: 'ReviewsAndRatings.list.resetFilters',
    defaultMessage: 'Reset search and filter',
  },
  total: {
    id: 'ReviewsAndRatings.list.total',
    defaultMessage: '{count, plural, one {# comment} other {# comments}}',
  },
  pagination: {
    id: 'ReviewsAndRatings.list.pagination',
    defaultMessage: 'Comments pagination',
  },
  offsetLimit: {
    id: 'ReviewsAndRatings.list.offsetLimit',
    defaultMessage:
      'Only the first {count} comments can be paged through. Narrow the list with a state filter or search.',
  },
});
