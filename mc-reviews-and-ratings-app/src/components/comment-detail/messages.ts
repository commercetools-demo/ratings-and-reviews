/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { defineMessages } from 'react-intl';

export default defineMessages({
  close: { id: 'ReviewsAndRatings.detail.close', defaultMessage: 'Close' },
  loadError: {
    id: 'ReviewsAndRatings.detail.loadError',
    defaultMessage: 'The comment could not be loaded.',
  },
  fieldText: {
    id: 'ReviewsAndRatings.detail.fieldText',
    defaultMessage: 'Comment',
  },
  fieldRating: {
    id: 'ReviewsAndRatings.detail.fieldRating',
    defaultMessage: 'Rating',
  },
  fieldReviewer: {
    id: 'ReviewsAndRatings.detail.fieldReviewer',
    defaultMessage: 'Reviewer',
  },
  fieldContact: {
    id: 'ReviewsAndRatings.detail.fieldContact',
    defaultMessage: 'Contact',
  },
  fieldProduct: {
    id: 'ReviewsAndRatings.detail.fieldProduct',
    defaultMessage: 'Product',
  },
  fieldLanguage: {
    id: 'ReviewsAndRatings.detail.fieldLanguage',
    defaultMessage: 'Language',
  },
  fieldSubmitted: {
    id: 'ReviewsAndRatings.detail.fieldSubmitted',
    defaultMessage: 'Submitted',
  },
  fieldChanged: {
    id: 'ReviewsAndRatings.detail.fieldChanged',
    defaultMessage: 'Last changed',
  },
  fieldState: {
    id: 'ReviewsAndRatings.detail.fieldState',
    defaultMessage: 'State',
  },
  fieldCounts: {
    id: 'ReviewsAndRatings.detail.fieldCounts',
    defaultMessage: 'Counts toward the product rating',
  },
  noContact: {
    id: 'ReviewsAndRatings.detail.noContact',
    defaultMessage: 'No contact on file',
  },
  noText: { id: 'ReviewsAndRatings.detail.noText', defaultMessage: 'No text' },
  actionsLabel: {
    id: 'ReviewsAndRatings.detail.actionsLabel',
    defaultMessage: 'Moderation',
  },
  actionTo: {
    id: 'ReviewsAndRatings.detail.actionTo',
    defaultMessage: 'Move to {state}',
  },
  noActions: {
    id: 'ReviewsAndRatings.detail.noActions',
    defaultMessage: 'No state change is available for this comment.',
  },
  moved: {
    id: 'ReviewsAndRatings.detail.moved',
    defaultMessage: 'The comment is now “{state}”.',
  },
});
