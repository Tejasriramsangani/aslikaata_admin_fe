"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  TrendingUp,
  Truck,
  Users,
  PackagePlus,
  Calendar,
  SendHorizontal,
  BarChart3,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  LogOut,
  Building2,
  Clock,
  Layers,
  UserCog,
  LayoutDashboard,
} from 'lucide-react';
import { useAdminNav, AdminNavSection } from '../../context/AdminNavContext';
import { useAdminAuth } from '../../context/AdminAuthContext';

interface NavItem {
  id: AdminNavSection | 'dashboard';
  href: string;
  label: string;
  badge?: string;
  badgeVariant?: 'emerald' | 'amber' | 'rose' | 'slate';
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  groupTitle: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    groupTitle: 'Operations & Dispatch',
    items: [
      {
        id: 'dashboard',
        href: '/',
        label: 'Dispatch Cockpit',
        badge: 'Live',
        badgeVariant: 'emerald',
        icon: LayoutDashboard,
      },
      {
        id: 'inward',
        href: '/inward',
        label: 'Scrap Inward Receiving',
        badge: 'Multi-Way',
        badgeVariant: 'emerald',
        icon: PackagePlus,
      },
    ],
  },
  {
    groupTitle: 'Commercials & Rates',
    items: [
      {
        id: 'pricing',
        href: '/pricing',
        label: 'Live Rates & Margins',
        badge: '± Engine',
        badgeVariant: 'emerald',
        icon: TrendingUp,
      },
      {
        id: 'outward',
        href: '/outward',
        label: 'Mill Dispatches & Sales',
        badge: 'B2B',
        badgeVariant: 'slate',
        icon: SendHorizontal,
      },
    ],
  },
  {
    groupTitle: 'Logistics & Fleet',
    items: [
      {
        id: 'fleet',
        href: '/fleet',
        label: 'Vehicle Registry & Fuel',
        badge: 'Rent/Own',
        badgeVariant: 'amber',
        icon: Truck,
      },
      {
        id: 'calendar',
        href: '/calendar',
        label: 'Holidays & Route Runs',
        badge: 'Weekly',
        badgeVariant: 'slate',
        icon: Calendar,
      },
    ],
  },
  {
    groupTitle: 'Workforce & Administration',
    items: [
      {
        id: 'workforce',
        href: '/workforce',
        label: 'Workforce & Cash Float',
        badge: 'Float Desk',
        badgeVariant: 'slate',
        icon: Users,
      },
      {
        id: 'users',
        href: '/users',
        label: 'Users & RBAC Roles',
        badge: 'Staff',
        badgeVariant: 'emerald',
        icon: UserCog,
      },
    ],
  },
  {
    groupTitle: 'Intelligence & Audit',
    items: [
      {
        id: 'analytics',
        href: '/analytics',
        label: 'Unit Economics & P&L',
        icon: BarChart3,
      },
      {
        id: 'audits',
        href: '/audits',
        label: 'Fraud Sentinel & Alerts',
        badge: 'Audit',
        badgeVariant: 'rose',
        icon: ShieldAlert,
      },
    ],
  },
];

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar, unassignedBulkCount, setActiveSection } = useAdminNav();
  const { admin, logout } = useAdminAuth();

  return (
    <aside
      className={`h-screen sticky top-0 bg-[#0A3D2B] text-white flex flex-col justify-between transition-all duration-300 z-30 select-none border-r border-emerald-900/60 shadow-2xl ${
        isSidebarCollapsed ? 'w-[76px]' : 'w-[268px]'
      }`}
    >
      {/* Top Branding & Workspace Identity */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-emerald-800/60 bg-[#062418]">
          <Link href="/" className="flex items-center gap-3 overflow-hidden group">
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="ASLI KAATA Logo"
                width={32}
                height={32}
                className="object-contain"
                priority
              />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black tracking-widest text-[#F59E0B] uppercase truncate leading-tight">
                  ASLI KAATA
                </span>
                <span className="text-[10px] font-bold text-emerald-300 tracking-wider uppercase opacity-90 truncate">
                  OPERATIONS ERP
                </span>
              </div>
            )}
          </Link>

          <button
            onClick={toggleSidebar}
            className="w-7 h-7 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 flex items-center justify-center transition-colors cursor-pointer"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </div>

        {/* Unassigned Quick Notification Pill */}
        {!isSidebarCollapsed && unassignedBulkCount > 0 && (
          <Link
            href="/inward"
            className="mx-3 mt-3 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-between text-amber-300 text-xs font-bold hover:bg-amber-500/25 transition-all block animate-pulse"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{unassignedBulkCount} Bulk Pickups Pending</span>
            </div>
            <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded-md">
              ACT
            </span>
          </Link>
        )}

        {/* Navigation Group Sections */}
        <div className="px-2.5 py-3 space-y-4 overflow-y-auto max-h-[calc(100vh-190px)]">
          {NAV_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {!isSidebarCollapsed && (
                <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/70 mb-1">
                  {group.groupTitle}
                </p>
              )}

              {group.items.map((item) => {
                const IconComponent = item.icon;
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      if (item.id !== 'dashboard') {
                        setActiveSection(item.id as AdminNavSection);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-xs transition-all relative group cursor-pointer ${
                      isActive
                        ? 'bg-[#10B981] text-slate-950 shadow-md shadow-emerald-950/40 font-black'
                        : 'text-emerald-100/90 hover:bg-emerald-900/60 hover:text-white'
                    }`}
                    title={isSidebarCollapsed ? item.label : undefined}
                  >
                    <IconComponent
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isActive ? 'scale-110 text-slate-950' : 'text-emerald-300 group-hover:scale-105'
                      }`}
                    />

                    {!isSidebarCollapsed && (
                      <div className="flex-1 flex items-center justify-between overflow-hidden">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ml-1.5 ${
                              isActive
                                ? 'bg-slate-950 text-emerald-300'
                                : item.badgeVariant === 'emerald'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : item.badgeVariant === 'amber'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : item.badgeVariant === 'rose'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom User Profile & Status */}
      <div className="p-3 border-t border-emerald-800/60 bg-[#062418]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-emerald-700 border border-emerald-500 flex items-center justify-center font-black text-xs text-white shrink-0">
              {admin?.name?.charAt(0) || 'A'}
            </div>

            {!isSidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-black text-white truncate leading-tight">
                  {admin?.name || 'Administrator'}
                </span>
                <span className="text-[10px] text-emerald-300 font-bold truncate">
                  {admin?.role === 'SUPER_ADMIN'
                    ? 'Super Admin'
                    : admin?.role === 'YARD_MANAGER'
                    ? 'Yard Manager'
                    : admin?.role === 'DISPATCHER'
                    ? 'Dispatcher'
                    : admin?.role === 'ACCOUNTANT'
                    ? 'Accountant'
                    : admin?.role || 'Staff'}
                </span>
              </div>
            )}
          </div>

          {!isSidebarCollapsed && (
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900/80 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
