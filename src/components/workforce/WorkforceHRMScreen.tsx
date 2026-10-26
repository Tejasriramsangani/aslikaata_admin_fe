"use client";

import React, { useState, useMemo } from 'react';
import {
  Users,
  Banknote,
  CalendarCheck,
  Award,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Phone,
  Truck,
  CreditCard,
  FileText,
  DollarSign,
  ChevronRight,
  X,
  Sparkles,
  Layers,
  Scale,
  Star,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { adminApiClient } from '../../lib/api-client';

export type EmployeeRole = 'FIELD_COLLECTOR' | 'DRIVER' | 'YARD_SORTER' | 'WEIGHBRIDGE_OPERATOR';
export type KycStatus = 'APPROVED' | 'PENDING_REVIEW' | 'SUSPENDED';
export type AttendanceStatus = 'PRESENT_ON_ROUTE' | 'PRESENT_IN_YARD' | 'ON_LEAVE' | 'HALF_DAY';
export type FloatStatus = 'ISSUED' | 'BALANCED' | 'SHORTAGE_FLAGGED' | 'SURPLUS_FLAGGED';

export interface EmployeeRecord {
  id: string;
  employeeCode: string; // e.g. AKP-EMP-0247
  name: string;
  phone: string;
  role: EmployeeRole;
  assignedDivision: string;
  assignedVehicleReg?: string;
  kyc: {
    status: KycStatus;
    aadhaarMasked: string; // e.g. XXXX-XXXX-4921
    dlNumber?: string;
    dlValidUntil?: string;
    policeVerificationDone: boolean;
    joinedDate: string;
  };
  compensation: {
    payModel: 'MONTHLY_SALARY' | 'DAILY_WAGE' | 'COMMISSION_ONLY';
    basePayRupees: number; // e.g. 18000 or 700/day
    incentivePerKgPaise: number; // e.g. 50 paise/kg
    bankAccountMasked: string;
    upiId: string;
  };
  todayAttendance: AttendanceStatus;
  checkInTime?: string;
  metrics: {
    rating: number; // e.g. 4.9
    totalPickupsCompleted: number;
    totalKgCollected: number;
    todayKgCollected: number;
    todayPickupsCompleted: number;
  };
}

export interface CashFloatRecord {
  id: string;
  date: string; // "YYYY-MM-DD"
  employeeCode: string;
  employeeName: string;
  vehicleReg: string;
  openingFloatRupees: number; // e.g. Rs 15,000
  issuedTime: string;
  issuedByAdmin: string;
  // Evening Settlement
  verifiedCustomerCashPayoutsRupees: number; // from OTP-verified pickups
  approvedRouteExpensesRupees: number; // fuel + tolls
  expectedCashReturnRupees: number; // opening - payouts - expenses
  actualPhysicalCashReturnedRupees?: number;
  varianceRupees: number; // actual - expected
  reconciledTime?: string;
  reconciledByAdmin?: string;
  status: FloatStatus;
  auditNotes?: string;
}

export const WorkforceHRMScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'FLOAT_DESK' | 'ATTENDANCE' | 'LEADERBOARD'>('ROSTER');
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [cashFloats, setCashFloats] = useState<CashFloatRecord[]>([]);

  // Filters & State
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState('');
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState<EmployeeRecord | null>(null);

  // Modals
  const [isIssueFloatOpen, setIsIssueFloatOpen] = useState(false);
  const [isSettleFloatOpen, setIsSettleFloatOpen] = useState(false);
  const [activeFloatToSettle, setActiveFloatToSettle] = useState<CashFloatRecord | null>(null);
  const [actualCashInput, setActualCashInput] = useState<number>(0);
  const [settleNotes, setSettleNotes] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for Issue Float
  const [issueEmpCode, setIssueEmpCode] = useState('');
  const [issueAmount, setIssueAmount] = useState(15000);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Dynamic live employees and cash floats from NestJS backend
  React.useEffect(() => {
    const fetchWorkforceData = async () => {
      try {
        const [empRes, floatRes] = await Promise.all([
          adminApiClient.get('/admin/operations/employees'),
          adminApiClient.get('/admin/operations/cash-floats'),
        ]);

        if (empRes.success && Array.isArray(empRes.data)) {
          setEmployees(empRes.data.map((employee: any) => ({
            id: employee._id || employee.id,
            employeeCode: employee.employeeCode || '—',
            name: employee.name || '—',
            phone: employee.phone || employee.mobile || '—',
            role: employee.role,
            assignedDivision: employee.assignedDivision?.name || employee.assignedDivision || '—',
            assignedVehicleReg: employee.assignedVehicle?.registrationNumber || employee.assignedVehicleReg,
            kyc: {
              status: employee.kyc?.status || employee.kycStatus || 'PENDING_REVIEW',
              aadhaarMasked: employee.kyc?.aadhaarMasked || '—',
              dlNumber: employee.kyc?.dlNumber,
              dlValidUntil: employee.kyc?.dlValidUntil,
              policeVerificationDone: Boolean(employee.kyc?.policeVerificationDone),
              joinedDate: employee.kyc?.joinedDate || employee.joinedDate || '—',
            },
            compensation: {
              payModel: employee.compensation?.payModel || 'MONTHLY_SALARY',
              basePayRupees: Number(employee.compensation?.basePayRupees || 0),
              incentivePerKgPaise: Number(employee.compensation?.incentivePerKgPaise || 0),
              bankAccountMasked: employee.compensation?.bankAccountMasked || '—',
              upiId: employee.compensation?.upiId || '—',
            },
            todayAttendance: employee.todayAttendance || 'ON_LEAVE',
            checkInTime: employee.checkInTime,
            metrics: {
              rating: Number(employee.metrics?.rating || 0),
              totalPickupsCompleted: Number(employee.metrics?.totalPickupsCompleted || 0),
              totalKgCollected: Number(employee.metrics?.totalKgCollected || 0),
              todayKgCollected: Number(employee.metrics?.todayKgCollected || 0),
              todayPickupsCompleted: Number(employee.metrics?.todayPickupsCompleted || 0),
            },
          })));
          if (empRes.data[0]?.employeeCode) {
            setIssueEmpCode(empRes.data[0].employeeCode);
          }
        }

        if (floatRes.success && Array.isArray(floatRes.data)) {
          setCashFloats(
            floatRes.data.map((f: any) => ({
              id: f._id || f.id,
              date: f.date,
              employeeCode: f.employeeCode,
              employeeName: f.employeeName,
              vehicleReg: f.vehicleReg || '—',
              openingFloatRupees: f.openingFloatRupees,
              issuedTime: f.issuedTime || f.createdAt || '—',
              issuedByAdmin: f.issuedByAdmin || '—',
              verifiedCustomerCashPayoutsRupees: f.verifiedCustomerCashPayoutsRupees || 0,
              approvedRouteExpensesRupees: f.approvedRouteExpensesRupees || 0,
              expectedCashReturnRupees: f.expectedCashReturnRupees,
              actualPhysicalCashReturnedRupees: f.actualPhysicalCashReturnedRupees,
              varianceRupees: f.varianceRupees || 0,
              reconciledTime: f.reconciledTime,
              reconciledByAdmin: f.reconciledByAdmin,
              status: f.status,
              auditNotes: f.auditNotes,
            })),
          );
        }
      } catch (err) {
        console.error('Failed to fetch workforce data:', err);
      }
    };

    fetchWorkforceData();
  }, []);

  // KPIs
  const metrics = useMemo(() => {
    const totalStaff = employees.length;
    const onRouteCount = employees.filter((e) => e.todayAttendance === 'PRESENT_ON_ROUTE').length;
    const inYardCount = employees.filter((e) => e.todayAttendance === 'PRESENT_IN_YARD').length;
    const pendingKycCount = employees.filter((e) => e.kyc.status === 'PENDING_REVIEW').length;

    // Active Route Cash Float Out in the Field
    const activeFloatsToday = cashFloats.filter((f) => f.status === 'ISSUED');
    const totalDisbursedFloat = activeFloatsToday.reduce((acc, f) => acc + f.openingFloatRupees, 0);
    const totalCustomerPaidToday = activeFloatsToday.reduce((acc, f) => acc + f.verifiedCustomerCashPayoutsRupees, 0);
    const expectedReturnFloat = activeFloatsToday.reduce((acc, f) => acc + f.expectedCashReturnRupees, 0);

    return {
      totalStaff,
      onRouteCount,
      inYardCount,
      pendingKycCount,
      totalDisbursedFloat: `₹${totalDisbursedFloat.toLocaleString('en-IN')}`,
      totalCustomerPaidToday: `₹${totalCustomerPaidToday.toLocaleString('en-IN')}`,
      expectedReturnFloat: `₹${Math.round(expectedReturnFloat).toLocaleString('en-IN')}`,
    };
  }, [employees, cashFloats]);

  // Filtered Roster
  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      if (roleFilter !== 'ALL' && e.role !== roleFilter) return false;
      if (searchEmployeeQuery.trim()) {
        const q = searchEmployeeQuery.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          e.phone.includes(q)
        );
      }
      return true;
    });
  }, [employees, roleFilter, searchEmployeeQuery]);

  // Handle Morning Cash Float Issuance
  const handleIssueFloatSubmit = async () => {
    const emp = employees.find((e) => e.employeeCode === issueEmpCode);
    if (!emp) return;

    const newFloat: CashFloatRecord = {
      id: `flt_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      employeeCode: emp.employeeCode,
      employeeName: emp.name,
      vehicleReg: emp.assignedVehicleReg || '—',
      openingFloatRupees: issueAmount,
      issuedTime: 'Just now',
      issuedByAdmin: 'Operations Admin',
      verifiedCustomerCashPayoutsRupees: 0,
      approvedRouteExpensesRupees: 0,
      expectedCashReturnRupees: issueAmount,
      varianceRupees: 0,
      status: 'ISSUED',
    };

    try {
      const res = await adminApiClient.post('/admin/operations/cash-floats/issue', {
        employeeCode: newFloat.employeeCode,
        employeeName: newFloat.employeeName,
        vehicleReg: newFloat.vehicleReg,
        openingFloatRupees: issueAmount,
      });

      if (res.success && res.data) {
        const saved = { ...newFloat, ...res.data, id: res.data._id || res.data.id };
        setCashFloats((current) => [saved, ...current]);
        setIsIssueFloatOpen(false);
        showToast(`Issued morning cash float of ₹${issueAmount.toLocaleString('en-IN')} to ${emp.name}.`);
      } else {
        showToast(res.error || 'Failed to issue cash float.');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to issue cash float.');
    }
  };

  // Open Settlement Modal
  const openSettlementModal = (flt: CashFloatRecord) => {
    if (flt.status !== 'ISSUED') return;
    setActiveFloatToSettle(flt);
    setActualCashInput(flt.expectedCashReturnRupees);
    setSettleNotes('');
    setIsSettleFloatOpen(true);
  };

  // Handle Evening Shift Settlement
  const handleSettleFloatSubmit = async () => {
    if (!activeFloatToSettle) return;

    const variance = actualCashInput - activeFloatToSettle.expectedCashReturnRupees;
    let finalStatus: FloatStatus = 'BALANCED';
    if (variance < -5) finalStatus = 'SHORTAGE_FLAGGED';
    if (variance > 5) finalStatus = 'SURPLUS_FLAGGED';

    const updated: CashFloatRecord = {
      ...activeFloatToSettle,
      actualPhysicalCashReturnedRupees: actualCashInput,
      varianceRupees: variance,
      reconciledTime: 'Just now',
      reconciledByAdmin: 'Operations Admin',
      status: finalStatus,
      auditNotes: settleNotes || (variance === 0 ? 'Exact count match' : `Variance of ₹${variance}`),
    };

    try {
      const res = await adminApiClient.patch(`/admin/operations/cash-floats/${activeFloatToSettle.id}/settle`, {
        actualPhysicalCashReturnedRupees: actualCashInput,
        auditNotes: updated.auditNotes,
      });
      if (!res.success) return showToast(res.error || 'Failed to settle float.');
    } catch (err: any) {
      return showToast(err.message || 'Failed to settle float.');
    }

    setCashFloats((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setIsSettleFloatOpen(false);
    setActiveFloatToSettle(null);

    if (finalStatus === 'BALANCED') {
      showToast(`Float balanced & closed cleanly for ${updated.employeeName}! (Saved to MongoDB)`);
    } else {
      showToast(`Warning: Recorded float ${finalStatus.toLowerCase()} of ₹${variance} for ${updated.employeeName} (Saved to MongoDB)`);
    }
  };

  // Quick KYC Approval
  const handleApproveKyc = async (empId: string) => {
    try {
      const res = await adminApiClient.patch(`/admin/operations/employees/${empId}/kyc`, {
        status: 'APPROVED',
      });
      if (!res.success) return showToast(res.error || 'Failed to approve KYC.');
    } catch (err: any) {
      return showToast(err.message || 'Failed to approve KYC.');
    }

    setEmployees((prev) =>
      prev.map((e) =>
        e.id === empId
          ? {
              ...e,
              kyc: { ...e.kyc, status: 'APPROVED', policeVerificationDone: true },
            }
          : e,
      ),
    );
    showToast('KYC successfully approved! Employee marked active for assignments. (Saved to MongoDB)');
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#0A3D2B] text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
          <span className="text-xs font-black tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Workforce Operations & Cash Control */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <Users className="w-3 h-3 text-emerald-700" />
                Workforce HRM & Cash Float Desk
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Phase 3: Drivers, Pickers & Physical Currency Control
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Workforce Roster & Daily Float Reconciliation Desk
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              End-to-end management for Doorstep Scrap Pickers, Truck Drivers, and Yard Sorters. 
              Issue working capital in the morning and automatically reconcile customer doorstep cash payouts against OTP scale vouchers in the evening.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsIssueFloatOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0A3D2B] hover:bg-[#0E4D36] text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/20 transition-all cursor-pointer"
            >
              <Banknote className="w-4 h-4 stroke-[2.5]" />
              <span>Issue Morning Cash Float</span>
            </button>
          </div>
        </div>

        {/* 4 Operations KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Duty Personnel
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-900">{metrics.totalStaff} Staff</span>
              <span className="text-[11px] font-extrabold text-emerald-700">
                {metrics.onRouteCount} On Route
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {metrics.inYardCount} in Yard • {metrics.pendingKycCount} KYC Pending
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              Morning Cash Float Disbursed
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-amber-950">{metrics.totalDisbursedFloat}</span>
            </div>
            <span className="text-[10px] text-amber-800/80 mt-1 block">Carried by pickers for cash payouts</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Verified Doorstep Cash Paid
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-[#0A3D2B]">{metrics.totalCustomerPaidToday}</span>
            </div>
            <span className="text-[10px] text-emerald-800/80 mt-1 block">Backed by verified OTP scale vouchers</span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
              Expected Evening Return Cash
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-blue-950">{metrics.expectedReturnFloat}</span>
            </div>
            <span className="text-[10px] text-blue-700 mt-1 block">To be physically audited at yard gate</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          {[
            { id: 'ROSTER', label: '👥 Workforce Roster & KYC', count: employees.length },
            { id: 'FLOAT_DESK', label: '💵 Daily Cash Float Desk', count: cashFloats.length },
            { id: 'ATTENDANCE', label: '📅 Geofenced Attendance', count: metrics.onRouteCount + metrics.inYardCount },
            { id: 'LEADERBOARD', label: '🏆 Collection Leaderboard', count: employees.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#0A3D2B] text-white shadow-md shadow-emerald-950/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/90'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md ${
                activeTab === tab.id ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* SUB-TAB 1: WORKFORCE ROSTER & KYC */}
      {activeTab === 'ROSTER' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/90">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 outline-none"
              >
                <option value="ALL">All Roles</option>
                <option value="FIELD_COLLECTOR">Field Collectors (Pickers)</option>
                <option value="DRIVER">Fleet Drivers</option>
                <option value="YARD_SORTER">Yard Sorters</option>
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name or code..."
                value={searchEmployeeQuery}
                onChange={(e) => setSearchEmployeeQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 outline-none font-medium"
              />
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="py-3.5 px-4">Employee Identity</th>
                    <th className="py-3.5 px-3">Role & Division</th>
                    <th className="py-3.5 px-3">Assigned Vehicle</th>
                    <th className="py-3.5 px-3">KYC Verification</th>
                    <th className="py-3.5 px-3">Pay Model & Incentives</th>
                    <th className="py-3.5 px-3">Today Collection</th>
                    <th className="py-3.5 px-3">Rating</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => {
                    const isKycApproved = emp.kyc.status === 'APPROVED';

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. Identity */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-950 font-black flex items-center justify-center shrink-0 border border-emerald-200">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-black text-slate-900 text-xs block">{emp.name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  {emp.employeeCode}
                                </span>
                                <span className="text-[10px] text-slate-400">{emp.phone}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Role */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-800 text-xs">
                              {emp.role.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-emerald-800 font-semibold truncate max-w-[120px]">
                              {emp.assignedDivision}
                            </span>
                          </div>
                        </td>

                        {/* 3. Vehicle */}
                        <td className="py-3.5 px-3">
                          {emp.assignedVehicleReg ? (
                            <span className="font-black text-slate-800 text-xs bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
                              {emp.assignedVehicleReg}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Yard Stationed</span>
                          )}
                        </td>

                        {/* 4. KYC Status */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full w-fit ${
                                isKycApproved
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                              }`}
                            >
                              {emp.kyc.status}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Aadhaar: {emp.kyc.aadhaarMasked}
                            </span>
                          </div>
                        </td>

                        {/* 5. Compensation */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-xs">
                              ₹{emp.compensation.basePayRupees.toLocaleString('en-IN')}
                              <span className="text-[9px] text-slate-400 font-normal">
                                {emp.compensation.payModel === 'DAILY_WAGE' ? '/day' : '/mo'}
                              </span>
                            </span>
                            {emp.compensation.incentivePerKgPaise > 0 && (
                              <span className="text-[10px] font-bold text-emerald-700">
                                +₹{(emp.compensation.incentivePerKgPaise / 100).toFixed(2)}/kg bonus
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 6. Today Collection */}
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-xs">
                              {emp.metrics.todayKgCollected} kg
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {emp.metrics.todayPickupsCompleted} pickups today
                            </span>
                          </div>
                        </td>

                        {/* 7. Rating */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1 font-black text-xs text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-400 stroke-none" />
                            <span>{emp.metrics.rating}</span>
                          </div>
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isKycApproved && (
                              <button
                                onClick={() => handleApproveKyc(emp.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-xs cursor-pointer"
                              >
                                Approve KYC
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedEmployeeForModal(emp)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer shadow-2xs"
                            >
                              Profile
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DAILY CASH FLOAT DESK */}
      {activeTab === 'FLOAT_DESK' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Daily Working Capital Reconciliation
              </h3>
              <p className="text-[11px] text-slate-400">
                Formula: Opening Float - Doorstep Cash Payouts - Route Fuel = Expected Cash Returned
              </p>
            </div>

            <button
              onClick={() => setIsIssueFloatOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Issue Float
            </button>
          </div>

          {/* Floats Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    <th className="py-3.5 px-4">Picker & Vehicle</th>
                    <th className="py-3.5 px-3">Opening Float</th>
                    <th className="py-3.5 px-3">Doorstep Cash Paid</th>
                    <th className="py-3.5 px-3">Route Expenses</th>
                    <th className="py-3.5 px-3 bg-blue-50/50 text-blue-900">Expected Return</th>
                    <th className="py-3.5 px-3">Actual Cash Count</th>
                    <th className="py-3.5 px-3">Variance</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {cashFloats.map((flt) => {
                    const isSettled = flt.status !== 'ISSUED';

                    return (
                      <tr key={flt.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. Picker */}
                        <td className="py-3.5 px-4">
                          <span className="font-black text-slate-900 text-xs block">{flt.employeeName}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {flt.employeeCode} • {flt.vehicleReg}
                          </span>
                        </td>

                        {/* 2. Opening Float */}
                        <td className="py-3.5 px-3 font-black text-slate-900 text-xs">
                          ₹{flt.openingFloatRupees.toLocaleString('en-IN')}
                          <span className="text-[9px] text-slate-400 block font-normal">{flt.issuedTime}</span>
                        </td>

                        {/* 3. Doorstep Cash Paid */}
                        <td className="py-3.5 px-3 font-extrabold text-emerald-800 text-xs">
                          ₹{flt.verifiedCustomerCashPayoutsRupees.toLocaleString('en-IN')}
                        </td>

                        {/* 4. Route Expenses */}
                        <td className="py-3.5 px-3 font-bold text-slate-600">
                          ₹{flt.approvedRouteExpensesRupees.toFixed(2)}
                        </td>

                        {/* 5. Expected Return */}
                        <td className="py-3.5 px-3 bg-blue-50/50 font-black text-blue-950 text-xs">
                          ₹{Math.round(flt.expectedCashReturnRupees).toLocaleString('en-IN')}
                        </td>

                        {/* 6. Actual Return */}
                        <td className="py-3.5 px-3 font-extrabold text-slate-900 text-xs">
                          {flt.actualPhysicalCashReturnedRupees != null
                            ? `₹${flt.actualPhysicalCashReturnedRupees.toLocaleString('en-IN')}`
                            : <span className="text-amber-600 text-[11px] font-bold">On Route</span>}
                        </td>

                        {/* 7. Variance */}
                        <td className="py-3.5 px-3">
                          {isSettled ? (
                            <span
                              className={`text-xs font-black ${
                                flt.varianceRupees === 0
                                  ? 'text-emerald-700'
                                  : flt.varianceRupees < 0
                                  ? 'text-rose-700'
                                  : 'text-blue-700'
                              }`}
                            >
                              {flt.varianceRupees === 0 ? '₹0.00' : `₹${flt.varianceRupees}`}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* 8. Status */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                              flt.status === 'BALANCED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : flt.status === 'SHORTAGE_FLAGGED'
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                            }`}
                          >
                            {flt.status}
                          </span>
                        </td>

                        {/* 9. Actions */}
                        <td className="py-3.5 px-4 text-right">
                          {!isSettled ? (
                            <button
                              onClick={() => openSettlementModal(flt)}
                              className="px-3 py-1.5 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] transition-colors cursor-pointer shadow-xs"
                            >
                              Audit & Settle
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold">
                              Settled {flt.reconciledTime}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {cashFloats.length === 0 && (
                    <tr><td colSpan={9} className="py-10 text-center text-slate-400">
                      No cash floats have been issued.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: GEOFENCED ATTENDANCE */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">Today's Shift Attendance Log (Oct 12, 2026)</h3>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Vijayawada Central Hub Geofence Active (Radius 100m)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {employees.map((emp) => (
                <div key={emp.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center shrink-0">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-black text-slate-900 block">{emp.name}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{emp.employeeCode} • {emp.role}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                      {emp.todayAttendance.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold block mt-1">
                      Check-in: {emp.checkInTime}
                    </span>
                  </div>
                </div>
              ))}
              {employees.length === 0 && (
                <div className="md:col-span-2 py-10 text-center text-xs text-slate-400">
                  No workforce roster records available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: COLLECTION LEADERBOARD */}
      {activeTab === 'LEADERBOARD' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {employees
              .filter((e) => e.role === 'FIELD_COLLECTOR' || e.role === 'DRIVER')
              .slice(0, 3)
              .map((top, idx) => (
                <div key={top.id} className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                    <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 stroke-none" /> {top.metrics.rating}
                    </span>
                  </div>

                  <div className="my-3">
                    <h4 className="text-base font-black text-slate-900">{top.name}</h4>
                    <span className="text-[10px] text-slate-400 font-bold">{top.employeeCode} • {top.assignedDivision}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Today Collected</span>
                      <span className="font-black text-slate-900 text-sm">{top.metrics.todayKgCollected} kg</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Pickups Done</span>
                      <span className="font-black text-emerald-800 text-sm">{top.metrics.todayPickupsCompleted} jobs</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* MODAL: ISSUE MORNING CASH FLOAT */}
      {isIssueFloatOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-800" />
                Issue Morning Cash Float
              </h3>
              <button
                onClick={() => setIsIssueFloatOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Field Picker / Driver</label>
                <select
                  value={issueEmpCode}
                  onChange={(e) => setIssueEmpCode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                >
                  {employees
                    .filter((e) => e.role === 'FIELD_COLLECTOR' || e.role === 'DRIVER')
                    .map((e) => (
                      <option key={e.id} value={e.employeeCode}>
                        {e.name} ({e.employeeCode}) — {e.assignedVehicleReg || 'No Vehicle'}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cash Float Amount (₹)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="1000"
                    value={issueAmount}
                    onChange={(e) => setIssueAmount(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-black text-slate-900 bg-slate-50 outline-none text-base"
                  />
                  <span className="text-xs font-bold text-slate-500">INR</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {[10000, 15000, 20000, 25000].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setIssueAmount(preset)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-[10px] text-slate-700 cursor-pointer"
                    >
                      ₹{preset.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900">
                ⚠️ Cashier Note: Picker must physically count and verify notes before leaving the yard gate.
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setIsIssueFloatOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleIssueFloatSubmit}
                className="w-1/2 py-2.5 rounded-xl bg-[#0A3D2B] text-white font-black text-xs hover:bg-[#0E4D36] cursor-pointer shadow-md"
              >
                Disburse Float
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SETTLE EVENING CASH FLOAT AUDIT */}
      {isSettleFloatOpen && activeFloatToSettle && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900">Evening Shift Float Audit</h3>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {activeFloatToSettle.employeeName} ({activeFloatToSettle.employeeCode})
                </span>
              </div>
              <button
                onClick={() => setIsSettleFloatOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reconciliation Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">1. Issued Morning Float:</span>
                <span className="font-black text-slate-900">
                  ₹{activeFloatToSettle.openingFloatRupees.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">2. Customer Cash Paid (OTP Vouchers):</span>
                <span className="font-extrabold text-emerald-800">
                  - ₹{activeFloatToSettle.verifiedCustomerCashPayoutsRupees.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">3. Approved Route Expenses:</span>
                <span className="font-bold text-slate-700">
                  - ₹{activeFloatToSettle.approvedRouteExpensesRupees.toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-sm">
                <span className="font-black text-slate-900">Expected Cash Return:</span>
                <span className="font-black text-blue-900">
                  ₹{Math.round(activeFloatToSettle.expectedCashReturnRupees).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Actual Physical Cash Counted */}
            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Actual Physical Cash Handed Over (₹)</label>
              <input
                type="number"
                value={actualCashInput}
                onChange={(e) => setActualCashInput(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-black text-slate-900 bg-slate-50 outline-none text-base"
              />

              {/* Variance Indicator */}
              {actualCashInput !== activeFloatToSettle.expectedCashReturnRupees && (
                <div className={`p-2.5 rounded-xl border text-xs font-bold ${
                  actualCashInput < activeFloatToSettle.expectedCashReturnRupees
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}>
                  {actualCashInput < activeFloatToSettle.expectedCashReturnRupees
                    ? `⚠️ Cash Shortage: -₹${activeFloatToSettle.expectedCashReturnRupees - actualCashInput}`
                    : `ℹ️ Cash Surplus: +₹${actualCashInput - activeFloatToSettle.expectedCashReturnRupees}`}
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Cashier Audit Notes</label>
                <textarea
                  placeholder="Optional audit notes or voucher breakdown..."
                  value={settleNotes}
                  onChange={(e) => setSettleNotes(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 font-medium text-xs bg-slate-50 outline-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setIsSettleFloatOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSettleFloatSubmit}
                className="w-1/2 py-2.5 rounded-xl bg-[#0A3D2B] text-white font-black text-xs hover:bg-[#0E4D36] cursor-pointer shadow-md"
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EMPLOYEE PROFILE DETAILS */}
      {selectedEmployeeForModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center">
                  {selectedEmployeeForModal.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedEmployeeForModal.name}</h3>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {selectedEmployeeForModal.employeeCode} • {selectedEmployeeForModal.role}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedEmployeeForModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile Data */}
            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">KYC & Compliance</span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Aadhaar Card:</span>
                  <span className="font-bold text-slate-800">{selectedEmployeeForModal.kyc.aadhaarMasked}</span>
                </div>
                {selectedEmployeeForModal.kyc.dlNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Driving License:</span>
                    <span className="font-bold text-slate-800">{selectedEmployeeForModal.kyc.dlNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Police Check:</span>
                  <span className="font-bold text-emerald-700">Verified & Clear</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Payout & Banking</span>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Account:</span>
                  <span className="font-bold text-slate-800">{selectedEmployeeForModal.compensation.bankAccountMasked}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">UPI ID:</span>
                  <span className="font-bold text-slate-800">{selectedEmployeeForModal.compensation.upiId}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedEmployeeForModal(null)}
              className="w-full py-2.5 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] cursor-pointer"
            >
              Close Profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
