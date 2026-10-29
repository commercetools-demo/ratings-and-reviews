/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

import { useIsAuthorized } from '@commercetools-frontend/permissions';
import { PERMISSIONS } from '../../constants';

/** Manage permission; controls are disabled without it, never hidden. */
export const useCanManage = (): boolean =>
  useIsAuthorized({ demandedPermissions: [PERMISSIONS.Manage] });
