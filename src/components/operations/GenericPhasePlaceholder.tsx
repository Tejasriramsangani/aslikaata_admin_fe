"use client";

import React from 'react';
import {
  Truck,
  Users,
  PackagePlus,
  Calendar,
  SendHorizontal,
  BarChart3,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useAdminNav, AdminNavSection } from '../../context/AdminNavContext';

interface PhaseMeta {
  title: string;
  badge: string;
  phaseNum: number;
  description: string;
  keyFeatures: string[];
  ctaLabel?: string;
  onCtaClick?: () => void;
}

const SECTION_METAS: Record<AdminNavSection, PhaseMeta> = {
  pricing: {
    title: 'Live Rates & Margins',
    badge: 'Phase 1 Active',
    phaseNum: 1,
    description: 'Dynamic wholesale benchmark tracking with Market Rate ± Margin calculation engine.',
    keyFeatures: ['Spot Mandi Feed', 'Inline Steppers', 'Customer App Simulator', 'Audit Log'],
  },
  fleet: {
    title: 'Vehicle Registry & Logistics (Rent vs Own)',
    badge: 'Phase 2 Next',
    phaseNum: 2,
    description: 'Fleet management tracking owned vs rented vehicles, fuel logs, maintenance, and route costs.',
    keyFeatures: [
      'Vehicle Ownership Registry (Owned vs Rented contracts)',
      'Fitness Certificate (FC), Insurance & PUC Expiration Tracking',
      'Fuel & EV Charging Logs with Odometer Efficiency Metrics',
      'Preventive Maintenance Desk & Mechanic Invoices',
      'Route Incidentals (Tolls, Parking, Punctures)',
    ],
  },
  workforce: {
    title: 'Workforce HRM & Daily Cash Float Desk',
    badge: 'Phase 3 Next',
    phaseNum: 3,
    description: 'Driver and picker management with morning cash float issuance and end-of-day reconciliation.',
    keyFeatures: [
      'Field Collector & Driver Profiles with KYC Document Approval',
      'Morning Cash Float Issuance (e.g. ₹15,000) with Digital Sign-off',
      'Evening Shift Cash Reconciler (Float - Customer Payouts - Fuel = Cash Returned)',
      'Discrepancy & Shortage Flagging on Picker Profile',
      'Daily Attendance & Performance Leaderboard (Kg collected)',
    ],
  },
  inward: {
    title: 'Multi-Channel Inward Scrap Receiving Desk',
    badge: 'Phase 4 Next',
    phaseNum: 4,
    description: 'Comprehensive intake tracking across Field Pickups, Yard Gate Walk-ins, and B2B Commercial Cleanouts.',
    keyFeatures: [
      'Unified Inward Intake Ledger (Doorstep AKP-XXXX + Gate Tickets)',
      'Rapid Yard Gate Walk-in Point-of-Sale (POS) with Instant Weighing Entry',
      'Auto-fetch Active Buying Rates & Wastage Deductions',
      '3-Inch Thermal Voucher Printing & Instant Cash/UPI Payout',
      'B2B Weighbridge Slips & GST e-Way Bill Documentation',
    ],
  },
  calendar: {
    title: 'Holiday Operations Calendar & Weekly Route Matrix',
    badge: 'Phase 5 Next',
    phaseNum: 5,
    description: 'Predefined holiday planning that automatically moves weekly route runs and re-schedules customer pickups.',
    keyFeatures: [
      'Interactive Full-Calendar Grid (National, State & Municipal Holidays)',
      'Configurable Shift Rule: NEXT_WORKING_DAY vs NEXT_WEEK_SAME_DAY',
      'Holiday Impact Simulator: Preview how many pickups move before saving',
      'Weekly Route Run Master Matrix (Vehicles × Divisions × Weekdays)',
      'Unassigned Bulk Orders Exception Queue',
    ],
  },
  outward: {
    title: 'Outward Mill Dispatches & Recycler Sales',
    badge: 'Phase 6 Next',
    phaseNum: 6,
    description: 'Wholesale material dispatches to smelters, paper mills, and plastic pelletizers.',
    keyFeatures: [
      'Recycler Contracts & Sale Agreements (Jindal, Paper Mills)',
      'Outward Gate Pass Generation & Outward Weighbridge Slips',
      'Baled Stock Material Lot Allocation',
      'Customer Buying Cost vs Smelter Sale Price Realization',
    ],
  },
  analytics: {
    title: 'Unit Economics & Financial P&L Operations',
    badge: 'Phase 6 Next',
    phaseNum: 6,
    description: 'End-to-end profitability analytics comparing buying expenditure, logistics, and mill revenue.',
    keyFeatures: [
      'True Net Margin = Mill Revenue - (Buying Cost + Fleet Rent + Fuel + Wages)',
      'Category-wise Contribution Margin (Iron vs Copper vs Paper vs Plastic)',
      'Per-Kg Fleet Transportation Cost Metrics',
      'Real-time P&L Statement & Daily Run Rate',
    ],
  },
  audits: {
    title: 'Fraud Sentinel & Anomaly Alert Monitor',
    badge: 'Phase 6 Next',
    phaseNum: 6,
    description: 'Automated operational safety monitoring and fraud prevention across weighing and cash payouts.',
    keyFeatures: [
      'Wastage Outlier Alerts (>20% deduction flag)',
      'Weight Estimation Disconnects (Customer estimated 10kg, recorded 70kg)',
      'Cash Float Shortage Audit Ledger',
      'Geofence Discrepancy Warnings (QR scanned away from address)',
    ],
  },
  users: {
    title: 'User Creation & RBAC Role Management',
    badge: 'Staff Management',
    phaseNum: 4,
    description: 'Configure corporate administrators, yard managers, dispatchers, and field operatives with role-based access control.',
    keyFeatures: [
      'Role-based permissions matrix',
      'Division & Yard Assignment',
      'Staff Credential Management',
      'User Status & Audit Logging',
    ],
  },
};

export const GenericPhasePlaceholder: React.FC = () => {
  const { activeSection, setActiveSection } = useAdminNav();
  const meta = SECTION_METAS[activeSection] || SECTION_METAS.fleet;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm relative overflow-hidden">
        {/* Background glow accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-50 rounded-full blur-3xl pointer-events-none -z-0 opacity-60" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#F59E0B]" />
              {meta.badge}
            </span>
            <span className="text-xs font-bold text-slate-400">
              Module {meta.phaseNum} of Operations ERP
            </span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {meta.title}
          </h2>

          <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
            {meta.description}
          </p>

          <div className="pt-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              Core Capabilities in this Module
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {meta.keyFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5 text-xs font-bold text-slate-800"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center gap-3">
            <button
              onClick={() => setActiveSection('pricing')}
              className="px-5 py-3 rounded-2xl bg-[#0A3D2B] hover:bg-[#0E4D36] text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/20 cursor-pointer transition-all"
            >
              <span>Explore Live Scrap Rates Engine (Phase 1)</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
