/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

// Make sure to import the helper functions from the `ssr` entry point.
import { entryPointUriPathToPermissionKeys } from '@commercetools-frontend/application-shell/ssr';

declare const window: Window &
  typeof globalThis & {
    app: { entryPointUriPath: string };
  };

export const entryPointUriPath =
  typeof window === 'undefined'
    ? process.env.ENTRY_POINT_URI_PATH || 'reviews-and-ratings'
    : window.app.entryPointUriPath || 'reviews-and-ratings';

export const PERMISSIONS = entryPointUriPathToPermissionKeys(entryPointUriPath);

export const PAGE_SIZES = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

/** The Query API accepts at most 500 results per request. */
export const SEARCH_CAP = 500;

/** The platform rejects `offset` beyond this many results. */
export const MAX_OFFSET_RESULTS = 10000;
