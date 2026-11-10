"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw, Lock } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminTopHeader } from './AdminTopHeader';
import { canAccessPath, rolesForPath, ROLE_LABELS } from '../../lib/permissions';

export const AdminAppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { admin, isAuthenticated, isLoading } = useAdminAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center text-emerald-800 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Loading ASLI KAATA Operations Cockpit...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <a href="#main-content" className="skip-link">Skip to content</a>
      {/* Fixed Operations Sidebar */}
      <AdminSidebar />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Header Command Bar */}
        <AdminTopHeader />

        {/* Section Content */}
        <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {canAccessPath(admin?.role, pathname) ? (
            children
          ) : (
            <div className="max-w-lg mx-auto mt-16 bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">This screen is not part of your role</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                You are signed in as <strong>{admin?.role ? ROLE_LABELS[admin.role] : 'staff'}</strong>.
                This screen is available to {(rolesForPath(pathname) || []).map((r) => ROLE_LABELS[r]).join(', ')}.
                Ask a Super Admin if you need access.
              </p>
              <Link
                href="/"
                className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-brand text-white text-xs font-bold hover:bg-[var(--brand-hover)]"
              >
                Back to Dispatch Cockpit
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
