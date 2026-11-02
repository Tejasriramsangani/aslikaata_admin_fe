"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, MapPin, Radio, Check, ArrowUp, ArrowDown, X } from 'lucide-react';
import { adminApiClient } from '../../lib/api-client';

interface MarketRateItem {
  id: string;
  code: string;
  name: string;
  categoryCode: string;
  categoryName: string;
  marketRatePerKg: number;
  previousRatePerKg: number | null;
  changePct: number | null;
  source: 'SEED' | 'MANUAL' | 'FEED';
  updatedAt: string | null;
  enabled: boolean;
  customerRatePerKg: number | null;
  margin: { type: string; value: number; label: string } | null;
}

interface MarketRatesResponse {
  market: { key: string; label: string };
  feed: {
    configured: boolean;
    lastRefresh: { at: string; ok: boolean; message: string } | null;
  };
  categories: Array<{ code: string; name: string; count: number; enabledCount: number }>;
  totals: { items: number; enabled: number };
  items: MarketRateItem[];
}

interface MarketRatesPanelProps {
  /** Called after an item is enabled/disabled or re-priced so the page can reload. */
  onCatalogChanged: () => void;
  onToast: (message: string) => void;
}

const SOURCE_LABEL: Record<MarketRateItem['source'], string> = {
  SEED: 'Reference',
  MANUAL: 'Manual',
  FEED: 'Live feed',
};

const formatUpdated = (iso: string | null) => {
  if (!iso) return 'Not set';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? 'Not set'
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const MarketRatesPanel: React.FC<MarketRatesPanelProps> = ({ onCatalogChanged, onToast }) => {
  const [data, setData] = useState<MarketRatesResponse | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (category !== 'ALL') params.set('category', category);
    const qs = params.toString();
    const res = await adminApiClient.get<MarketRatesResponse>(
      `/admin/market-rates${qs ? `?${qs}` : ''}`,
    );
    if (res.success && res.data) {
      setData(res.data);
      setError('');
    } else {
      setError(res.error || 'Unable to load market rates.');
    }
    setIsLoading(false);
  }, [debouncedSearch, category]);

  useEffect(() => {
    void load();
  }, [load]);

  const afterChange = async (message: string) => {
    onToast(message);
    await load();
    onCatalogChanged();
  };

  const toggle = async (item: MarketRateItem) => {
    setBusyId(item.id);
    const res = item.enabled
      ? await adminApiClient.post(`/admin/market-rates/${item.id}/disable`, {})
      : await adminApiClient.post(`/admin/market-rates/${item.id}/enable`, {});
    setBusyId(null);
    if (!res.success) {
      onToast(`${item.name}: ${res.error || 'request failed'}`);
      return;
    }
    await afterChange(
      item.enabled
        ? `${item.name} hidden from customer & employee apps.`
        : `${item.name} is now live in customer & employee apps.`,
    );
  };

  const saveRate = async (item: MarketRateItem) => {
    const raw = edits[item.id];
    const value = Number(raw);
    if (raw === undefined || raw.trim() === '' || !Number.isFinite(value) || value < 0) {
      onToast('Enter a valid market rate in ₹/kg.');
      return;
    }
    setBusyId(item.id);
    const res = await adminApiClient.patch(`/admin/market-rates/${item.id}`, {
      ratePerKg: Math.round(value * 100) / 100,
    });
    setBusyId(null);
    if (!res.success) {
      onToast(`${item.name}: ${res.error || 'could not save rate'}`);
      return;
    }
    setEdits((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    await afterChange(
      item.enabled
        ? `${item.name} market rate saved — customer rate re-priced with its margin.`
        : `${item.name} market rate saved.`,
    );
  };

  const refreshFeed = async () => {
    setIsRefreshing(true);
    const res = await adminApiClient.post('/admin/market-rates/refresh', {});
    setIsRefreshing(false);
    if (!res.success) {
      onToast(res.error || 'Live feed refresh failed.');
      await load();
      return;
    }
    await afterChange(res.data?.message || 'Live rates refreshed.');
  };

  const enabledItems = useMemo(() => (data?.items || []).filter((i) => i.enabled), [data]);
  const otherGroups = useMemo(() => {
    const groups = new Map<string, { name: string; items: MarketRateItem[] }>();
    (data?.items || [])
      .filter((i) => !i.enabled)
      .forEach((i) => {
        const g = groups.get(i.categoryCode) ?? { name: i.categoryName, items: [] };
        g.items.push(i);
        groups.set(i.categoryCode, g);
      });
    return Array.from(groups.entries());
  }, [data]);

  const renderRow = (item: MarketRateItem) => {
    const edited = edits[item.id];
    const isDirty = edited !== undefined && Number(edited) !== item.marketRatePerKg;
    const busy = busyId === item.id;
    const canEnable = item.marketRatePerKg > 0;

    return (
      <div
        key={item.id}
        className={`grid grid-cols-12 items-center gap-3 px-4 py-3 border-t border-slate-100 ${
          item.enabled ? 'bg-emerald-50/40' : 'bg-white'
        }`}
      >
        <div className="col-span-12 md:col-span-4 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs text-slate-900 truncate">{item.name}</span>
            <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              {item.code}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
            {item.categoryName} · {SOURCE_LABEL[item.source]} · {formatUpdated(item.updatedAt)}
          </div>
        </div>

        <div className="col-span-6 md:col-span-3">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 w-28">
              <span className="text-[10px] font-bold text-slate-400 mr-1">₹</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={edited ?? (item.marketRatePerKg > 0 ? String(item.marketRatePerKg) : '')}
                placeholder="Set rate"
                onChange={(e) => setEdits((prev) => ({ ...prev, [item.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isDirty) void saveRate(item);
                }}
                className="w-full bg-transparent font-black text-xs text-slate-900 outline-none"
              />
              <span className="text-[10px] font-bold text-slate-400">/kg</span>
            </div>
            {isDirty && (
              <button
                type="button"
                onClick={() => saveRate(item)}
                disabled={busy}
                className="p-1.5 rounded-lg bg-[#0A3D2B] text-white hover:bg-[#0E4D36] cursor-pointer disabled:opacity-50"
                title="Save market rate"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {item.changePct != null && item.changePct !== 0 && (
            <span
              className={`inline-flex items-center gap-0.5 text-[10px] font-black mt-1 ${
                item.changePct > 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {item.changePct > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(item.changePct)}% vs previous
            </span>
          )}
        </div>

        <div className="col-span-6 md:col-span-3">
          {item.enabled && item.customerRatePerKg != null ? (
            <>
              <div className="text-sm font-black text-[#0A3D2B]">
                ₹{item.customerRatePerKg.toFixed(2)}
                <span className="text-[10px] font-bold text-emerald-800">/kg</span>
              </div>
              <div className="text-[10px] font-semibold text-slate-400">
                Customer rate · margin {item.margin?.label ?? '—'}
              </div>
            </>
          ) : (
            <div className="text-[10px] font-semibold text-slate-400">
              {canEnable ? 'Not shown to customers' : 'Set a market rate to enable'}
            </div>
          )}
        </div>

        <div className="col-span-12 md:col-span-2 flex md:justify-end">
          <button
            type="button"
            onClick={() => toggle(item)}
            disabled={busy || (!item.enabled && !canEnable)}
            title={
              item.enabled
                ? 'Click to hide from customer & employee apps'
                : canEnable
                ? 'Click to show in customer & employee apps'
                : 'Set a market rate first'
            }
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              item.enabled
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            {busy ? '…' : item.enabled ? 'Enabled' : 'Enable'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-900">Market Rates</h3>
              <span className="flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <MapPin className="w-3 h-3" />
                {data?.market.label ?? 'Vijayawada, Andhra Pradesh'}
              </span>
              <span
                className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  data?.feed.configured
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                    : 'text-slate-500 bg-slate-50 border-slate-200'
                }`}
              >
                <Radio className="w-3 h-3" />
                {data?.feed.configured ? 'Live feed connected' : 'Manual rates (no live feed)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 max-w-2xl">
              Search an item, set or review its Vijayawada market rate, then enable it. Enabled items go
              live in the customer and employee apps at market rate ± your margin, and are listed first.
            </p>
            {data?.feed.lastRefresh && (
              <p
                className={`text-[10px] font-semibold mt-1 ${
                  data.feed.lastRefresh.ok ? 'text-slate-400' : 'text-rose-600'
                }`}
              >
                Last sync {formatUpdated(data.feed.lastRefresh.at)}: {data.feed.lastRefresh.message}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={refreshFeed}
            disabled={isRefreshing || !data?.feed.configured}
            title={
              data?.feed.configured
                ? 'Pull the latest rates from the live feed'
                : 'No live feed configured — set MARKET_RATES_FEED_URL on the backend'
            }
            className="shrink-0 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing…' : 'Refresh live rates'}</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scrap items — copper, newspaper, battery, radiator…"
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0A3D2B] focus:border-transparent"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[{ code: 'ALL', name: 'All', count: data?.totals.items ?? 0, enabledCount: data?.totals.enabled ?? 0 }, ...(data?.categories || [])].map(
            (c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => setCategory(c.code)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black shrink-0 cursor-pointer transition-all ${
                  category === c.code
                    ? 'bg-[#0A3D2B] text-white shadow-md shadow-emerald-950/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {c.name}
                <span
                  className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-md ${
                    category === c.code ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {c.enabledCount}/{c.count}
                </span>
              </button>
            ),
          )}
        </div>
      </div>

      {error && (
        <div className="px-5 pb-4 text-xs font-semibold text-rose-600">{error}</div>
      )}

      {isLoading && !data ? (
        <div className="px-5 pb-6 text-xs text-slate-400">Loading market rates…</div>
      ) : (
        <div>
          {enabledItems.length > 0 && (
            <>
              <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Live in customer & employee apps · {enabledItems.length}
              </div>
              {enabledItems.map(renderRow)}
            </>
          )}

          {otherGroups.map(([code, group]) => (
            <React.Fragment key={code}>
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {group.name} · available to enable · {group.items.length}
              </div>
              {group.items.map(renderRow)}
            </React.Fragment>
          ))}

          {(data?.items.length ?? 0) === 0 && !error && (
            <div className="px-5 pb-6 text-xs text-slate-400">
              No market items match “{debouncedSearch}”.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
