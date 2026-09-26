import { cookies } from 'next/headers';
import { verifyAdminToken, COOKIE } from './auth';

// For server components (layouts/pages), not API routes — those use
// getAdminFromRequest from lib/auth.js instead. Same token, different
// way of reading the cookie since there's no `req` object here.
export function getServerAdmin() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token); // { id, email, role, status, iat, exp } or null
}