/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { FC } from 'react';
import { useIntl } from 'react-intl';
import { Badge, Tabs } from '@commercetools/nimbus';
import { ALL_STATES } from '../../../domain/query-state';
import type { CommentCounts } from '../../../hooks/use-comments-connector';
import type { ReviewStateInfo } from '../../../types/comment';
import messages from './messages';

type StateTabsProps = {
  states: ReviewStateInfo[];
  counts: CommentCounts;
  selected: string;
  onSelect: (stateId: string) => void;
};

const StateTabs: FC<StateTabsProps> = ({
  states,
  counts,
  selected,
  onSelect,
}) => {
  const intl = useIntl();
  const tabs = [
    { id: ALL_STATES, label: intl.formatMessage(messages.all) },
    ...states.map((state) => ({ id: state.id, label: state.label })),
  ];
  return (
    <Tabs.Root
      selectedKey={selected}
      onSelectionChange={(key) => onSelect(String(key))}
    >
      <Tabs.List aria-label={intl.formatMessage(messages.ariaLabel)}>
        {tabs.map((tab) => (
          <Tabs.Tab key={tab.id} id={tab.id}>
            {tab.label}{' '}
            <Badge size="2xs" colorPalette="neutral">
              {counts[tab.id] ?? '…'}
            </Badge>
          </Tabs.Tab>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
};

export default StateTabs;
