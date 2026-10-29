/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useEffect, useState, type FC } from 'react';
import { useIntl } from 'react-intl';
import { Alert, SearchInput, Stack } from '@commercetools/nimbus';
import { SEARCH_CAP } from '../../../constants';
import messages from './messages';

const DEBOUNCE_MS = 250;

type SearchBarProps = {
  value: string;
  capped: boolean;
  onSearch: (term: string) => void;
};

const SearchBar: FC<SearchBarProps> = ({ value, capped, onSearch }) => {
  const intl = useIntl();
  const [draft, setDraft] = useState(value);

  // A reset from outside (reset button) empties the field.
  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (draft === value) return undefined;
    const timer = setTimeout(() => onSearch(draft), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, value, onSearch]);

  return (
    <Stack gap="200">
      <SearchInput
        aria-label={intl.formatMessage(messages.label)}
        placeholder={intl.formatMessage(messages.placeholder)}
        value={draft}
        onChange={setDraft}
        width="360px"
        maxWidth="100%"
      />
      {capped && (
        <Alert.Root colorPalette="info">
          <Alert.Description>
            {intl.formatMessage(messages.capped, { count: SEARCH_CAP })}
          </Alert.Description>
        </Alert.Root>
      )}
    </Stack>
  );
};

export default SearchBar;
