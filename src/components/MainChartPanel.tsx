/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ProjectYearData, MonthlyData } from '../types';
import { TrendingUp, Activity, BarChart3, HelpCircle } from 'lucide-react';

interface MainChartPanelProps {
  project: ProjectYearData;
  allProjects: ProjectYearData[];
  onUpdateProject: (updated: ProjectYearData) => void;
}

// Month name lookup table
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export default function MainChartPanel({ project, allProjects, onUpdateProject }: MainChartPanelProps) {
  const [activeTab, setActiveTab] = useState<'scurve' | 'cashflow'>('scurve');
  const [isMultiYear, setIsMultiYear] = useState<boolean>(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showForecast, setShowForecast] = useState<boolean>(false);

  const selectedYear = project.year;
  const C = project.reportingMonth;
  const alpha = project.accelerationFactor;

  // Let's compute Year Weights (budget values for 2025, 2026, 2027, 2028)
  const getProjectBudget = (p: ProjectYearData) => {
    return p.wbsList.reduce((sum, item) => sum + item.budget, 0);
  };

  const budgetsByYear = allProjects.reduce((acc, p) => {
    acc[p.year] = getProjectBudget(p);
    return acc;
  }, {} as Record<number, number>);

  const totalCampaignBudget = Object.values(budgetsByYear).reduce((sum, b) => sum + b, 0);

  // Year list sorted
  const sortedYears = [...allProjects].sort((a, b) => a.year - b.year);

  // Check which year this is in the chronology (0-index based)
  const activeYearIndex = sortedYears.findIndex(p => p.year === selectedYear);

  // --- MULTI-YEAR CAMPAIGN DATA GENERATION ---
  // Construct a continuous 48-month sequence (12 mos for each 2025, 2026, 2027, 2028)
  const multiYearTimelineData: Array<{
    seqIndex: number; // 0 to 47
    monthNum: number; // 1 to 12
    year: number;
    label: string; // "Jan-25", etc
    targetCumulativeProgress: number; // % of total 4yr campaign
    actualCumulativeProgress: number | null; // % of total 4yr campaign
    recoveryCumulativeProgress: number | null; // % of total 4yr campaign
    targetCashFlow: number; // $k for that specific month
    actualCashFlow: number | null; // $k for that specific month
    sourceItem: MonthlyData;
  }> = [];

  // Running cumulative trackers
  let accumulatedBudgetSpentTarget = 0;
  let accumulatedBudgetSpentActual = 0;

  // Track if overall actual campaign tracker is active. 
  // We plot actuals for completed 2025 and up to reportingMonth in active 2026.
  // 2027-2028 remain future concept.
  sortedYears.forEach((yData) => {
    const yBudget = budgetsByYear[yData.year];
    const yReportingMonth = yData.reportingMonth;

    yData.monthlyData.forEach((mItem) => {
      const label = `${MONTH_NAMES[mItem.month - 1]}-${String(yData.year).substring(2)}`;
      
      // Calculate target campaign cumulative progress:
      // (Prior Years Budgets + Current Year Budget * (mItem.targetCumulativeProgress / 100)) / totalCampaignBudget * 100
      const priorYearsBudget = sortedYears
        .filter(p => p.year < yData.year)
        .reduce((sum, p) => sum + budgetsByYear[p.year], 0);

      const targetCampProg = ((priorYearsBudget + (mItem.targetCumulativeProgress / 100) * yBudget) / totalCampaignBudget) * 100;

      // Actual cumulative progress
      let actualCampProg: number | null = null;
      const isCompletedYear = yData.year < selectedYear;
      const hasActualProgress = mItem.actualCumulativeProgress !== null;

      if (isCompletedYear) {
        const actVal = mItem.actualCumulativeProgress ?? mItem.targetCumulativeProgress;
        actualCampProg = ((priorYearsBudget + (actVal / 100) * yBudget) / totalCampaignBudget) * 100;
      } else if (yData.year === selectedYear && hasActualProgress) {
        actualCampProg = ((priorYearsBudget + (mItem.actualCumulativeProgress! / 100) * yBudget) / totalCampaignBudget) * 100;
      }

      multiYearTimelineData.push({
        seqIndex: multiYearTimelineData.length,
        monthNum: mItem.month,
        year: yData.year,
        label,
        targetCumulativeProgress: Number(targetCampProg.toFixed(2)),
        actualCumulativeProgress: actualCampProg !== null ? Number(actualCampProg.toFixed(2)) : null,
        recoveryCumulativeProgress: null, // will compute after
        targetCashFlow: mItem.targetCashFlow,
        actualCashFlow: (isCompletedYear) 
          ? (mItem.actualCashFlow ?? mItem.targetCashFlow) 
          : (yData.year === selectedYear) ? mItem.actualCashFlow : null,
        sourceItem: mItem
      });
    });
  });

  // Now let's calculate the multi-year recovery projection starting at the active year's cutoff month
  // Find seq index of cutoff month in multiyear array
  const cutoffSeqIndex = activeYearIndex * 12 + C - 1; // e.g. Year 2026, month 6 -> index 12 + 6 - 1 = 17
  const lastActualValue = cutoffSeqIndex >= 0 ? multiYearTimelineData[cutoffSeqIndex]?.actualCumulativeProgress : 0;
  const lastActualAtCutoff = lastActualValue ?? 0;
  const lastTargetAtCutoff = cutoffSeqIndex >= 0 ? multiYearTimelineData[cutoffSeqIndex]?.targetCumulativeProgress : 0;

  // Let's populate recovery projections for all months >= cutoff month
  multiYearTimelineData.forEach((pt, idx) => {
    if (idx < cutoffSeqIndex) {
      pt.recoveryCumulativeProgress = null;
    } else if (idx === cutoffSeqIndex) {
      pt.recoveryCumulativeProgress = lastActualAtCutoff;
    } else {
      // Recovery model:
      // Campaign progress gap on remaining timeline
      const targetGap = 100 - lastTargetAtCutoff;
      const currentTarget = pt.targetCumulativeProgress;
      const progressProportion = targetGap > 0 
        ? (currentTarget - lastTargetAtCutoff) / targetGap 
        : 0;

      const remainingActualNeeded = 100 - lastActualAtCutoff;
      let recoveryVal = lastActualAtCutoff + (progressProportion * remainingActualNeeded * alpha);
      recoveryVal = Math.min(100, Math.max(lastActualAtCutoff, recoveryVal));
      pt.recoveryCumulativeProgress = Number(recoveryVal.toFixed(2));
    }
  });


  // --- SINGLE YEAR LOCAL DATA GENERATION ---
  const currentYearMonthlyData = project.monthlyData.map((m) => {
    // Label
    const label = `${MONTH_NAMES[m.month - 1]}-${String(selectedYear).substring(2)}`;
    
    // Recovery calculation for single-year
    const actualAtC = C > 0 && project.monthlyData[C - 1]?.actualCumulativeProgress !== null
      ? (project.monthlyData[C - 1]?.actualCumulativeProgress ?? 0)
      : 0;
    const targetAtC = C > 0 ? (project.monthlyData[C - 1]?.targetCumulativeProgress ?? 0) : 0;

    let recoveryVal = null;
    if (m.month === C) {
      recoveryVal = actualAtC;
    } else if (m.month > C) {
      const originalTarget = m.targetCumulativeProgress;
      const remainingPlanGrowth = 100 - targetAtC;
      const progressProportion = remainingPlanGrowth > 0 
        ? (originalTarget - targetAtC) / remainingPlanGrowth
        : 0;

      const remainingActualNeeded = 100 - actualAtC;
      let calculatedRec = actualAtC + (progressProportion * remainingActualNeeded * alpha);
      recoveryVal = Math.min(100, Math.max(actualAtC, Math.round(calculatedRec)));
    }

    const isPastOrCurrent = m.month <= C;
    const actualCumulativeProgress = isPastOrCurrent ? m.actualCumulativeProgress : null;
    const actualCashFlow = isPastOrCurrent ? m.actualCashFlow : null;

    return {
      seqIndex: m.month - 1,
      monthNum: m.month,
      label,
      targetCumulativeProgress: m.targetCumulativeProgress,
      actualCumulativeProgress,
      recoveryCumulativeProgress: recoveryVal,
      targetCashFlow: m.targetCashFlow,
      actualCashFlow,
      sourceItem: m
    };
  });


  // Chart Dimensions & Setup
  const containerWidth = 800;
  const containerHeight = 310;
  const margin = { top: 30, right: 65, bottom: 45, left: 55 };
  const chartWidth = containerWidth - margin.left - margin.right;
  const chartHeight = containerHeight - margin.top - margin.bottom;

  // Decide active dataset based on isMultiYear flag
  const activeDataset = isMultiYear ? multiYearTimelineData : currentYearMonthlyData;
  const totalPoints = activeDataset.length;

  // --- LINEAR REGRESSION CALCULATIONS ---
  const validActualPoints = activeDataset
    .map((pt, idx) => ({ x: idx, y: pt.actualCumulativeProgress }))
    .filter(p => p.y !== null) as Array<{ x: number; y: number }>;

  let m = 0;
  let c = 0;

  if (validActualPoints.length >= 2) {
    const n = validActualPoints.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += validActualPoints[i].x;
      sumY += validActualPoints[i].y;
      sumXY += validActualPoints[i].x * validActualPoints[i].y;
      sumXX += validActualPoints[i].x * validActualPoints[i].x;
    }
    const denom = n * sumXX - sumX * sumX;
    if (denom !== 0) {
      m = (n * sumXY - sumX * sumY) / denom;
      c = (sumY - m * sumX) / n;
    } else {
      m = validActualPoints[validActualPoints.length - 1].y / (validActualPoints[validActualPoints.length - 1].x || 1);
      c = 0;
    }
  } else if (validActualPoints.length === 1) {
    m = validActualPoints[0].y / (validActualPoints[0].x || 1);
    c = 0;
  }

  const x100 = m > 0 ? (100 - c) / m : null;
  let projectedCompletionLabel = "N/A (No positive velocity)";

  if (validActualPoints.length > 0) {
    if (m > 0 && x100 !== null) {
      const floorIdx = Math.floor(x100);
      if (floorIdx < totalPoints) {
        projectedCompletionLabel = activeDataset[floorIdx]?.label || "N/A";
      } else {
        const lastPt = activeDataset[totalPoints - 1];
        const monthsAway = Math.round(x100 - (totalPoints - 1));
        let projectedMonth = lastPt.sourceItem.month + monthsAway;
        let projectedYear = (lastPt as any).year ?? selectedYear;
        
        while (projectedMonth > 12) {
          projectedMonth -= 12;
          projectedYear += 1;
        }
        projectedCompletionLabel = `${MONTH_NAMES[projectedMonth - 1]}-${String(projectedYear).substring(2)}`;
      }
    } else {
      projectedCompletionLabel = "Never (Zero/Negative Velocity)";
    }
  }

  const getX = (index: number) => {
    return margin.left + (index * chartWidth) / (totalPoints - 1);
  };

  // Dynamic Cut-off marker index in active dataset
  // Local active: index is C - 1
  // Multi-year active: index is activeYearIndex * 12 + C - 1
  const activeCutoffIndex = isMultiYear 
    ? (activeYearIndex * 12 + C - 1) 
    : (C - 1);

  // Compute cumulative plan and actual cost values
  let runningTargetCash = 0;
  let runningActualCash = 0;
  const cumulativeCashData = activeDataset.map((pt, idx) => {
    runningTargetCash += pt.targetCashFlow;
    const isPastOrCurrent = idx <= activeCutoffIndex;
    if (isPastOrCurrent) {
      runningActualCash += (pt.actualCashFlow ?? 0);
    }
    return {
      cumulativeTargetCash: runningTargetCash,
      cumulativeActualCash: isPastOrCurrent ? runningActualCash : null,
    };
  });

  const totalTargetCash = cumulativeCashData.length > 0 ? cumulativeCashData[cumulativeCashData.length - 1].cumulativeTargetCash : 1;
  const scaleMaxCumulativeCash = (totalTargetCash || 1) * 1.1;

  const getY_CumulativeCash = (value: number) => {
    const height = (value * chartHeight) / scaleMaxCumulativeCash;
    return margin.top + chartHeight - height;
  };

  const yTicksCumulativeCash = [
    0,
    Math.round(scaleMaxCumulativeCash * 0.25),
    Math.round(scaleMaxCumulativeCash * 0.5),
    Math.round(scaleMaxCumulativeCash * 0.75),
    Math.round(scaleMaxCumulativeCash)
  ];

  // Coordinate Points for Cumulative Plan line
  const cumulativePlanPoints = activeDataset.map((p, idx) => ({
    x: getX(idx),
    y: getY_CumulativeCash(cumulativeCashData[idx].cumulativeTargetCash),
    val: cumulativeCashData[idx].cumulativeTargetCash,
    idx
  }));

  const cumulativePlanPath = cumulativePlanPoints.length > 0
    ? cumulativePlanPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  // Coordinate Points for Cumulative Actual line
  const cumulativeActualPoints = activeDataset
    .map((p, idx) => ({ p, idx }))
    .filter((item) => item.idx <= activeCutoffIndex)
    .map((item) => ({
      x: getX(item.idx),
      y: getY_CumulativeCash(cumulativeCashData[item.idx].cumulativeActualCash!),
      val: cumulativeCashData[item.idx].cumulativeActualCash!,
      idx: item.idx
    }));

  const cumulativeActualPath = cumulativeActualPoints.length > 0
    ? cumulativeActualPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  const getY_Progress = (percentage: number) => {
    return margin.top + chartHeight - (percentage * chartHeight) / 100;
  };

  const trendlinePoints: Array<{ x: number; y: number }> = [];
  if (validActualPoints.length > 0) {
    if (m > 0 && x100 !== null) {
      const xEnd = x100 < totalPoints - 1 ? x100 : totalPoints - 1;
      
      const pStart_x = margin.left + (0 * chartWidth) / (totalPoints - 1);
      const pStart_y = getY_Progress(Math.max(0, Math.min(100, c)));
      
      const pEnd_x = margin.left + (xEnd * chartWidth) / (totalPoints - 1);
      const pEnd_y = getY_Progress(Math.max(0, Math.min(100, m * xEnd + c)));
      
      trendlinePoints.push({ x: pStart_x, y: pStart_y });
      trendlinePoints.push({ x: pEnd_x, y: pEnd_y });
    } else {
      const pStart_x = margin.left + (0 * chartWidth) / (totalPoints - 1);
      const pStart_y = getY_Progress(Math.max(0, Math.min(100, c)));
      
      const pEnd_x = margin.left + ((totalPoints - 1) * chartWidth) / (totalPoints - 1);
      const pEnd_y = getY_Progress(Math.max(0, Math.min(100, m * (totalPoints - 1) + c)));
      
      trendlinePoints.push({ x: pStart_x, y: pStart_y });
      trendlinePoints.push({ x: pEnd_x, y: pEnd_y });
    }
  }

  // Find max cash flow to scale the bar chart dynamically
  const maxCashInTimeline = Math.max(
    ...activeDataset.map((m) => Math.max(m.targetCashFlow, m.actualCashFlow ?? 0)),
    300 // default minimum peak
  );
  const scaleMaxCash = maxCashInTimeline * 1.15;

  const getY_Cash = (value: number) => {
    const height = (value * chartHeight) / scaleMaxCash;
    return margin.top + chartHeight - height;
  };

  const getBarHeight = (value: number) => {
    return (value * chartHeight) / scaleMaxCash;
  };


  // Coordinate Points for Target S-Curve
  const targetSPoints = activeDataset.map((p, idx) => ({
    x: getX(idx),
    y: getY_Progress(p.targetCumulativeProgress),
    val: p.targetCumulativeProgress,
    label: p.label,
    idx
  }));

  const targetSPath = targetSPoints.length > 0
    ? targetSPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  // Coordinate Points for Actual S-Curve
  const actualSPoints = activeDataset
    .filter(p => p.actualCumulativeProgress !== null)
    .map((p) => ({
      x: getX(p.seqIndex),
      y: getY_Progress(p.actualCumulativeProgress!),
      val: p.actualCumulativeProgress!,
      label: p.label,
      idx: p.seqIndex
    }));

  const actualSPath = actualSPoints.length > 0
    ? actualSPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  // Coordinate Points for Recovery Project S-Curve
  const recoverySPoints = activeDataset
    .filter(p => p.recoveryCumulativeProgress !== null)
    .map((p, idx) => ({
      x: getX(p.seqIndex ?? p.monthNum - 1),
      y: getY_Progress(p.recoveryCumulativeProgress!),
      val: p.recoveryCumulativeProgress!,
      label: p.label,
      idx: p.seqIndex ?? p.monthNum - 1
    }));

  const recoverySPath = recoverySPoints.length > 0
    ? recoverySPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  // Y-axis scales tick marks
  const yTicksProgress = [0, 25, 50, 75, 100];
  const yTicksCash = [
    0,
    Math.round(scaleMaxCash * 0.25),
    Math.round(scaleMaxCash * 0.5),
    Math.round(scaleMaxCash * 0.75),
    Math.round(scaleMaxCash)
  ];

  const barWidth = isMultiYear ? 4 : 12;

  return (
    <div id="executive-charts-panel" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden font-sans">
      
      {/* Panel Nav Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 bg-slate-50/60 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2 rounded-sm text-[9px] bg-slate-200 text-slate-700 font-bold tracking-widest font-mono uppercase">
              Operational Plot
            </span>
            <Activity className="w-4 h-4 text-slate-500 animate-pulse" />
          </div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mt-1">
            {activeTab === 'scurve' ? 'Baseline VS Actual Physical S-Curve' : 'Time-Phased Cash Drawdowns'}
          </h3>
          <p className="text-[11px] text-slate-400 font-medium">
            {activeTab === 'scurve' 
              ? 'Performance tracking index showing target lines, actual measurements, and catch-up recovery bounds.'
              : 'Period breakdown of expenditures showing planned disbursements vs verified site costs ($k).'}
          </p>
        </div>

        {/* Tab Buttons & Multi-year select */}
        <div className="flex flex-wrap items-center gap-2">
          {/* S-curve vs Cash drawdown tab switch */}
          <div className="bg-slate-200/60 p-1 rounded-lg flex items-center">
            <button
              onClick={() => setActiveTab('scurve')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === 'scurve' 
                  ? 'bg-white text-slate-900 shadow-3xs' 
                  : 'text-slate-505 hover:text-slate-800'
              }`}
            >
              S-Curve Progress
            </button>
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                activeTab === 'cashflow' 
                  ? 'bg-white text-slate-900 shadow-3xs' 
                  : 'text-slate-505 hover:text-slate-800'
              }`}
            >
              Cash Flow
            </button>
          </div>

          {/* Multi-year Timeline Toggle */}
          <div className="border-l border-slate-200 pl-2">
            <button
              onClick={() => setIsMultiYear(!isMultiYear)}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 cursor-pointer ${
                isMultiYear 
                  ? 'bg-blue-900 text-white border-blue-900 hover:bg-blue-950 font-black' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              {isMultiYear ? 'Campaign Level (2025-2028)' : 'Year Level View'}
            </button>
          </div>

          {/* Forecast Trendline Toggle */}
          {activeTab === 'scurve' && (
            <div className="border-l border-slate-200 pl-2">
              <button
                onClick={() => setShowForecast(!showForecast)}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 cursor-pointer ${
                  showForecast 
                    ? 'bg-purple-900 text-white border-purple-900 hover:bg-purple-950 font-black' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                {showForecast ? 'Forecast: Active' : 'Enable Forecast'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SVG Canvas Content Layout */}
      <div className="p-5">
        
        {/* Colors Legend HUD strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] bg-slate-50 px-4 py-2 rounded-xl border border-slate-100/60 mb-4">
          <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
            {isMultiYear ? 'Viewing: Combined Campaign Master Plan' : `Viewing: ${selectedYear} Plan Outline`}
          </span>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {activeTab === 'scurve' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 bg-blue-600 rounded-full" />
                  <span className="text-slate-600 font-bold">Planned Target S-Curve</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 bg-orange-500 rounded-full" />
                  <span className="text-slate-600 font-bold">Actual Progress Earned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 bg-emerald-500 rounded-full" />
                  <span className="text-slate-600 font-bold">Recovery Buffer</span>
                </div>
                {showForecast && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                    <span className="text-slate-600 font-bold">Regression Forecast</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 bg-blue-50 border border-blue-400 rounded-sm" />
                  <span className="text-slate-600 font-bold">Planned Monthly Cost</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-1 bg-indigo-600 rounded-full" />
                  <span className="text-slate-600 font-bold">Cumulative Planned Cost</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 bg-orange-50 border border-orange-500 rounded-sm" />
                  <span className="text-slate-600 font-bold">Actual Monthly Cost</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-1 bg-rose-600 rounded-full" />
                  <span className="text-slate-600 font-bold">Cumulative Actual Cost</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Forecast Stats Banner */}
        {activeTab === 'scurve' && showForecast && (
          <div className="mb-4 p-3.5 bg-purple-50/50 border border-purple-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100/70 text-purple-700 rounded-lg shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block font-mono">Regression Forecast Metrics</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Calculated using least-squares velocity fitting of past actual milestones.</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 select-text">
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Current Velocity</span>
                <span className="text-xs font-black text-slate-800 font-mono">+{m.toFixed(2)}% / month</span>
              </div>
              
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Est. Completion</span>
                <span className="text-xs font-black text-purple-700 font-mono">{projectedCompletionLabel}</span>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Timeline Status</span>
                <span className={`text-xs font-black font-mono ${
                  m <= 0 
                  ? 'text-rose-600' 
                  : (m > 0 && projectedCompletionLabel === 'Already Completed' ? 'text-emerald-600' : 'text-blue-700')
                }`}>
                  {m <= 0 ? 'Lagging / Flat' : 'Active Growth'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Scalable Vector Graphics Visualizer */}
        <div className="relative w-full overflow-x-auto min-h-[310px] flex justify-center custom-scrollbar">
          <svg
            viewBox={`0 0 ${containerWidth} ${containerHeight}`}
            className="w-full min-w-[700px] h-auto select-none"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Background Grid tick alignments */}
            {activeTab === 'scurve' ? (
              yTicksProgress.map((tick) => (
                <g key={`y-tick-${tick}`}>
                  <line
                    x1={margin.left}
                    y1={getY_Progress(tick)}
                    x2={containerWidth - margin.right}
                    y2={getY_Progress(tick)}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                  />
                  <text
                    x={margin.left - 10}
                    y={getY_Progress(tick) + 4}
                    textAnchor="end"
                    className="text-[9px] font-mono font-bold text-slate-400"
                  >
                    {tick}%
                  </text>
                </g>
              ))
            ) : (
              <>
                {yTicksCash.map((tick) => (
                  <g key={`y-cash-tick-${tick}`}>
                    <line
                      x1={margin.left}
                      y1={getY_Cash(tick)}
                      x2={containerWidth - margin.right}
                      y2={getY_Cash(tick)}
                      stroke="#F1F5F9"
                      strokeWidth="1"
                    />
                    <text
                      x={margin.left - 10}
                      y={getY_Cash(tick) + 4}
                      textAnchor="end"
                      className="text-[9px] font-mono font-bold text-slate-400"
                    >
                      ${tick.toLocaleString()}k
                    </text>
                  </g>
                ))}
                {yTicksCumulativeCash.map((tick) => (
                  <g key={`y-cum-tick-${tick}`}>
                    <text
                      x={containerWidth - margin.right + 10}
                      y={getY_CumulativeCash(tick) + 4}
                      textAnchor="start"
                      className="text-[9px] font-mono font-bold text-indigo-500"
                    >
                      ${tick.toLocaleString()}k
                    </text>
                  </g>
                ))}
              </>
            )}

            {/* X-Axis Tick Labels and Guidelines with exact Month-Year styling requested */}
            {activeDataset.map((pt, idx) => {
              // Custom interval display to prevent overlapping tick descriptions on multi-year timeline
              const showText = !isMultiYear || idx % 3 === 0 || idx === activeCutoffIndex || idx === totalPoints - 1;
              const isCutoff = idx === activeCutoffIndex;

              return (
                <g key={`x-tick-${idx}`}>
                  {showText && (
                    <text
                      x={getX(idx)}
                      y={containerHeight - margin.bottom + 18}
                      textAnchor="middle"
                      className={`text-[9px] font-bold tracking-tight transition-colors ${
                        isCutoff 
                          ? 'text-blue-600 font-extrabold font-mono bg-blue-50' 
                          : idx === hoveredIndex 
                            ? 'text-slate-800' 
                            : 'text-slate-400'
                      }`}
                    >
                      {pt.label}
                    </text>
                  )}

                  {/* Vertical Guidelines */}
                  <line
                    x1={getX(idx)}
                    y1={margin.top}
                    x2={getX(idx)}
                    y2={containerHeight - margin.bottom}
                    stroke={isCutoff ? '#3B82F6' : idx === hoveredIndex ? '#E2E8F0' : '#F8FAFC'}
                    strokeWidth={isCutoff ? '1.5' : '1'}
                    strokeDasharray={isCutoff ? '4 2' : 'none'}
                  />
                </g>
              );
            })}

            {/* Cutoff Flag Indicator badge */}
            {activeCutoffIndex >= 0 && activeCutoffIndex < totalPoints && (
              <g>
                <rect
                  x={getX(activeCutoffIndex) - 45}
                  y={margin.top - 18}
                  width="90"
                  height="16"
                  rx="4"
                  fill="#2563EB"
                  className="shadow-xs"
                />
                <text
                  x={getX(activeCutoffIndex)}
                  y={margin.top - 7}
                  textAnchor="middle"
                  className="text-[8px] font-black text-white uppercase tracking-wider"
                >
                  CUT-OFF ({activeDataset[activeCutoffIndex]?.label})
                </text>
              </g>
            )}

            {/* CONDITIONAL RENDER: S-CURVES (LINE CHARTS) */}
            {activeTab === 'scurve' && (
              <>
                {/* s-curve line 1: Target Line */}
                <path
                  d={targetSPath}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />

                {/* s-curve line 2: Actuals Line */}
                {actualSPath && (
                  <path
                    d={actualSPath}
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />
                )}

                {/* s-curve line 3: Recovery Projection */}
                {recoverySPath && (
                  <path
                    d={recoverySPath}
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />
                )}

                {/* Forecast Least-Squares Trendline Overlay */}
                {showForecast && trendlinePoints.length >= 2 && (
                  <g id="forecast-regression-trendline">
                    <path
                      d={`M ${trendlinePoints[0].x} ${trendlinePoints[0].y} L ${trendlinePoints[1].x} ${trendlinePoints[1].y}`}
                      fill="none"
                      stroke="#A855F7"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="6 4"
                      className="transition-all duration-300 animate-pulse"
                    />

                    {/* Target 100% intersection node inside the visible graph */}
                    {m > 0 && x100 !== null && x100 < totalPoints && (
                      <g>
                        <line
                          x1={margin.left + (x100 * chartWidth) / (totalPoints - 1)}
                          y1={getY_Progress(100)}
                          x2={margin.left + (x100 * chartWidth) / (totalPoints - 1)}
                          y2={containerHeight - margin.bottom}
                          stroke="#A855F7"
                          strokeWidth="1"
                          strokeDasharray="2 3"
                        />
                        <circle
                          cx={margin.left + (x100 * chartWidth) / (totalPoints - 1)}
                          cy={getY_Progress(100)}
                          r="6"
                          fill="#A855F7"
                          stroke="#FFFFFF"
                          strokeWidth="2"
                        />
                        <text
                          x={margin.left + (x100 * chartWidth) / (totalPoints - 1)}
                          y={getY_Progress(100) - 10}
                          textAnchor="middle"
                          className="text-[9px] font-black fill-purple-700 font-mono"
                          style={{ paintOrder: 'stroke', stroke: '#FFFFFF', strokeWidth: 3.5, strokeLinejoin: 'round' }}
                        >
                          Forecasted 100% ({projectedCompletionLabel})
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* Nodes on S-curve timelines */}
                {targetSPoints.map((p) => {
                  const showNode = !isMultiYear || p.idx % 2 === 0 || p.idx === activeCutoffIndex;
                  if (!showNode) return null;
                  return (
                    <circle
                      key={`t-node-${p.idx}`}
                      cx={p.x}
                      cy={p.y}
                      r={p.idx === hoveredIndex ? 5 : 2.5}
                      fill="#2563EB"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      className="transition-all"
                    />
                  );
                })}

                {actualSPoints.map((p) => {
                  const showNode = !isMultiYear || p.idx % 2 === 0 || p.idx === activeCutoffIndex;
                  if (!showNode) return null;
                  return (
                    <circle
                      key={`a-node-${p.idx}`}
                      cx={p.x}
                      cy={p.y}
                      r={p.idx === hoveredIndex ? 6.5 : 4}
                      fill="#F97316"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="transition-all shadow-sm"
                    />
                  );
                })}

                {recoverySPoints.map((p) => {
                  const showNode = !isMultiYear || p.idx % 2 === 0 || p.idx === activeCutoffIndex;
                  if (!showNode) return null;
                  return (
                    <circle
                      key={`r-node-${p.idx}`}
                      cx={p.x}
                      cy={p.y}
                      r={p.idx === hoveredIndex ? 5 : 2.5}
                      fill="#10B981"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      className="transition-all"
                    />
                  );
                })}
              </>
            )}

             {/* CONDITIONAL RENDER: CASH FLOW DRAWDOWN (BAR CHARTS OR DUAL DRAWDOWN GRAPH) */}
            {activeTab === 'cashflow' && (
              <>
                {/* Render Double Vertical Bars for Cash Plan & Actual */}
                {activeDataset.map((pt, idx) => {
                  const hasSpentActual = pt.actualCashFlow !== null;
                  const xCenter = getX(idx);
                  
                  // Position adjustment based on densities
                  const widthAdjust = isMultiYear ? 2 : 5;
                  const pvX = xCenter - widthAdjust - 0.5;
                  const acX = xCenter + 0.5;

                  const pvY = getY_Cash(pt.targetCashFlow);
                  const pvH = getBarHeight(pt.targetCashFlow);

                  const acY = hasSpentActual ? getY_Cash(pt.actualCashFlow!) : getY_Cash(0);
                  const acH = hasSpentActual ? getBarHeight(pt.actualCashFlow!) : 0;

                  return (
                    <g key={`cash-bar-${idx}`}>
                      {/* Target bar */}
                      <rect
                        x={pvX}
                        y={pvY}
                        width={isMultiYear ? 3.5 : 9}
                        height={pvH}
                        fill="#EFF6FF"
                        stroke="#3B82F6"
                        strokeWidth="1"
                        rx="1"
                        className="transition-all duration-300"
                      />

                      {/* Actual spent bar */}
                      {hasSpentActual && (
                        <rect
                          x={acX}
                          y={acY}
                          width={isMultiYear ? 3.5 : 9}
                          height={acH}
                          fill="#FFEDD5"
                          stroke="#F97316"
                          strokeWidth="1"
                          rx="1"
                          className="transition-all duration-300"
                        />
                      )}
                    </g>
                  );
                })}

                {/* Cumulative Planned Cost Line */}
                {cumulativePlanPath && (
                  <path
                    d={cumulativePlanPath}
                    fill="none"
                    stroke="#4F46E5"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />
                )}

                {/* Cumulative Actual Cost Line */}
                {cumulativeActualPath && (
                  <path
                    d={cumulativeActualPath}
                    fill="none"
                    stroke="#E11D48"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-300"
                  />
                )}

                {/* Cumulative Nodes and Circles */}
                {cumulativePlanPoints.map((p) => {
                  const showNode = !isMultiYear || p.idx % 2 === 0 || p.idx === activeCutoffIndex;
                  if (!showNode) return null;
                  return (
                    <circle
                      key={`cum-p-node-${p.idx}`}
                      cx={p.x}
                      cy={p.y}
                      r={p.idx === hoveredIndex ? 6 : 3.5}
                      fill="#4F46E5"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      className="transition-all"
                    />
                  );
                })}

                {cumulativeActualPoints.map((p) => {
                  const showNode = !isMultiYear || p.idx % 2 === 0 || p.idx === activeCutoffIndex;
                  if (!showNode) return null;
                  return (
                    <circle
                      key={`cum-a-node-${p.idx}`}
                      cx={p.x}
                      cy={p.y}
                      r={p.idx === hoveredIndex ? 7.5 : 4.5}
                      fill="#E11D48"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      className="transition-all shadow-xs"
                    />
                  );
                })}
              </>
            )}

            {/* Hover Slices Overlay for Tooltip interaction */}
            {activeDataset.map((pt, idx) => (
              <rect
                key={`slice-trigger-${idx}`}
                x={getX(idx) - (chartWidth / (totalPoints - 1)) / 2}
                y={margin.top}
                width={chartWidth / (totalPoints - 1)}
                height={chartHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(idx)}
              />
            ))}
          </svg>

          {/* Interactive HUD HUD Hover HUD Box */}
          {hoveredIndex !== null && activeDataset[hoveredIndex] && (
            <div
              className="absolute rounded-xl bg-slate-950/95 text-white p-3.5 shadow-xl border border-slate-700/60 z-30 w-52 text-xs font-sans pointer-events-none transition-all duration-100"
              style={{
                left: `${Math.min(
                  containerWidth - 210,
                  Math.max(10, getX(hoveredIndex) - 85)
                )}px`,
                top: activeTab === 'scurve' ? '120px' : '45px',
              }}
            >
              <div className="font-bold border-b border-slate-700 pb-1 mb-1.5 flex justify-between items-center">
                <span className="text-blue-400 font-bold">{activeDataset[hoveredIndex].label}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {isMultiYear ? `Index ${hoveredIndex + 1}` : `M${activeDataset[hoveredIndex].monthNum}`}
                </span>
              </div>

              <div className="space-y-1.5">
                {activeTab === 'scurve' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Target Progress:</span>
                      <span className="font-mono font-bold text-blue-300">
                        {activeDataset[hoveredIndex].targetCumulativeProgress.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Actual Earned:</span>
                      <span className="font-mono font-bold text-orange-400">
                        {activeDataset[hoveredIndex].actualCumulativeProgress !== null 
                          ? `${activeDataset[hoveredIndex].actualCumulativeProgress!.toFixed(1)}%` 
                          : 'N/A'}
                      </span>
                    </div>

                    {activeDataset[hoveredIndex].recoveryCumulativeProgress !== null && hoveredIndex >= activeCutoffIndex && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span className="text-slate-400">Recovery Proj:</span>
                        <span className="font-mono">
                          {activeDataset[hoveredIndex].recoveryCumulativeProgress!.toFixed(1)}%
                        </span>
                      </div>
                    )}

                    {activeDataset[hoveredIndex].actualCumulativeProgress !== null && (
                      <div className="flex justify-between border-t border-slate-800 pt-1 mt-1 text-[10px]">
                        <span className="text-slate-400">Schedule Var:</span>
                        <span className={`font-mono font-bold ${
                          activeDataset[hoveredIndex].actualCumulativeProgress! - activeDataset[hoveredIndex].targetCumulativeProgress >= 0 
                            ? 'text-emerald-400' 
                            : 'text-rose-400'
                        }`}>
                          {(activeDataset[hoveredIndex].actualCumulativeProgress! - activeDataset[hoveredIndex].targetCumulativeProgress).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Monthly Plan:</span>
                      <span className="font-mono font-bold text-blue-300">
                        ${activeDataset[hoveredIndex].targetCashFlow}k
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800/60 pb-1 mb-1">
                      <span className="text-indigo-350 font-medium">Cum. Plan:</span>
                      <span className="font-mono font-bold text-indigo-300">
                        ${cumulativeCashData[hoveredIndex]?.cumulativeTargetCash.toLocaleString()}k
                      </span>
                    </div>

                    <div className="flex justify-between mt-1">
                      <span className="text-slate-400 font-medium">Monthly Actual:</span>
                      <span className="font-mono font-bold text-orange-400">
                        {activeDataset[hoveredIndex].actualCashFlow !== null 
                          ? `$${activeDataset[hoveredIndex].actualCashFlow}k` 
                          : '—'}
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-slate-800/60 pb-1 mb-1">
                      <span className="text-rose-350 font-medium font-bold">Cum. Actual:</span>
                      <span className="font-mono font-bold text-rose-400">
                        {cumulativeCashData[hoveredIndex]?.cumulativeActualCash !== null 
                          ? `$${cumulativeCashData[hoveredIndex]?.cumulativeActualCash!.toLocaleString()}k` 
                          : '—'}
                      </span>
                    </div>

                    {activeDataset[hoveredIndex].actualCashFlow !== null && (
                      <div className="flex justify-between pt-1 mt-1 text-[10px]">
                        <span className="text-slate-400">Cost Variance:</span>
                        <span className={`font-mono font-bold ${
                          activeDataset[hoveredIndex].targetCashFlow - activeDataset[hoveredIndex].actualCashFlow! >= 0 
                            ? 'text-emerald-400' 
                            : 'text-rose-400'
                        }`}>
                          {(activeDataset[hoveredIndex].targetCashFlow - activeDataset[hoveredIndex].actualCashFlow!).toLocaleString()}k
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
