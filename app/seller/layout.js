import { redirect } from 'next/navigation';
import { getServerAdmin } from '@/lib/getServerAdmin';
import AdminShell from '@/components/admin/AdminShell';

// Public pages under /seller — login and register — render outside this
// gate. Only protected seller pages (dashboard, products, orders, settings)
// go through here.
const PUBLIC_PATHS = ['/seller/login', '/seller/register'];

export default function SellerLayout({ children }) {
  const admin = getServerAdmin();

  // Next.js layouts can't read the current pathname directly in the App
  // Router without a client hook, so login/register get their own layout
  // override below (layout.jsx only wraps files inside app/seller that
  // don't define a closer layout — see the note under those two folders).
  if (!admin) {
    redirect('/seller/login');
  }

  return (
    <AdminShell admin={admin} navSet="seller">
      {children}
    </AdminShell>
  );
}