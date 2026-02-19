/**
 * RedTrack API Proxy — /api/redtrack/[[path]]
 *
 * Routes ALL RedTrack requests through the server.
 * The RedTrack API key NEVER reaches the browser.
 *
 * - Authenticates the request via JWT
 * - Injects the server-side RedTrack API key
 * - Forwards to RedTrack API
 */

import { authenticateRequest } from '../../lib/auth';
import { isAdmin } from '../../lib/permissions';

interface Env {
  REDTRACK_API_KEY: string;
  REDTRACK_BASE_URL: string;
  JWT_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  // 1. Authenticate
  const user = await authenticateRequest(request, env.JWT_SECRET);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Only admins/ops can access RedTrack
  if (!isAdmin(user)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 3. Build RedTrack URL
  const pathSegments = params.path as string[];
  const redtrackPath = '/' + pathSegments.join('/');
  const baseUrl = env.REDTRACK_BASE_URL || 'https://api.redtrack.io';

  const url = new URL(request.url);
  const redtrackUrl = new URL(`${baseUrl}${redtrackPath}`);

  // Copy query params from original request
  url.searchParams.forEach((value, key) => {
    redtrackUrl.searchParams.set(key, value);
  });

  // Check if client sent api_key in query — remove it (we inject server-side)
  redtrackUrl.searchParams.delete('api_key');

  // Check request body for auth mode
  const hasAuthHeader = request.headers.get('X-Redtrack-Auth-Mode') === 'bearer';

  // 4. Forward request
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (hasAuthHeader) {
    // Bearer token mode
    headers['Authorization'] = `Bearer ${env.REDTRACK_API_KEY}`;
  } else {
    // Query param mode (default)
    redtrackUrl.searchParams.set('api_key', env.REDTRACK_API_KEY);
  }

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = await request.text();
  }

  const response = await fetch(redtrackUrl.toString(), fetchOptions);
  const responseBody = await response.text();

  return new Response(responseBody, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
};
