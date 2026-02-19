/**
 * POST /api/auth/logout
 *
 * Clears the session cookie.
 */

export const onRequestPost: PagesFunction = async () => {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'ops_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
    },
  });
};
