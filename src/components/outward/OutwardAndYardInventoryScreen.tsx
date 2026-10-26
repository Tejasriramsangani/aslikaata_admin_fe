"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { adminApiClient } from '../../lib/api-client';
import {
  SendHorizontal,
  Layers,
  Building2,
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  Scale,
  Sparkles,
  X,
  Check,
  ChevronRight,
  ExternalLink,
  Package,
  Boxes,
  ArrowUpRight,
  QrCode,
  BadgeAlert,
} from 'lucide-react';

export type StockStage = 'RAW_UNSORTED' | 'SORTING_IN_PROGRESS' | 'BALED_READY_FOR_SALE';
export type PaymentRealizationStatus = 'PAID_FULL' | 'PENDING_REMITTANCE' | 'PARTIAL_30_DAYS';

export interface YardStockItem {
  id: string;
  categoryName: string;
  productName: string;
  stage: StockStage;
  yardLocation: string; // e.g. "Vijayawada Central - Bay 3"
  currentTonnageKg: number;
  averageInwardCostPerKgRupees: number;
  marketWholesaleRatePerKgRupees: number;
  unrealizedGrossMarginRupees: number;
  lastUpdated: string;
}

export interface OutwardDispatchRecord {
  id: string;
  gatePassNumber: string; // e.g. GP-20261012-014
  destinationMillName: string; // e.g. "Jindal Steel Mandi", "ITC Bhadrachalam Paper Mills"
  destinationCity: string;
  categoryName: string;
  productName: string;
  dispatchedWeightKg: number;
  agreedMillRatePerKgRupees: number;
  inwardCostPerKgRupees: number;
  grossRealizedMarginRupees: number;
  totalInvoiceValueRupees: number;
  vehicleReg: string;
  driverName: string;
  driverPhone: string;
  eWayBillNumber: string;
  paymentStatus: PaymentRealizationStatus;
  dispatchTimestamp: string;
  authorizedBy: string;
}

export const OutwardAndYardInventoryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'YARD_INVENTORY' | 'OUTWARD_DISPATCHES'>('YARD_INVENTORY');
  const [stockItems, setStockItems] = useState<YardStockItem[]>([]);
  const [dispatches, setDispatches] = useState<OutwardDispatchRecord[]>([]);

  // Dynamic live stock items and outward dispatches from NestJS backend
  useEffect(() => {
    const fetchYardData = async () => {
      try {
        const [stockRes, dispRes] = await Promise.all([
          adminApiClient.get('/admin/operations/yard-stock'),
          adminApiClient.get('/admin/operations/outward-dispatches'),
        ]);

        if (stockRes.success && Array.isArray(stockRes.data)) {
          setStockItems(
            stockRes.data.map((s: any) => ({
              id: s._id || s.id,
              categoryName: s.categoryName,
              productName: s.productName,
              stage: s.stage,
              yardLocation: s.yardLocation || '—',
              currentTonnageKg: s.currentTonnageKg,
              averageInwardCostPerKgRupees: s.averageInwardCostPerKgRupees,
              marketWholesaleRatePerKgRupees: s.marketWholesaleRatePerKgRupees,
              unrealizedGrossMarginRupees: s.unrealizedGrossMarginRupees,
              lastUpdated: s.lastUpdated || s.updatedAt || '—',
            })),
          );
        }

        if (dispRes.success && Array.isArray(dispRes.data)) {
          setDispatches(
            dispRes.data.map((d: any) => ({
              id: d._id || d.id,
              gatePassNumber: d.gatePassNumber,
              destinationMillName: d.destinationMillName,
              destinationCity: d.destinationCity,
              categoryName: d.categoryName || '—',
              productName: d.productName,
              dispatchedWeightKg: d.dispatchedWeightKg,
              agreedMillRatePerKgRupees: d.agreedMillRatePerKgRupees,
              inwardCostPerKgRupees: d.inwardCostPerKgRupees,
              grossRealizedMarginRupees: d.grossRealizedMarginRupees,
              totalInvoiceValueRupees: d.totalInvoiceValueRupees,
              vehicleReg: d.vehicleReg,
              driverName: d.driverName || '—',
              driverPhone: d.driverPhone || '—',
              eWayBillNumber: d.eWayBillNumber || '—',
              paymentStatus: d.paymentStatus || 'PENDING_REMITTANCE',
              dispatchTimestamp: d.dispatchTimestamp || d.createdAt || '—',
              authorizedBy: d.authorizedBy || '—',
            })),
          );
        }
      } catch (err) {
        console.error('Failed to load yard inventory data:', err);
      }
    };

    fetchYardData();
  }, []);

  // Filters & State
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isNewDispatchOpen, setIsNewDispatchOpen] = useState(false);
  const [isBalingModalOpen, setIsBalingModalOpen] = useState(false);
  const [printableGatePass, setPrintableGatePass] = useState<OutwardDispatchRecord | null>(null);

  // Form State: New Outward Dispatch
  const [formMillName, setFormMillName] = useState('');
  const [formDestination, setFormDestination] = useState('');
  const [formProduct, setFormProduct] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formWeightKg, setFormWeightKg] = useState<number>(0);
  const [formAgreedRate, setFormAgreedRate] = useState<number>(0);
  const [formInwardCost, setFormInwardCost] = useState<number>(0);
  const [formVehicleReg, setFormVehicleReg] = useState('');
  const [formDriverName, setFormDriverName] = useState('');
  const [formDriverPhone, setFormDriverPhone] = useState('');
  const [formEWayBill, setFormEWayBill] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPIs
  const metrics = useMemo(() => {
    const totalYardStockKg = stockItems.reduce((acc, s) => acc + s.currentTonnageKg, 0);
    const baledReadyKg = stockItems.filter((s) => s.stage === 'BALED_READY_FOR_SALE').reduce((acc, s) => acc + s.currentTonnageKg, 0);
    const rawUnsortedKg = stockItems.filter((s) => s.stage === 'RAW_UNSORTED').reduce((acc, s) => acc + s.currentTonnageKg, 0);
    const totalUnrealizedMargin = stockItems.reduce((acc, s) => acc + s.unrealizedGrossMarginRupees, 0);

    const totalDispatchesRevenue = dispatches.reduce((acc, d) => acc + d.totalInvoiceValueRupees, 0);
    const totalRealizedMargin = dispatches.reduce((acc, d) => acc + d.grossRealizedMarginRupees, 0);

    return {
      totalYardStockTons: (totalYardStockKg / 1000).toFixed(1),
      baledReadyTons: (baledReadyKg / 1000).toFixed(1),
      rawUnsortedTons: (rawUnsortedKg / 1000).toFixed(1),
      totalUnrealizedMargin: `₹${Math.round(totalUnrealizedMargin).toLocaleString('en-IN')}`,
      totalDispatchesRevenue: `₹${Math.round(totalDispatchesRevenue).toLocaleString('en-IN')}`,
      totalRealizedMargin: `₹${Math.round(totalRealizedMargin).toLocaleString('en-IN')}`,
    };
  }, [stockItems, dispatches]);

  // Create Outward Dispatch
  const handleCreateDispatch = async () => {
    if (formWeightKg <= 0 || formAgreedRate <= 0) {
      alert('Please enter valid tonnage and rate.');
      return;
    }

    const marginPerKg = formAgreedRate - formInwardCost;
    const totalMargin = marginPerKg * formWeightKg;
    const totalInvoice = formAgreedRate * formWeightKg;
    const newRecord: OutwardDispatchRecord = {
      id: '',
      gatePassNumber: '',
      destinationMillName: formMillName,
      destinationCity: formDestination,
      categoryName: formCategory || 'Scrap Commodities',
      productName: formProduct,
      dispatchedWeightKg: formWeightKg,
      agreedMillRatePerKgRupees: formAgreedRate,
      inwardCostPerKgRupees: formInwardCost,
      grossRealizedMarginRupees: totalMargin,
      totalInvoiceValueRupees: totalInvoice,
      vehicleReg: formVehicleReg.toUpperCase().trim(),
      driverName: formDriverName,
      driverPhone: formDriverPhone,
      eWayBillNumber: formEWayBill,
      paymentStatus: 'PENDING_REMITTANCE',
      dispatchTimestamp: new Date().toISOString(),
      authorizedBy: '—',
    };

    try {
      const res = await adminApiClient.post('/admin/operations/outward-dispatches', newRecord);
      if (res.success && res.data) {
        const saved = { ...newRecord, ...res.data, id: res.data._id || res.data.id };
        const [stockRes, dispatchRes] = await Promise.all([
          adminApiClient.get('/admin/operations/yard-stock'),
          adminApiClient.get('/admin/operations/outward-dispatches'),
        ]);
        if (stockRes.success && Array.isArray(stockRes.data)) {
          setStockItems(stockRes.data.map((s: any) => ({
            id: s._id || s.id,
            categoryName: s.categoryName,
            productName: s.productName,
            stage: s.stage,
            yardLocation: s.yardLocation || '—',
            currentTonnageKg: Number(s.currentTonnageKg || 0),
            averageInwardCostPerKgRupees: Number(s.averageInwardCostPerKgRupees || 0),
            marketWholesaleRatePerKgRupees: Number(s.marketWholesaleRatePerKgRupees || 0),
            unrealizedGrossMarginRupees: Number(s.unrealizedGrossMarginRupees || 0),
            lastUpdated: s.lastUpdated || s.updatedAt || '—',
          })));
        }
        if (dispatchRes.success && Array.isArray(dispatchRes.data)) {
          setDispatches(dispatchRes.data.map((d: any) => ({
            id: d._id || d.id,
            gatePassNumber: d.gatePassNumber,
            destinationMillName: d.destinationMillName,
            destinationCity: d.destinationCity,
            categoryName: d.categoryName || '—',
            productName: d.productName,
            dispatchedWeightKg: Number(d.dispatchedWeightKg || 0),
            agreedMillRatePerKgRupees: Number(d.agreedMillRatePerKgRupees || 0),
            inwardCostPerKgRupees: Number(d.inwardCostPerKgRupees || 0),
            grossRealizedMarginRupees: Number(d.grossRealizedMarginRupees || 0),
            totalInvoiceValueRupees: Number(d.totalInvoiceValueRupees || 0),
            vehicleReg: d.vehicleReg,
            driverName: d.driverName || '—',
            driverPhone: d.driverPhone || '—',
            eWayBillNumber: d.eWayBillNumber || '—',
            paymentStatus: d.paymentStatus || 'PENDING_REMITTANCE',
            dispatchTimestamp: d.dispatchTimestamp || d.createdAt || '—',
            authorizedBy: d.authorizedBy || '—',
          })));
        }
        setIsNewDispatchOpen(false);
        setPrintableGatePass(saved);
        showToast(`Gate Pass #${saved.gatePassNumber || saved.id} created. Realized Margin: ₹${Math.round(totalMargin).toLocaleString('en-IN')}`);
      } else {
        showToast(`Dispatch failed: ${res.error || 'Backend rejected request'}`);
      }
    } catch (err: any) {
      showToast(`Dispatch failed: ${err.message || 'Network error'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-emerald-500/40 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title & Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#0A3D2B]">
              <SendHorizontal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Yard Stock Inventory & Outward Mill Dispatches
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Phase 6 • B2B Sales & Baling
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time Yard Bay Inventory, Raw-to-Baled Conversion & Outward Smelter Sales Order Gate Passes
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsNewDispatchOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A3D2B] text-white text-xs font-bold hover:bg-[#0E4D36] transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            + New Outward Mill Dispatch
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Yard Stock</span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-slate-900">{metrics.totalYardStockTons} <span className="text-xs text-slate-500 font-semibold">Tons</span></div>
          <div className="text-[10px] text-slate-400 mt-0.5">Across all yard bays</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Baled & Ready</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-black text-blue-700">{metrics.baledReadyTons} <span className="text-xs text-slate-500 font-semibold">Tons</span></div>
          <div className="text-[10px] text-slate-400 mt-0.5">Ready for mill dispatch</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Raw Unsorted</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg font-black text-amber-700">{metrics.rawUnsortedTons} <span className="text-xs text-slate-500 font-semibold">Tons</span></div>
          <div className="text-[10px] text-slate-400 mt-0.5">Sorting in queue</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Unrealized Margin</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-700">{metrics.totalUnrealizedMargin}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Current inventory upside</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Dispatched Revenue</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-black text-purple-700">{metrics.totalDispatchesRevenue}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{dispatches.length} Mill Shipments</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Realized Net Spread</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-700">{metrics.totalRealizedMargin}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Pure trading spread</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('YARD_INVENTORY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'YARD_INVENTORY'
                ? 'bg-[#0A3D2B] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            Yard Stock Inventory Ledger ({stockItems.length})
          </button>

          <button
            onClick={() => setActiveTab('OUTWARD_DISPATCHES')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'OUTWARD_DISPATCHES'
                ? 'bg-[#0A3D2B] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <SendHorizontal className="w-3.5 h-3.5" />
            Outward Mill Dispatches & Gate Passes ({dispatches.length})
          </button>
        </div>
      </div>

      {/* TAB 1: YARD STOCK INVENTORY LEDGER */}
      {activeTab === 'YARD_INVENTORY' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Scrap Product & Category</th>
                    <th className="py-3 px-4">Processing Stage</th>
                    <th className="py-3 px-4">Yard Bay Location</th>
                    <th className="py-3 px-4 text-right">Current Stock (kg)</th>
                    <th className="py-3 px-4 text-right">Avg Buying Rate</th>
                    <th className="py-3 px-4 text-right">Current Mill Spot</th>
                    <th className="py-3 px-4 text-right">Spread / kg</th>
                    <th className="py-3 px-4 text-right">Unrealized Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockItems.map((stk) => {
                    const spreadPerKg = stk.marketWholesaleRatePerKgRupees - stk.averageInwardCostPerKgRupees;
                    return (
                      <tr key={stk.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{stk.productName}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{stk.categoryName} • {stk.lastUpdated}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              stk.stage === 'BALED_READY_FOR_SALE'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : stk.stage === 'SORTING_IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {stk.stage.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {stk.yardLocation}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                          {stk.currentTonnageKg.toLocaleString('en-IN')} kg
                          <span className="text-[10px] text-slate-400 font-normal block">
                            ({(stk.currentTonnageKg / 1000).toFixed(2)} T)
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-slate-600 font-semibold">
                          ₹{stk.averageInwardCostPerKgRupees.toFixed(1)}/kg
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold">
                          ₹{stk.marketWholesaleRatePerKgRupees.toFixed(1)}/kg
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-800">
                          +₹{spreadPerKg.toFixed(1)}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                          ₹{Math.round(stk.unrealizedGrossMarginRupees).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                  {stockItems.length === 0 && (
                    <tr><td colSpan={8} className="py-10 text-center text-slate-400">
                      No yard stock records available.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OUTWARD MILL DISPATCHES */}
      {activeTab === 'OUTWARD_DISPATCHES' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Gate Pass # & Date</th>
                    <th className="py-3 px-4">Destination Smelter / Mill</th>
                    <th className="py-3 px-4">Truck Reg & e-Way Bill</th>
                    <th className="py-3 px-4 text-right">Dispatched Wt</th>
                    <th className="py-3 px-4 text-right">Agreed Rate</th>
                    <th className="py-3 px-4 text-right">Total Invoice</th>
                    <th className="py-3 px-4 text-right">Realized Margin</th>
                    <th className="py-3 px-4 text-center">Payment</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dispatches.map((disp) => (
                    <tr key={disp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 font-mono">{disp.gatePassNumber}</div>
                        <div className="text-[10px] text-slate-400">{disp.dispatchTimestamp}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{disp.destinationMillName}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{disp.destinationCity} • {disp.productName}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{disp.vehicleReg}</div>
                        <div className="text-[10px] text-slate-400 font-mono">e-Way: {disp.eWayBillNumber}</div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {disp.dispatchedWeightKg.toLocaleString('en-IN')} kg
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                        ₹{disp.agreedMillRatePerKgRupees}/kg
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                        ₹{Math.round(disp.totalInvoiceValueRupees).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                        +₹{Math.round(disp.grossRealizedMarginRupees).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            disp.paymentStatus === 'PAID_FULL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {disp.paymentStatus.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setPrintableGatePass(disp)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-[#0A3D2B] hover:text-white font-bold text-[11px] transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          Gate Pass
                        </button>
                      </td>
                    </tr>
                  ))}
                  {dispatches.length === 0 && (
                    <tr><td colSpan={9} className="py-10 text-center text-slate-400">
                      No outward dispatches available.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 1: NEW OUTWARD DISPATCH PASS --- */}
      {isNewDispatchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-[#0A3D2B] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SendHorizontal className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-sm">Create Outward Mill Dispatch Order</h3>
              </div>
              <button
                onClick={() => setIsNewDispatchOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Destination Mill *</label>
                  <input
                    type="text"
                    value={formMillName}
                    onChange={(e) => setFormMillName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Destination City</label>
                  <input
                    type="text"
                    value={formDestination}
                    onChange={(e) => setFormDestination(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Scrap Commodity</label>
                  <select
                    value={formProduct}
                    onChange={(e) => {
                      const stock = stockItems.find((item) => item.productName === e.target.value);
                      setFormProduct(e.target.value);
                      if (stock) {
                        setFormCategory(stock.categoryName);
                        setFormInwardCost(stock.averageInwardCostPerKgRupees);
                        setFormWeightKg(stock.currentTonnageKg);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800"
                  >
                    <option value="">Select yard stock</option>
                    {stockItems.map((stock) => (
                      <option key={stock.id} value={stock.productName}>{stock.productName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dispatched Weight (kg) *</label>
                  <input
                    type="number"
                    value={formWeightKg}
                    onChange={(e) => setFormWeightKg(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono font-black text-slate-900"
                  />
                </div>
              </div>

              {/* Rates & Spread */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Agreed Mill Rate (₹/kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formAgreedRate}
                    onChange={(e) => setFormAgreedRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Avg Inward Cost (₹/kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formInwardCost}
                    onChange={(e) => setFormInwardCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono font-bold text-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Truck Reg Number</label>
                  <input
                    type="text"
                    value={formVehicleReg}
                    onChange={(e) => setFormVehicleReg(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold uppercase text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">GST e-Way Bill #</label>
                  <input
                    type="text"
                    value={formEWayBill}
                    onChange={(e) => setFormEWayBill(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-800"
                  />
                </div>
              </div>

              {/* Calculated Realized Margin Banner */}
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-emerald-900 uppercase block">Expected Realized Margin</span>
                  <span className="text-xs text-emerald-700 font-semibold">
                    Spread: +₹{(formAgreedRate - formInwardCost).toFixed(1)}/kg
                  </span>
                </div>
                <span className="font-mono font-black text-base text-emerald-800">
                  ₹{Math.round(Math.max(0, formAgreedRate - formInwardCost) * formWeightKg).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsNewDispatchOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDispatch}
                className="px-5 py-2 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] transition-all cursor-pointer shadow-md"
              >
                Generate Gate Pass & Outward Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: PRINTABLE GATE PASS SLIP --- */}
      {printableGatePass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="font-bold text-xs">Official Outward Mill Gate Pass</span>
              <button
                onClick={() => setPrintableGatePass(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-white space-y-4 font-sans text-xs text-slate-800">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <div className="font-black text-base tracking-wider uppercase text-slate-900">ASLI KAATA RECYCLING ERP</div>
                <div className="text-[10px] text-slate-500">Official Mill Dispatch & Security Gate Pass</div>
                <div className="text-xs font-mono font-bold text-emerald-800 mt-1">{printableGatePass.gatePassNumber}</div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Consignee Mill:</span>
                  <span className="font-bold text-right">{printableGatePass.destinationMillName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination:</span>
                  <span className="font-medium">{printableGatePass.destinationCity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Material Grade:</span>
                  <span className="font-bold">{printableGatePass.productName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dispatched Weight:</span>
                  <span className="font-mono font-black">{printableGatePass.dispatchedWeightKg} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Agreed Selling Rate:</span>
                  <span className="font-mono">₹{printableGatePass.agreedMillRatePerKgRupees}/kg</span>
                </div>
                <div className="flex justify-between font-black text-sm border-t border-slate-200 pt-1.5">
                  <span>Total Invoice Value:</span>
                  <span className="font-mono text-emerald-800">
                    ₹{Math.round(printableGatePass.totalInvoiceValueRupees).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Carrier Vehicle:</span>
                  <span className="font-bold">{printableGatePass.vehicleReg}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GST e-Way Bill:</span>
                  <span className="font-mono">{printableGatePass.eWayBillNumber}</span>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-slate-300">
                <QrCode className="w-14 h-14 mx-auto text-slate-800 p-1 border border-slate-200 rounded" />
                <div className="text-[9px] text-slate-400 mt-1 uppercase">
                  Authorized Signatory: {printableGatePass.authorizedBy}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setPrintableGatePass(null)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-200 transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                  showToast('Sent Gate Pass to printer.');
                }}
                className="px-5 py-2 rounded-xl bg-[#0A3D2B] text-white font-bold text-xs hover:bg-[#0E4D36] transition-all cursor-pointer shadow-md flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Gate Pass
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
