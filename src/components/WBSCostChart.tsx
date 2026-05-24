/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WBSItem } from '../types';
import { AlertTriangle, Award, CheckCircle2, DollarSign, Activity, Settings2 } from 'lucide-react';

interface WBSCostChartProps {
  wbsList: WBSItem[];
  onNavigateToAbbr: (abbr: string) => void;
}

export default function WBSCostChart({ wbsList, onNavigateToAbbr }: WBSCostChartProps) {
  // Determine top 3 highest spent cost centers
  const sortedBySpent = [...wbsList].sort((a, b) => b.spent - a.spent);
  const top3Ids = sortedBySpent.slice(0, 3).map((item) => item.id);

  // Maximum value for scaling horizontal bars
  const maxVal = Math.max(...wbsList.map((item) => Math.max(item.budget, item.spent)), 400);

  return (
    <div id="wbs-cost-visual-panel" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden font-sans">
      
      {/* Panel header and legend */}
      <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 rounded-sm text-[9px] bg-sky-200 text-sky-800 font-bold tracking-widest font-mono uppercase">
              Cost centers
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mt-1">
            WBS Work Center Cost & Progress Ledger
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">
            Cross-reference budget ceilings vs actual accrued field costs. Golden badge marks high-spender components.
          </p>
        </div>

        {/* Legend block */}
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-100 self-start sm:self-center">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-xs" />
            <span>Budget Limit</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 bg-orange-500 rounded-xs" />
            <span>Actual Cost</span>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {wbsList.map((item, index) => {
          const isTop3 = top3Ids.includes(item.id) && item.spent > 0;
          const pctSpent = item.budget > 0 ? (item.spent / item.budget) * 100 : 0;
          const isOverrun = item.spent > item.budget;

          // Width computation clamped at 0% - 100% relative to absolute max value
          const budgetWidth = `${Math.min(100, (item.budget / maxVal) * 100)}%`;
          const spentWidth = `${Math.min(100, (item.spent / maxVal) * 100)}%`;

          // Earned Value (EV) = Budget * Progress%
          const earnedValue = (item.progress / 100) * item.budget;
          
          // Cost Performance Index (CPI) = EV / AC (Spent)
          let cpi: number | null = null;
          if (item.spent > 0) {
            cpi = earnedValue / item.spent;
          }

          // Section 3: Spent > 0 but Progress == 0 warning
          const isHiddenDelay = item.spent > 0 && item.progress === 0;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                isTop3
                  ? 'bg-amber-50/15 border-amber-200/60 shadow-inner ring-1 ring-amber-400/5'
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              {/* Header metrics for item */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold font-mono px-1.5 py-0.5 rounded-sm">
                    WBS-{String(index + 1).padStart(2, '0')}
                  </span>
                  <h4 className="text-xs font-black text-slate-800 tracking-tight">{item.name}</h4>
                  
                  {isTop3 && (
                    <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-sm text-[8px] font-black tracking-widest uppercase flex items-center gap-0.5" title="Top Spender">
                      <Award className="w-2.5 h-2.5" /> HEAT-MAP
                    </span>
                  )}

                  {isOverrun && (
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-sm bg-rose-100 text-rose-800 border border-rose-200 uppercase tracking-widest animate-pulse">
                      OVERRUN
                    </span>
                  )}
                </div>

                {/* Index indicators */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-500 font-mono">
                  {cpi !== null && (
                    <span 
                      onClick={() => onNavigateToAbbr('cpi')}
                      title="Click to view CPI index definition and live formula"
                      className={`px-1.5 py-0.5 rounded-xs font-bold text-[9px] cursor-pointer hover:ring-2 hover:ring-indigo-100 transition-all ${
                        cpi >= 1.0 
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                          : 'bg-rose-50 text-rose-700 font-black hover:bg-rose-100'
                      }`}
                    >
                      CPI: {cpi.toFixed(2)}
                    </span>
                  )}
                  <span 
                    onClick={() => onNavigateToAbbr('pv')}
                    title="Click to view Budget & Planned Value (PV) explanation"
                    className="cursor-pointer hover:underline hover:text-blue-600 transition-colors py-0.5 px-1 rounded-sm hover:bg-slate-100"
                  >
                    Bgt: <span className="text-slate-800 font-bold">${item.budget.toLocaleString()}k</span>
                  </span>
                  <span 
                    onClick={() => onNavigateToAbbr('ac')}
                    title="Click to view Actual Cost (AC) explanation"
                    className="cursor-pointer hover:underline hover:text-blue-600 transition-colors py-0.5 px-1 rounded-sm hover:bg-slate-100"
                  >
                    Cum: <span className="text-slate-800 font-bold">${item.spent.toLocaleString()}k</span>
                  </span>
                </div>
              </div>

              {/* Progress and budget bar */}
              <div className="space-y-3">
                {/* Visual Comparative Track: TWO separate bars side by side inside a grid context for maximum visual honesty */}
                <div className="space-y-1.5 bg-slate-50/50 p-2.5 rounded-lg border border-slate-150/50">
                  {/* Row A: Budget Track */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      <span>Baseline Approved Capital limit</span>
                      <span>${item.budget.toLocaleString()}k</span>
                    </div>
                    <div className="relative h-2 bg-slate-200/60 rounded-sm w-full overflow-hidden">
                      <div
                        className="absolute h-full bg-blue-600 rounded-sm transition-all duration-500"
                        style={{ width: budgetWidth }}
                      />
                    </div>
                  </div>

                  {/* Row B: Spent Track */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      <span>Verified Accrued Cash Spent</span>
                      <span>${item.spent.toLocaleString()}k ({pctSpent.toFixed(0)}%)</span>
                    </div>
                    <div className="relative h-2 bg-slate-200/60 rounded-sm w-full overflow-hidden">
                      <div
                        className={`absolute h-full rounded-sm transition-all duration-500 ${
                          isOverrun ? 'bg-rose-600' : 'bg-orange-500'
                        }`}
                        style={{ width: spentWidth }}
                      />
                    </div>
                  </div>
                </div>

                {/* Physical Progress indicator */}
                <div 
                  onClick={() => onNavigateToAbbr('ev')}
                  title="Click to view Earned Value (EV) physical progress definitions"
                  className="flex items-center gap-3 pt-0.5 cursor-pointer hover:bg-slate-50/50 p-1 rounded transition-colors group"
                >
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono w-24 group-hover:text-blue-600">Physical Done (EV)</span>
                  <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/30">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-blue-700 font-mono w-10 text-right group-hover:underline">{item.progress}%</span>
                </div>

                {/* Warning flag if Spent > 0 but progress is 0% */}
                {isHiddenDelay && (
                  <div className="flex items-start gap-2 mt-2 bg-rose-50 border border-rose-100 text-rose-800 p-2.5 rounded-lg text-[10px] font-medium leading-relaxed">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="font-extrabold uppercase text-[9px] tracking-wider block mb-0.5 text-rose-900">Zero-Earned Cost Incurred (Hidden Delay)</strong>
                      Field expenditures have occurred (${item.spent.toLocaleString()}k accrued), but physical engineering milestone progress remains at <span className="font-black font-mono">0%</span>. Review contract terms immediately.
                    </span>
                  </div>
                )}
                
                {/* Completed confirmation code stamp */}
                {!isHiddenDelay && item.spent > 0 && item.progress === 100 && (
                  <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Work Center physical execution 100% complete.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {wbsList.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs">
            No cost centers declared. Create a WBS center in the Left Panel to begin simulation.
          </div>
        )}
      </div>
    </div>
  );
}
