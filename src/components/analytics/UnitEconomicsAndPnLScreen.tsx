"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { adminApiClient } from '../../lib/api-client';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Scale,
  Truck,
  Users,
  Fuel,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Sparkles,
  PieChart,
  Percent,
  Layers,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';

export interface CategoryPnLRow {
  categoryName: string;
  inwardKg: number;
  totalInwardPaidRupees: number;
  avgBuyingRateRupees: number;
  outwardSoldKg: number;
  totalOutwardRevenueRupees: number;
  avgSellingRateRupees: number;
  grossSpreadPerKgRupees: number;
  totalGrossProfitRupees: number;
  marginPercent: number;
}

const CATEGORY_PNL_DATA: CategoryPnLRow[] = [
  {
    categoryName: 'Copper & High-Value Metals',
    inwardKg: 1850,
    totalInwardPaidRupees: 1119250,
    avgBuyingRateRupees: 605.0,
    outwardSoldKg: 2500,
    totalOutwardRevenueRupees: 1625000,
    avgSellingRateRupees: 650.0,
    grossSpreadPerKgRupees: 45.0,
    totalGrossProfitRupees: 112500,
    marginPercent: 7.4,
  },
  {
    categoryName: 'Heavy Scrap Iron & Steel',
    inwardKg: 38400,
    totalInwardPaidRupees: 1075200,
    avgBuyingRateRupees: 28.0,
    outwardSoldKg: 42000,
    totalOutwardRevenueRupees: 1365000,
    avgSellingRateRupees: 32.5,
    grossSpreadPerKgRupees: 4.5,
    totalGrossProfitRupees: 189000,
    marginPercent: 16.1,
  },
  {
    categoryName: 'Corrugated Cardboard & Paper',
    inwardKg: 46200,
    totalInwardPaidRupees: 623700,
    avgBuyingRateRupees: 13.5,
    outwardSoldKg: 54000,
    totalOutwardRevenueRupees: 928800,
    avgSellingRateRupees: 17.2,
    grossSpreadPerKgRupees: 3.7,
    totalGrossProfitRupees: 199800,
    marginPercent: 27.4,
  },
  {
    categoryName: 'Plastics & HDPE Flakes',
    inwardKg: 12400,
    totalInwardPaidRupees: 297600,
    avgBuyingRateRupees: 24.0,
    outwardSoldKg: 14000,
    totalOutwardRevenueRupees: 406000,
    avgSellingRateRupees: 29.0,
    grossSpreadPerKgRupees: 5.0,
    totalGrossProfitRupees: 70000,
    marginPercent: 20.8,
  },
  {
    categoryName: 'Batteries & E-Waste',
    inwardKg: 3600,
    totalInwardPaidRupees: 316800,
    avgBuyingRateRupees: 88.0,
    outwardSoldKg: 4000,
    totalOutwardRevenueRupees: 392000,
    avgSellingRateRupees: 98.0,
    grossSpreadPerKgRupees: 10.0,
    totalGrossProfitRupees: 40000,
    marginPercent: 11.4,
  },
];

export const UnitEconomicsAndPnLScreen: React.FC = () => {
  const [timeWindow, setTimeWindow] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH'>('THIS_MONTH');
  const [categoryData, setCategoryData] = useState<CategoryPnLRow[]>(CATEGORY_PNL_DATA);
  const [financials, setFinancials] = useState({
    totalOutwardRevenue: '₹47,16,800',
    totalMaterialBuyingCost: '₹34,32,550',
    totalGrossTradingSpread: '₹12,84,250',
    totalOperatingExpenses: '₹2,25,250',
    netOperatingProfit: '₹10,59,000',
    netEbitdaMarginPct: '22.5%',
    vehicleFleetRents: '₹62,000',
    fuelAndPowerCharging: '₹34,850',
    crewLaborAndIncentives: '₹1,12,000',
    routeIncidentalsAndMaintenance: '₹16,400',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPnL = async () => {
      setIsLoading(true);
      try {
        const res = await adminApiClient.get(`/admin/operations/unit-economics-pnl?timeWindow=${timeWindow}`);
        if (res.success && res.data) {
          if (res.data.financials) {
            setFinancials(res.data.financials);
          }
          if (Array.isArray(res.data.categoryBreakdown) && res.data.categoryBreakdown.length > 0) {
            setCategoryData(res.data.categoryBreakdown);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch live PnL:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPnL();
  }, [timeWindow]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#0A3D2B]">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Unit Economics & Operations P&L Analytics
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Phase 6 • Executive Financials
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Buying Costs, Vehicle Rents, Fuel & Crew Wages reconciled against Outward Smelter Revenue & Realized Margins
              </p>
            </div>
          </div>
        </div>

        {/* Time Window Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white border border-slate-200 shadow-sm">
          {(['TODAY', 'THIS_WEEK', 'THIS_MONTH'] as const).map((win) => (
            <button
              key={win}
              onClick={() => setTimeWindow(win)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeWindow === win ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {win === 'TODAY' ? 'Today (12 Oct)' : win === 'THIS_WEEK' ? 'This Week' : 'October 2026 (MTD)'}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Outward Mill Sales</span>
          <div className="text-lg font-black text-slate-900">{financials.totalOutwardRevenue}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            Top-line Gross Inflow
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Material Buying Cost</span>
          <div className="text-lg font-black text-rose-700">{financials.totalMaterialBuyingCost}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Paid to Scrap Sellers</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Gross Trading Spread</span>
          <div className="text-lg font-black text-emerald-700">{financials.totalGrossTradingSpread}</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Spread before OPEX</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Operating Overheads</span>
          <div className="text-lg font-black text-amber-700">{financials.totalOperatingExpenses}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Fleet + Fuel + Wages</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">Net Operating Profit</span>
          <div className="text-lg font-black text-emerald-800">{financials.netOperatingProfit}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Net Realized EBITDA</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase block mb-1">EBITDA Margin %</span>
          <div className="text-lg font-black text-emerald-700">{financials.netEbitdaMarginPct}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Overall Unit Efficiency</div>
        </div>
      </div>

      {/* OPEX Cost Breakdown Waterfall */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Truck className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold uppercase">Vehicle Rents</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{financials.vehicleFleetRents}</div>
          <p className="text-[10px] text-slate-400 mt-1">Own depreciation + Rental vendor contracts</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Fuel className="w-4 h-4 text-rose-600" />
            <span className="text-xs font-bold uppercase">Fuel & EV Power</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{financials.fuelAndPowerCharging}</div>
          <p className="text-[10px] text-slate-400 mt-1">Verified petrol/diesel logs + yard charger power</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase">Workforce & Wages</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{financials.crewLaborAndIncentives}</div>
          <p className="text-[10px] text-slate-400 mt-1">Daily wages + 50p/kg collector collection incentive</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold uppercase">Route Incidentals</span>
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{financials.routeIncidentalsAndMaintenance}</div>
          <p className="text-[10px] text-slate-400 mt-1">Tolls, puncture repairs & minor maintenance</p>
        </div>
      </div>

      {/* Category-Wise Realized Margins Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#0A3D2B]" />
            <h3 className="font-bold text-slate-900 text-sm">Commodity-Wise Realized Margin Spread (Per Kg Breakdown)</h3>
          </div>
          <span className="text-xs text-slate-400">All prices in Indian Rupees (INR)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Commodity Category</th>
                <th className="py-3 px-4 text-right">Inward Volume (kg)</th>
                <th className="py-3 px-4 text-right">Avg Buying Rate</th>
                <th className="py-3 px-4 text-right">Sold Volume (kg)</th>
                <th className="py-3 px-4 text-right">Avg Smelter Rate</th>
                <th className="py-3 px-4 text-right">Spread / kg</th>
                <th className="py-3 px-4 text-right">Total Gross Profit</th>
                <th className="py-3 px-4 text-center">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{row.categoryName}</td>

                  <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                    {row.inwardKg.toLocaleString('en-IN')} kg
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-rose-700 font-semibold">
                    ₹{row.avgBuyingRateRupees.toFixed(1)}/kg
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-slate-900 font-bold">
                    {row.outwardSoldKg.toLocaleString('en-IN')} kg
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-bold">
                    ₹{row.avgSellingRateRupees.toFixed(1)}/kg
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                    +₹{row.grossSpreadPerKgRupees.toFixed(1)}
                  </td>

                  <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-sm">
                    ₹{row.totalGrossProfitRupees.toLocaleString('en-IN')}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {row.marginPercent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
