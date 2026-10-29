/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useState, type FC } from 'react';
import { useIntl } from 'react-intl';
import { useShowNotification } from '@commercetools-frontend/actions-global';
import { DOMAINS } from '@commercetools-frontend/constants';
import { Button, Flex, Text } from '@commercetools/nimbus';
import { useCanManage } from '../../../hooks/shared/permissions';
import { useBulkTransition } from '../../../hooks/use-comments-connector';
import type { Comment, ReviewStateInfo } from '../../../types/comment';
import messages from './messages';

type BulkBarProps = {
  selected: Comment[];
  states: ReviewStateInfo[];
  onClear: () => void;
  /** The comments that failed stay selected; everything else is cleared. */
  onDone: (failedIds: string[]) => void;
};

/** One action per non-initial state; disabled, never hidden, without Manage. */
const BulkBar: FC<BulkBarProps> = ({ selected, states, onClear, onDone }) => {
  const intl = useIntl();
  const canManage = useCanManage();
  const showNotification = useShowNotification();
  const bulk = useBulkTransition(states);
  const [running, setRunning] = useState(false);

  const run = async (stateId: string) => {
    setRunning(true);
    try {
      const result = await bulk(selected, stateId);
      showNotification({
        domain: DOMAINS.SIDE,
        kind: result.failed.length > 0 ? 'warning' : 'success',
        text: intl.formatMessage(messages.result, {
          changed: result.changed.length,
          skipped: result.skipped.length,
          failed: result.failed.length,
        }),
      });
      onDone(result.failed.map((failure) => failure.comment.id));
    } finally {
      setRunning(false);
    }
  };

  return (
    <Flex
      gap="300"
      alignItems="center"
      wrap="wrap"
      role="group"
      aria-label={intl.formatMessage(messages.label)}
      data-testid="bulk-bar"
    >
      <Text fontWeight="600">
        {intl.formatMessage(messages.selected, { count: selected.length })}
      </Text>
      {states
        .filter((state) => !state.initial)
        .map((state) => (
          <Button
            key={state.id}
            variant="outline"
            isDisabled={!canManage || running}
            onPress={() => run(state.id)}
          >
            {intl.formatMessage(messages.moveTo, { state: state.label })}
          </Button>
        ))}
      <Button variant="ghost" isDisabled={running} onPress={onClear}>
        {intl.formatMessage(messages.clear)}
      </Button>
    </Flex>
  );
};

export default BulkBar;
