import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminToken, COOKIE } from '@/lib/auth';
import AdminShell from '@/components/admin/AdminShell';
import NewOrderListener from '@/components/admin/NewOrderListener';

export default async function AdminLayout({ children }) {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  const admin = token ? verifyAdminToken(token) : null;

  // No valid session: render bare children (the /admin/login page).
  // middleware.js already redirects other /admin pages.
  if (!admin) return <>{children}</>;

  // /admin/* is superadmin-only. Sellers go to their own area.
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