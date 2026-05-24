/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ProjectYearData, MonthlyData } from '../types';
import { Grid, Save, HelpCircle, Milestone, DollarSign } from 'lucide-react';
import SafeNumberInput from './SafeNumberInput';

interface SpreadsheetEditorProps {
  project: ProjectYearData;
  onUpdateProject: (updated: ProjectYearData) => void;
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function SpreadsheetEditor({ project, onUpdateProject }: SpreadsheetEditorProps) {
  const [activeCellInfo, setActiveCellInfo] = useState<string | null>(null);

  const C = project.reportingMonth;
  const year = project.year;

  // Derive monthly incremental values from cumulative S-curve values for display
  const getIncrementalPlan = (index: number) => {
    if (index === 0) return project.monthlyData[0].targetCumulativeProgress;
    return Math.max(0, project.monthlyData[index].targetCumulativeProgress - project.monthlyData[index - 1].targetCumulativeProgress);
  };

  const getIncrementalActual = (index: number) => {
    const act = project.monthlyData[index].actualCumulativeProgress;
    if (act === null) return null;
    if (index === 0) return act;
    const prevAct = project.monthlyData[index - 1].actualCumulativeProgress;
    return Math.max(0, act - (prevAct ?? 0));
  };

  // 1. Handler for Incremental Target Progress Change
  const handleIncrementalPlanChange = (index: number, val: number) => {
    const newVal = Math.max(0, val);
    
    // Recalculate running cumulative progress array starting at index
    const updatedMonthly = [...project.monthlyData];
    
    // Calculate new increments list
    const currentIncrements = project.monthlyData.map((_, i) => getIncrementalPlan(i));
    currentIncrements[index] = newVal;

    // Reconstruct cumulatives
    let runningSum = 0;
    for (let i = 0; i < 12; i++) {
      runningSum += currentIncrements[i];
      // Clamp the target cumulative in plan at 100 max, support decimals
      const cumulativeVal = Math.min(100, Math.round(runningSum * 10) / 10);
      updatedMonthly[i] = {
        ...updatedMonthly[i],
        targetCumulativeProgress: cumulativeVal
      };
    }

    onUpdateProject({
      ...project,
      monthlyData: updatedMonthly
    });
  };

  // 2. Handler for Incremental Actual Progress Change
  const handleIncrementalActualChange = (index: number, val: number) => {
    const newVal = Math.max(0, val);
    const updatedMonthly = [...project.monthlyData];

    // Compute increments
    const currentIncrements = project.monthlyData.map((_, i) => getIncrementalActual(i));
    currentIncrements[index] = newVal;

    // Get maximum index with actual progress data
    let maxIdxWithActual = C - 1;
    for (let i = 0; i < 12; i++) {
      if (currentIncrements[i] !== null || i === index) {
        maxIdxWithActual = Math.max(maxIdxWithActual, i);
      }
    }

    let runningSum = 0;
    for (let i = 0; i < 12; i++) {
      const increment = currentIncrements[i];
      if (i <= maxIdxWithActual) {
        runningSum += (increment ?? 0);
        updatedMonthly[i] = {
          ...updatedMonthly[i],
          actualCumulativeProgress: Math.round(runningSum * 10) / 10
        };
      } else {
        updatedMonthly[i] = {
          ...updatedMonthly[i],
          actualCumulativeProgress: null
        };
      }
    }

    onUpdateProject({
      ...project,
      monthlyData: updatedMonthly
    });
  };

  // 3. Handler for Cumulative Plan Progress Change
  const handleCumulativePlanChange = (index: number, val: number) => {
    // Cumulative should be cumulative, so clamp to 100 max, support decimals
    const newVal = Math.min(100, Math.max(0, Math.round(val * 10) / 10));
    const updatedMonthly = [...project.monthlyData];
    updatedMonthly[index] = {
      ...updatedMonthly[index],
      targetCumulativeProgress: newVal
    };

    // Guarantee progression order to prevent negative target increments
    for (let i = index + 1; i < 12; i++) {
      if (updatedMonthly[i].targetCumulativeProgress < updatedMonthly[i - 1].targetCumulativeProgress) {
        updatedMonthly[i].targetCumulativeProgress = updatedMonthly[i - 1].targetCumulativeProgress;
      }
    }
    for (let i = index - 1; i >= 0; i--) {
      if (updatedMonthly[i].targetCumulativeProgress > updatedMonthly[i + 1].targetCumulativeProgress) {
        updatedMonthly[i].targetCumulativeProgress = updatedMonthly[i + 1].targetCumulativeProgress;
      }
    }

    onUpdateProject({
      ...project,
      monthlyData: updatedMonthly
    });
  };

  // 4. Handler for Cumulative Actual Progress Change
  const handleCumulativeActualChange = (index: number, val: number) => {
    // Actual progress can exceed 100%
    const newVal = Math.max(0, Math.round(val * 10) / 10);
    const updatedMonthly = [...project.monthlyData];
    updatedMonthly[index] = {
      ...updatedMonthly[index],
      actualCumulativeProgress: newVal
    };

    // Find the maximum index containing actual progress
    const maxIdxWithActual = Math.max(
      C - 1,
      ...updatedMonthly.map((m, idx) => m.actualCumulativeProgress !== null ? idx : -1)
    );

    // Guarantee actual physical progression sequence logic up to maxIdxWithActual
    for (let i = index + 1; i <= maxIdxWithActual; i++) {
      if (updatedMonthly[i].actualCumulativeProgress !== null && 
          updatedMonthly[i].actualCumulativeProgress! < updatedMonthly[i - 1].actualCumulativeProgress!) {
        updatedMonthly[i].actualCumulativeProgress = updatedMonthly[i - 1].actualCumulativeProgress;
      }
    }
    for (let i = index - 1; i >= 0; i--) {
      if (updatedMonthly[i].actualCumulativeProgress !== null && 
          updatedMonthly[i].actualCumulativeProgress! > updatedMonthly[i + 1].actualCumulativeProgress!) {
        updatedMonthly[i].actualCumulativeProgress = updatedMonthly[i + 1].actualCumulativeProgress;
      }
    }

    onUpdateProject({
      ...project,
      monthlyData: updatedMonthly
    });
  };

  // 5. Update Target Cash Flow value
  const handleTargetCashFlowChange = (index: number, val: number) => {
    const updatedMonthly = [...project.monthlyData];
    updatedMonthly[index] = {
      ...updatedMonthly[index],
      targetCashFlow: Math.max(0, val)
    };
    onUpdateProject({ ...project, monthlyData: updatedMonthly });
  };

  // 6. Update Actual Cash Flow value
  const handleActualCashFlowChange = (index: number, val: number) => {
    const updatedMonthly = [...project.monthlyData];
    updatedMonthly[index] = {
      ...updatedMonthly[index],
      actualCashFlow: Math.max(0, val)
    };
    onUpdateProject({ ...project, monthlyData: updatedMonthly });
  };

  return (
    <div id="spreadsheet-editor-panel" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden font-sans">
      {/* Header Info Area */}
      <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              Campaign Time-Phased S-Curve Matrix (Spreadsheet Mode)
            </h3>
            <p className="text-xs text-slate-400">
              Interactive financial and physical ledger. Modifying increments automatically updates the global cumulative curves.
            </p>
          </div>
        </div>

        {activeCellInfo && (
          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10px] text-blue-700 bg-blue-50 rounded-lg animate-pulse border border-blue-100/50">
            <Milestone className="w-3 h-3" />
            Active: <span className="font-extrabold">{activeCellInfo}</span>
          </span>
        )}
      </div>

      {/* Spreadsheet Input Horizontal Scrolling Table wrapper */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            {/* Months Header block */}
            <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase font-bold tracking-wider">
              <th className="p-3 border-r border-slate-800 w-[230px] min-w-[230px] max-w-[230px] sticky left-0 z-10 bg-slate-900">
                Variables & Indices
              </th>
              {MONTH_NAMES.map((name, i) => {
                const isPastCutoff = i <= C - 1;
                return (
                  <th 
                    key={name}
                    className={`p-3 text-center border-r border-slate-800 font-bold min-w-[85px] ${
                      isPastCutoff ? 'bg-slate-850 text-blue-400 border-b-2 border-b-blue-500' : ''
                    }`}
                  >
                    {name}-{String(year).substring(2)}
                    <span className="block text-[8px] text-slate-500 font-mono">
                      {isPastCutoff ? 'H-Month' : 'Future'}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 text-[11px] font-sans">
            
            {/* ROW 1: Monthly Target / Incremental Plan Progress (%) */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200 sticky left-0 bg-white z-10 w-[230px] min-w-[230px] max-w-[230px]">
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <span className="truncate">Incremental Target Prog (%)</span>
                  <span className="text-[9px] text-blue-500 bg-blue-50/50 px-1.5 py-0.5 rounded-sm uppercase tracking-tight font-mono shrink-0">Plan</span>
                </div>
              </td>
              {project.monthlyData.map((m, idx) => {
                const incVal = getIncrementalPlan(idx);
                return (
                  <td key={`inc-plan-${idx}`} className="p-2 border-r border-slate-200 bg-blue-50/10">
                    <SafeNumberInput
                      step="0.1"
                      min="0"
                      max="100"
                      value={incVal}
                      onFocus={() => setActiveCellInfo(`Month ${idx + 1} Incremental Target Plan`)}
                      onBlur={() => setActiveCellInfo(null)}
                      onChange={(val) => handleIncrementalPlanChange(idx, val ?? 0)}
                      className="w-full bg-white text-slate-800 border border-slate-200 hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:focus:ring-blue-500 rounded px-1.5 py-1 text-center font-bold font-mono transition-shadow"
                    />
                  </td>
                );
              })}
            </tr>

            {/* ROW 2: Cumulative Target Progress (%) */}
            <tr className="bg-slate-50/20 hover:bg-slate-50/50 transition-colors">
              <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 w-[230px] min-w-[230px] max-w-[230px]">
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <span className="truncate">Cumulative Target Prog (%)</span>
                  <span className="text-[9px] text-blue-600 bg-blue-100/70 px-1.5 py-0.5 rounded-sm uppercase tracking-tight font-mono shrink-0">Cumulative</span>
                </div>
              </td>
              {project.monthlyData.map((m, idx) => (
                <td key={`cum-plan-${idx}`} className="p-2 border-r border-slate-200 bg-blue-50/20">
                  <SafeNumberInput
                    step="0.1"
                    min="0"
                    max="100"
                    value={m.targetCumulativeProgress}
                    onFocus={() => setActiveCellInfo(`Month ${idx + 1} Cumulative Target Plan`)}
                    onBlur={() => setActiveCellInfo(null)}
                    onChange={(val) => handleCumulativePlanChange(idx, val ?? 0)}
                    className="w-full bg-white text-blue-800 border border-blue-200 hover:border-blue-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1 text-center font-bold font-mono transition-shadow shadow-3xs"
                  />
                </td>
              ))}
            </tr>

            {/* ROW 3: Monthly Actual / Incremental Progress (%) */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200 sticky left-0 bg-white z-10 w-[230px] min-w-[230px] max-w-[230px]">
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <span className="truncate">Incremental Actual Prog (%)</span>
                  <span className="text-[9px] text-orange-500 bg-orange-50/50 px-1.5 py-0.5 rounded-sm uppercase tracking-tight font-mono shrink-0">Actual</span>
                </div>
              </td>
              {project.monthlyData.map((m, idx) => {
                const incActualVal = getIncrementalActual(idx);
                const isHistorical = idx <= C - 1;

                return (
                  <td 
                    key={`inc-actual-${idx}`} 
                    className={`p-2 border-r border-slate-200 ${
                      isHistorical ? 'bg-orange-50/10' : 'bg-slate-50/10'
                    }`}
                  >
                    <SafeNumberInput
                      step="0.1"
                      value={isHistorical ? incActualVal : null}
                      placeholder={isHistorical ? "0" : "—"}
                      disabled={!isHistorical}
                      onFocus={() => setActiveCellInfo(`Month ${idx + 1} Incremental Actual Progress`)}
                      onBlur={() => setActiveCellInfo(null)}
                      onChange={(val) => handleIncrementalActualChange(idx, val ?? 0)}
                      className={`w-full text-center font-bold font-mono rounded px-1.5 py-1 border transition-colors ${
                        isHistorical 
                          ? 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-3xs'
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                      }`}
                    />
                  </td>
                );
              })}
            </tr>

            {/* ROW 4: Cumulative Actual Progress (%) */}
            <tr className="bg-slate-50/20 hover:bg-slate-50/50 transition-colors">
              <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 w-[230px] min-w-[230px] max-w-[230px]">
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <span className="truncate">Cumulative Actual Prog (%)</span>
                  <span className="text-[9px] text-orange-600 bg-orange-100/70 px-1.5 py-0.5 rounded-sm uppercase tracking-tight font-mono shrink-0">Cumulative</span>
                </div>
              </td>
              {project.monthlyData.map((m, idx) => {
                const isHistorical = idx <= C - 1;
                return (
                  <td 
                    key={`cum-actual-${idx}`}
                    className={`p-2 border-r border-slate-200 ${
                      isHistorical ? 'bg-orange-50/20' : 'bg-slate-50/20'
                    }`}
                  >
                    <SafeNumberInput
                      step="0.1"
                      value={isHistorical ? m.actualCumulativeProgress : null}
                      placeholder={isHistorical ? "0" : "—"}
                      disabled={!isHistorical}
                      onFocus={() => setActiveCellInfo(`Month ${idx + 1} Cumulative Actual Progress`)}
                      onBlur={() => setActiveCellInfo(null)}
                      onChange={(val) => handleCumulativeActualChange(idx, val ?? 0)}
                      className={`w-full text-center font-bold font-mono rounded px-1.5 py-1 border transition-colors ${
                        isHistorical
                          ? 'bg-white text-orange-850 border-orange-200 hover:border-orange-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-3xs'
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                      }`}
                    />
                  </td>
                );
              })}
            </tr>

            {/* ROW 5: Target Monthly Cash Flow Drawdown ($k) */}
            <tr className="hover:bg-slate-50/50 transition-colors">
              <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200 sticky left-0 bg-white z-10 w-[230px] min-w-[230px] max-w-[230px]">
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <span className="truncate">Planned Cash Spend ($k)</span>
                  <span className="text-[9px] text-blue-500 bg-blue-50/50 px-1.5 py-0.5 rounded-sm uppercase tracking-tight font-mono shrink-0">Cash Plan</span>
                </div>
              </td>
              {project.monthlyData.map((m, idx) => (
                <td key={`cash-plan-${idx}`} className="p-2 border-r border-slate-200 bg-blue-50/5">
                  <SafeNumberInput
                    step="5"
                    value={m.targetCashFlow}
                    onFocus={() => setActiveCellInfo(`Month ${idx + 1} Planned Cash Drawdown`)}
                    onBlur={() => setActiveCellInfo(null)}
                    onChange={(val) => handleTargetCashFlowChange(idx, val ?? 0)}
                    className="w-full bg-white text-slate-800 border border-slate-200 hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded px-1.5 py-1 text-center font-mono font-bold transition-shadow"
                  />
                </td>
              ))}
            </tr>

            {/* ROW 6: Actual Monthly Cash Flow Drawdown ($k) */}
            <tr className="bg-slate-50/10 hover:bg-slate-50/50 transition-colors">
              <td className="p-2.5 font-bold text-slate-700 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 w-[230px] min-w-[230px] max-w-[230px]">
                <div className="flex items-center justify-between gap-1.5 w-full">
                  <span className="truncate">Actual Cash Spent ($k)</span>
                  <span className="text-[9px] text-orange-500 bg-orange-50/50 px-1.5 py-0.5 rounded-sm uppercase tracking-tight font-mono shrink-0">Cash Spent</span>
                </div>
              </td>
              {project.monthlyData.map((m, idx) => {
                const isHistorical = idx <= C - 1;
                return (
                  <td 
                    key={`cash-actual-${idx}`}
                    className={`p-2 border-r border-slate-200 ${
                      isHistorical ? 'bg-orange-50/5' : 'bg-slate-50/5'
                    }`}
                  >
                    <SafeNumberInput
                      step="5"
                      value={isHistorical ? m.actualCashFlow : null}
                      placeholder={isHistorical ? "0" : "—"}
                      disabled={!isHistorical}
                      onFocus={() => setActiveCellInfo(`Month ${idx + 1} Actual Cash Expenditure`)}
                      onBlur={() => setActiveCellInfo(null)}
                      onChange={(val) => handleActualCashFlowChange(idx, val ?? 0)}
                      className={`w-full text-center font-mono font-bold rounded px-1.5 py-1 border transition-colors ${
                        isHistorical
                          ? 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-3xs'
                          : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none'
                      }`}
                    />
                  </td>
                );
              })}
            </tr>

          </tbody>
        </table>
      </div>

      {/* Spreadsheet Quick Formulas Legend footer */}
      <div className="p-3 bg-slate-50 text-[10px] text-slate-400 border-t border-slate-100/60 flex items-center justify-between gap-3 font-mono">
        <span className="flex items-center gap-1">
          <Milestone className="w-3.5 h-3.5 text-blue-500" />
          Formulaic Relations: Cumulative Progress [M_j] = Cumulative Progress [M_j-1] + Monthly Increment [M_j]
        </span>
        <span className="text-right">
          Units: progress ratio (%), capital expenditure ($1,000 USD, $k equivalent)
        </span>
      </div>

    </div>
  );
}
