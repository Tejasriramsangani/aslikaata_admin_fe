"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { adminApiClient } from '../../lib/api-client';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Users,
  Scale,
  Banknote,
  Sparkles,
  ArrowRight,
  TrendingDown,
  X,
  Check,
  Eye,
  AlertCircle,
  FileText,
  ShieldCheck,
  Flame,
} from 'lucide-react';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type AlertCategory =
  | 'WEIGHT_MISMATCH_DUMP'
  | 'FLOAT_CASH_SHORTAGE'
  | 'HIGH_WASTAGE_DEDUCTION'
  | 'DUPLICATE_CUSTOMER_PHONE';

export interface FraudAlertRecord {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  description: string;
  subjectCode: string; // e.g. "AKP-EMP-0310", "AP 16 TF 2234"
  subjectName: string;
  detectedAt: string;
  financialRiskRupees?: number;
  status: 'OPEN_PENDING_ACTION' | 'ACKNOWLEDGED_INVESTIGATING' | 'RESOLVED_CLEARED';
  notes?: string;
}

export const FraudSentinelAndAlertsScreen: React.FC = () => {
  const [alerts, setAlerts] = useState<FraudAlertRecord[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeModalAlert, setActiveModalAlert] = useState<FraudAlertRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchAlerts = async () => {
      setIsLoading(true);
      try {
        const res = await adminApiClient.get('/admin/operations/fraud-alerts');
        if (res.success && Array.isArray(res.data)) {
          setAlerts(res.data);
        } else {
          setAlerts([]);
          showToast(res.error || 'Unable to load audit alerts.');
        }
      } catch (err) {
        console.warn('Failed to fetch fraud alerts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalAlerts = alerts.length;
    const openCount = alerts.filter((a) => a.status === 'OPEN_PENDING_ACTION').length;
    const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && a.status !== 'RESOLVED_CLEARED').length;
    const totalRisk = alerts.filter((a) => a.status !== 'RESOLVED_CLEARED').reduce((acc, a) => acc + (a.financialRiskRupees || 0), 0);

    return {
      totalAlerts,
      openCount,
      criticalCount,
      totalRisk: `₹${totalRisk.toLocaleString('en-IN')}`,
      resolutionRate: totalAlerts
        ? ((alerts.filter((a) => a.status === 'RESOLVED_CLEARED').length / totalAlerts) * 100).toFixed(1)
        : '0.0',
    };
  }, [alerts]);

  // Action: Acknowledge & Investigate
  const handleAcknowledgeAlert = async (id: string) => {
    const notes = 'Supervisor notified. Employee summoned for scale audit reconciliation.';
    try {
      const res = await adminApiClient.patch(`/admin/operations/fraud-alerts/${id}`, {
        status: 'ACKNOWLEDGED_INVESTIGATING',
        notes,
      });
      if (!res.success || res.data?.success === false) {
        return showToast(res.data?.error || res.error || 'Failed to acknowledge alert.');
      }
      setAlerts((prev) => prev.map((a) => a.id === id
        ? { ...a, status: 'ACKNOWLEDGED_INVESTIGATING', notes } : a));
      setActiveModalAlert(null);
      showToast('Alert marked as Investigating.');
    } catch (err: any) {
      showToast(err.message || 'Failed to acknowledge alert.');
    }
  };

  // Action: Mark as Resolved / Clear
  const handleResolveAlert = async (id: string) => {
    const notes = 'Audit completed. Shortage reconciled or verified within valid moisture tolerance.';
    try {
      const res = await adminApiClient.patch(`/admin/operations/fraud-alerts/${id}`, {
        status: 'RESOLVED_CLEARED',
        notes,
      });
      if (!res.success || res.data?.success === false) {
        return showToast(res.data?.error || res.error || 'Failed to resolve alert.');
      }
      setAlerts((prev) => prev.map((a) => a.id === id
        ? { ...a, status: 'RESOLVED_CLEARED', notes } : a));
      setActiveModalAlert(null);
      showToast('Alert resolved and archived into audit log.');
    } catch (err: any) {
      showToast(err.message || 'Failed to resolve alert.');
    }
  };

  // Filtered
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (severityFilter !== 'ALL' && a.severity !== severityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.subjectName.toLowerCase().includes(q) ||
          a.subjectCode.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [alerts, severityFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-emerald-500/40 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Fraud Sentinel & Anomaly Alert Monitor
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  Phase 6 • Live Sentinel
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated heuristic monitoring for Scale Drift, Cash Float Leakage & Collector Deduction Outliers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            Real-time Rule Engine: Active
          </span>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Open Anomalies</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{metrics.openCount} Alerts</div>
          <div className="text-[10px] text-slate-400 mt-1">Requires supervisor action</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Critical Violations</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{metrics.criticalCount} Critical</div>
          <div className="text-[10px] text-rose-600/80 mt-1">Weight shortages &gt; 2.5%</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Potential Leakage Risk</span>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{metrics.totalRisk}</div>
          <div className="text-[10px] text-slate-400 mt-1">Quantified cash/material exposure</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Audit Resolution Rate</span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-700">{metrics.resolutionRate}%</div>
          <div className="text-[10px] text-slate-400 mt-1">Resolved within 24h</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Severity:
          </span>
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                severityFilter === sev ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sev === 'ALL' ? 'All Severities' : sev}
            </button>
          ))}
        </div>

        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search anomalies by employee, vehicle or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
          />
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Severity & Timestamp</th>
                <th className="py-3 px-4">Anomaly Details</th>
                <th className="py-3 px-4">Associated Entity / Employee</th>
                <th className="py-3 px-4 text-right">Leakage Risk</th>
                <th className="py-3 px-4 text-center">Audit Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlerts.map((alt) => (
                <tr key={alt.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          alt.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : alt.severity === 'WARNING'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {alt.severity}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">{alt.detectedAt}</div>
                  </td>

                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="font-bold text-slate-900">{alt.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{alt.description}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{alt.subjectName}</div>
                    <div className="text-[10px] font-mono text-emerald-800 font-semibold">{alt.subjectCode}</div>
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-black text-rose-700 text-sm">
                    {alt.financialRiskRupees ? `₹${alt.financialRiskRupees}` : 'N/A'}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        alt.status === 'OPEN_PENDING_ACTION'
                          ? 'bg-rose-100 text-rose-800'
                          : alt.status === 'ACKNOWLEDGED_INVESTIGATING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {alt.status.replace(/_/g, ' ')}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => setActiveModalAlert(alt)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      Investigate
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredAlerts.length === 0 && (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">
                  No audit alerts found.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: INVESTIGATE ANOMALY */}
      {activeModalAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="font-black text-sm">Investigate Anomaly Record</h3>
              </div>
              <button
                onClick={() => setActiveModalAlert(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                <div className="flex justify-between font-bold text-rose-950">
                  <span>{activeModalAlert.title}</span>
                  <span className="font-mono text-rose-700">{activeModalAlert.severity}</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-relaxed mt-1">{activeModalAlert.description}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subject:</span>
                  <span className="font-bold text-slate-900">{activeModalAlert.subjectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Entity Code:</span>
                  <span className="font-mono font-bold text-emerald-800">{activeModalAlert.subjectCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Detected At:</span>
                  <span className="text-slate-700">{activeModalAlert.detectedAt}</span>
                </div>
              </div>

              {activeModalAlert.notes && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                  <span className="font-bold block mb-0.5">Audit Trail:</span>
                  {activeModalAlert.notes}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between gap-2">
              <button
                onClick={() => handleResolveAlert(activeModalAlert.id)}
                className="px-3.5 py-2 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Resolve / Clear
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setActiveModalAlert(null)}
                  className="px-3 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleAcknowledgeAlert(activeModalAlert.id)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all cursor-pointer shadow-md"
                >
                  Mark Investigating
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
