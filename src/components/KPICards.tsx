/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectYearData } from '../types';
import { TrendingUp, AlertTriangle, ShieldCheck, DollarSign } from 'lucide-react';

interface KPICardsProps {
  project: ProjectYearData;
  onNavigateToAbbr: (abbr: string) => void;
}

export default function KPICards({ project, onNavigateToAbbr }: KPICardsProps) {
  const C = project.reportingMonth;
  const currentMonthData = project.monthlyData.find((m) => m.month === C) || project.monthlyData[C - 1];

  // 1. Math totals
  const totalBudget = project.wbsList.reduce((acc, curr) => acc + curr.budget, 0);
  const totalSpent = project.wbsList.reduce((acc, curr) => acc + curr.spent, 0);

  const targetProgress = currentMonthData ? currentMonthData.targetCumulativeProgress : 0;
  const actualProgress = currentMonthData ? (currentMonthData.actualCumulativeProgress ?? 0) : 0;

  // 1. Schedules Variance (SV) & Schedule Performance Index (SPI)
  // Planned Value (PV) = Total Budget * (Target Cum % / 100)
  // Earned Value (EV) = Total Budget * (Actual Cum % / 100)
  const PV = Math.round(totalBudget * (targetProgress / 100));
  const EV = Math.round(totalBudget * (actualProgress / 100));
  const AC = totalSpent;

  const SV = EV - PV;
  const CV = EV - AC;

  const SPI = PV > 0 ? (EV / PV) : 1;
  const CPI = AC > 0 ? (EV / AC) : 1;

  // 2. Schedule Status Badge Definition
  const scheduleDiff = actualProgress - targetProgress;
  let status: 'Ahead' | 'On Track' | 'Behind' = 'On Track';
  let badgeColors = 'bg-amber-50 border-amber-200 text-amber-700 shadow-amber-100';
  let badgeAnimation = 'animate-pulse';

  if (scheduleDiff > 1.5) {
    status = 'Ahead';
    badgeColors = 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-emerald-100';
    badgeAnimation = '';
  } else if (scheduleDiff < -1.5) {
    status = 'Behind';
    badgeColors = 'bg-rose-50 border-rose-300 text-rose-700 shadow-rose-100';
    badgeAnimation = 'animate-bounce'; // Quick notice
  }

  // 3. Front Loading Risk Score
  // Calculated from early spending deviations
  const spendRatio = totalBudget > 0 ? (totalSpent / totalBudget) : 0;
  const progressRatio = actualProgress / 100;
  const gap = spendRatio - progressRatio;
  const frontLoadingScore = Math.max(0, Math.min(100, Math.round(gap * 150)));

  let riskTier = 'Low';
  let riskColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
  if (frontLoadingScore > 15 && frontLoadingScore <= 35) {
    riskTier = 'Moderate';
    riskColor = 'text-amber-600 bg-amber-50 border-amber-100';
  } else if (frontLoadingScore > 35) {
    riskTier = 'High Risk';
    riskColor = 'text-rose-600 bg-rose-50 border-rose-100';
  }

  // 4. Forecasting: Completion Delay
  // Average physical baseline progress built per month
  const monthlyBurnRate = C > 0 ? (actualProgress / C) : 0;
  let projectedDelayMonths = 0;
  let projectedTotalMonths = 12;

  if (monthlyBurnRate > 0) {
    const remainingProgress = Math.max(0, 100 - actualProgress);
    const projectedRemaining = remainingProgress / monthlyBurnRate;
    projectedTotalMonths = parseFloat((C + projectedRemaining).toFixed(1));
    projectedDelayMonths = parseFloat(Math.max(0, projectedTotalMonths - 12).toFixed(1));
  }

  // EAC calculation (Estimate At Completion)
  const EAC = CPI > 0 ? Math.round(totalBudget / CPI) : totalBudget + (AC - EV);
  const varianceAtCompletion = totalBudget - EAC;

  return (
    <div id="kpi-banner-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-sans mb-6">
      {/* CARD 1: S-Curve Progress Monitor */}
      <div 
        onClick={() => onNavigateToAbbr('ev')}
        title="Click to view Earned Value (EV) & progress definitions"
        className="bg-white border border-slate-200 border-l-4 border-l-blue-600 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md cursor-pointer hover:bg-slate-50/30 group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-blue-600 transition-colors">Overall Progress (EV)</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${badgeColors} ${badgeAnimation}`}>
            {status}
          </span>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-800">{actualProgress.toFixed(1)}%</span>
            <span className="text-xs font-semibold text-slate-400 group-hover:underline">Actual Cum. (EV)</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            Planned target (PV) is <span onClick={(e) => { e.stopPropagation(); onNavigateToAbbr('pv'); }} className="font-bold text-slate-700 hover:text-blue-600 hover:underline">{targetProgress}%</span>
          </p>
        </div>
        <div 
          onClick={(e) => { e.stopPropagation(); onNavigateToAbbr('sv'); }}
          title="Click to view Schedule Variance (SV) definition"
          className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs hover:text-blue-600 hover:underline"
        >
          <span className="text-slate-400 uppercase text-[9px] font-bold tracking-wider">Schedule Variance (SV):</span>
          <span className={`font-bold font-mono ${scheduleDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {scheduleDiff >= 0 ? '+' : ''}{scheduleDiff.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* CARD 2: Cost & Earned Value (CPI / SPI) */}
      <div 
        onClick={() => onNavigateToAbbr('ac')}
        title="Click to view Actual Cost (AC) & expenditure definitions"
        className="bg-white border border-slate-200 border-l-4 border-l-slate-400 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md cursor-pointer hover:bg-slate-50/30 group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">Current Spend (AC)</span>
          <TrendingUp className="w-4 h-4 text-slate-400" />
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-800">${totalSpent.toLocaleString()}k</span>
            <span className="text-xs font-semibold text-slate-400 group-hover:underline">Spent AC</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Budget (BAC) is <span className="font-bold text-slate-700">${totalBudget.toLocaleString()}k</span>
          </p>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-xs">
          <div 
            onClick={(e) => { e.stopPropagation(); onNavigateToAbbr('cpi'); }}
            title="Click to view Cost Performance Index (CPI) formula"
            className="border-r border-slate-100 hover:bg-slate-50 hover:text-blue-600 transition-colors py-0.5 rounded cursor-pointer"
          >
            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">CPI Index</span>
            <span className={`font-bold font-mono text-xs ${CPI >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {CPI.toFixed(2)}
            </span>
          </div>
          <div 
            onClick={(e) => { e.stopPropagation(); onNavigateToAbbr('spi'); }}
            title="Click to view Schedule Performance Index (SPI) formula"
            className="hover:bg-slate-50 hover:text-blue-600 transition-colors py-0.5 rounded cursor-pointer"
          >
            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">SPI Index</span>
            <span className={`font-bold font-mono text-xs ${SPI >= 1 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {SPI.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* CARD 3: Front-Loading Risk Score */}
      <div 
        onClick={() => onNavigateToAbbr('flr')}
        title="Click to view Front-Loading Ratio (FLR) definition & risks"
        className={`bg-white border border-slate-200 border-l-4 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md cursor-pointer hover:bg-slate-50/30 group ${
          frontLoadingScore < 15 ? 'border-l-emerald-500' : frontLoadingScore <= 35 ? 'border-l-amber-500' : 'border-l-rose-500'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-800 transition-colors">Front-Loading Risk</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${riskColor}`}>
            {riskTier}
          </span>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-800">{frontLoadingScore.toFixed(0)}</span>
            <span className="text-xs font-semibold text-slate-400 group-hover:underline">Gap Score (FLR)</span>
          </div>
          <div className="w-full bg-slate-100 h-1 mt-2.5 overflow-hidden rounded">
            <div
              className={`h-full ${
                frontLoadingScore < 15 ? 'bg-emerald-500' : frontLoadingScore <= 35 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(5, frontLoadingScore))}%` }}
            />
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="text-slate-400 uppercase text-[9px] font-bold tracking-wider">Drawdown Margin:</span>
          <span className="font-bold font-mono text-slate-700">
            {(spendRatio / Math.max(0.01, progressRatio)).toFixed(2)}x
          </span>
        </div>
      </div>

      {/* CARD 4: Forecasting Engine (delay & EAC) */}
      <div 
        onClick={() => onNavigateToAbbr('eac')}
        title="Click to view Estimate at Completion (EAC) formula"
        className="bg-white border border-slate-200 border-l-4 border-l-indigo-600 rounded-2xl p-4 shadow-sm flex flex-col justify-between transition-all hover:shadow-md cursor-pointer hover:bg-slate-50/30 group"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-indigo-600 transition-colors">Completion Forecast</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
            projectedDelayMonths > 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {projectedDelayMonths > 0 ? 'DELAY RISK' : 'HEALTHY'}
          </span>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-800">${EAC.toLocaleString()}k</span>
            <span className="text-xs font-semibold text-slate-400 group-hover:underline">EAC Projection</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Variance at End (VAC): <span onClick={(e) => { e.stopPropagation(); onNavigateToAbbr('vac'); }} className={`font-bold hover:underline hover:text-blue-600 ${varianceAtCompletion >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {varianceAtCompletion >= 0 ? '+' : ''}{varianceAtCompletion.toLocaleString()}k
            </span>
          </p>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="text-slate-400 uppercase text-[9px] font-bold tracking-wider">Est. Completion Delay:</span>
          <span className={`font-bold font-mono ${projectedDelayMonths > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {projectedDelayMonths > 0 ? `+${projectedDelayMonths} Months` : 'On Time'}
          </span>
        </div>
      </div>
    </div>
  );
}
