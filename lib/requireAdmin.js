import { NextResponse } from 'next/server';
import { getAdminFromRequest } from './auth';
import { dbConnect } from './mongodb';
import Admin from '@/models/Admin';

// Any logged-in seller or superadmin, regardless of approval status.
// Use this for things like "view my own profile" or "check my status".
export function requireAdmin(handler) {
  return async (req, ctx) => {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized. Please login to admin.' }, { status: 401 });
    }
    return handler(req, ctx, admin);
  };
}

// One of the given roles, any approval status. Mainly for superadmin-only routes.
export function requireRole(allowedRoles) {
  return function (handler) {
    return async (req, ctx) => {
      const admin = getAdminFromRequest(req);
      if (!admin) {
        return NextResponse.json({ error: 'Unauthorized. Please login to admin.' }, { status: 401 });
      }
      if (!allowedRoles.includes(admin.role)) {
        return NextResponse.json({ error: 'Forbidden. Insufficient permissions.' }, { status: 403 });
      }
      return handler(req, ctx, admin);
    };
  };
}

export const requireSuperAdmin = requireRole(['superadmin']);

// Gate for anything a seller does that touches the storefront: adding
// products, editing inventory, managing orders. Superadmins always pass.
// Re-checks the DB (not just the JWT) so a superadmin revoking approval
// takes effect immediately instead of waiting for the seller's cookie to expire.
export function requireApprovedSeller(handler) {
  return async (req, ctx) => {
    const tokenAdmin = getAdminFromRequest(req);
    if (!tokenAdmin) {
      return NextResponse.json({ error: 'Unauthorized. Please login to admin.' }, { status: 401 });
    }

    if (tokenAdmin.role === 'superadmin') {
      return handler(req, ctx, tokenAdmin);
    }

    await dbConnect();
    const admin = await Admin.findById(tokenAdmin.id).lean();

    if (!admin) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 401 });
    }
    if (admin.status === 'pending') {
      return NextResponse.json(
        { error: 'Your seller account is pending approval. You cannot add or manage products yet.' },
        { status: 403 }
      );
    }
    if (admin.status === 'rejected') {
      return NextResponse.json(
        { error: 'Your seller application was rejected.', reason: admin.rejectionReason || undefined },
        { status: 403 }
      );
    }

    return handler(req, ctx, { ...tokenAdmin, status: admin.status });
  };
}