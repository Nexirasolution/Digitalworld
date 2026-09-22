import { NextResponse } from 'next/server';
import { getAdminFromRequest } from './auth';
import { dbConnect } from './mongodb';
import Admin from '@/models/Admin';

export function requireAdmin(handler) {
  return async (req, ctx) => {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized. Please login to admin.' }, { status: 401 });
    }
    return handler(req, ctx, admin);
  };
}

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

// Any approved seller, or a superadmin. Re-checks the DB so a revoked
// seller is blocked on their very next request, not just after their
// cookie expires.
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
    const admin = await Admin.findById(tokenAdmin.id).select('status rejectionReason').lean();

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

// True if `admin` is allowed to touch this product: superadmin, or the
// seller who owns it. `product` needs its `seller` field selected/populated.
export function ownsProduct(admin, product) {
  if (admin.role === 'superadmin') return true;
  if (!product?.seller) return false;
  return String(product.seller._id || product.seller) === String(admin.id);
}

// True if `admin` is allowed to update this order: superadmin, or a seller
// who owns every line item in it. A seller cannot partially update an
// order that includes another seller's items.
export function ownsOrder(admin, order) {
  if (admin.role === 'superadmin') return true;
  if (!order?.items?.length) return false;
  return order.items.every((it) => it.seller && String(it.seller) === String(admin.id));
}