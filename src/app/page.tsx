"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Truck,
  Users,
  PackagePlus,
  Calendar,
  SendHorizontal,
  BarChart3,
  ShieldAlert,
  UserCog,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Scale,
  Sparkles,
  Building2,
  Coins,
  MapPin,
  Clock,
  Radio,
  ClipboardList,
} from 'lucide-react';
import { AdminAppShell } from '../components/layout/AdminAppShell';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminNav } from '../context/AdminNavContext';
import { adminApiClient } from '../lib/api-client';

export default function OperationsDashboardPage() {
  const { admin } = useAdminAuth();
  const { isBackendConnected, unassignedBulkCount } = useAdminNav();

  const [loading, setLoading] = useState(false);
  const [pickups, setPickups] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState({
    volumeKg: 0,
    totalAmount: 0,
    activeVehicles: 0,
    totalVehicles: 0,
    cashFloatStatus: 'NO DATA',
    cashFloatAmount: 0,
  });

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [analyticsRes, pickupsRes, vehiclesRes, floatsRes] = await Promise.all([
        adminApiClient.get('/admin/analytics/today'),
        adminApiClient.get('/admin/pickups'),
        adminApiClient.get('/admin/vehicles'),
        adminApiClient.get('/admin/operations/cash-floats'),
      ]);
      const analytics: any = analyticsRes.success ? analyticsRes.data || {} : {};
      const vehicles: any[] = vehiclesRes.success && Array.isArray(vehiclesRes.data) ? vehiclesRes.data : [];
      const floats: any[] = floatsRes.success && Array.isArray(floatsRes.data) ? floatsRes.data : [];
      const outstandingFloats = floats.filter((item) =>
        ['ISSUED', 'SHORTAGE_FLAGGED', 'SURPLUS_FLAGGED'].includes(item.status),
      );
      setKpis({
        volumeKg: Number(analytics.weightCollected?.netWeightGrams || 0) / 1000,
        totalAmount: Number(analytics.financials?.totalAmount || 0) / 100,
        activeVehicles: vehicles.filter((vehicle) => vehicle.status === 'ACTIVE').length,
        totalVehicles: vehicles.length,
        cashFloatStatus: floats.length === 0 ? 'NO DATA' : outstandingFloats.length === 0 ? 'BALANCED' : 'PENDING',
        cashFloatAmount: outstandingFloats.reduce(
          (sum, item) => sum + Number(
            item.status === 'ISSUED'
              ? item.openingFloatRupees
              : item.actualPhysicalCashReturnedRupees ?? item.expectedCashReturnRupees ?? 0,
          ),
          0,
        ),
      });
      if (pickupsRes.success && Array.isArray(pickupsRes.data)) {
        setPickups(pickupsRes.data.map((pickup: any) => {
          const total = Number(pickup.totals?.totalAmount || 0);
          const address = pickup.addressSnapshot || {};
          const assignment = pickup.assignment || {};
          return {
            id: pickup.pickupCode || pickup._id || pickup.id,
            customerName: address.name || pickup.orderMeta?.customerName || 'Customer',
            address: [address.line1, address.area, address.city].filter(Boolean).join(', ') || '—',
            category: pickup.categories?.[0]?.name || pickup.categories?.[0] ||
              pickup.items?.[0]?.productName || '—',
            estWeightKg: Number(
              pickup.totals?.netWeightGrams != null
                ? pickup.totals.netWeightGrams / 1000
                : pickup.estimatedWeightSnapshot?.maxGrams != null
                  ? pickup.estimatedWeightSnapshot.maxGrams / 1000
                  : pickup.estimatedWeightSnapshot?.minGrams != null
                    ? pickup.estimatedWeightSnapshot.minGrams / 1000
                    : pickup.estimatedWeightSnapshot?.kg ?? pickup.totals?.netWeightKg ?? 0,
            ),
            slotTime: pickup.timeSlotSnapshot?.displayLabel || '—',
            driverName: assignment.employee?.name || assignment.driverName ||
              assignment.vehicle?.registrationNumber || 'Unassigned',
            status: pickup.status || '—',
            totalRupees: total > 100000 ? total / 100 : total,
          };
        }));
      } else {
        setPickups([]);
        setError(pickupsRes.error || 'Unable to load dashboard pickups.');
      }
    } catch (err: any) {
      setPickups([]);
      setError(err.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <AdminAppShell>
      <div className="space-y-6">
        {/* 1. Top Operations Banner */}
        <div className="bg-gradient-to-r from-[#0A3D2B] via-[#0E4D36] to-[#04160E] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/15 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                  Live Operations Command
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {isBackendConnected ? 'Connected to NestJS + Upstash Redis' : 'Connected to Backend'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome back, {admin?.name || 'Operations Executive'}
              </h1>

              <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl font-medium">
                {admin?.role === 'SUPER_ADMIN'
                  ? 'Master Operations Cockpit: Oversee rates, logistics dispatch, yard baling, cash float desk, and workforce RBAC.'
                  : `Authenticated as ${admin?.role} for ${admin?.assignedDivision}.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dispatch"
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <ClipboardList className="w-4 h-4" />
                <span>
                  Assign Pickups
                  {unassignedBulkCount > 0 ? ` (${unassignedBulkCount})` : ''}
                </span>
              </Link>
              <Link
                href="/pricing"
                className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider border border-emerald-600/60 flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Adjust Rates</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 2. Real-Time Operations KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Today Scrap Volume</span>
              <Scale className="w-4 h-4 text-emerald-800" />
            </div>
            <div className="text-2xl font-black text-slate-900">{kpis.volumeKg.toLocaleString('en-IN')} kg</div>
            <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <span>Live</span> collected today
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Today Collections / Payouts</span>
              <Coins className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">₹ {kpis.totalAmount.toLocaleString('en-IN')}</div>
            <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <span>Backend total</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Active EV Vehicles</span>
              <Truck className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-black text-slate-900">{kpis.activeVehicles} / {kpis.totalVehicles}</div>
            <div className="text-[10px] font-bold text-sky-600 flex items-center gap-1">
              <span>{kpis.totalVehicles ? Math.round((kpis.activeVehicles / kpis.totalVehicles) * 100) : 0}% fleet active</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Unassigned Queue</span>
              <AlertCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600">{unassignedBulkCount} Pending</div>
            <Link href="/inward" className="text-[10px] font-bold text-rose-600 hover:underline">
              Review and dispatch &rarr;
            </Link>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider">Cash Float Balance</span>
              <Building2 className="w-4 h-4 text-emerald-800" />
            </div>
            <div className="text-2xl font-black text-emerald-800">{kpis.cashFloatStatus}</div>
            <div className="text-[10px] font-bold text-slate-500">₹ {kpis.cashFloatAmount.toLocaleString('en-IN')} outstanding</div>
          </div>
        </div>

        {/* 3. Command Navigation Cards (Route Based) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Operations ERP Modules
            </h2>
            <span className="text-xs text-slate-400 font-semibold">Direct Route Links</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/pricing"
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-[#0A3D2B] group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  ± Margin
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                Live Rates & Margins
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Wholesale mandi benchmark rates with dynamic spread formula.
              </p>
            </Link>

            <Link
              href="/inward"
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                  Intake Gate
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                Scrap Inward Receiving
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Field pickups queue, gate walk-ins & digital gross/tare weighing.
              </p>
            </Link>

            <Link
              href="/fleet"
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600 group-hover:scale-110 transition-transform">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md">
                  EV Fleet
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                Vehicle Registry & Logistics
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Owned vs rented vehicle assets, battery status & fuel logs.
              </p>
            </Link>

            <Link
              href="/users"
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
                  <UserCog className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                  RBAC
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                Users & Roles Management
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Create staff users, assign RBAC privileges & yard divisions.
              </p>
            </Link>

            <Link
              href="/calendar"
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                  Planning
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                Holidays & Route Runs
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Predefined holiday auto-shifting and 14-day route schedules.
              </p>
            </Link>

            <Link
              href="/workforce"
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Floats
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                Workforce & Cash Floats
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Pickers, drivers, KYC approvals and daily evening reconciliation.
              </p>
            </Link>

            <Link
              href="/outward"
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform">
                  <SendHorizontal className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                  B2B Mills
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                Mill Dispatches & Sales
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Outward baled inventory shipments to smelters and paper mills.
              </p>
            </Link>

            <Link
              href="/analytics"
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-500 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  P&L
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900">
                Unit Economics & P&L
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Realized financial realizations, operating expenses and net profit.
              </p>
            </Link>
            <Link
              href="/audits"
              className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-rose-500 hover:shadow-md transition-all group cursor-pointer"
            >
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 w-fit mb-2">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Fraud Sentinel & Audits</h3>
              <p className="text-xs text-slate-500 mt-1">Review live anomaly alerts and resolutions.</p>
            </Link>
          </div>
        </div>

        {/* 4. Live Dispatches & Pickups Real-Time Stream */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Live Dispatches & Scheduled Doorstep Pickups
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Active route run jobs synced with field companion apps
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 cursor-pointer"
                title="Refresh Dispatches"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/inward"
                className="px-3.5 py-2 rounded-xl bg-[#0A3D2B] hover:bg-[#0E4D36] text-white text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <span>View Full Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Pickup Code</th>
                  <th className="py-2.5 px-3">Customer & Location</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Est. Weight</th>
                  <th className="py-2.5 px-3">Assigned Vehicle / Driver</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {pickups.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <span className="font-mono font-extrabold text-slate-900">{p.id}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{p.customerName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {p.address}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-slate-700">{p.category}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-extrabold text-slate-900">{p.estWeightKg} kg</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-slate-900 font-bold flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-emerald-800" />
                        {p.driverName}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : p.status === 'IN_TRANSIT'
                            ? 'bg-sky-50 text-sky-800 border-sky-200 animate-pulse'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {p.status === 'COMPLETED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-mono font-black text-slate-900">₹ {p.totalRupees}</span>
                    </td>
                  </tr>
                ))}
                {!loading && pickups.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-400">
                    {error || 'No pickups available.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminAppShell>
  );
}
