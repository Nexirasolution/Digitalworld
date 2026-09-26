'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const INK = '#000000';
const INK_SOFT = '#6B6B6B';
const GOLD = '#C9A227';
const LINE = '#E8E8E8';
const PAPER = '#FFFFFF';
const RED = '#B3261E';
const GREEN = '#1B8A3E';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AdminSellersPage() {
  const router = useRouter();
  const [tab, setTab] = useState('pending');
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null); // seller object or null
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async (status) => {
    setLoading(true);
    setError('');
    const res = await fetch(`/api/admin/sellers?status=${status}`);
    if (res.status === 401 || res.status === 403) {
      router.push('/seller/login');
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to load sellers.');
      setLoading(false);
      return;
    }
    setSellers(data.sellers || []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(tab); }, [tab, load]);

  async function approve(id) {
    setBusyId(id);
    setError('');
    const res = await fetch(`/api/admin/sellers/${id}/approve`, { method: 'POST' });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || 'Failed to approve seller.');
      return;
    }
    load(tab);
  }

  function openReject(seller) {
    setRejectTarget(seller);
    setRejectReason('');
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setBusyId(rejectTarget._id);
    setError('');
    const res = await fetch(`/api/admin/sellers/${rejectTarget._id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || 'Failed to reject seller.');
      return;
    }
    setRejectTarget(null);
    setRejectReason('');
    load(tab);
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10" style={{ background: PAPER }}>
      <h1 className="text-[18px] tracking-[1.5px] uppercase mb-1" style={{ color: INK }}>
        Seller Management
      </h1>
      <p className="text-[13px] mb-8" style={{ color: INK_SOFT }}>
        Review and manage seller business applications.
      </p>

      <div className="flex gap-6 mb-8" style={{ borderBottom: `1px solid ${LINE}` }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="pb-3 text-[12px] tracking-[1.5px] uppercase"
            style={{
              color: tab === t.key ? INK : INK_SOFT,
              borderBottom: tab === t.key ? `2px solid ${GOLD}` : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 text-[13px]" style={{ background: '#FCE8E6', color: RED }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-[13px]" style={{ color: INK_SOFT }}>Loading...</div>
      ) : sellers.length === 0 ? (
        <div className="text-[13px]" style={{ color: INK_SOFT }}>
          No {tab} sellers.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sellers.map((s) => (
            <div key={s._id} className="p-4" style={{ border: `1px solid ${LINE}` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px]" style={{ color: INK }}>
                      {s.businessName || '(no business name)'}
                    </span>
                    <StatusPill status={s.status} />
                  </div>
                  <div className="text-[12.5px]" style={{ color: INK_SOFT }}>{s.name} · {s.email}</div>
                  {s.businessPhone && (
                    <div className="text-[12.5px]" style={{ color: INK_SOFT }}>{s.businessPhone}</div>
                  )}
                  {s.businessAddress && (
                    <div className="text-[12.5px]" style={{ color: INK_SOFT }}>{s.businessAddress}</div>
                  )}
                  {s.gstNumber && (
                    <div className="text-[12.5px]" style={{ color: INK_SOFT }}>GST: {s.gstNumber}</div>
                  )}
                  <div className="text-[11px] mt-1" style={{ color: '#9A9A9A' }}>
                    Applied {new Date(s.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {tab === 'rejected' && s.rejectionReason && (
                    <div className="text-[12px] mt-2 px-2 py-1.5" style={{ background: '#FCE8E6', color: RED }}>
                      Reason: {s.rejectionReason}
                    </div>
                  )}
                  {tab === 'approved' && s.approvedAt && (
                    <div className="text-[11px] mt-1" style={{ color: GREEN }}>
                      Approved {new Date(s.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  {tab !== 'approved' && (
                    <button
                      onClick={() => approve(s._id)}
                      disabled={busyId === s._id}
                      className="text-[11px] tracking-[1px] uppercase px-3 py-2"
                      style={{ background: INK, color: PAPER, opacity: busyId === s._id ? 0.6 : 1 }}
                    >
                      Approve
                    </button>
                  )}
                  {tab !== 'rejected' && (
                    <button
                      onClick={() => openReject(s)}
                      disabled={busyId === s._id}
                      className="text-[11px] tracking-[1px] uppercase px-3 py-2"
                      style={{ border: `1px solid ${LINE}`, color: RED, opacity: busyId === s._id ? 0.6 : 1 }}
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectTarget && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setRejectTarget(null)}
        >
          <div
            className="w-full max-w-sm p-6"
            style={{ background: PAPER }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-[14px] tracking-[1.5px] uppercase mb-1" style={{ color: INK }}>
              Reject Seller
            </h2>
            <p className="text-[12.5px] mb-4" style={{ color: INK_SOFT }}>
              {rejectTarget.businessName || rejectTarget.email}
            </p>
            <label className="block text-[11px] tracking-[1.5px] uppercase mb-1.5" style={{ color: INK_SOFT }}>
              Reason (optional, shown to the seller)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm outline-none mb-4"
              style={{ border: `1px solid ${LINE}`, color: INK }}
              placeholder="e.g. Business documents could not be verified"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectTarget(null)}
                className="text-[12px] tracking-[1px] uppercase px-4 py-2"
                style={{ color: INK_SOFT }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReject}
                disabled={busyId === rejectTarget._id}
                className="text-[12px] tracking-[1px] uppercase px-4 py-2"
                style={{ background: RED, color: PAPER, opacity: busyId === rejectTarget._id ? 0.6 : 1 }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const colors = {
    pending: { bg: '#FBF3D9', fg: '#8A6D1B' },
    approved: { bg: '#E3F3E8', fg: '#1B8A3E' },
    rejected: { bg: '#FCE8E6', fg: '#B3261E' },
  };
  const c = colors[status] || colors.pending;
  return (
    <span
      className="text-[10px] tracking-[1px] uppercase px-2 py-0.5"
      style={{ background: c.bg, color: c.fg }}
    >
      {status}
    </span>
  );
}