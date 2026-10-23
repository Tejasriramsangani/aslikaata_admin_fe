"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  Building2,
  Truck,
  Coins,
  Scale,
  Sparkles,
  Lock,
  Mail,
  Phone,
  User,
  X,
  AlertCircle,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { adminApiClient } from '../../lib/api-client';
import { AdminRole, useAdminAuth } from '../../context/AdminAuthContext';

export interface SystemUserRecord {
  id: string;
  userId?: string;
  name: string;
  email: string;
  mobile: string;
  role: AdminRole;
  assignedDivision: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt?: string;
}

const ROLE_DEFINITIONS: Record<
  AdminRole,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    description: string;
    permissions: string[];
  }
> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    badgeBg: 'bg-purple-100 border-purple-300',
    badgeText: 'text-purple-800',
    description: 'Master operational control across all divisions and financial realization.',
    permissions: [
      'Live Pricing & Margin Engine',
      'Fleet & Logistics Control',
      'Inward Scrap Intake',
      'Workforce & Cash Float Reconciler',
      'Outward Mill Sales & Dispatch',
      'Financial P&L Realization',
      'User & RBAC Role Administration',
    ],
  },
  YARD_MANAGER: {
    label: 'Yard Manager',
    badgeBg: 'bg-emerald-100 border-emerald-300',
    badgeText: 'text-emerald-800',
    description: 'Yard gate receiving, weighment scale verification, baling & outward dispatches.',
    permissions: [
      'Inward Scrap Intake & Weighment Scale',
      'Outward Mill Dispatches & Baled Inventory',
      'Gate Drop Cash Receipts',
      'Daily Yard Waste Audits',
    ],
  },
  DISPATCHER: {
    label: 'Fleet Dispatcher',
    badgeBg: 'bg-sky-100 border-sky-300',
    badgeText: 'text-sky-800',
    description: 'Route run planning, automated pickup assignments, and vehicle logistics.',
    permissions: [
      'Fleet & Vehicle Registry',
      'Driver Roster & Route Run Scheduling',
      'Unassigned Bulk Queue Dispatch',
      'Vehicle Maintenance & Fuel Logs',
    ],
  },
  ACCOUNTANT: {
    label: 'Chief Accountant',
    badgeBg: 'bg-amber-100 border-amber-300',
    badgeText: 'text-amber-800',
    description: 'Cash float custody, field collection reconciliations, and P&L realization.',
    permissions: [
      'Daily Cash Float Wallet Desk',
      'Doorstep Cash Settlement Verifications',
      'Unit Economics & P&L Statements',
      'Invoice Ledger Audits',
    ],
  },
  COLLECTOR: {
    label: 'Field Collector / Driver',
    badgeBg: 'bg-indigo-100 border-indigo-300',
    badgeText: 'text-indigo-800',
    description: 'Field collection operative using handheld companion app for weighment & OTPs.',
    permissions: [
      'Mobile Companion App Access',
      'Doorstep QR & Geofence Check',
      'Digital Scale Bluetooth Weight Entry',
      'Customer OTP Handshake & Invoicing',
    ],
  },
};

const DIVISIONS_LIST = [
  'All Andhra Divisions',
  'Vijayawada Central Yard',
  'Guntur Autonagar Fleet Hub',
  'Vizag Port Scrap Depot',
  'Tirupati Division',
];

export const UserManagementScreen: React.FC = () => {
  const { admin } = useAdminAuth();

  const [users, setUsers] = useState<SystemUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | AdminRole>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  // New User Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    role: 'SUPER_ADMIN' as AdminRole,
    assignedDivision: 'Vijayawada Central Yard',
    password: 'Staff@123456',
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminApiClient.get('/admin/users');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setUsers(res.data);
      } else {
        // Fallback default users if empty
        setUsers([
          {
            id: '1',
            name: 'Ramesh Varma',
            email: 'admin@aslikaata.com',
            mobile: '9848022334',
            role: 'SUPER_ADMIN',
            assignedDivision: 'All Andhra Divisions',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'K. Venkat Rao',
            email: 'yard.manager@aslikaata.com',
            mobile: '9848022335',
            role: 'YARD_MANAGER',
            assignedDivision: 'Vijayawada Central Yard',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          },
          {
            id: '3',
            name: 'Suresh Reddy',
            email: 'dispatcher@aslikaata.com',
            mobile: '9848022336',
            role: 'DISPATCHER',
            assignedDivision: 'Guntur Autonagar Fleet Hub',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          },
          {
            id: '4',
            name: 'P. Anitha',
            email: 'accounts@aslikaata.com',
            mobile: '9848022337',
            role: 'ACCOUNTANT',
            assignedDivision: 'All Andhra Divisions',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          },
          {
            id: '5',
            name: 'Ravi Kumar',
            email: 'ravi.collector@aslikaata.com',
            mobile: '9848022340',
            role: 'COLLECTOR',
            assignedDivision: 'Vijayawada Central Yard',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.mobile.includes(searchQuery);
      const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, selectedRoleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionNotice(null);

    try {
      const res = await adminApiClient.post('/admin/users', formData);
      if (res.success && res.data) {
        setActionNotice({
          type: 'success',
          message: `User ${formData.name} (${formData.role}) created successfully!`,
        });
        setIsModalOpen(false);
        setFormData({
          name: '',
          email: '',
          mobile: '',
          role: 'SUPER_ADMIN',
          assignedDivision: 'Vijayawada Central Yard',
          password: 'Staff@123456',
        });
        await loadUsers();
      } else {
        setActionNotice({
          type: 'error',
          message: res.error || 'Failed to create user. Please check if email or mobile already exists.',
        });
      }
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Error communicating with backend.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate and remove user: ${name}?`)) {
      return;
    }
    try {
      const res = await adminApiClient.delete(`/admin/users/${id}`);
      if (res.success) {
        setActionNotice({
          type: 'success',
          message: `User ${name} removed successfully!`,
        });
        await loadUsers();
      } else {
        setActionNotice({
          type: 'error',
          message: res.error || 'Failed to remove user',
        });
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', message: err.message || 'Network error' });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Action Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-50 text-[#0A3D2B] border border-emerald-200">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              User & RBAC Role Management
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure system staff, role-based permission matrices, yard assignments, and security credentials.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadUsers}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#0A3D2B] hover:bg-[#0E4D36] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-in fade-in duration-200 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Role Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {(Object.keys(ROLE_DEFINITIONS) as AdminRole[]).map((rKey) => {
          const info = ROLE_DEFINITIONS[rKey];
          const count = users.filter((u) => u.role === rKey).length;
          const isSelected = selectedRoleFilter === rKey;

          return (
            <button
              key={rKey}
              onClick={() => setSelectedRoleFilter(isSelected ? 'ALL' : rKey)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-900 text-white border-emerald-700 shadow-md scale-[1.02]'
                  : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                    isSelected ? 'bg-emerald-800 text-emerald-200' : `${info.badgeBg} ${info.badgeText}`
                  }`}
                >
                  {info.label}
                </span>
                <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {count}
                </span>
              </div>
              <p
                className={`text-[10px] line-clamp-1 font-medium ${
                  isSelected ? 'text-emerald-200' : 'text-slate-400'
                }`}
              >
                {info.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or mobile..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500 font-bold">
          <span>Showing {filteredUsers.length} of {users.length} Users</span>
          {selectedRoleFilter !== 'ALL' && (
            <button
              onClick={() => setSelectedRoleFilter('ALL')}
              className="text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* 4. Users Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Role & Access</th>
                <th className="py-3 px-4">Assigned Division</th>
                <th className="py-3 px-4">Mobile Number</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-800" />
                    <span>Loading users from database...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>No users found matching your criteria.</span>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleMeta = ROLE_DEFINITIONS[u.role] || ROLE_DEFINITIONS.SUPER_ADMIN;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${roleMeta.badgeBg} ${roleMeta.badgeText}`}
                        >
                          {roleMeta.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {u.assignedDivision}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-600 font-bold">+91 {u.mobile}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {u.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {u.email !== 'admin@aslikaata.com' ? (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Remove User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            Protected Root
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Create User Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-[#0A3D2B] border border-emerald-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Create Staff User</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Issue role-based credentials for ASLI KAATA operations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Full Legal Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. M. Nagaraju"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Mobile (+91) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Mobile Number (+91) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      pattern="[0-9]{10}"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="10-digit mobile"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Corporate Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="user@aslikaata.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Temporary Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Initial Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Role Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Assigned RBAC Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as AdminRole })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Full Control)</option>
                    <option value="YARD_MANAGER">YARD_MANAGER (Inward/Outward/Scale)</option>
                    <option value="DISPATCHER">DISPATCHER (Fleet & Logistics)</option>
                    <option value="ACCOUNTANT">ACCOUNTANT (Floats & Financials)</option>
                    <option value="COLLECTOR">COLLECTOR (Mobile Field Operative)</option>
                  </select>
                </div>

                {/* Division Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Assigned Yard / Division *
                  </label>
                  <select
                    value={formData.assignedDivision}
                    onChange={(e) => setFormData({ ...formData, assignedDivision: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    {DIVISIONS_LIST.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Role Permissions Matrix Preview */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-800" />
                    Role Privileges: {ROLE_DEFINITIONS[formData.role].label}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {ROLE_DEFINITIONS[formData.role].permissions.length} modules granted
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {ROLE_DEFINITIONS[formData.role].permissions.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200/60 font-semibold text-slate-800"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="text-[11px] truncate">{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#0A3D2B] hover:bg-[#0E4D36] text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-950/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating User...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>Confirm & Create</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
