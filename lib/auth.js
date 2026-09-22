import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const COOKIE_NAME = 'lb_admin_token';

export function signAdminToken(admin) {
  return jwt.sign(
    {
      id: admin._id?.toString?.() ?? admin.id,
      email: admin.email,
      role: admin.role,
      status: admin.role === 'superadmin' ? 'approved' : admin.status,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAdminToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function getAdminFromRequest(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token); // { id, email, role, status, iat, exp } or null
}

export function setAdminCookie(res, token) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAdminCookie(res) {
  res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
}

export const COOKIE = COOKIE_NAME;