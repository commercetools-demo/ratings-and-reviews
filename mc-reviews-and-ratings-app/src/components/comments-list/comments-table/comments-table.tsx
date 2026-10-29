/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import type { FC } from 'react';
import './comments-table.css';
import { useIntl } from 'react-intl';
import {
  DataTable,
  Stack,
  Text,
  VisuallyHidden,
  type DataTableColumnItem,
  type DataTableRowItem,
} from '@commercetools/nimbus';
import type { SortKey, SortState } from '../../../domain/query-state';
import type { Comment } from '../../../types/comment';
import {
  RatingDisplay,
  StateBadge,
  useFallbacks,
} from '../../shared/comment-display';
import sharedMessages from '../../shared/messages';
import messages from './messages';

type Row = DataTableRowItem<{ comment: Comment; position: number }>;

const SORT_DIRECTION = { asc: 'ascending', desc: 'descending' } as const;
const SORTABLE: SortKey[] = ['createdAt', 'rating', 'authorName'];

type CommentsTableProps = {
  comments: Comment[];
  initialStateIds: ReadonlySet<string>;
  sort: SortState;
  onSortChange: (key: SortKey) => void;
  onOpen: (commentId: string) => void;
  selectedIds: ReadonlySet<string>;
  onSelectionChange: (ids: Set<string>) => void;
};

const CommentsTable: FC<CommentsTableProps> = ({
  comments,
  initialStateIds,
  sort,
  onSortChange,
  onOpen,
  selectedIds,
  onSelectionChange,
}) => {
  const intl = useIntl();
  const fallback = useFallbacks();

  // The rows arrive in their final order from the server. The table sorts by
  // the accessor, so a sortable column answers with the row's position
  // (mirrored for descending) and keeps that order.
  const position = (row: Row) =>
    sort.direction === 'asc' ? row.position : -row.position;
  const sortable = { isSortable: true, accessor: position } as const;
  const plain = { isSortable: false } as const;

  const columns: DataTableColumnItem<Row>[] = [
    {
      id: 'comment',
      header: intl.formatMessage(messages.columnComment),
      minWidth: 260,
      ...plain,
      accessor: (row) => row.comment.title,
      isRowHeader: true,
      render: ({ row }) => (
        <Stack gap="50" minWidth={0}>
          <Text fontWeight="600" truncate>
            {fallback.title(row.comment)}
          </Text>
          <Text fontSize="300" color="neutral.11" truncate>
            {row.comment.text}
          </Text>
        </Stack>
      ),
    },
    {
      id: 'authorName',
      header: intl.formatMessage(messages.columnReviewer),
      width: 150,
      minWidth: 150,
      ...sortable,
      render: ({ row }) => (
        <Text truncate>{fallback.reviewer(row.comment)}</Text>
      ),
    },
    {
      id: 'product',
      header: intl.formatMessage(messages.columnProduct),
      width: 160,
      minWidth: 160,
      ...plain,
      accessor: (row) => row.comment.productName ?? '',
      render: ({ row }) => (
        <Text truncate>{fallback.product(row.comment)}</Text>
      ),
    },
    {
      id: 'rating',
      header: intl.formatMessage(messages.columnRating),
      width: 100,
      minWidth: 100,
      ...sortable,
      render: ({ row }) => <RatingDisplay rating={row.comment.rating} />,
    },
    {
      id: 'locale',
      header: intl.formatMessage(messages.columnLanguage),
      width: 110,
      minWidth: 110,
      ...plain,
      accessor: (row) => row.comment.locale ?? '',
      render: ({ row }) => <Text>{row.comment.locale ?? '–'}</Text>,
    },
    {
      id: 'createdAt',
      header: intl.formatMessage(messages.columnSubmitted),
      width: 130,
      minWidth: 130,
      ...sortable,
      render: ({ row }) => (
        <Text whiteSpace="nowrap">
          {intl.formatDate(row.comment.createdAt, { dateStyle: 'medium' })}
        </Text>
      ),
    },
    {
      id: 'state',
      header: intl.formatMessage(messages.columnState),
      width: 170,
      minWidth: 170,
      ...plain,
      accessor: (row) => row.comment.state?.label ?? '',
      render: ({ row }) => (
        <StateBadge
          size="xs"
          comment={row.comment}
          isInitial={
            row.comment.state !== null &&
            initialStateIds.has(row.comment.state.id)
          }
        />
      ),
    },
    {
      id: 'counts',
      header: intl.formatMessage(messages.columnCounts),
      width: 90,
      minWidth: 90,
      ...plain,
      accessor: (row) => (row.comment.includedInStatistics ? 1 : 0),
      render: ({ row }) => (
        <Text>
          {intl.formatMessage(
            row.comment.includedInStatistics
              ? sharedMessages.yes
              : sharedMessages.no
          )}
        </Text>
      ),
    },
  ];

  const sortedColumn = columns.find((column) => column.id === sort.key);

  return (
    <div className="comments-table" data-testid="comments-table">
      <VisuallyHidden>
        <span role="status">
          {intl.formatMessage(messages.sortedBy, {
            column: sortedColumn?.header,
            direction: intl.formatMessage(
              sort.direction === 'asc'
                ? messages.ascending
                : messages.descending
            ),
          })}
        </span>
      </VisuallyHidden>
      <DataTable
        aria-label={intl.formatMessage(messages.tableLabel)}
        columns={columns}
        rows={comments.map((comment, index) => ({
          id: comment.id,
          comment,
          position: index,
        }))}
        allowsSorting
        sortDescriptor={{
          column: sort.key,
          direction: SORT_DIRECTION[sort.direction],
        }}
        onSortChange={(descriptor) => {
          const key = descriptor.column as SortKey;
          if (SORTABLE.includes(key)) onSortChange(key);
        }}
        selectionMode="multiple"
        selectedKeys={new Set(selectedIds)}
        onSelectionChange={(keys) =>
          onSelectionChange(
            keys === 'all'
              ? new Set(comments.map((comment) => comment.id))
              : new Set([...keys].map(String))
          )
        }
        allowsPinning={false}
        allowsExpandColumn={false}
        density="condensed"
        onRowClick={(row) => onOpen(row.comment.id)}
      />
    </div>
  );
};

export default CommentsTable;
