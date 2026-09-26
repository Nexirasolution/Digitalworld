import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminToken } from '@/lib/auth';
import AdminShell from '@/components/admin/AdminShell';
import NewOrderListener from '@/components/admin/NewOrderListener';

export default function AdminLayout({ children }) {
  const token = cookies().get('lb_admin_token')?.value;
  const admin = token ? verifyAdminToken(token) : null;

  // No valid session — render bare children (e.g. an /admin/login page,
  // if one still exists) rather than redirecting, same as before.
  if (!admin) return <>{children}</>;

  // Logged in, but not a superadmin — /admin/* is superadmin-only now
  // that sellers have their own /seller/* area. Send them there instead
  // of showing them the full site-control panel.
  if (admin.role !== 'superadmin') {
    redirect('/seller/dashboard');
  }

  return (
    <AdminShell admin={admin} navSet="admin">
      <NewOrderListener />
      {children}
    </AdminShell>
  );
}