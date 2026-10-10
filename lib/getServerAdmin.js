import { cookies } from 'next/headers';
import { verifyAdminToken, COOKIE } from '@/lib/auth';

// Works on Next 14 and 15+ (awaiting a non-promise is harmless).
export async function getServerAdmin() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  return token ? verifyAdminToken(token) : null;
}