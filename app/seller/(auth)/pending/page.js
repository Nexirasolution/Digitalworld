import Link from 'next/link';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';

export default function SellerPendingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#FFFFFF' }}>
      <div className="w-full max-w-sm text-center">
        <h1 className="text-[15px] font-normal tracking-[2px] uppercase" style={{ color: INK }}>
          Pending Approval
        </h1>
        <div className="mt-2 mx-auto" style={{ width: '32px', height: '2px', background: GOLD }} />

        <p className="mt-6 text-sm leading-relaxed" style={{ color: INK_SOFT }}>
          Your seller account is waiting for approval. You will be able to add products
          and manage orders once an admin approves it. Please log in again after approval.
        </p>

        <div className="mt-6 flex flex-col gap-1.5">
          <Link href="/seller/login" className="text-[12px]" style={{ color: INK_SOFT }}>
            Back to login
          </Link>
          <Link href="/" className="text-[12px]" style={{ color: INK_SOFT }}>
            ← Back to store
          </Link>
        </div>
      </div>
    </div>
  );
}