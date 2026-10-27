import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Search,
  MapPin,
  Wifi,
  WifiOff,
  Bell,
  UserCheck,
  ChevronDown,
  Sparkles,
  Command,
  RefreshCw,
} from 'lucide-react';
import { useAdminNav } from '../../context/AdminNavContext';
import { useAdminAuth, AdminRole } from '../../context/AdminAuthContext';

export const AdminTopHeader: React.FC = () => {
  const pathname = usePathname();
  const {
    activeSection,
    selectedDivisionId,
    setSelectedDivisionId,
    isBackendConnected,
    unassignedBulkCount,
    searchQuery,
    setSearchQuery,
    divisions,
  } = useAdminNav();
  const { admin, loginWithDemo } = useAdminAuth();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Friendly title for the active section based on route
  const sectionTitle =
    pathname === '/pricing'
      ? 'Live Scrap Rates & Dynamic Margin Engine'
      : pathname === '/fleet'
      ? 'Vehicle Registry, Logistics & Fuel Desk'
      : pathname === '/workforce'
      ? 'Workforce HRM & Daily Cash Float Desk'
      : pathname === '/inward'
      ? 'Multi-Channel Inward Scrap Receiving Desk'
      : pathname === '/dispatch'
      ? 'Assign Pickups — Orders & Employees'
      : pathname === '/calendar'
      ? 'Operations Holiday Calendar & Route Matrix'
      : pathname === '/outward'
      ? 'Outward Mill Dispatches & Recycler Sales'
      : pathname === '/analytics'
      ? 'Unit Economics & Financial P&L'
      : pathname === '/audits'
      ? 'Fraud Sentinel & Anomaly Alert Monitor'
      : pathname === '/users'
      ? 'User Creation & RBAC Role Privileges'
      : 'Operations Command Center & ERP Dispatch';

  const rolesList: { role: AdminRole; label: string; desc: string }[] = [
    { role: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Full System & Rate Authority' },
    { role: 'YARD_MANAGER', label: 'Yard Manager', desc: 'Inward Scales & Inventory' },
    { role: 'DISPATCHER', label: 'Fleet Dispatcher', desc: 'Vehicle Routes & Float Desk' },
    { role: 'ACCOUNTANT', label: 'Accountant', desc: 'Disbursements & Invoicing' },
  ];

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Active Section & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Operations Cockpit</span>
          <span>/</span>
        </div>
        <h1 className="text-sm md:text-base font-black text-slate-900 tracking-tight truncate">
          {sectionTitle}
        </h1>
      </div>

      {/* Right Controls: Division Filter, Search, WebSocket, Alerts, Role Switcher */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Division Selector */}
        <div className="relative">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-slate-300 transition-colors">
            <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <select
              value={selectedDivisionId}
              onChange={(e) => setSelectedDivisionId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer pr-1"
            >
              {divisions.map((div) => (
                <option key={div.id} value={div.id}>
                  {div.code === 'ALL' ? '🌐 All Divisions' : `📍 ${div.name}`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative hidden lg:block w-48 xl:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search pickup, vehicle, employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-600 focus:bg-white transition-all font-medium"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 bg-slate-200 px-1 py-0.5 rounded">
            ⌘K
          </span>
        </div>

        {/* Real-time Connection Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
            isBackendConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
          title={
            isBackendConnected
              ? 'Connected to NestJS WebSocket (Port 4000)'
              : 'Local Realtime Emulation active'
          }
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isBackendConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="hidden sm:inline">
            {isBackendConnected ? 'Backend Connected' : 'Local Fallback'}
          </span>
        </div>

        {/* Quick Role Switcher (For Pair Development Testing) */}
        <div className="relative">
          <button
            onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-[#0A3D2B] transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{admin?.role || 'SUPER_ADMIN'}</span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 animate-in fade-in duration-150">
              <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Switch Active Role
                </span>
                <span className="text-xs font-extrabold text-slate-800">
                  {admin?.name}
                </span>
              </div>

              {rolesList.map((r) => (
                <button
                  key={r.role}
                  onClick={() => {
                    loginWithDemo(r.role);
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex flex-col ${
                    admin?.role === r.role
                      ? 'bg-[#0A3D2B] text-white'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-extrabold">{r.label}</span>
                  <span
                    className={`text-[10px] ${
                      admin?.role === r.role ? 'text-emerald-200' : 'text-slate-400'
                    }`}
                  >
                    {r.desc}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
