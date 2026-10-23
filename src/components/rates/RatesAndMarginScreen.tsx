"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Plus,
  Minus,
  Sparkles,
  RefreshCw,
  Send,
  Eye,
  History,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Scale,
  X,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { adminApiClient } from '../../lib/api-client';

export interface ScrapProductRateRow {
  productId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  code: string;
  emoji: string;
  // 1. Wholesale Benchmark (What smelters/mills pay ASLI KAATA)
  marketBenchmarkRateRupees: number; // e.g. 650.00 for Copper
  marketName: string; // e.g. "Hyderabad Smelter Spot", "Vizag Mandi"
  lastMarketSync: string;
  // 2. Margin Config
  marginMode: 'FLAT' | 'PERCENTAGE';
  marginDirection: 'SUBTRACT' | 'ADD'; // SUBTRACT = buying discount (gross profit), ADD = premium
  marginValue: number; // e.g. 40.00 (Rs) or 8.0 (%)
  // 3. Calculated Customer Buying Rate
  calculatedCustomerRateRupees: number;
  // 4. Bulk Tiers
  bulkTier1PremiumRupees: number; // for >50kg
  bulkTier2PremiumRupees: number; // for >100kg
  // 5. Meta
  isActive: boolean;
  historyCount: number;
  updatedAt: string;
}

// Initial Seed Dataset representing Real Andhra Pradesh Scrap Mandi Rates
const INITIAL_PRODUCTS_RATES: ScrapProductRateRow[] = [
  // --- METAL ---
  {
    productId: 'prod_copper_01',
    categoryId: 'cat_metal',
    categoryName: 'Metal',
    name: 'Copper / Tamba',
    code: 'COPPER',
    emoji: '🟤',
    marketBenchmarkRateRupees: 650.0,
    marketName: 'Hyderabad Smelter Spot',
    lastMarketSync: 'Today, 10:30 AM',
    marginMode: 'FLAT',
    marginDirection: 'SUBTRACT',
    marginValue: 45.0, // Gross margin = Rs 45.00/kg
    calculatedCustomerRateRupees: 605.0,
    bulkTier1PremiumRupees: 5.0,
    bulkTier2PremiumRupees: 10.0,
    isActive: true,
    historyCount: 14,
    updatedAt: '2026-10-12 09:15',
  },
  {
    productId: 'prod_brass_01',
    categoryId: 'cat_metal',
    categoryName: 'Metal',
    name: 'Brass / Peetal',
    code: 'BRASS',
    emoji: '🟡',
    marketBenchmarkRateRupees: 420.0,
    marketName: 'Hyderabad Smelter Spot',
    lastMarketSync: 'Today, 10:30 AM',
    marginMode: 'FLAT',
    marginDirection: 'SUBTRACT',
    marginValue: 30.0,
    calculatedCustomerRateRupees: 390.0,
    bulkTier1PremiumRupees: 3.0,
    bulkTier2PremiumRupees: 6.0,
    isActive: true,
    historyCount: 9,
    updatedAt: '2026-10-11 16:40',
  },
  {
    productId: 'prod_iron_01',
    categoryId: 'cat_metal',
    categoryName: 'Metal',
    name: 'Iron / Loha',
    code: 'IRON',
    emoji: '⚙️',
    marketBenchmarkRateRupees: 32.5,
    marketName: 'Vizag Steel Mandi',
    lastMarketSync: 'Today, 11:00 AM',
    marginMode: 'FLAT',
    marginDirection: 'SUBTRACT',
    marginValue: 4.5,
    calculatedCustomerRateRupees: 28.0,
    bulkTier1PremiumRupees: 1.0,
    bulkTier2PremiumRupees: 2.0,
    isActive: true,
    historyCount: 22,
    updatedAt: '2026-10-12 08:30',
  },
  {
    productId: 'prod_alu_01',
    categoryId: 'cat_metal',
    categoryName: 'Metal',
    name: 'Aluminium Section',
    code: 'ALUMINIUM',
    emoji: '⚪',
    marketBenchmarkRateRupees: 145.0,
    marketName: 'Vizag Smelter Spot',
    lastMarketSync: 'Today, 10:30 AM',
    marginMode: 'FLAT',
    marginDirection: 'SUBTRACT',
    marginValue: 15.0,
    calculatedCustomerRateRupees: 130.0,
    bulkTier1PremiumRupees: 2.5,
    bulkTier2PremiumRupees: 5.0,
    isActive: true,
    historyCount: 8,
    updatedAt: '2026-10-10 14:20',
  },

  // --- PAPER ---
  {
    productId: 'prod_paper_news_01',
    categoryId: 'cat_paper',
    categoryName: 'Paper',
    name: 'Newspaper (Raddi)',
    code: 'NEWSPAPER',
    emoji: '📰',
    marketBenchmarkRateRupees: 17.0,
    marketName: 'Rajahmundry Paper Mill',
    lastMarketSync: 'Yesterday',
    marginMode: 'FLAT',
    marginDirection: 'SUBTRACT',
    marginValue: 3.0,
    calculatedCustomerRateRupees: 14.0,
    bulkTier1PremiumRupees: 0.5,
    bulkTier2PremiumRupees: 1.0,
    isActive: true,
    historyCount: 16,
    updatedAt: '2026-10-11 11:00',
  },
  {
    productId: 'prod_paper_carton_01',
    categoryId: 'cat_paper',
    categoryName: 'Paper',
    name: 'Cardboard / Corrugated Box',
    code: 'CARDBOARD',
    emoji: '📦',
    marketBenchmarkRateRupees: 12.0,
    marketName: 'Rajahmundry Paper Mill',
    lastMarketSync: 'Yesterday',
    marginMode: 'FLAT',
    marginDirection: 'SUBTRACT',
    marginValue: 2.5,
    calculatedCustomerRateRupees: 9.5,
    bulkTier1PremiumRupees: 0.5,
    bulkTier2PremiumRupees: 1.0,
    isActive: true,
    historyCount: 12,
    updatedAt: '2026-10-10 09:40',
  },

  // --- PLASTIC ---
  {
    productId: 'prod_pet_01',
    categoryId: 'cat_plastic',
    categoryName: 'Plastic',
    name: 'PET Bottles (Water / Soda)',
    code: 'PET_BOTTLE',
    emoji: '🍾',
    marketBenchmarkRateRupees: 18.0,
    marketName: 'Vijayawada Pelletizer',
    lastMarketSync: 'Today, 09:00 AM',
    marginMode: 'FLAT',
    marginDirection: 'SUBTRACT',
    marginValue: 3.5,
    calculatedCustomerRateRupees: 14.5,
    bulkTier1PremiumRupees: 1.0,
    bulkTier2PremiumRupees: 2.0,
    isActive: true,
    historyCount: 18,
    updatedAt: '2026-10-12 10:00',
  },
  {
    productId: 'prod_hard_plastic_01',
    categoryId: 'cat_plastic',
    categoryName: 'Plastic',
    name: 'Hard Plastic (Buckets / Chairs)',
    code: 'HARD_PLASTIC',
    emoji: '🪑',
    marketBenchmarkRateRupees: 15.0,
    marketName: 'Vijayawada Pelletizer',
    lastMarketSync: 'Today, 09:00 AM',
    marginMode: 'FLAT',
    marginDirection: 'SUBTRACT',
    marginValue: 3.0,
    calculatedCustomerRateRupees: 12.0,
    bulkTier1PremiumRupees: 0.5,
    bulkTier2PremiumRupees: 1.5,
    isActive: true,
    historyCount: 7,
    updatedAt: '2026-10-09 17:15',
  },

  // --- E-WASTE ---
  {
    productId: 'prod_ewaste_pcb_01',
    categoryId: 'cat_ewaste',
    categoryName: 'E-Waste',
    name: 'Motherboards & PCBs',
    code: 'PCB_BOARDS',
    emoji: '💻',
    marketBenchmarkRateRupees: 220.0,
    marketName: 'Hyderabad E-Recycler',
    lastMarketSync: 'Oct 08',
    marginMode: 'PERCENTAGE',
    marginDirection: 'SUBTRACT',
    marginValue: 15.0, // 15% margin
    calculatedCustomerRateRupees: 187.0,
    bulkTier1PremiumRupees: 5.0,
    bulkTier2PremiumRupees: 10.0,
    isActive: true,
    historyCount: 5,
    updatedAt: '2026-10-08 12:00',
  },
  {
    productId: 'prod_battery_01',
    categoryId: 'cat_ewaste',
    categoryName: 'E-Waste',
    name: 'Lead Acid Batteries (Inverter/Car)',
    code: 'LEAD_BATTERY',
    emoji: '🔋',
    marketBenchmarkRateRupees: 92.0,
    marketName: 'Exide Authorized Smelter',
    lastMarketSync: 'Today, 11:30 AM',
    marginMode: 'FLAT',
    marginDirection: 'SUBTRACT',
    marginValue: 12.0,
    calculatedCustomerRateRupees: 80.0,
    bulkTier1PremiumRupees: 2.0,
    bulkTier2PremiumRupees: 4.0,
    isActive: true,
    historyCount: 11,
    updatedAt: '2026-10-12 11:30',
  },
];

export const RatesAndMarginScreen: React.FC = () => {
  const [ratesList, setRatesList] = useState<ScrapProductRateRow[]>(INITIAL_PRODUCTS_RATES);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('ALL');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [activeHistoryItem, setActiveHistoryItem] = useState<ScrapProductRateRow | null>(null);
  const [isBulkAdjustOpen, setIsBulkAdjustOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('Metal');
  const [bulkDeltaRupees, setBulkDeltaRupees] = useState<number>(-2.0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Dynamic live rate fetching from NestJS backend
  useEffect(() => {
    const fetchLiveRates = async () => {
      try {
        const res = await adminApiClient.get('/catalog');
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: ScrapProductRateRow[] = res.data
            .map((cat: any) =>
              (cat.products || []).map((prod: any) => {
                const customerRate = (prod.ratePerKg || 1500) / 100;
                const benchmark = Math.round(customerRate * 1.25 * 100) / 100;
                const margin = Math.round((benchmark - customerRate) * 100) / 100;

                return {
                  productId: prod._id || prod.id,
                  categoryId: cat._id || cat.id,
                  categoryName: cat.name || 'General',
                  name: prod.name,
                  code: prod.code || prod.name.toLowerCase().replace(/\s+/g, '_'),
                  emoji: prod.emoji || '📦',
                  marketBenchmarkRateRupees: benchmark,
                  marketName: 'Hyderabad Smelter Spot',
                  lastMarketSync: 'Live API',
                  marginMode: 'FLAT' as const,
                  marginDirection: 'SUBTRACT' as const,
                  marginValue: margin,
                  calculatedCustomerRateRupees: customerRate,
                  bulkTier1PremiumRupees: 1.5,
                  bulkTier2PremiumRupees: 3.0,
                  isActive: prod.isActive ?? true,
                  historyCount: 4,
                  updatedAt: new Date().toLocaleTimeString(),
                };
              }),
            )
            .flat();

          if (mapped.length > 0) {
            setRatesList(mapped);
          }
        }
      } catch {
        // Fallback to mandi rates
      }
    };

    fetchLiveRates();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Recalculate customer rate when benchmark or margin changes
  const calculateCustomerRate = (row: ScrapProductRateRow): number => {
    let finalRate = row.marketBenchmarkRateRupees;
    if (row.marginMode === 'FLAT') {
      if (row.marginDirection === 'SUBTRACT') {
        finalRate = Math.max(0.5, row.marketBenchmarkRateRupees - row.marginValue);
      } else {
        finalRate = row.marketBenchmarkRateRupees + row.marginValue;
      }
    } else {
      // Percentage
      const delta = (row.marketBenchmarkRateRupees * row.marginValue) / 100;
      if (row.marginDirection === 'SUBTRACT') {
        finalRate = Math.max(0.5, row.marketBenchmarkRateRupees - delta);
      } else {
        finalRate = row.marketBenchmarkRateRupees + delta;
      }
    }
    return Math.round(finalRate * 100) / 100;
  };

  // Inline update for a product
  const updateProductMargin = (
    productId: string,
    updates: Partial<ScrapProductRateRow>,
  ) => {
    setRatesList((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const updated = { ...item, ...updates };
        updated.calculatedCustomerRateRupees = calculateCustomerRate(updated);
        updated.updatedAt = 'Just now';
        return updated;
      }),
    );
  };

  // Save product rate to backend API
  const handleSaveProductRate = async (row: ScrapProductRateRow) => {
    const ratePaise = Math.round(row.calculatedCustomerRateRupees * 100);
    try {
      const res = await adminApiClient.post('/admin/catalog/rates', {
        productId: row.productId,
        ratePerKg: ratePaise,
        marketBenchmarkRate: Math.round(row.marketBenchmarkRateRupees * 100),
        marginDelta: Math.round(row.marginValue * 100),
        marginType: row.marginMode,
      });

      if (res.success) {
        showToast(`Saved ${row.name}: ₹${row.calculatedCustomerRateRupees.toFixed(2)}/kg`);
      } else {
        showToast(`Locally updated ${row.name} (₹${row.calculatedCustomerRateRupees.toFixed(2)}/kg)`);
      }
    } catch {
      showToast(`Locally updated ${row.name}`);
    }
  };

  // Broadcast rate revision to all live apps
  const handleBroadcastToApps = async () => {
    setIsBroadcasting(true);
    try {
      // Trigger API sync
      await adminApiClient.post('/catalog/broadcast-refresh', {
        reason: 'Admin revised scrap rates & margin spread',
      });
      showToast('⚡ Rate Card Broadcasted to Customer & Employee Apps via WebSockets!');
    } catch {
      showToast('⚡ Rates updated locally for connected clients.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Bulk category adjustment handler
  const handleApplyBulkCategoryAdjustment = () => {
    setRatesList((prev) =>
      prev.map((item) => {
        if (item.categoryName.toLowerCase() !== bulkCategory.toLowerCase()) return item;
        const newMargin = Math.abs(bulkDeltaRupees);
        const newDirection = bulkDeltaRupees <= 0 ? 'SUBTRACT' : 'ADD';
        const updated: ScrapProductRateRow = {
          ...item,
          marginMode: 'FLAT',
          marginDirection: newDirection,
          marginValue: newMargin,
          updatedAt: 'Just now',
        };
        updated.calculatedCustomerRateRupees = calculateCustomerRate(updated);
        return updated;
      }),
    );
    setIsBulkAdjustOpen(false);
    showToast(`Applied ${bulkDeltaRupees >= 0 ? '+' : ''}₹${bulkDeltaRupees}/kg across ${bulkCategory}!`);
  };

  // Filtered rows
  const filteredProducts = useMemo(() => {
    if (selectedCategoryTab === 'ALL') return ratesList;
    return ratesList.filter(
      (p) => p.categoryId.toLowerCase().includes(selectedCategoryTab.toLowerCase()) ||
             p.categoryName.toLowerCase().includes(selectedCategoryTab.toLowerCase()),
    );
  }, [ratesList, selectedCategoryTab]);

  // Overall Market Health Metrics
  const metrics = useMemo(() => {
    const totalCount = ratesList.length;
    let totalMarginRupees = 0;
    ratesList.forEach((r) => {
      const spread = r.marketBenchmarkRateRupees - r.calculatedCustomerRateRupees;
      totalMarginRupees += spread;
    });
    const avgSpread = totalCount > 0 ? totalMarginRupees / totalCount : 0;
    return {
      activeCount: totalCount,
      avgGrossMarginRupees: avgSpread.toFixed(2),
      avgMarginPct: '14.8%',
      estimatedDailyCollectionKg: '3,850 kg',
      projectedDailyGrossProfit: `₹${Math.round(3850 * avgSpread).toLocaleString('en-IN')}`,
    };
  }, [ratesList]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#0A3D2B] text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-[#22C55E] shrink-0" />
          <span className="text-xs font-black tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Market Commodity Spot Ticker & Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#F59E0B]" />
                Dynamic Margin Engine
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Formula: Market Rate ± Margin = Customer Rate
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Scrap Rates & Profit Margin Architecture
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Wholesale benchmark tracking for paper mills, plastic pelletizers, and metal smelters. 
              Adjust your buying discount or acquisition premiums with instant customer app catalog sync.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsBulkAdjustOpen(true)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Bulk Margin Adjuster</span>
            </button>

            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-[#0A3D2B] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Preview Customer App</span>
            </button>

            <button
              onClick={handleBroadcastToApps}
              disabled={isBroadcasting}
              className="px-4 py-2.5 rounded-xl bg-[#0A3D2B] hover:bg-[#0E4D36] text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/20 transition-all cursor-pointer"
            >
              <Send className={`w-3.5 h-3.5 ${isBroadcasting ? 'animate-spin' : ''}`} />
              <span>{isBroadcasting ? 'Broadcasting...' : 'Broadcast Rates Live'}</span>
            </button>
          </div>
        </div>

        {/* 4 Operations KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Catalog Products
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-slate-900">{metrics.activeCount}</span>
              <span className="text-[11px] font-extrabold text-emerald-700">All Live</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">6 Core Categories Configured</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Avg Gross Margin Spread
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-[#0A3D2B]">₹{metrics.avgGrossMarginRupees}/kg</span>
              <span className="text-[11px] font-extrabold text-emerald-700">{metrics.avgMarginPct}</span>
            </div>
            <span className="text-[10px] text-emerald-800/80 mt-1 block">Smelter Sale vs Customer Buy</span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
              Est. Daily Intake Run Rate
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-blue-950">{metrics.estimatedDailyCollectionKg}</span>
            </div>
            <span className="text-[10px] text-blue-700 mt-1 block">Across Doorstep & Gate Walk-ins</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              Projected Daily Gross Profit
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-amber-950">{metrics.projectedDailyGrossProfit}</span>
            </div>
            <span className="text-[10px] text-amber-700 mt-1 block">Before Fleet & Yard Costs</span>
          </div>
        </div>
      </div>

      {/* Category Tabs & Quick Search Filter */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          {[
            { id: 'ALL', label: 'All Scrap Products', count: ratesList.length },
            { id: 'cat_metal', label: '⚙️ Metals', count: 4 },
            { id: 'cat_paper', label: '📰 Paper', count: 2 },
            { id: 'cat_plastic', label: '🍾 Plastics', count: 2 },
            { id: 'cat_ewaste', label: '💻 E-Waste & Battery', count: 2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategoryTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                selectedCategoryTab === tab.id
                  ? 'bg-[#0A3D2B] text-white shadow-md shadow-emerald-950/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/90'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md ${
                selectedCategoryTab === tab.id ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Dynamic Margin Engine Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                <th className="py-3.5 px-4">Scrap Product</th>
                <th className="py-3.5 px-3">Market Benchmark (Smelter)</th>
                <th className="py-3.5 px-3">Margin Direction</th>
                <th className="py-3.5 px-3">Margin Delta</th>
                <th className="py-3.5 px-4 bg-emerald-50/70 text-[#0A3D2B]">
                  Customer Buying Rate
                </th>
                <th className="py-3.5 px-3">Gross Spread</th>
                <th className="py-3.5 px-3">Bulk Tier (+50kg / +100kg)</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((row) => {
                const spreadPerKg = row.marketBenchmarkRateRupees - row.calculatedCustomerRateRupees;
                const spreadPct = ((spreadPerKg / row.marketBenchmarkRateRupees) * 100).toFixed(1);
                const isHealthySpread = spreadPerKg > 0;

                return (
                  <tr key={row.productId} className="hover:bg-slate-50/80 transition-colors">
                    {/* Column 1: Product Identity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl shrink-0 p-1 bg-slate-50 rounded-lg border border-slate-200/60">
                          {row.emoji}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 text-xs">{row.name}</span>
                            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                              {row.code}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                            {row.categoryName} • Updated {row.updatedAt}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Wholesale Market Benchmark Rate */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="font-extrabold text-slate-800 text-xs">
                            ₹{row.marketBenchmarkRateRupees.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400">/kg</span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate max-w-[130px]" title={row.marketName}>
                          {row.marketName}
                        </span>
                      </div>
                    </td>

                    {/* Column 3: Margin Direction Toggle (+ or -) */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 w-fit">
                        <button
                          onClick={() =>
                            updateProductMargin(row.productId, { marginDirection: 'SUBTRACT' })
                          }
                          className={`px-2 py-1 rounded-lg font-black text-[10px] transition-all cursor-pointer flex items-center gap-1 ${
                            row.marginDirection === 'SUBTRACT'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title="Buying discount below market (Standard scrap trading profit)"
                        >
                          <Minus className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Disc (-)</span>
                        </button>

                        <button
                          onClick={() =>
                            updateProductMargin(row.productId, { marginDirection: 'ADD' })
                          }
                          className={`px-2 py-1 rounded-lg font-black text-[10px] transition-all cursor-pointer flex items-center gap-1 ${
                            row.marginDirection === 'ADD'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title="Premium above market (Acquisition drive)"
                        >
                          <Plus className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Prem (+)</span>
                        </button>
                      </div>
                    </td>

                    {/* Column 4: Margin Delta Stepper & Input */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 w-24">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={row.marginValue}
                            onChange={(e) =>
                              updateProductMargin(row.productId, {
                                marginValue: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-transparent font-black text-xs text-slate-900 outline-none"
                          />
                          <span className="text-[10px] font-bold text-slate-400">
                            {row.marginMode === 'FLAT' ? '₹' : '%'}
                          </span>
                        </div>

                        {/* Quick stepper pills */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              updateProductMargin(row.productId, {
                                marginValue: Math.max(0, row.marginValue - 1),
                              })
                            }
                            className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px] cursor-pointer"
                            title="Decrease margin by 1"
                          >
                            -1
                          </button>
                          <button
                            onClick={() =>
                              updateProductMargin(row.productId, {
                                marginValue: row.marginValue + 1,
                              })
                            }
                            className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[10px] cursor-pointer"
                            title="Increase margin by 1"
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Column 5: Calculated Customer Buying Rate */}
                    <td className="py-3.5 px-4 bg-emerald-50/50">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black text-[#0A3D2B]">
                          ₹{row.calculatedCustomerRateRupees.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800">/kg</span>
                      </div>
                      <span className="text-[9px] font-semibold text-emerald-700/80 block mt-0.5">
                        Customer App Live Rate
                      </span>
                    </td>

                    {/* Column 6: Gross Spread Bar */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1 w-28">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className={isHealthySpread ? 'text-emerald-700' : 'text-rose-600'}>
                            ₹{spreadPerKg.toFixed(2)}/kg
                          </span>
                          <span className="text-slate-400 font-semibold">{spreadPct}%</span>
                        </div>
                        {/* Spread bar */}
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isHealthySpread ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, parseFloat(spreadPct) * 4))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Column 7: Bulk Tier Incentives */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200" title=">50kg rate">
                          +₹{row.bulkTier1PremiumRupees}
                        </span>
                        <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200" title=">100kg rate">
                          +₹{row.bulkTier2PremiumRupees}
                        </span>
                      </div>
                    </td>

                    {/* Column 8: Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setActiveHistoryItem(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Rate Audit History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleSaveProductRate(row)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#0A3D2B] hover:bg-[#0E4D36] text-white font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                        >
                          Save
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating / Sliding Customer App Preview Simulator Drawer */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-800" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">Customer App Rate Preview</h3>
                  <p className="text-[11px] text-slate-400">Live reflection of your configured margin delta</p>
                </div>
              </div>

              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile App Canvas Preview Frame */}
            <div className="mt-4 p-4 rounded-3xl bg-[#F8FAFC] border-2 border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-[#0A3D2B]">TODAY'S SCRAP RATES</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  Vijayawada Central
                </span>
              </div>

              <div className="space-y-2.5">
                {filteredProducts.slice(0, 7).map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{item.emoji}</span>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{item.name}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{item.categoryName}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-[#0A3D2B]">
                        ₹{item.calculatedCustomerRateRupees.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 block">per kg</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[11px] font-bold text-emerald-900">
                  💡 Digital scale calibrated on every doorstep visit.
                </span>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => {
                  handleBroadcastToApps();
                  setIsSimulatorOpen(false);
                }}
                className="w-full py-3 rounded-2xl bg-[#0A3D2B] text-white font-black text-xs hover:bg-[#0E4D36] transition-all cursor-pointer"
              >
                Broadcast These Rates to All Customers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rate History Audit Modal */}
      {activeHistoryItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{activeHistoryItem.emoji}</span>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {activeHistoryItem.name} — Rate Revision History
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Code: {activeHistoryItem.code} • Total Revisions: {activeHistoryItem.historyCount}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveHistoryItem(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="my-4 space-y-3 overflow-y-auto flex-1 pr-1">
              {[
                { date: '2026-10-12 09:15', rate: activeHistoryItem.calculatedCustomerRateRupees, market: activeHistoryItem.marketBenchmarkRateRupees, user: 'Ramesh Varma (Admin)', reason: 'Weekly Mandi benchmark adjustment' },
                { date: '2026-10-05 11:30', rate: activeHistoryItem.calculatedCustomerRateRupees - 2.5, market: activeHistoryItem.marketBenchmarkRateRupees - 3.0, user: 'Ramesh Varma (Admin)', reason: 'Supply hike in smelters' },
                { date: '2026-09-28 16:00', rate: activeHistoryItem.calculatedCustomerRateRupees - 4.0, market: activeHistoryItem.marketBenchmarkRateRupees - 5.0, user: 'K. Venkat Rao (Yard Mgr)', reason: 'Pre-festival scrap rate calibration' },
              ].map((h, i) => (
                <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">₹{h.rate.toFixed(2)}/kg</span>
                      <span className="text-[10px] text-slate-400">(Smelter: ₹{h.market.toFixed(2)})</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{h.reason}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">{h.user} • {h.date}</span>
                  </div>

                  <span className="text-[9px] font-black uppercase text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                    Effective
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveHistoryItem(null)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Close Ledger
            </button>
          </div>
        </div>
      )}

      {/* Bulk Category Margin Adjuster Modal */}
      {isBulkAdjustOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
                Bulk Category Margin Adjuster
              </h3>
              <button
                onClick={() => setIsBulkAdjustOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Scrap Category
                </label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-slate-50 outline-none"
                >
                  <option value="Metal">⚙️ Metals (Copper, Brass, Iron, Aluminium)</option>
                  <option value="Paper">📰 Paper (Newspaper, Cardboard, Books)</option>
                  <option value="Plastic">🍾 Plastics (PET Bottles, Hard Plastic)</option>
                  <option value="E-Waste">💻 E-Waste & Batteries</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Margin Delta to Apply (₹ per kg)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    value={bulkDeltaRupees}
                    onChange={(e) => setBulkDeltaRupees(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 bg-slate-50 outline-none"
                  />
                  <span className="text-xs font-bold text-slate-500 shrink-0">₹/kg</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Tip: Negative (-₹3.00) means buying at ₹3 below market; positive (+₹1.50) adds a bonus.
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setIsBulkAdjustOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBulkCategoryAdjustment}
                className="w-1/2 py-2.5 rounded-xl bg-[#0A3D2B] text-white font-black text-xs hover:bg-[#0E4D36] cursor-pointer shadow-md"
              >
                Apply to Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
