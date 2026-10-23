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

// Seed Yard Stock Data
const INITIAL_YARD_STOCK: YardStockItem[] = [
  {
    id: 'stk_01',
    categoryName: 'Metal',
    productName: 'Heavy Scrap Iron / Loha',
    stage: 'BALED_READY_FOR_SALE',
    yardLocation: 'Vijayawada Central - Bay A1',
    currentTonnageKg: 14200,
    averageInwardCostPerKgRupees: 28.0,
    marketWholesaleRatePerKgRupees: 32.5,
    unrealizedGrossMarginRupees: 63900,
    lastUpdated: 'Today, 11:30 AM',
  },
  {
    id: 'stk_02',
    categoryName: 'Paper',
    productName: 'Corrugated Cardboard (Baled)',
    stage: 'BALED_READY_FOR_SALE',
    yardLocation: 'Vijayawada Central - Bay B2',
    currentTonnageKg: 28500,
    averageInwardCostPerKgRupees: 13.5,
    marketWholesaleRatePerKgRupees: 17.2,
    unrealizedGrossMarginRupees: 105450,
    lastUpdated: 'Today, 10:45 AM',
  },
  {
    id: 'stk_03',
    categoryName: 'Metal',
    productName: 'Copper / Tamba Cut-Pieces',
    stage: 'BALED_READY_FOR_SALE',
    yardLocation: 'Vijayawada Central - Secure Vault #1',
    currentTonnageKg: 1850,
    averageInwardCostPerKgRupees: 605.0,
    marketWholesaleRatePerKgRupees: 650.0,
    unrealizedGrossMarginRupees: 83250,
    lastUpdated: 'Today, 09:15 AM',
  },
  {
    id: 'stk_04',
    categoryName: 'Plastic',
    productName: 'Rigid HDPE Drums & Flakes',
    stage: 'SORTING_IN_PROGRESS',
    yardLocation: 'Guntur Hub - Bay C4',
    currentTonnageKg: 6400,
    averageInwardCostPerKgRupees: 24.0,
    marketWholesaleRatePerKgRupees: 29.0,
    unrealizedGrossMarginRupees: 32000,
    lastUpdated: 'Yesterday, 16:30',
  },
  {
    id: 'stk_05',
    categoryName: 'Paper',
    productName: 'Mixed Raddi / ONP Unsorted',
    stage: 'RAW_UNSORTED',
    yardLocation: 'Vijayawada Central - Intake Pit',
    currentTonnageKg: 8900,
    averageInwardCostPerKgRupees: 14.0,
    marketWholesaleRatePerKgRupees: 17.5,
    unrealizedGrossMarginRupees: 31150,
    lastUpdated: 'Today, 12:00 PM',
  },
  {
    id: 'stk_06',
    categoryName: 'E-Waste',
    productName: 'Lead Acid Batteries (Neutralized)',
    stage: 'BALED_READY_FOR_SALE',
    yardLocation: 'Guntur Hub - Hazmat Bay #2',
    currentTonnageKg: 3200,
    averageInwardCostPerKgRupees: 88.0,
    marketWholesaleRatePerKgRupees: 98.0,
    unrealizedGrossMarginRupees: 32000,
    lastUpdated: 'Today, 08:30 AM',
  },
];

// Seed Outward Dispatches to End Mills & Smelters
const INITIAL_OUTWARD_DISPATCHES: OutwardDispatchRecord[] = [
  {
    id: 'disp_01',
    gatePassNumber: 'GP-20261012-014',
    destinationMillName: 'Jindal Steel & Power Ltd (Mandi Branch)',
    destinationCity: 'Visakhapatnam, AP',
    categoryName: 'Metal',
    productName: 'Heavy Scrap Iron / Loha',
    dispatchedWeightKg: 12000,
    agreedMillRatePerKgRupees: 32.5,
    inwardCostPerKgRupees: 28.0,
    grossRealizedMarginRupees: 54000,
    totalInvoiceValueRupees: 390000,
    vehicleReg: 'AP 39 UB 9921',
    driverName: 'S. Nagesh',
    driverPhone: '9848556677',
    eWayBillNumber: '2419-0091-8841',
    paymentStatus: 'PAID_FULL',
    dispatchTimestamp: 'Today, 08:30 AM',
    authorizedBy: 'Ramesh Varma (Yard In-charge)',
  },
  {
    id: 'disp_02',
    gatePassNumber: 'GP-20261011-008',
    destinationMillName: 'ITC Bhadrachalam Paperboards Ltd',
    destinationCity: 'Bhadrachalam, TS',
    categoryName: 'Paper',
    productName: 'Corrugated Cardboard (Baled)',
    dispatchedWeightKg: 22000,
    agreedMillRatePerKgRupees: 17.2,
    inwardCostPerKgRupees: 13.5,
    grossRealizedMarginRupees: 81400,
    totalInvoiceValueRupees: 378400,
    vehicleReg: 'AP 16 TE 4432',
    driverName: 'P. Rambabu',
    driverPhone: '9908114422',
    eWayBillNumber: '2418-9902-1134',
    paymentStatus: 'PENDING_REMITTANCE',
    dispatchTimestamp: 'Yesterday, 14:15',
    authorizedBy: 'K. Venkat Rao (Director Ops)',
  },
  {
    id: 'disp_03',
    gatePassNumber: 'GP-20261010-003',
    destinationMillName: 'Hyderabad Smelting Works (P) Ltd',
    destinationCity: 'Hyderabad, TS',
    categoryName: 'Metal',
    productName: 'Copper / Tamba Cut-Pieces',
    dispatchedWeightKg: 2500,
    agreedMillRatePerKgRupees: 650.0,
    inwardCostPerKgRupees: 605.0,
    grossRealizedMarginRupees: 112500,
    totalInvoiceValueRupees: 1625000,
    vehicleReg: 'AP 07 TH 7781',
    driverName: 'G. Suresh',
    driverPhone: '9701889900',
    eWayBillNumber: '2417-8821-4490',
    paymentStatus: 'PAID_FULL',
    dispatchTimestamp: '10 Oct 2026, 11:00',
    authorizedBy: 'Ramesh Varma (Yard In-charge)',
  },
];

export const OutwardAndYardInventoryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'YARD_INVENTORY' | 'OUTWARD_DISPATCHES'>('YARD_INVENTORY');
  const [stockItems, setStockItems] = useState<YardStockItem[]>(INITIAL_YARD_STOCK);
  const [dispatches, setDispatches] = useState<OutwardDispatchRecord[]>(INITIAL_OUTWARD_DISPATCHES);

  // Dynamic live stock items and outward dispatches from NestJS backend
  useEffect(() => {
    const fetchYardData = async () => {
      try {
        const [stockRes, dispRes] = await Promise.all([
          adminApiClient.get('/admin/operations/yard-stock'),
          adminApiClient.get('/admin/operations/outward-dispatches'),
        ]);

        if (stockRes.success && Array.isArray(stockRes.data) && stockRes.data.length > 0) {
          setStockItems(
            stockRes.data.map((s: any) => ({
              id: s._id || s.id,
              categoryName: s.categoryName,
              productName: s.productName,
              stage: s.stage,
              yardLocation: s.yardLocation || 'Vijayawada Central',
              currentTonnageKg: s.currentTonnageKg,
              averageInwardCostPerKgRupees: s.averageInwardCostPerKgRupees,
              marketWholesaleRatePerKgRupees: s.marketWholesaleRatePerKgRupees,
              unrealizedGrossMarginRupees: s.unrealizedGrossMarginRupees,
              lastUpdated: s.lastUpdated || 'Today',
            })),
          );
        }

        if (dispRes.success && Array.isArray(dispRes.data) && dispRes.data.length > 0) {
          setDispatches(
            dispRes.data.map((d: any) => ({
              id: d._id || d.id,
              gatePassNumber: d.gatePassNumber,
              destinationMillName: d.destinationMillName,
              destinationCity: d.destinationCity,
              categoryName: d.categoryName || 'Scrap Commodities',
              productName: d.productName,
              dispatchedWeightKg: d.dispatchedWeightKg,
              agreedMillRatePerKgRupees: d.agreedMillRatePerKgRupees,
              inwardCostPerKgRupees: d.inwardCostPerKgRupees,
              grossRealizedMarginRupees: d.grossRealizedMarginRupees,
              totalInvoiceValueRupees: d.totalInvoiceValueRupees,
              vehicleReg: d.vehicleReg,
              driverName: d.driverName || 'Authorized Driver',
              driverPhone: d.driverPhone || '9848011223',
              eWayBillNumber: d.eWayBillNumber || '2419-0000',
              paymentStatus: d.paymentStatus || 'PAID_FULL',
              dispatchTimestamp: d.dispatchTimestamp || 'Today',
              authorizedBy: d.authorizedBy || 'Yard In-charge',
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
  const [formMillName, setFormMillName] = useState('Jindal Steel & Power Ltd (Mandi Branch)');
  const [formDestination, setFormDestination] = useState('Visakhapatnam, AP');
  const [formProduct, setFormProduct] = useState('Heavy Scrap Iron / Loha');
  const [formWeightKg, setFormWeightKg] = useState<number>(10000);
  const [formAgreedRate, setFormAgreedRate] = useState<number>(32.5);
  const [formInwardCost, setFormInwardCost] = useState<number>(28.0);
  const [formVehicleReg, setFormVehicleReg] = useState('AP 39 UB 9921');
  const [formDriverName, setFormDriverName] = useState('S. Nagesh');
  const [formDriverPhone, setFormDriverPhone] = useState('9848556677');
  const [formEWayBill, setFormEWayBill] = useState('2419-1122-3344');

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
    const randomSuffix = Math.floor(100 + Math.random() * 900);

    const newRecord: OutwardDispatchRecord = {
      id: `disp_${Date.now()}`,
      gatePassNumber: `GP-20261012-${randomSuffix}`,
      destinationMillName: formMillName,
      destinationCity: formDestination,
      categoryName: 'Scrap Commodities',
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
      dispatchTimestamp: 'Just now',
      authorizedBy: 'Yard In-charge',
    };

    try {
      const res = await adminApiClient.post('/admin/operations/outward-dispatches', newRecord);
      if (res.success && res.data) {
        newRecord.id = res.data._id || newRecord.id;
      }
    } catch (err) {
      console.error('Failed to save outward dispatch to backend:', err);
    }

    setDispatches((prev) => [newRecord, ...prev]);
    setIsNewDispatchOpen(false);
    setPrintableGatePass(newRecord);
    showToast(`Gate Pass #${newRecord.gatePassNumber} created & saved to MongoDB! Realized Margin: ₹${Math.round(totalMargin).toLocaleString('en-IN')}`);
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
                    onChange={(e) => setFormProduct(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-800"
                  >
                    <option value="Heavy Scrap Iron / Loha">Heavy Scrap Iron / Loha</option>
                    <option value="Corrugated Cardboard (Baled)">Corrugated Cardboard (Baled)</option>
                    <option value="Copper / Tamba Cut-Pieces">Copper / Tamba Cut-Pieces</option>
                    <option value="Rigid HDPE Drums & Flakes">Rigid HDPE Drums & Flakes</option>
                    <option value="Lead Acid Batteries (Neutralized)">Lead Acid Batteries</option>
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
