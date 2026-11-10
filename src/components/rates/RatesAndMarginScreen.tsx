"use client";

import { Button, DialogSurface } from '../ui';
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
import { MarketRatesPanel } from './MarketRatesPanel';

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
  isActive: boolean; // product enabled (shown in customer + employee apps)
  categoryActive: boolean; // parent category enabled
  historyCount: number;
  updatedAt: string;
}

interface AdminCategoryRow {
  id: string;
  name: string;
  emoji: string;
  isActive: boolean;
  productCount: number;
}

export const RatesAndMarginScreen: React.FC = () => {
  const [ratesList, setRatesList] = useState<ScrapProductRateRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<AdminCategoryRow[]>([]);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('ALL');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [activeHistoryItem, setActiveHistoryItem] = useState<ScrapProductRateRow | null>(null);
  const [isBulkAdjustOpen, setIsBulkAdjustOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>('Metal');
  const [bulkDeltaRupees, setBulkDeltaRupees] = useState<number>(-2.0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [rateHistory, setRateHistory] = useState<any[]>([]);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Dynamic live rate fetching from NestJS backend
  useEffect(() => {
    const fetchLiveRates = async () => {
      try {
        // Admin catalog = every category/product (including hidden) + full margin detail.
        const res = await adminApiClient.get('/admin/catalog');
        if (res.success && Array.isArray(res.data)) {
          const mapped: ScrapProductRateRow[] = res.data
            .map((cat: any) =>
              (cat.products || []).map((prod: any) => {
                const rate = prod.activeRate || {};
                const customerRate = Number(rate.ratePerKgPaise ?? 0) / 100;
                const storedBenchmark = Number(rate.marketBenchmarkRatePaise ?? 0) / 100;
                const benchmark = storedBenchmark > 0 ? storedBenchmark : customerRate;
                const isPercent = String(rate.marginType || 'FLAT').toUpperCase().startsWith('PERCENT');
                const deltaRaw = Number(rate.marginDeltaPaise ?? 0);
                // Backend stores a signed delta: negative = discount, positive = premium.
                const marginDirection: 'SUBTRACT' | 'ADD' =
                  storedBenchmark > 0 && deltaRaw !== 0
                    ? deltaRaw < 0 ? 'SUBTRACT' : 'ADD'
                    : benchmark >= customerRate ? 'SUBTRACT' : 'ADD';
                const margin =
                  storedBenchmark > 0 && deltaRaw !== 0
                    ? Math.abs(isPercent ? deltaRaw : deltaRaw / 100)
                    : Math.abs(benchmark - customerRate);

                return {
                  productId: String(prod.id),
                  categoryId: String(cat.id),
                  categoryName: cat.name || 'General',
                  name: prod.name,
                  code: prod.code || prod.name.toLowerCase().replace(/\s+/g, '_'),
                  emoji: prod.emoji || cat.emoji || '📦',
                  marketBenchmarkRateRupees: benchmark,
                  marketName: '—',
                  lastMarketSync: rate.effectiveFrom || '—',
                  marginMode: isPercent ? 'PERCENTAGE' : 'FLAT',
                  marginDirection,
                  marginValue: margin,
                  calculatedCustomerRateRupees: customerRate,
                  bulkTier1PremiumRupees: 0,
                  bulkTier2PremiumRupees: 0,
                  isActive: prod.isActive !== false,
                  categoryActive: cat.isActive !== false,
                  historyCount: 0,
                  updatedAt: rate.effectiveFrom
                    ? new Date(rate.effectiveFrom).toLocaleDateString()
                    : '—',
                };
              }),
            )
            .flat();

          setCategoryRows(
            res.data.map((cat: any) => ({
              id: String(cat.id),
              name: cat.name,
              emoji: cat.emoji || '📦',
              isActive: cat.isActive !== false,
              productCount: (cat.products || []).length,
            })),
          );
          setRatesList(mapped);
        } else {
          setRatesList([]);
          setLoadError(res.error || 'Unable to load catalog rates.');
        }
      } catch (err: any) {
        setRatesList([]);
        setLoadError(err.message || 'Unable to load catalog rates.');
      }
    };

    fetchLiveRates();
  }, [reloadKey]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openRateHistory = async (row: ScrapProductRateRow) => {
    setActiveHistoryItem(row);
    setRateHistory([]);
    const res = await adminApiClient.get(`/admin/catalog/rates/history/${row.productId}`);
    if (res.success && Array.isArray(res.data)) setRateHistory(res.data);
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

  // Show / hide a whole scrap category in the customer + employee apps
  const handleToggleCategory = async (cat: AdminCategoryRow) => {
    const next = !cat.isActive;
    const res = await adminApiClient.patch(`/admin/catalog/categories/${cat.id}`, {
      isActive: next,
    });
    if (!res.success) {
      showToast(`Could not update ${cat.name}: ${res.error || 'Backend rejected update'}`);
      return;
    }
    setCategoryRows((prev) => prev.map((c) => (c.id === cat.id ? { ...c, isActive: next } : c)));
    setRatesList((prev) =>
      prev.map((row) => (row.categoryId === cat.id ? { ...row, categoryActive: next } : row)),
    );
    showToast(`${cat.name} ${next ? 'is now visible' : 'hidden'} in customer & employee apps.`);
  };

  // Show / hide a single scrap product in the customer + employee apps
  const handleToggleProduct = async (row: ScrapProductRateRow) => {
    const next = !row.isActive;
    const res = await adminApiClient.patch(`/admin/catalog/products/${row.productId}`, {
      isActive: next,
    });
    if (!res.success) {
      showToast(`Could not update ${row.name}: ${res.error || 'Backend rejected update'}`);
      return;
    }
    setRatesList((prev) =>
      prev.map((item) => (item.productId === row.productId ? { ...item, isActive: next } : item)),
    );
    showToast(`${row.name} ${next ? 'is now visible' : 'hidden'} in customer & employee apps.`);
  };

  // Save product rate to backend API
  const handleSaveProductRate = async (row: ScrapProductRateRow) => {
    const ratePaise = Math.round(row.calculatedCustomerRateRupees * 100);
    try {
      const res = await adminApiClient.post('/admin/catalog/rates', {
        productId: row.productId,
        ratePerKg: ratePaise,
        marketBenchmarkRate: Math.round(row.marketBenchmarkRateRupees * 100),
        marginDelta: Math.round(
          row.marginValue * (row.marginMode === 'FLAT' ? 100 : 1) *
          (row.marginDirection === 'SUBTRACT' ? -1 : 1),
        ),
        marginType: row.marginMode,
      });

      if (res.success) {
        showToast(`Saved ${row.name}: ₹${row.calculatedCustomerRateRupees.toFixed(2)}/kg`);
      } else {
        showToast(`Failed to save ${row.name}: ${res.error || 'Backend rejected update'}`);
      }
    } catch (err: any) {
      showToast(`Failed to save ${row.name}: ${err.message || 'Network error'}`);
    }
  };

  // Broadcast rate revision to all live apps
  const handleBroadcastToApps = async () => {
    setIsBroadcasting(true);
    try {
      showToast('Rates saved — customer apps refresh on next open.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Bulk category adjustment handler
  const handleApplyBulkCategoryAdjustment = async () => {
    const matching = ratesList.filter(
      (item) => item.categoryName.toLowerCase() === bulkCategory.toLowerCase(),
    );
    const adjusted = matching.map((item) => {
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
    });
    try {
      for (const row of adjusted) {
        const res = await adminApiClient.post('/admin/catalog/rates', {
          productId: row.productId,
          ratePerKg: Math.round(row.calculatedCustomerRateRupees * 100),
          marketBenchmarkRate: Math.round(row.marketBenchmarkRateRupees * 100),
          marginDelta: Math.round(bulkDeltaRupees * 100),
          marginType: 'FLAT',
        });
        if (!res.success) throw new Error(res.error || `Failed to update ${row.name}`);
      }
      setRatesList((prev) =>
        prev.map((item) => adjusted.find((row) => row.productId === item.productId) || item),
      );
    } catch (err: any) {
      showToast(err.message || 'Bulk rate update failed.');
      return;
    }
    setIsBulkAdjustOpen(false);
    showToast(`Saved ${matching.length} ${bulkCategory} rates.`);
  };

  // Filtered rows
  const filteredProducts = useMemo(() => {
    if (selectedCategoryTab === 'ALL') return ratesList;
    return ratesList.filter(
      (p) =>
        p.categoryId === selectedCategoryTab ||
        p.categoryName === selectedCategoryTab ||
        p.categoryId.toLowerCase() === selectedCategoryTab.toLowerCase() ||
        p.categoryName.toLowerCase() === selectedCategoryTab.toLowerCase(),
    );
  }, [ratesList, selectedCategoryTab]);

  // Overall Market Health Metrics
  const metrics = useMemo(() => {
    const liveRates = ratesList.filter((r) => r.isActive && r.categoryActive);
    const totalCount = liveRates.length;
    let totalMarginRupees = 0;
    liveRates.forEach((r) => {
      const spread = r.marketBenchmarkRateRupees - r.calculatedCustomerRateRupees;
      totalMarginRupees += spread;
    });
    const avgSpread = totalCount > 0 ? totalMarginRupees / totalCount : 0;
    const avgMarginPct = totalCount > 0
      ? liveRates.reduce((sum, rate) => sum +
        (rate.marketBenchmarkRateRupees > 0
          ? ((rate.marketBenchmarkRateRupees - rate.calculatedCustomerRateRupees) /
            rate.marketBenchmarkRateRupees) * 100 : 0), 0) / totalCount
      : null;
    return {
      activeCount: totalCount,
      avgGrossMarginRupees: avgSpread.toFixed(2),
      avgMarginPct: avgMarginPct == null ? '—' : `${avgMarginPct.toFixed(1)}%`,
      estimatedDailyCollectionKg: '—',
      projectedDailyGrossProfit: '—',
    };
  }, [ratesList]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-brand text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-brand shrink-0" />
          <span className="text-xs font-bold tracking-wide">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner: Market Commodity Spot Ticker & Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm relative overflow-hidden">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-gold" />
                Dynamic Margin Engine
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Formula: Market Rate ± Margin = Customer Rate
              </span>
            </div>
            <h2 className="text-2xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Scrap Rates & Profit Margin Architecture
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
              Wholesale benchmark tracking for paper mills, plastic pelletizers, and metal smelters. 
              Adjust your buying discount or acquisition premiums with instant customer app catalog sync.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              onClick={() => setIsBulkAdjustOpen(true)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Bulk Margin Adjuster</span>
            </Button>

            <Button
              onClick={() => setIsSimulatorOpen(true)}
              className="px-3.5 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-brand font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
              <span>Preview Customer App</span>
            </Button>

            <Button
              onClick={handleBroadcastToApps}
              disabled={isBroadcasting}
              className="px-4 py-2.5 rounded-xl bg-brand hover:bg-[var(--brand-hover)] text-white font-bold text-xs flex items-center gap-2 shadow-lg  transition-all cursor-pointer"
            >
              <Send className={`w-3.5 h-3.5 ${isBroadcasting ? 'animate-spin' : ''}`} />
              <span>{isBroadcasting ? 'Saving...' : 'Confirm Rates Saved'}</span>
            </Button>
          </div>
        </div>

        {/* 4 Operations KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Active Catalog Products
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-slate-900">{metrics.activeCount}</span>
              <span className="text-[11px] font-extrabold text-emerald-700">All Live</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">{categoryRows.filter((c) => c.isActive).length} Categories Live</span>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Avg Gross Margin Spread
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="data-value text-xl font-bold text-brand">₹{metrics.avgGrossMarginRupees}/kg</span>
              <span className="text-[11px] font-extrabold text-emerald-700">{metrics.avgMarginPct}</span>
            </div>
            <span className="text-[11px] text-emerald-800/80 mt-1 block">Smelter Sale vs Customer Buy</span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              Est. Daily Intake Run Rate
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-blue-950">{metrics.estimatedDailyCollectionKg}</span>
            </div>
            <span className="text-[11px] text-blue-700 mt-1 block">Across Doorstep & Gate Walk-ins</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Projected Daily Gross Profit
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold text-amber-950">{metrics.projectedDailyGrossProfit}</span>
            </div>
            <span className="text-[11px] text-amber-700 mt-1 block">Before Fleet & Yard Costs</span>
          </div>
        </div>
      </div>

      {/* Market rates (Vijayawada): search, set benchmark, enable items for the apps */}
      <MarketRatesPanel
        onCatalogChanged={() => setReloadKey((k) => k + 1)}
        onToast={showToast}
      />

      {/* Catalog Visibility: choose which scrap types customers & employees can see */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Scrap Type Visibility</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Hidden categories/products disappear from the customer pickup request, the rates list
              and the employee collection screens. Rates keep their history.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {categoryRows.filter((c) => c.isActive).length}/{categoryRows.length} categories live
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
          {categoryRows.map((cat) => {
            // Live customer rates (benchmark ± margin) of this category's enabled products
            const catProducts = ratesList.filter((r) => r.categoryId === cat.id);
            const livePrices = catProducts
              .filter((r) => r.isActive && r.calculatedCustomerRateRupees > 0)
              .map((r) => r.calculatedCustomerRateRupees);
            const minRate = livePrices.length ? Math.min(...livePrices) : null;
            const maxRate = livePrices.length ? Math.max(...livePrices) : null;
            const rateLabel =
              minRate == null
                ? 'No live rate'
                : minRate === maxRate
                ? `₹${minRate.toFixed(2)}/kg`
                : `₹${minRate.toFixed(2)} – ₹${(maxRate as number).toFixed(2)}/kg`;

            return (
              <div
                key={cat.id}
                className={`rounded-2xl border p-3 transition-all ${
                  cat.isActive
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xl ${cat.isActive ? '' : 'grayscale opacity-60'}`}>
                      {cat.emoji}
                    </span>
                    <div className="min-w-0">
                      <div
                        className={`text-xs font-bold truncate ${
                          cat.isActive ? 'text-brand' : 'text-slate-400'
                        }`}
                      >
                        {cat.name}{' '}
                        <span className="text-[11px] font-bold text-slate-400">
                          ({cat.productCount})
                        </span>
                      </div>
                      <div
                        className={`text-[11px] font-bold ${
                          cat.isActive ? 'text-emerald-800' : 'text-slate-400'
                        }`}
                      >
                        {rateLabel}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() => handleToggleCategory(cat)}
                    title={cat.isActive ? 'Click to hide from apps' : 'Click to show in apps'}
                    className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                      cat.isActive
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {cat.isActive ? 'Visible' : 'Hidden'}
                  </Button>
                </div>

                {catProducts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {catProducts.map((p) => (
                      <span
                        key={p.productId}
                        title={
                          p.isActive
                            ? `${p.name}: live customer rate (margin included)`
                            : `${p.name} is hidden from apps`
                        }
                        className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${
                          p.isActive && cat.isActive
                            ? 'bg-white border-slate-200 text-slate-700'
                            : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                        }`}
                      >
                        {p.name}{' '}
                        <span className="data-value font-bold">
                          ₹{p.calculatedCustomerRateRupees.toFixed(2)}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {categoryRows.length === 0 && (
            <span className="text-xs text-slate-400">No categories loaded.</span>
          )}
        </div>
      </div>

      {/* Category Tabs & Quick Search Filter */}
      <div className="flex items-center justify-between gap-4 overflow-x-auto pb-1">
        <div className="flex items-center gap-2">
          {(() => {
            const categoryTabs = Array.from(
              ratesList.reduce((map, row) => {
                const key = row.categoryId || row.categoryName;
                if (!map.has(key)) {
                  map.set(key, {
                    id: key,
                    label: row.categoryName || key,
                    count: 0,
                  });
                }
                map.get(key)!.count += 1;
                return map;
              }, new Map<string, { id: string; label: string; count: number }>()),
            ).map(([, tab]) => tab);
            return [
              { id: 'ALL', label: 'All Scrap Products', count: ratesList.length },
              ...categoryTabs,
            ];
          })().map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setSelectedCategoryTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                selectedCategoryTab === tab.id
                  ? 'bg-brand text-white shadow-md '
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/90'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-md ${
                selectedCategoryTab === tab.id ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Main Dynamic Margin Engine Table */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-400 uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3.5 px-4">Scrap Product</th>
                <th className="py-3.5 px-3">Market Benchmark (Smelter)</th>
                <th className="py-3.5 px-3">Margin Direction</th>
                <th className="py-3.5 px-3">Margin Delta</th>
                <th className="py-3.5 px-4 bg-emerald-50/70 text-brand">
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
                  <tr
                    key={row.productId}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !row.isActive || !row.categoryActive ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Column 1: Product Identity */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl shrink-0 p-1 bg-slate-50 rounded-lg border border-slate-200/60">
                          {row.emoji}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-xs">{row.name}</span>
                            <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                              {row.code}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
                            {row.categoryName} • Updated {row.updatedAt}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Wholesale Market Benchmark Rate */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="data-value font-extrabold text-slate-800 text-xs">
                            ₹{row.marketBenchmarkRateRupees.toFixed(2)}
                          </span>
                          <span className="text-[11px] text-slate-400">/kg</span>
                        </div>
                        <span className="text-[11px] text-slate-400 truncate max-w-[130px]" title={row.marketName}>
                          {row.marketName}
                        </span>
                      </div>
                    </td>

                    {/* Column 3: Margin Direction Toggle (+ or -) */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 w-fit">
                        <Button aria-label="Buying discount below market (Standard scrap trading profit)"
                          onClick={() =>
                            updateProductMargin(row.productId, { marginDirection: 'SUBTRACT' })
                          }
                          className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                            row.marginDirection === 'SUBTRACT'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title="Buying discount below market (Standard scrap trading profit)"
                        >
                          <Minus className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Disc (-)</span>
                        </Button>

                        <Button aria-label="Premium above market (Acquisition drive)"
                          onClick={() =>
                            updateProductMargin(row.productId, { marginDirection: 'ADD' })
                          }
                          className={`px-2 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
                            row.marginDirection === 'ADD'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                          title="Premium above market (Acquisition drive)"
                        >
                          <Plus className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Prem (+)</span>
                        </Button>
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
                            className="w-full bg-transparent font-bold text-xs text-slate-900 outline-none"
                          />
                          <span className="text-[11px] font-bold text-slate-400">
                            {row.marginMode === 'FLAT' ? '₹' : '%'}
                          </span>
                        </div>

                        {/* Quick stepper pills */}
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() =>
                              updateProductMargin(row.productId, {
                                marginValue: Math.max(0, row.marginValue - 1),
                              })
                            }
                            className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[11px] cursor-pointer"
                            title="Decrease margin by 1"
                          >
                            -1
                          </Button>
                          <Button
                            onClick={() =>
                              updateProductMargin(row.productId, {
                                marginValue: row.marginValue + 1,
                              })
                            }
                            className="w-5 h-5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[11px] cursor-pointer"
                            title="Increase margin by 1"
                          >
                            +1
                          </Button>
                        </div>
                      </div>
                    </td>

                    {/* Column 5: Calculated Customer Buying Rate */}
                    <td className="py-3.5 px-4 bg-emerald-50/50">
                      <div className="flex items-baseline gap-1">
                        <span className="data-value text-sm font-bold text-brand">
                          ₹{row.calculatedCustomerRateRupees.toFixed(2)}
                        </span>
                        <span className="text-[11px] font-bold text-emerald-800">/kg</span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700/80 block mt-0.5">
                        Customer App Live Rate
                      </span>
                    </td>

                    {/* Column 6: Gross Spread Bar */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1 w-28">
                        <div className="flex items-center justify-between text-[11px] font-bold">
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
                      <div className="flex items-center gap-1.5 text-[11px] font-bold">
                        <span className="data-value bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200" title=">50kg rate">
                          +₹{row.bulkTier1PremiumRupees}
                        </span>
                        <span className="data-value bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200" title=">100kg rate">
                          +₹{row.bulkTier2PremiumRupees}
                        </span>
                      </div>
                    </td>

                    {/* Column 8: Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          onClick={() => handleToggleProduct(row)}
                          title={
                            !row.categoryActive
                              ? 'Category is hidden — enable the category first'
                              : row.isActive
                              ? 'Visible in apps — click to hide'
                              : 'Hidden from apps — click to show'
                          }
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                            row.isActive
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                              : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {row.isActive ? 'Visible' : 'Hidden'}
                        </Button>

                        <Button aria-label="View Rate Audit History"
                          onClick={() => openRateHistory(row)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Rate Audit History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          onClick={() => handleSaveProductRate(row)}
                          className="px-2.5 py-1.5 rounded-lg bg-brand hover:bg-[var(--brand-hover)] text-white font-bold text-[11px] transition-colors cursor-pointer shadow-2xs"
                        >
                          Save
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-slate-400">
                  {loadError || 'No catalog rates available.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating / Sliding Customer App Preview Simulator Drawer */}
      {isSimulatorOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60  flex items-center justify-end animate-in fade-in">
          <DialogSurface onClose={() => setIsSimulatorOpen(false)} label="Customer App Rate Preview" className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-800" />
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Customer App Rate Preview</h3>
                  <p className="text-[11px] text-slate-400">Live reflection of your configured margin delta</p>
                </div>
              </div>

              <Button aria-label="Close"
                onClick={() => setIsSimulatorOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Mobile App Canvas Preview Frame */}
            <div className="mt-4 p-4 rounded-3xl bg-canvas border-2 border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-brand">TODAY'S SCRAP RATES</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  Vijayawada Central
                </span>
              </div>

              <div className="space-y-2.5">
                {filteredProducts.filter((p) => p.isActive && p.categoryActive).slice(0, 7).map((item) => (
                  <div
                    key={item.productId}
                    className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{item.emoji}</span>
                      <div>
                        <h4 className="text-base font-bold text-slate-900">{item.name}</h4>
                        <span className="text-[11px] font-bold text-slate-400">{item.categoryName}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="data-value text-xs font-bold text-brand">
                        ₹{item.calculatedCustomerRateRupees.toFixed(2)}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-400 block">per kg</span>
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
              <Button
                onClick={() => {
                  handleBroadcastToApps();
                  setIsSimulatorOpen(false);
                }}
                className="w-full py-3 rounded-2xl bg-brand text-white font-bold text-xs hover:bg-[var(--brand-hover)] transition-all cursor-pointer"
              >
                Confirm Rates Saved
              </Button>
            </div>
          </DialogSurface>
        </div>
      )}

      {/* Rate History Audit Modal */}
      {activeHistoryItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60  flex items-center justify-center p-4 animate-in fade-in">
          <DialogSurface onClose={() => setActiveHistoryItem(null)} label="— Rate Revision History" className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{activeHistoryItem.emoji}</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {activeHistoryItem.name} — Rate Revision History
                  </h3>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Code: {activeHistoryItem.code} • Total Revisions: {activeHistoryItem.historyCount}
                  </span>
                </div>
              </div>

              <Button aria-label="Close"
                onClick={() => setActiveHistoryItem(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="my-4 space-y-3 overflow-y-auto flex-1 pr-1">
              {rateHistory.map((h, i) => (
                <div key={i} className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="data-value font-bold text-slate-900">₹{Number(
                        h.ratePerKgRupees ?? (h.ratePerKg != null ? h.ratePerKg / 100 : 0),
                      ).toFixed(2)}/kg</span>
                      <span className="data-value text-[11px] text-slate-400">{h.marketBenchmarkRateRupees != null ? `(Smelter: ₹${Number(h.marketBenchmarkRateRupees).toFixed(2)})` : ''}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{h.reason || '—'}</span>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">{h.updatedBy?.name || h.userName || '—'} • {h.createdAt || '—'}</span>
                  </div>

                  <span className="text-[11px] font-bold uppercase text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                    Effective
                  </span>
                </div>
              ))}
              {rateHistory.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">No rate history available.</div>
              )}
            </div>

            <Button
              onClick={() => setActiveHistoryItem(null)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Close Ledger
            </Button>
          </DialogSurface>
        </div>
      )}

      {/* Bulk Category Margin Adjuster Modal */}
      {isBulkAdjustOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60  flex items-center justify-center p-4 animate-in fade-in">
          <DialogSurface onClose={() => setIsBulkAdjustOpen(false)} label="Bulk Category Margin Adjuster" className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-700" />
                Bulk Category Margin Adjuster
              </h3>
              <Button aria-label="Close"
                onClick={() => setIsBulkAdjustOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Target Scrap Category
                </label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 outline-none"
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
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-slate-50 outline-none"
                  />
                  <span className="text-xs font-bold text-slate-500 shrink-0">₹/kg</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Tip: Negative (-₹3.00) means buying at ₹3 below market; positive (+₹1.50) adds a bonus.
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                onClick={() => setIsBulkAdjustOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyBulkCategoryAdjustment}
                className="w-1/2 py-2.5 rounded-xl bg-brand text-white font-bold text-xs hover:bg-[var(--brand-hover)] cursor-pointer shadow-md"
              >
                Apply to Category
              </Button>
            </div>
          </DialogSurface>
        </div>
      )}
    </div>
  );
};
