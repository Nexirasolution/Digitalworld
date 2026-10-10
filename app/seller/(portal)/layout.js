import { redirect } from 'next/navigation';
import { getServerAdmin } from '@/lib/getServerAdmin';
import AdminShell from '@/components/admin/AdminShell';

// Only protected seller pages live under (portal).
// login, register and pending live under (auth) and skip this layout.
export default async function SellerPortalLayout({ children }) {
  const admin = await getServerAdmin();

  if (!admin) {
    redirect('/seller/login');
  }

  if (admin.role !== 'seller' && admin.role !== 'superadmin') {
    redirect('/seller/login');
  }

  if (admin.role === 'seller' && admin.status === 'pending') {
    redirect('/seller/pending');
  }

  if (admin.role === 'seller' && admin.status === 'rejected') {
    redirect('/seller/login');
  }

  return (
    <AdminShell admin={admin} navSet="seller">
      {children}
    </AdminShell>
  );
}