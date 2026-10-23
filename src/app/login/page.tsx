"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Building2,
  Truck,
  Users,
  Coins,
} from 'lucide-react';
import { useAdminAuth, DEMO_CREDENTIALS, AdminRole } from '../../context/AdminAuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, loginWithDemo, isAuthenticated, isLoading } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already authenticated, redirect to command center
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    const res = await login(email, password);
    setSubmitting(false);

    if (res.success) {
      router.push('/');
    } else {
      setErrorMsg(res.error || 'Login failed. Please check your credentials.');
    }
  };

  const handleSelectDemo = async (role: AdminRole) => {
    const cred = DEMO_CREDENTIALS.find((d) => d.role === role);
    if (!cred) return;
    setEmail(cred.email);
    setPassword(cred.password);
    setErrorMsg(null);

    setSubmitting(true);
    const res = await loginWithDemo(role);
    setSubmitting(false);

    if (res.success) {
      router.push('/');
    } else {
      setErrorMsg(res.error || 'Authentication failed');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#062418] flex items-center justify-center text-emerald-300">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#062418] via-[#0A3D2B] to-[#04160E] flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      {/* Background ambient lighting accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left / Top Hero Info */}
        <div className="lg:col-span-5 text-white space-y-5">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-black uppercase tracking-widest shadow-inner">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Restricted Internal Access</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white p-2 flex items-center justify-center shadow-xl shrink-0">
              <Image
                src="/logo.png"
                alt="ASLI KAATA Logo"
                width={48}
                height={48}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                ASLI KAATA
              </h1>
              <p className="text-xs font-bold text-[#F59E0B] tracking-widest uppercase">
                Operations ERP & Command Cockpit
              </p>
            </div>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed">
            Centralized enterprise operations hub orchestrating live scrap mandi rate margins, EV fleet dispatches, yard intake weighment audits, and digital cash float settlement.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/60">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                Deployment
              </span>
              <span className="font-extrabold text-white">Vijayawada Hub</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/60">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                Security Standard
              </span>
              <span className="font-extrabold text-white">RBAC + JWT Dual Session</span>
            </div>
          </div>
        </div>

        {/* Right Login Card */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Staff Authentication
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Sign in with authorized administrator credentials
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-black text-[10px] uppercase tracking-wider border border-emerald-200">
              Live Backend
            </span>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Corporate Email ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@aslikaata.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-slate-400 font-semibold">Min. 8 characters</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-[#0A3D2B] hover:bg-[#0E4D36] active:scale-[0.99] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Grid (Requested by User) */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                One-Click Demo Credentials
              </span>
              <span className="text-[10px] text-slate-400">Click to auto-fill & login</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_CREDENTIALS.map((cred) => {
                const icon =
                  cred.role === 'SUPER_ADMIN'
                    ? ShieldCheck
                    : cred.role === 'YARD_MANAGER'
                    ? Building2
                    : cred.role === 'DISPATCHER'
                    ? Truck
                    : Coins;
                const IconComponent = icon;

                return (
                  <button
                    key={cred.role}
                    type="button"
                    onClick={() => handleSelectDemo(cred.role)}
                    disabled={submitting}
                    className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500/80 bg-slate-50/70 hover:bg-emerald-50/60 text-left transition-all group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1 rounded-md bg-white border border-slate-200 group-hover:border-emerald-500/40 text-[#0A3D2B]">
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                        {cred.label}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      {cred.email}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                      Pass: <span className="font-bold text-slate-700">{cred.password}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
