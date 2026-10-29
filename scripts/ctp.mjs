/*
 * SPDX-License-Identifier: MIT
 * Copyright (c) 2026 commercetools GmbH and the ct-builders contributors
 * Freely available, AS IS and UNSUPPORTED. See LICENSE.
 */

/**
 * Minimal commercetools API client for the seed scripts (Node 22, no
 * dependencies): reads the CTP_* settings from the environment or from
 * `.env.local` in the repository root, and calls the HTTP API.
 */

const REGIONS = {
  'gcp-eu': 'europe-west1.gcp',
  'gcp-us': 'us-central1.gcp',
  'aws-eu': 'eu-central-1.aws',
  'aws-us': 'us-east-2.aws',
};

export function loadEnv() {
  try {
    process.loadEnvFile(new URL('../.env.local', import.meta.url));
  } catch {
    // No .env.local: the variables must come from the environment.
  }
  const required = ['CTP_PROJECT_KEY', 'CTP_CLIENT_ID', 'CTP_CLIENT_SECRET'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(
      `Missing environment variable(s): ${missing.join(', ')}. See scripts/.env.example.`
    );
  }
  const env = process.env;
  return {
    projectKey: env.CTP_PROJECT_KEY,
    clientId: env.CTP_CLIENT_ID,
    clientSecret: env.CTP_CLIENT_SECRET,
    region: env.CTP_REGION ?? 'gcp-eu',
    authBaseUrl: env.CTP_AUTH_URL,
    apiBaseUrl: env.CTP_API_URL,
    scopes: env.CTP_SCOPES,
  };
}

/** `defaultScopes(projectKey)` is used when CTP_SCOPES is not set. */
export function createClient({
  projectKey,
  clientId,
  clientSecret,
  region = 'gcp-eu',
  authBaseUrl,
  apiBaseUrl,
  scopes,
  defaultScopes = (key) => `manage_states:${key} view_states:${key}`,
}) {
  const host = REGIONS[region];
  if (!host && !(authBaseUrl && apiBaseUrl)) {
    throw new Error(`Unknown CTP_REGION "${region}". Use ${Object.keys(REGIONS).join(', ')}.`);
  }
  const authUrl = `${authBaseUrl ?? `https://auth.${host}.commercetools.com`}/oauth/token`;
  const apiUrl = `${apiBaseUrl ?? `https://api.${host}.commercetools.com`}/${projectKey}`;
  const scope = scopes ?? defaultScopes(projectKey);
  let token;

  const getToken = async () => {
    const response = await fetch(authUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=client_credentials&scope=${encodeURIComponent(scope)}`,
    });
    if (!response.ok) {
      throw new Error(`Authentication failed (${response.status}): ${await response.text()}`);
    }
    return (await response.json()).access_token;
  };

  const call = async (method, path, body) => {
    token ??= await getToken();
    const response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`${method} ${path} failed (${response.status}): ${await response.text()}`);
    }
    return response.json();
  };

  return { call };
}
