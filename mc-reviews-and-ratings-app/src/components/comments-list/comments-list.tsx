/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useEffect, useMemo, useState, type FC } from 'react';
import { useIntl } from 'react-intl';
import {
  Alert,
  Badge,
  Button,
  DefaultPage,
  Icon,
  Pagination,
  Skeleton,
  Stack,
  Text,
} from '@commercetools/nimbus';
import { Visibility } from '@commercetools/nimbus-icons';
import { MAX_OFFSET_RESULTS, PAGE_SIZES } from '../../constants';
import { ALL_STATES } from '../../domain/query-state';
import { useCommentsQuery } from '../../hooks/query-state-context';
import { useCanManage } from '../../hooks/shared/permissions';
import { describeError } from '../../hooks/shared/error-handling';
import {
  useCommentCounts,
  useComments,
} from '../../hooks/use-comments-connector';
import { useReviewStates } from '../../hooks/use-review-states-connector';
import sharedMessages from '../shared/messages';
import CommentDetail from '../comment-detail/comment-detail';
import BulkBar from './bulk-bar/bulk-bar';
import CommentsTable from './comments-table/comments-table';
import messages from './messages';
import SearchBar from './search-bar/search-bar';
import StateTabs from './state-tabs/state-tabs';

const LoadingRows: FC = () => {
  const intl = useIntl();
  return (
    <Stack
      gap="100"
      role="status"
      aria-label={intl.formatMessage(sharedMessages.loading)}
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} height="56px" />
      ))}
    </Stack>
  );
};

type ErrorBannerProps = { title: string; error: unknown; onRetry: () => void };

const ErrorBanner: FC<ErrorBannerProps> = ({ title, error, onRetry }) => {
  const intl = useIntl();
  return (
    <Alert.Root colorPalette="critical">
      <Alert.Title>{title}</Alert.Title>
      <Alert.Description>{describeError(intl, error)}</Alert.Description>
      <Alert.Actions>
        <Button size="xs" variant="outline" onPress={onRetry}>
          {intl.formatMessage(sharedMessages.retry)}
        </Button>
      </Alert.Actions>
    </Alert.Root>
  );
};

const CommentsList: FC = () => {
  const intl = useIntl();
  const canManage = useCanManage();
  const { query, dispatch } = useCommentsQuery();
  const reviewStates = useReviewStates();
  const { states } = reviewStates;
  const list = useComments(states);
  const counts = useCommentCounts(states);
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // The selection belongs to the page on screen (spec FR-009).
  useEffect(() => {
    setSelectedIds(new Set());
  }, [
    query.stateId,
    query.search,
    query.page,
    query.pageSize,
    query.sort.key,
    query.sort.direction,
  ]);

  const initialStateIds = useMemo(
    () => new Set(states.filter((state) => state.initial).map((s) => s.id)),
    [states]
  );
  const filtered = query.stateId !== ALL_STATES || query.search.trim() !== '';
  const shownTotal = Math.min(list.total, MAX_OFFSET_RESULTS);

  return (
    <DefaultPage.Root>
      <DefaultPage.Header>
        <DefaultPage.Title>
          {intl.formatMessage(sharedMessages.appTitle)}
        </DefaultPage.Title>
        <DefaultPage.Actions>
          {!canManage && (
            <Badge colorPalette="neutral">
              <Icon size="xs">
                <Visibility />
              </Icon>
              {intl.formatMessage(sharedMessages.viewOnly)}
            </Badge>
          )}
        </DefaultPage.Actions>
      </DefaultPage.Header>
      <DefaultPage.Content>
        <Stack gap="400">
          {reviewStates.error ? (
            <ErrorBanner
              title={intl.formatMessage(messages.statesErrorTitle)}
              error={reviewStates.error}
              onRetry={() => reviewStates.refetch()}
            />
          ) : reviewStates.loading ? (
            <LoadingRows />
          ) : (
            <>
              <StateTabs
                states={states}
                counts={counts.counts}
                selected={query.stateId}
                onSelect={(stateId) =>
                  dispatch({ type: 'selectState', stateId })
                }
              />

              <SearchBar
                value={query.search}
                capped={list.capped}
                onSearch={(search) => dispatch({ type: 'search', search })}
              />

              {list.error ? (
                <ErrorBanner
                  title={intl.formatMessage(messages.loadErrorTitle)}
                  error={list.error}
                  onRetry={list.refetch}
                />
              ) : !list.hasData ? (
                <LoadingRows />
              ) : list.total === 0 ? (
                <Stack gap="200" alignItems="center" py="800">
                  <Text fontWeight="600">
                    {intl.formatMessage(
                      filtered ? messages.emptyFiltered : messages.emptyTitle
                    )}
                  </Text>
                  {filtered ? (
                    <Button
                      variant="outline"
                      onPress={() => dispatch({ type: 'reset' })}
                    >
                      {intl.formatMessage(messages.resetFilters)}
                    </Button>
                  ) : (
                    <Text color="neutral.11">
                      {intl.formatMessage(messages.emptyBody)}
                    </Text>
                  )}
                </Stack>
              ) : (
                <>
                  <Text color="neutral.11" data-testid="comments-total">
                    {intl.formatMessage(messages.total, {
                      count: list.total,
                    })}
                  </Text>
                  {selectedIds.size > 0 && (
                    <BulkBar
                      selected={list.comments.filter((c) =>
                        selectedIds.has(c.id)
                      )}
                      states={states}
                      onClear={() => setSelectedIds(new Set())}
                      onDone={(failedIds) => {
                        setSelectedIds(new Set(failedIds));
                        list.refetch();
                        counts.refresh();
                      }}
                    />
                  )}
                  <CommentsTable
                    comments={list.comments}
                    initialStateIds={initialStateIds}
                    sort={query.sort}
                    onSortChange={(key) => dispatch({ type: 'sort', key })}
                    onOpen={setOpenId}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                  />
                  {list.total > MAX_OFFSET_RESULTS && (
                    <Alert.Root colorPalette="info">
                      <Alert.Description>
                        {intl.formatMessage(messages.offsetLimit, {
                          count: MAX_OFFSET_RESULTS,
                        })}
                      </Alert.Description>
                    </Alert.Root>
                  )}
                  <Pagination
                    aria-label={intl.formatMessage(messages.pagination)}
                    totalItems={shownTotal}
                    currentPage={query.page}
                    pageSize={query.pageSize}
                    pageSizeOptions={[...PAGE_SIZES]}
                    enablePageSizeSelector
                    onPageChange={(page) => dispatch({ type: 'page', page })}
                    onPageSizeChange={(pageSize) =>
                      dispatch({ type: 'pageSize', pageSize })
                    }
                  />
                </>
              )}
            </>
          )}
        </Stack>
      </DefaultPage.Content>
      <CommentDetail
        commentId={openId}
        listed={list.comments.find((c) => c.id === openId) ?? null}
        states={states}
        onClose={() => setOpenId(null)}
        onChanged={() => {
          list.refetch();
          counts.refresh();
        }}
      />
    </DefaultPage.Root>
  );
};

export default CommentsList;
