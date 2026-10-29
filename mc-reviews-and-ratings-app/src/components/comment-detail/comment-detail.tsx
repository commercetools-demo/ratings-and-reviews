/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { FC, ReactNode } from 'react';
import { useIntl } from 'react-intl';
import { Alert, Drawer, Flex, Stack, Text } from '@commercetools/nimbus';
import { useComment } from '../../hooks/use-comments-connector';
import type { Comment, ReviewStateInfo } from '../../types/comment';
import {
  RatingDisplay,
  StateBadge,
  useFallbacks,
} from '../shared/comment-display';
import sharedMessages from '../shared/messages';
import CommentActions from './comment-actions';
import messages from './messages';

type FieldProps = { label: string; children: ReactNode };

const Field: FC<FieldProps> = ({ label, children }) => (
  <Stack gap="50">
    <Text fontSize="300" color="neutral.11">
      {label}
    </Text>
    {children}
  </Stack>
);

type CommentDetailProps = {
  /** The comment as the list shows it; shown while the detail loads. */
  listed: Comment | null;
  commentId: string | null;
  states: ReviewStateInfo[];
  onClose: () => void;
  /** After a change or a detected conflict: refresh list and counts. */
  onChanged: () => void;
};

const CommentDetail: FC<CommentDetailProps> = ({
  listed,
  commentId,
  states,
  onClose,
  onChanged,
}) => {
  const intl = useIntl();
  const fallback = useFallbacks();
  const detail = useComment(commentId, states);
  const comment = detail.comment ?? listed;
  const isInitial = (c: Comment) =>
    c.state !== null && states.some((s) => s.id === c.state?.id && s.initial);

  return (
    <Drawer.Root
      placement="right"
      isOpen={commentId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{comment ? fallback.title(comment) : ''}</Drawer.Title>
          <Drawer.CloseTrigger
            aria-label={intl.formatMessage(messages.close)}
          />
        </Drawer.Header>
        <Drawer.Body>
          {detail.error && !comment && (
            <Alert.Root colorPalette="critical">
              <Alert.Description>
                {intl.formatMessage(messages.loadError)}
              </Alert.Description>
            </Alert.Root>
          )}
          {comment && (
            <Stack gap="400">
              <Field label={intl.formatMessage(messages.fieldState)}>
                <Flex>
                  <StateBadge
                    comment={comment}
                    isInitial={isInitial(comment)}
                  />
                </Flex>
              </Field>
              <Field label={intl.formatMessage(messages.fieldText)}>
                <Text whiteSpace="pre-wrap">
                  {comment.text || intl.formatMessage(messages.noText)}
                </Text>
              </Field>
              <Field label={intl.formatMessage(messages.fieldRating)}>
                <RatingDisplay rating={comment.rating} />
              </Field>
              <Field label={intl.formatMessage(messages.fieldReviewer)}>
                <Text>{fallback.reviewer(comment)}</Text>
              </Field>
              <Field label={intl.formatMessage(messages.fieldContact)}>
                <Text>
                  {comment.customerEmail ??
                    intl.formatMessage(messages.noContact)}
                </Text>
              </Field>
              <Field label={intl.formatMessage(messages.fieldProduct)}>
                <Text>{fallback.product(comment)}</Text>
              </Field>
              <Field label={intl.formatMessage(messages.fieldLanguage)}>
                <Text>{comment.locale ?? '–'}</Text>
              </Field>
              <Field label={intl.formatMessage(messages.fieldSubmitted)}>
                <Text>
                  {intl.formatDate(comment.createdAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </Text>
              </Field>
              <Field label={intl.formatMessage(messages.fieldChanged)}>
                <Text>
                  {intl.formatDate(comment.lastModifiedAt, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </Text>
              </Field>
              <Field label={intl.formatMessage(messages.fieldCounts)}>
                <Text>
                  {intl.formatMessage(
                    comment.includedInStatistics
                      ? sharedMessages.yes
                      : sharedMessages.no
                  )}
                </Text>
              </Field>
            </Stack>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          {comment && (
            <CommentActions
              comment={comment}
              states={states}
              onChanged={() => {
                detail.refetch();
                onChanged();
              }}
            />
          )}
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer.Root>
  );
};

export default CommentDetail;
