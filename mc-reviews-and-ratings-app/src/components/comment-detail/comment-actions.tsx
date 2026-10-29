/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { FC } from 'react';
import { useIntl } from 'react-intl';
import { useShowNotification } from '@commercetools-frontend/actions-global';
import { DOMAINS } from '@commercetools-frontend/constants';
import { Button, Flex, Stack, Text } from '@commercetools/nimbus';
import { useCanManage } from '../../hooks/shared/permissions';
import {
  graphQLErrorHandler,
  isConflict,
} from '../../hooks/shared/error-handling';
import { useTransitionComment } from '../../hooks/use-comments-connector';
import type { Comment, ReviewStateInfo } from '../../types/comment';
import messages from './messages';

type CommentActionsProps = {
  comment: Comment;
  states: ReviewStateInfo[];
  /** Called after a successful change and after a conflict was detected. */
  onChanged: () => void;
};

/**
 * One button per entry of the comment's own transitions (constitution IX),
 * disabled, never hidden, without Manage permission.
 */
const CommentActions: FC<CommentActionsProps> = ({
  comment,
  states,
  onChanged,
}) => {
  const intl = useIntl();
  const canManage = useCanManage();
  const showNotification = useShowNotification();
  const { transition, loading } = useTransitionComment(states);

  const move = async (stateId: string) => {
    try {
      const updated = await transition(comment, stateId);
      showNotification({
        domain: DOMAINS.SIDE,
        kind: 'success',
        text: intl.formatMessage(messages.moved, {
          state: updated.state?.label ?? '',
        }),
      });
      onChanged();
    } catch (error) {
      graphQLErrorHandler(showNotification, intl)(error);
      // A stale version: show what the comment looks like now.
      if (isConflict(error)) onChanged();
    }
  };

  return (
    <Stack
      gap="200"
      role="group"
      aria-label={intl.formatMessage(messages.actionsLabel)}
    >
      {comment.transitions.length === 0 ? (
        <Text color="neutral.11">{intl.formatMessage(messages.noActions)}</Text>
      ) : (
        <Flex gap="200" wrap="wrap">
          {comment.transitions.map((target) => (
            <Button
              key={target.id}
              variant="outline"
              isDisabled={!canManage || loading}
              onPress={() => move(target.id)}
            >
              {intl.formatMessage(messages.actionTo, { state: target.label })}
            </Button>
          ))}
        </Flex>
      )}
    </Stack>
  );
};

export default CommentActions;
