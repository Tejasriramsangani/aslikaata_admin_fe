"use client";

import { Button } from '../../components/ui';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAdminAuth();

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--brand-dark)] flex items-center justify-center text-emerald-300">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand flex flex-col justify-center items-center p-4 sm:p-6 select-none">
      {/* Background ambient lighting accents */}

      <div className="w-full max-w-4xl relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left / Top Hero Info */}
        <div className="lg:col-span-5 text-white space-y-5">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-widest shadow-inner">
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
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                ASLI KAATA
              </h1>
              <p className="text-xs font-medium text-gold tracking-widest uppercase">
                Operations ERP & Command Cockpit
              </p>
            </div>
          </div>

          <p className="text-slate-300 text-sm leading-relaxed">
            Centralized enterprise operations hub orchestrating live scrap mandi rate margins, EV fleet dispatches, yard intake weighment audits, and digital cash float settlement.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/60">
              <span className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider block">
                Deployment
              </span>
              <span className="font-extrabold text-white">Vijayawada Hub</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/60">
              <span className="text-[11px] text-amber-400 font-bold uppercase tracking-wider block">
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
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Staff Authentication
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Sign in with authorized administrator credentials
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[11px] uppercase tracking-wider border border-emerald-200">
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
                <input aria-label="you@company.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com" autoComplete="username"
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
                <span className="text-[11px] text-slate-400 font-semibold">Ask your Super Admin for access</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input aria-label="••••••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••" autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <Button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-brand hover:bg-[var(--brand-hover)] active:scale-[0.99] text-white font-bold text-xs uppercase tracking-wider shadow-lg  flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
