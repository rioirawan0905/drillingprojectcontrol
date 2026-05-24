/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WBSItem } from '../types';
import { AlertTriangle, Award, CheckCircle2 } from 'lucide-react';

interface WBSCostChartProps {
  wbsList: WBSItem[];
}

export default function WBSCostChart({ wbsList }: WBSCostChartProps) {
  // Determine top 3 highest spent cost centers
  const sortedBySpent = [...wbsList].sort((a, b) => b.spent - a.spent);
  const top3Ids = sortedBySpent.slice(0, 3).map((item) => item.id);

  // Maximum value for scaling horizontal bars
  const maxVal = Math.max(...wbsList.map((item) => Math.max(item.budget, item.spent)), 500);

  return (
    <div id="wbs-cost-visual-panel" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs font-sans space-y-5">
      <div>
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">WBS WORK CENTER DRAWDOWN ANALYSIS</h3>
        <p className="text-xs text-slate-400">Budget vs. Spent. Golden badges mark top 3 highest spending items.</p>
      </div>

      <div className="space-y-4">
        {wbsList.map((item) => {
          const isTop3 = top3Ids.includes(item.id) && item.spent > 0;
          const pctSpent = item.budget > 0 ? (item.spent / item.budget) * 100 : 0;
          const isOverrun = item.spent > item.budget;

          // Width computation clamped at 100% of maxVal
          const budgetWidth = `${Math.min(100, (item.budget / maxVal) * 100)}%`;
          const spentWidth = `${Math.min(100, (item.spent / maxVal) * 100)}%`;

          // Section 3: Spent > 0 but Progress == 0 warning
          const isHiddenDelay = item.spent > 0 && item.progress === 0;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                isTop3
                  ? 'bg-amber-50/20 border-amber-200/50 shadow-xs ring-1 ring-amber-400/10'
                  : 'bg-slate-50/30 border-slate-100 hover:border-slate-200/60'
              }`}
            >
              {/* Header metrics for item */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  {isTop3 && (
                    <span className="bg-amber-100 text-amber-700 p-1 rounded-sm" title="Top Spender">
                      <Award className="w-3.5 h-3.5" />
                    </span>
                  )}
                  <h4 className="text-xs font-bold text-slate-700">{item.name}</h4>
                  
                  {isOverrun && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                      Overrun
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap text-[10px] font-semibold">
                  <span className="text-slate-500">
                    Budget: <span className="font-mono text-slate-800">${item.budget}k</span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">
                    Spent: <span className="font-mono text-slate-800">${item.spent}k </span>
                    <span className="font-mono text-slate-400">({pctSpent.toFixed(0)}%)</span>
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-500">
                    Physical: <span className="font-mono text-blue-600">{item.progress}%</span>
                  </span>
                </div>
              </div>

              {/* Progress and budget bar */}
              <div className="space-y-2">
                {/* Budget visual track */}
                <div className="relative h-6 bg-slate-200/50 rounded-md w-full overflow-hidden border border-slate-100/50">
                  {/* Budget line */}
                  <div
                    className="absolute top-0 bottom-0 left-0 bg-blue-100/70 border-r-2 border-blue-500"
                    style={{ width: budgetWidth }}
                    title={`Budget: $${item.budget}k`}
                  />
                  {/* Spent overlay bar (energetic orange) */}
                  <div
                    className={`absolute top-0 bottom-0 left-0 h-full ${
                      isOverrun ? 'bg-rose-500/80' : 'bg-orange-500/80 shadow-inner'
                    }`}
                    style={{ width: spentWidth }}
                    title={`Spent: $${item.spent}k`}
                  />

                  {/* Inside metrics rendering overlay */}
                  <div className="absolute inset-x-3 inset-y-0 flex items-center justify-between text-[9px] font-bold text-slate-700/80 pointer-events-none">
                    <span>SPENT: ${item.spent}k</span>
                    <span>BUDGET: ${item.budget}k</span>
                  </div>
                </div>

                {/* Physical Progress indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-slate-400 w-24">Physical Work Done:</span>
                  <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 font-mono w-8 text-right">{item.progress}%</span>
                </div>

                {/* Warning flag if Spent > 0 but progress is 0% */}
                {isHiddenDelay && (
                  <div className="flex items-center gap-1.5 mt-2 bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-1.5 rounded-lg text-[10px] font-medium animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>
                      <strong>Hidden Delay Indicator:</strong> Cost has been incurred (${item.spent}k) but physical progress is 0% for {item.name}.
                    </span>
                  </div>
                )}
                
                {/* Clean Status Check */}
                {!isHiddenDelay && item.spent > 0 && item.progress === 100 && (
                  <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-medium pt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Physical work center 100% complete.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {wbsList.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-xs">
            No cost centers declared. Create a WBS center in the Left Panel to begin simulation.
          </div>
        )}
      </div>
    </div>
  );
}
