/**
 * GET /api/auth/me
 *
 * Returns the current user session from the JWT.
 * Used on page load to restore sessions without localStorage.
 */

import { authenticateRequest } from '../../lib/auth';

interface Env {
  JWT_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const user = await authenticateRequest(request, env.JWT_SECRET);

  if (!user) {
    return new Response(JSON.stringify({ user: null }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ user }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
