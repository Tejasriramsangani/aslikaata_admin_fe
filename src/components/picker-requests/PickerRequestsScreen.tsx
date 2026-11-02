"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  UserPlus,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  Truck,
  X,
  AlertCircle,
  BadgeCheck,
} from 'lucide-react';
import { adminApiClient } from '../../lib/api-client';
import { useAdminNav } from '../../context/AdminNavContext';

type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface PickerRequest {
  id: string;
  requestCode: string;
  fullName: string;
  mobile: string;
  alternateMobile: string | null;
  email: string | null;
  address: {
    line1: string;
    area: string;
    landmark?: string | null;
    city: string;
    district?: string | null;
    state: string;
    pincode: string;
  };
  workType: 'FIELD_COLLECTOR' | 'DRIVER';
  vehicleType: string;
  vehicleLabel: string;
  vehicleNumber: string | null;
  experienceYears: number;
  availability: 'FULL_TIME' | 'PART_TIME' | 'WEEKENDS';
  about: string | null;
  status: RequestStatus;
  reviewedByName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  employeeCode: string | null;
  createdAt: string;
}

const WORK_LABEL: Record<PickerRequest['workType'], string> = {
  FIELD_COLLECTOR: 'Field Collector',
  DRIVER: 'Driver',
};
const AVAIL_LABEL: Record<PickerRequest['availability'], string> = {
  FULL_TIME: 'Full time',
  PART_TIME: 'Part time',
  WEEKENDS: 'Weekends only',
};
const STATUS_STYLE: Record<RequestStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
};

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

const Detail: React.FC<{ icon?: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div>
    <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">
      {icon}
      {label}
    </div>
    <div className="text-xs font-semibold text-slate-800 break-words">{children}</div>
  </div>
);

export const PickerRequestsScreen: React.FC = () => {
  const { refreshPickerRequestCount, pickerRequestEventTick } = useAdminNav();

  const [filter, setFilter] = useState<'ALL' | RequestStatus>('PENDING');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [items, setItems] = useState<PickerRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<PickerRequest | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const qs = new URLSearchParams();
    if (filter !== 'ALL') qs.set('status', filter);
    if (debouncedSearch) qs.set('search', debouncedSearch);
    const res = await adminApiClient.get<{ items: PickerRequest[]; counts: Record<string, number> }>(
      `/admin/picker-requests${qs.toString() ? `?${qs}` : ''}`,
    );
    if (res.success && res.data) {
      setItems(res.data.items);
      setCounts(res.data.counts);
    } else {
      setItems([]);
      setLoadError(res.error || 'Could not load picker requests.');
    }
    setLoading(false);
  }, [filter, debouncedSearch]);

  // Reload on filter/search changes and whenever a request is raised/decided elsewhere (socket).
  useEffect(() => {
    void load();
  }, [load, pickerRequestEventTick]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const closeDetail = () => {
    setSelected(null);
    setRejecting(false);
    setReason('');
    setActionError('');
  };

  const approve = async (req: PickerRequest) => {
    if (!window.confirm(`Approve ${req.fullName}?\n\nThis creates a field account for +91 ${req.mobile} and notifies them.`)) return;
    setBusy(true);
    setActionError('');
    const res = await adminApiClient.post<PickerRequest>(`/admin/picker-requests/${req.id}/approve`);
    setBusy(false);
    if (res.success && res.data) {
      setToast(`Approved — account created${res.data.employeeCode ? ` (${res.data.employeeCode})` : ''}. ${req.fullName} has been notified.`);
      closeDetail();
      await load();
      void refreshPickerRequestCount();
    } else {
      setActionError(res.error || 'Could not approve this request.');
    }
  };

  const reject = async (req: PickerRequest) => {
    if (reason.trim().length < 3) {
      setActionError('Please give a short reason (min 3 characters). It is shared with the applicant.');
      return;
    }
    setBusy(true);
    setActionError('');
    const res = await adminApiClient.post(`/admin/picker-requests/${req.id}/reject`, { reason: reason.trim() });
    setBusy(false);
    if (res.success) {
      setToast(`Request ${req.requestCode} rejected. ${req.fullName} has been informed.`);
      closeDetail();
      await load();
      void refreshPickerRequestCount();
    } else {
      setActionError(res.error || 'Could not reject this request.');
    }
  };

  const tabs = useMemo(
    () => [
      { key: 'PENDING' as const, label: 'Pending', count: counts.PENDING },
      { key: 'APPROVED' as const, label: 'Approved', count: counts.APPROVED },
      { key: 'REJECTED' as const, label: 'Rejected', count: counts.REJECTED },
      { key: 'ALL' as const, label: 'All', count: (counts.PENDING || 0) + (counts.APPROVED || 0) + (counts.REJECTED || 0) },
    ],
    [counts],
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-emerald-500/40 max-w-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#0A3D2B]">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Picker Requests</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              People who asked to become freelance pickers from the Field Ops app. Approving creates their login
              account and notifies them.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 text-xs font-bold cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                filter === t.key
                  ? 'bg-[#0A3D2B] text-white border-[#0A3D2B] shadow'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  filter === t.key ? 'bg-white/20' : t.key === 'PENDING' && t.count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, mobile, area, pincode, PR-code…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {loadError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="py-16 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Loading requests…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center space-y-1">
            <p className="text-sm font-bold text-slate-700">
              {filter === 'PENDING' && !debouncedSearch ? 'No requests waiting' : 'No requests match'}
            </p>
            <p className="text-xs text-slate-500">New requests from the Field Ops app appear here instantly.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r)}
                className="w-full text-left px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center gap-3 md:gap-6"
              >
                <div className="md:w-56 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-black text-slate-500">{r.requestCode}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                  </div>
                  <div className="text-sm font-black text-slate-900 truncate mt-0.5">{r.fullName}</div>
                  <div className="text-xs text-slate-500 font-mono">+91 {r.mobile}</div>
                </div>
                <div className="flex-1 min-w-0 text-xs text-slate-600">
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="truncate">
                      {r.address.area}, {r.address.city} - {r.address.pincode}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {WORK_LABEL[r.workType]} • {r.vehicleLabel} • {AVAIL_LABEL[r.availability]}
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 md:w-44 md:justify-end">
                  <Clock className="w-3.5 h-3.5" />
                  {fmtDate(r.createdAt)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onClick={closeDetail}>
          <div
            className="w-full max-w-lg h-full bg-white shadow-2xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-start justify-between z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-black text-slate-500">{selected.requestCode}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${STATUS_STYLE[selected.status]}`}>
                    {selected.status}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-0.5">{selected.fullName}</h2>
                <p className="text-[11px] text-slate-400 font-semibold">Submitted {fmtDate(selected.createdAt)}</p>
              </div>
              <button type="button" onClick={closeDetail} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <section className="grid grid-cols-2 gap-4">
                <Detail icon={<Phone className="w-3 h-3" />} label="Mobile (login)">+91 {selected.mobile}</Detail>
                <Detail icon={<Phone className="w-3 h-3" />} label="Alternate mobile">{selected.alternateMobile ? `+91 ${selected.alternateMobile}` : '—'}</Detail>
                <Detail icon={<Mail className="w-3 h-3" />} label="Email">{selected.email || '—'}</Detail>
              </section>

              <section className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <MapPin className="w-3 h-3" /> Home address
                </div>
                <p className="text-sm font-semibold text-slate-900">{selected.address.line1}</p>
                <p className="text-xs text-slate-600">
                  {selected.address.area}
                  {selected.address.landmark ? ` • Near ${selected.address.landmark}` : ''}
                </p>
                <p className="text-xs text-slate-600">
                  {[selected.address.city, selected.address.district, selected.address.state].filter(Boolean).join(', ')} -{' '}
                  <span className="font-mono font-bold">{selected.address.pincode}</span>
                </p>
              </section>

              <section className="grid grid-cols-2 gap-4">
                <Detail label="Wants to work as">{WORK_LABEL[selected.workType]}</Detail>
                <Detail label="Availability">{AVAIL_LABEL[selected.availability]}</Detail>
                <Detail icon={<Truck className="w-3 h-3" />} label="Vehicle">{selected.vehicleLabel}</Detail>
                <Detail label="Vehicle number">{selected.vehicleNumber || '—'}</Detail>
                <Detail label="Experience">{selected.experienceYears} {selected.experienceYears === 1 ? 'year' : 'years'}</Detail>
              </section>

              {selected.about && (
                <section>
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Note from applicant</div>
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.about}</p>
                </section>
              )}

              {selected.status !== 'PENDING' && (
                <section
                  className={`p-4 rounded-2xl border space-y-1 ${
                    selected.status === 'APPROVED' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    {selected.status === 'APPROVED' ? (
                      <>
                        <BadgeCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-800">Approved — account created</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span className="text-rose-800">Rejected</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {fmtDate(selected.reviewedAt)}
                    {selected.reviewedByName ? ` by ${selected.reviewedByName}` : ''}
                  </p>
                  {selected.employeeCode && (
                    <p className="text-xs text-slate-700">
                      Employee ID: <span className="font-mono font-black">{selected.employeeCode}</span>
                    </p>
                  )}
                  {selected.rejectionReason && <p className="text-xs text-slate-700">Reason: {selected.rejectionReason}</p>}
                </section>
              )}

              {actionError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              {selected.status === 'PENDING' && (
                <section className="space-y-3 pt-2 border-t border-slate-100">
                  {rejecting ? (
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500">
                        Reason for rejecting (sent to the applicant)
                      </label>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        maxLength={300}
                        placeholder="e.g. Outside our current service area"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void reject(selected)}
                          disabled={busy}
                          className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black cursor-pointer disabled:opacity-50"
                        >
                          {busy ? 'Rejecting…' : 'Confirm reject'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejecting(false);
                            setActionError('');
                          }}
                          className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void approve(selected)}
                        disabled={busy}
                        className="flex-1 py-3 rounded-xl bg-[#0A3D2B] hover:bg-[#0E4D36] text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {busy ? 'Creating account…' : 'Approve & create account'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejecting(true)}
                        disabled={busy}
                        className="px-5 py-3 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-black cursor-pointer disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Approving creates a field login for +91 {selected.mobile}, sends them an SMS and an in-app welcome
                    message. They can then be assigned pickups.
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
