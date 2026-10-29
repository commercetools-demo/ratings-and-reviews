/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { ComponentProps, FC } from 'react';
import { useIntl } from 'react-intl';
import { Badge, Text } from '@commercetools/nimbus';
import type { Comment } from '../../types/comment';
import messages from './messages';

type RatingDisplayProps = { rating: number | null };

export const RatingDisplay: FC<RatingDisplayProps> = ({ rating }) => {
  const intl = useIntl();
  return rating === null ? (
    <Text color="neutral.11">{intl.formatMessage(messages.notRated)}</Text>
  ) : (
    <Text whiteSpace="nowrap">
      {intl.formatMessage(messages.rating, { rating })}
    </Text>
  );
};

export type StateTone = 'warning' | 'positive' | 'neutral';

/** Initial states ask for attention; a state that counts is positive. */
export const stateTone = (comment: Comment, isInitial: boolean): StateTone =>
  isInitial ? 'warning' : comment.includedInStatistics ? 'positive' : 'neutral';

type StateBadgeProps = {
  comment: Comment;
  isInitial: boolean;
  size?: ComponentProps<typeof Badge>['size'];
};

export const StateBadge: FC<StateBadgeProps> = ({
  comment,
  isInitial,
  size,
}) => {
  const intl = useIntl();
  return (
    <Badge size={size} colorPalette={stateTone(comment, isInitial)}>
      {comment.state?.label ?? intl.formatMessage(messages.noState)}
    </Badge>
  );
};

/** Name and product with their fallback labels (FR-013). */
export const useFallbacks = () => {
  const intl = useIntl();
  return {
    reviewer: (comment: Comment) =>
      comment.authorName ?? intl.formatMessage(messages.reviewerFallback),
    product: (comment: Comment) =>
      comment.productName ?? intl.formatMessage(messages.productFallback),
    title: (comment: Comment) =>
      comment.title || intl.formatMessage(messages.noTitle),
  };
};
