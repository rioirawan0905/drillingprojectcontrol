/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ProjectYearData, WBSItem } from '../types';

interface PrintReportViewProps {
  project: ProjectYearData;
  allProjects?: ProjectYearData[];
  config: {
    title: string;
    subtitle: string;
    preparedBy: string;
    classification: string;
    includeCoverPage: boolean;
    includeKPIs: boolean;
    includeCharts?: boolean;
    chartsScope?: 'year' | 'campaign';
    showDataLabels?: boolean;
    includeLedger: boolean;
    includeWBS: boolean;
    includeAdvisory: boolean;
    includeSignOff: boolean;
    colorTheme: 'executive' | 'slate' | 'emerald' | 'monochrome';
  };
  orientation: 'portrait' | 'landscape';
}

export default function PrintReportView({ project, allProjects, config, orientation }: PrintReportViewProps) {
  const C = project.reportingMonth;
  const currentMonthData = project.monthlyData.find((m) => m.month === C) || project.monthlyData[C - 1];

  // Calculations
  const totalBudget = project.wbsList.reduce((acc, curr) => acc + curr.budget, 0);
  const totalSpent = project.wbsList.reduce((acc, curr) => acc + curr.spent, 0);

  const targetProgress = currentMonthData ? currentMonthData.targetCumulativeProgress : 0;
  const actualProgress = currentMonthData ? (currentMonthData.actualCumulativeProgress ?? 0) : 0;

  const PV = Math.round(totalBudget * (targetProgress / 100));
  const EV = Math.round(totalBudget * (actualProgress / 100));
  const AC = totalSpent;

  const SV = EV - PV;
  const CV = EV - AC;

  const SPI = PV > 0 ? (EV / PV) : 1;
  const CPI = AC > 0 ? (EV / AC) : 1;

  // EAC calculation (Estimate At Completion)
  const EAC = CPI > 0 ? Math.round(totalBudget / CPI) : totalBudget + (AC - EV);
  const VAC = totalBudget - EAC;

  const spendRatio = totalBudget > 0 ? (totalSpent / totalBudget) : 0;
  const progressRatio = actualProgress / 100;
  const gap = spendRatio - progressRatio;
  const frontLoadingRatio = progressRatio > 0 ? (spendRatio / progressRatio) : 1;

  // Underperforming & Overrun WBS
  const overruns = project.wbsList.filter((item) => item.spent > item.budget);
  const hiddenDelays = project.wbsList.filter((item) => item.spent > 0 && item.progress === 0);

  // Month labels
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  // Styling based on theme selection
  const themeColors = {
    executive: {
      primaryText: 'text-blue-900',
      border: 'border-blue-200',
      bgLight: 'bg-blue-50/20',
      accentBar: 'bg-blue-800',
      badge: 'bg-blue-10 w-fit text-blue-900 border-blue-200',
    },
    slate: {
      primaryText: 'text-slate-800',
      border: 'border-slate-300',
      bgLight: 'bg-slate-50',
      accentBar: 'bg-slate-700',
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
    },
    emerald: {
      primaryText: 'text-emerald-900',
      border: 'border-emerald-200',
      bgLight: 'bg-emerald-50/10',
      accentBar: 'bg-emerald-800',
      badge: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    },
    monochrome: {
      primaryText: 'text-black',
      border: 'border-black',
      bgLight: 'bg-neutral-100',
      accentBar: 'bg-black',
      badge: 'bg-neutral-100 text-black border-black',
    }
  }[config.colorTheme];
  
  // --- CHART METRIC DATA PREPARATION ---
  const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sortedYears = [...(allProjects || [project])].sort((a, b) => a.year - b.year);
  const selectedYear = project.year;
  const activeYearIndex = sortedYears.findIndex(p => p.year === selectedYear);
  const alpha = project.accelerationFactor;

  const getProjectBudget = (p: ProjectYearData) => {
    return p.wbsList.reduce((sum, item) => sum + item.budget, 0);
  };

  const budgetsByYear = sortedYears.reduce((acc, p) => {
    acc[p.year] = getProjectBudget(p);
    return acc;
  }, {} as Record<number, number>);

  const totalCampaignBudget = Object.values(budgetsByYear).reduce((sum, b) => sum + b, 0) || 1;

  const timelineData: Array<{
    label: string;
    targetCumulativeProgress: number;
    actualCumulativeProgress: number | null;
    recoveryCumulativeProgress: number | null;
    targetCashFlow: number;
    actualCashFlow: number | null;
  }> = [];

  if (config.chartsScope === 'campaign' && allProjects && allProjects.length > 0) {
    // CAMPAIGN TIMELINE GENERATION
    sortedYears.forEach((yData) => {
      const yBudget = budgetsByYear[yData.year];
      yData.monthlyData.forEach((mItem) => {
        const label = `${MONTH_SHORT[mItem.month - 1]}-${String(yData.year).substring(2)}`;
        
        const priorYearsBudget = sortedYears
          .filter(p => p.year < yData.year)
          .reduce((sum, p) => sum + budgetsByYear[p.year], 0);

        const targetCampProg = ((priorYearsBudget + (mItem.targetCumulativeProgress / 100) * yBudget) / totalCampaignBudget) * 100;

        let actualCampProg: number | null = null;
        const isCompletedYear = yData.year < selectedYear;
        const hasActualProgress = mItem.actualCumulativeProgress !== null;

        if (isCompletedYear) {
          const actVal = mItem.actualCumulativeProgress ?? mItem.targetCumulativeProgress;
          actualCampProg = ((priorYearsBudget + (actVal / 100) * yBudget) / totalCampaignBudget) * 100;
        } else if (yData.year === selectedYear && hasActualProgress) {
          actualCampProg = ((priorYearsBudget + (mItem.actualCumulativeProgress! / 100) * yBudget) / totalCampaignBudget) * 100;
        }

        timelineData.push({
          label,
          targetCumulativeProgress: Number(targetCampProg.toFixed(1)),
          actualCumulativeProgress: actualCampProg !== null ? Number(actualCampProg.toFixed(1)) : null,
          recoveryCumulativeProgress: null,
          targetCashFlow: mItem.targetCashFlow,
          actualCashFlow: isCompletedYear 
            ? (mItem.actualCashFlow ?? mItem.targetCashFlow) 
            : (yData.year === selectedYear ? mItem.actualCashFlow : null),
        });
      });
    });

    // Recovery starting at active year's cutoff
    const cutoffSeqIndex = activeYearIndex >= 0 ? activeYearIndex * 12 + C - 1 : 0;
    const lastActualAtCutoff = cutoffSeqIndex >= 0 && cutoffSeqIndex < timelineData.length 
      ? (timelineData[cutoffSeqIndex]?.actualCumulativeProgress ?? 0) 
      : 0;
    const lastTargetAtCutoff = cutoffSeqIndex >= 0 && cutoffSeqIndex < timelineData.length 
      ? (timelineData[cutoffSeqIndex]?.targetCumulativeProgress ?? 0) 
      : 0;

    timelineData.forEach((pt, idx) => {
      if (idx < cutoffSeqIndex) {
        pt.recoveryCumulativeProgress = null;
      } else if (idx === cutoffSeqIndex) {
        pt.recoveryCumulativeProgress = lastActualAtCutoff;
      } else {
        const targetGap = 100 - lastTargetAtCutoff;
        const currentTarget = pt.targetCumulativeProgress;
        const progressProportion = targetGap > 0 
          ? (currentTarget - lastTargetAtCutoff) / targetGap 
          : 0;

        const remainingActualNeeded = 100 - lastActualAtCutoff;
        let recoveryVal = lastActualAtCutoff + (progressProportion * remainingActualNeeded * alpha);
        recoveryVal = Math.min(100, Math.max(lastActualAtCutoff, recoveryVal));
        pt.recoveryCumulativeProgress = Number(recoveryVal.toFixed(1));
      }
    });

  } else {
    // SINGLE YEAR TIMELINE GENERATION
    project.monthlyData.forEach((mItem) => {
      const label = `${MONTH_SHORT[mItem.month - 1]}-${String(selectedYear).substring(2)}`;
      const actualAtC = C > 0 && project.monthlyData[C - 1]?.actualCumulativeProgress !== null
        ? (project.monthlyData[C - 1]?.actualCumulativeProgress ?? 0)
        : 0;
      const targetAtC = C > 0 ? (project.monthlyData[C - 1]?.targetCumulativeProgress ?? 0) : 0;

      let recoveryVal = null;
      if (mItem.month === C) {
        recoveryVal = actualAtC;
      } else if (mItem.month > C) {
        const originalTarget = mItem.targetCumulativeProgress;
        const remainingPlanGrowth = 100 - targetAtC;
        const progressProportion = remainingPlanGrowth > 0 
          ? (originalTarget - targetAtC) / remainingPlanGrowth
          : 0;

        const remainingActualNeeded = 100 - actualAtC;
        let calculatedRec = actualAtC + (progressProportion * remainingActualNeeded * alpha);
        recoveryVal = Math.min(100, Math.max(actualAtC, Math.round(calculatedRec)));
      }

      const isPastOrCurrent = mItem.month <= C;

      timelineData.push({
        label,
        targetCumulativeProgress: mItem.targetCumulativeProgress,
        actualCumulativeProgress: isPastOrCurrent ? mItem.actualCumulativeProgress : null,
        recoveryCumulativeProgress: recoveryVal,
        targetCashFlow: mItem.targetCashFlow,
        actualCashFlow: isPastOrCurrent ? mItem.actualCashFlow : null,
      });
    });
  }

  const hasActuals = timelineData.some(p => p.actualCumulativeProgress !== null);
  const hasRecovery = timelineData.some(p => p.recoveryCumulativeProgress !== null);

  // Spend calculations & running trackers
  let runningTargetCash = 0;
  let runningActualCash = 0;
  const cumulativeCashList = timelineData.map((pt) => {
    runningTargetCash += pt.targetCashFlow;
    const isPastOrCurrent = pt.actualCashFlow !== null;
    if (isPastOrCurrent) {
      runningActualCash += pt.actualCashFlow!;
    }
    return {
      cumTarget: runningTargetCash,
      cumActual: isPastOrCurrent ? runningActualCash : null,
    };
  });

  const totalTargetCash = timelineData.reduce((sum, item) => sum + item.targetCashFlow, 0);
  const maxCumulativeCash = totalTargetCash * 1.05;

  const maxMonthlyCash = Math.max(
    ...timelineData.map(item => Math.max(item.targetCashFlow, item.actualCashFlow ?? 0)),
    100
  ) * 1.15;

  const currentDateString = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className={`print-only-report w-full p-2 text-slate-900 ${orientation === 'landscape' ? 'w-[297mm]' : 'w-[210mm]'} mx-auto text-xs`}>
      {/* 1. COVER PAGE SECTION */}
      {config.includeCoverPage && (
        <div className="flex flex-col justify-between h-[270mm] border-4 border-slate-950/10 p-12 mb-12 break-after-page text-center relative">
          {/* Top Classification Header */}
          <div className="absolute top-8 left-0 right-0 text-center font-bold tracking-widest text-[10px] text-slate-600">
            {config.classification.toUpperCase()}
          </div>

          <div className="my-auto space-y-8 py-24">
            <div className={`mx-auto w-20 h-2 ${themeColors.accentBar} mb-8`} />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">
              {config.title}
            </h1>
            <p className="text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
              {config.subtitle}
            </p>
            <div className="text-[11px] font-mono font-black text-blue-600 tracking-wider">
              CAMPAIGN OPERATIONAL YEAR: {project.year}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-8 flex justify-between items-center text-left text-slate-500 text-[10px]">
            <div>
              <p className="font-bold text-slate-850 uppercase">Prepared By:</p>
              <p className="font-mono mt-0.5">{config.preparedBy}</p>
            </div>
            <div>
              <p className="font-bold text-slate-850 uppercase">Audit Date:</p>
              <p className="font-mono mt-0.5">{currentDateString}</p>
            </div>
            <div>
              <p className="font-bold text-slate-850 uppercase">Analysis Period:</p>
              <p className="font-mono mt-0.5">Month M1 to Month M{C}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. EXECUTIVE BRIEF & COMPREHENSIVE CONTROL METRICS */}
      {config.includeKPIs && (
        <div className="space-y-6 break-after-page">
          {/* Section Header */}
          <div className={`border-b-2 ${themeColors.border} pb-2.5 flex justify-between items-end`}>
            <div>
              <span className="text-[9px] font-bold text-slate-500 font-mono tracking-widest uppercase block">Section 1.0</span>
              <h2 className={`text-base font-extrabold uppercase tracking-tight ${themeColors.primaryText}`}>Executive Performance Dashboard</h2>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Campaign: {project.name} | Month: M{C}
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border border-slate-200 p-3.5 rounded-lg bg-white">
              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">Approved Budget (BAC)</span>
              <span className="text-xl font-extrabold tracking-tight">${totalBudget.toLocaleString()}k</span>
              <span className="block text-[9px] text-slate-400 mt-1 font-mono">Authorized Capital Limit</span>
            </div>
            <div className="border border-slate-200 p-3.5 rounded-lg bg-white">
              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">Actual Spend (AC)</span>
              <span className="text-xl font-extrabold tracking-tight text-slate-800">${totalSpent.toLocaleString()}k</span>
              <span className="block text-[9px] text-slate-400 mt-1 font-mono">{((totalSpent / totalBudget) * 100).toFixed(1)}% total capital burned</span>
            </div>
            <div className="border border-slate-200 p-3.5 rounded-lg bg-white">
              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">Earned Value (EV)</span>
              <span className="text-xl font-extrabold tracking-tight text-blue-800">${EV.toLocaleString()}k</span>
              <span className="block text-[9px] text-slate-400 mt-1 font-mono">{actualProgress.toFixed(1)}% physical progress worth</span>
            </div>
            <div className="border border-slate-200 p-3.5 rounded-lg bg-white">
              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">Forecasted EAC</span>
              <span className="text-xl font-extrabold tracking-tight text-amber-850">${EAC.toLocaleString()}k</span>
              <span className="block text-[9px] mt-1 font-mono font-bold text-amber-705">CV Variance: ${CV.toLocaleString()}k</span>
            </div>
          </div>

          {/* Core EVM Indices Controls Matrix */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50/55 p-4 rounded-xl border border-slate-200">
            <div className="text-center p-2 border-r border-slate-200 last:border-0">
              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Schedule Index (SPI)</span>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className={`text-lg font-black font-mono ${SPI >= 1 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {SPI.toFixed(2)}
                </span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase ${SPI >= 1 ? 'bg-emerald-100 text-emerald-805' : 'bg-rose-100 text-rose-800'}`}>
                  {SPI >= 1 ? 'ON SCHED' : 'BEHIND'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Target is {targetProgress}%, Actual is {actualProgress}%</p>
            </div>

            <div className="text-center p-2 border-r border-slate-200 last:border-0">
              <span className="block text-[9px] text-slate-550 font-bold uppercase tracking-wider font-mono">Cost Index (CPI)</span>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className={`text-lg font-black font-mono ${CPI >= 1 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {CPI.toFixed(2)}
                </span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase ${CPI >= 1 ? 'bg-emerald-105 text-emerald-805' : 'bg-rose-100 text-rose-800'}`}>
                  {CPI >= 1 ? 'SAVING' : 'OVERRUN'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Spent ${totalSpent.toLocaleString()}k, Earned ${EV.toLocaleString()}k</p>
            </div>

            <div className="text-center p-2 last:border-0 col-span-2 md:col-span-1">
              <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">Front-Loading Coefficient</span>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <span className={`text-lg font-black font-mono ${frontLoadingRatio <= 1.25 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {frontLoadingRatio.toFixed(2)}x
                </span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase ${frontLoadingRatio <= 1.25 ? 'bg-emerald-100 text-emerald-850' : 'bg-amber-100 text-amber-800'}`}>
                  {frontLoadingRatio <= 1.1 ? 'BALANCED' : frontLoadingRatio <= 1.3 ? 'MODERATE' : 'CRITICAL'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Ratio of drawdown budget relative to progress</p>
            </div>
          </div>

          {/* Variances detailed breakdown table */}
          <div>
            <h3 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest font-mono mb-2">Integrated Earned Value Performance Metrics Table</h3>
            <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden text-[10px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-650 font-mono">
                  <th className="p-2.5">Earned Value Acronym</th>
                  <th className="p-2.5">Formal KPI Description</th>
                  <th className="p-2.5 text-right">Target (Plan)</th>
                  <th className="p-2.5 text-right">Current Actual</th>
                  <th className="p-2.5 text-right">Absolute Variance</th>
                  <th className="p-2.5 text-right">Index Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2.5 font-bold font-mono text-slate-900">EV / BCWP</td>
                  <td className="p-2.5">Earned Value of Work Performed (Physical value of work complete)</td>
                  <td className="p-2.5 text-right text-slate-400">N/A</td>
                  <td className="p-2.5 text-right font-bold text-blue-800">${EV.toLocaleString()}k</td>
                  <td className="p-2.5 text-right font-bold text-slate-400">-</td>
                  <td className="p-2.5 text-right font-mono font-bold">-</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-slate-900">PV / BCWS</td>
                  <td className="p-2.5">Planned Value cost budget scheduled relative to milestone plan</td>
                  <td className="p-2.5 text-right font-semibold">${PV.toLocaleString()}k</td>
                  <td className="p-2.5 text-right text-slate-400">N/A</td>
                  <td className="p-2.5 text-right font-bold text-slate-400">-</td>
                  <td className="p-2.5 text-right font-mono font-bold">-</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-slate-900">AC / ACWP</td>
                  <td className="p-2.5">Actual Cost of Work Performed (Total expenditures logged)</td>
                  <td className="p-2.5 text-right text-slate-400">N/A</td>
                  <td className="p-2.5 text-right font-bold">${AC.toLocaleString()}k</td>
                  <td className="p-2.5 text-right font-bold text-slate-400">-</td>
                  <td className="p-2.5 text-right font-mono font-bold">-</td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-blue-900">SV (EV - PV)</td>
                  <td className="p-2.5">Schedule Variance representing physical schedule lag in cash equivalents</td>
                  <td className="p-2.5 text-right text-slate-400">N/A</td>
                  <td className="p-2.5 text-right text-slate-400">N/A</td>
                  <td className={`p-2.5 text-right font-bold font-mono ${SV >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    ${SV.toLocaleString()}k
                  </td>
                  <td className={`p-2.5 text-right font-bold font-mono ${SPI >= 1.0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    SPI: {SPI.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-blue-900">CV (EV - AC)</td>
                  <td className="p-2.5">Cost Variance representing cash spending over (or under) physical value</td>
                  <td className="p-2.5 text-right text-slate-400">N/A</td>
                  <td className="p-2.5 text-right text-slate-400">N/A</td>
                  <td className={`p-2.5 text-right font-bold font-mono ${CV >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    ${CV.toLocaleString()}k
                  </td>
                  <td className={`p-2.5 text-right font-bold font-mono ${CPI >= 1.0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    CPI: {CPI.toFixed(2)}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-bold font-mono text-slate-900">EAC / BAC</td>
                  <td className="p-2.5">Estimate At Completion (EAC) versus original authorized budget limit</td>
                  <td className="p-2.5 text-right font-semibold">${totalBudget.toLocaleString()}k</td>
                  <td className="p-2.5 text-right font-bold text-amber-900">${EAC.toLocaleString()}k</td>
                  <td className={`p-2.5 text-right font-bold font-mono ${VAC >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    VAC: ${VAC.toLocaleString()}k
                  </td>
                  <td className="p-2.5 text-right text-slate-400">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GRAPHIC CHRONOLOGICAL S-CURVE & CASH FLOW PLOT */}
      {config.includeCharts && (
        <div className="space-y-6 break-after-page">
          <div className={`border-b-2 ${themeColors.border} pb-2.5 flex justify-between items-end`}>
            <div>
              <span className="text-[9px] font-bold text-slate-500 font-mono tracking-widest uppercase block">Performance Graphics</span>
              <h2 className={`text-base font-extrabold uppercase tracking-tight ${themeColors.primaryText}`}>
                {config.chartsScope === 'campaign' ? 'Campaign Level S-Curve & Cash Flow Plot (2025-2028)' : `${project.year} S-Curve & Cash Flow Performance Curves`}
              </h2>
            </div>
            <div className="text-[10px] text-slate-500 font-mono text-right">
              EVM Progress Analytics Plot | Scope: {config.chartsScope === 'campaign' ? 'Multi-Year' : 'Selected Year'}
            </div>
          </div>

          <p className="text-slate-600 text-[10.5px] leading-relaxed">
            Graphic visualization showing authorized milestone timelines, cumulative earned progress, and actual capital discursion against targeted baselines.
          </p>

          <div className="space-y-6">
            {/* 1. PHYSICAL S-CURVE CHART */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
              <span className="block text-[9.5px] font-bold text-slate-800 uppercase tracking-wider font-sans">
                Baseline Planned vs Actual Physical S-Curve ({config.chartsScope === 'campaign' ? 'Campaign Progress %' : 'Yearly Progress %'})
              </span>
              
              <div className="w-full flex justify-center">
                <svg viewBox="0 0 800 240" className="w-full h-auto text-slate-705 bg-white">
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y = 30 + (100 - tick) * 160 / 100;
                    return (
                      <g key={`print-s-grid-${tick}`}>
                        <line x1="50" y1={y} x2="740" y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2 2" />
                        <text x="38" y={y + 3} textAnchor="end" className="text-[9px] font-mono fill-slate-500 font-bold">{tick}%</text>
                      </g>
                    );
                  })}

                  {/* X-axis tick lines & labels */}
                  {timelineData.map((pt, idx) => {
                    const isCamp = config.chartsScope === 'campaign';
                    const showLabel = !isCamp ? (idx % 2 === 0 || idx === 11) : (idx % 6 === 0 || idx === timelineData.length - 1);
                    const x = 50 + idx * 690 / (timelineData.length - 1);
                    return (
                      <g key={`print-s-x-${idx}`}>
                        <line x1={x} y1="30" x2={x} y2="190" stroke="#F1F5F9" strokeWidth="1" />
                        {showLabel && (
                          <text x={x} y="206" textAnchor="middle" className="text-[8.5px] font-bold fill-slate-600 font-mono">{pt.label}</text>
                        )}
                      </g>
                    );
                  })}

                  {/* Planned Target Path */}
                  <path
                    d={timelineData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${50 + i * 690 / (timelineData.length - 1)} ${30 + (100 - p.targetCumulativeProgress) * 160 / 100}`).join(' ')}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Actual Progress Path */}
                  {hasActuals && (
                    <path
                      d={timelineData.filter(p => p.actualCumulativeProgress !== null).map((p, i) => `${i === 0 ? 'M' : 'L'} ${50 + i * 690 / (timelineData.length - 1)} ${30 + (100 - p.actualCumulativeProgress!) * 160 / 100}`).join(' ')}
                      fill="none"
                      stroke="#F97316"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Recovery Projection Path */}
                  {hasRecovery && (
                    <path
                      d={timelineData.filter(p => p.recoveryCumulativeProgress !== null).map((p, i) => {
                        const originalIdx = timelineData.findIndex(item => item.label === p.label);
                        return `${i === 0 ? 'M' : 'L'} ${50 + originalIdx * 690 / (timelineData.length - 1)} ${30 + (100 - p.recoveryCumulativeProgress!) * 160 / 100}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.5"
                      strokeDasharray="4 2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* S-Curve Interactive/Data labels overlay */}
                  {config.showDataLabels && (
                    <g id="print-s-curve-data-labels">
                      {timelineData.map((pt, idx) => {
                        const isCamp = config.chartsScope === 'campaign';
                        // To keep it clean and prevent overlap, we display all months in single-year, or every 3rd month on Campaign level.
                        const isLabeledStep = !isCamp ? true : (idx % 3 === 0 || idx === timelineData.length - 1);
                        if (!isLabeledStep) return null;

                        const x = 50 + idx * 690 / (timelineData.length - 1);
                        const yTarget = 30 + (100 - pt.targetCumulativeProgress) * 160 / 100;
                        const yActual = pt.actualCumulativeProgress !== null 
                          ? 30 + (100 - pt.actualCumulativeProgress) * 160 / 100 
                          : null;
                        const yRecovery = pt.recoveryCumulativeProgress !== null 
                          ? 30 + (100 - pt.recoveryCumulativeProgress) * 160 / 100 
                          : null;

                        return (
                          <g key={`print-data-lbl-${idx}`}>
                            {/* 1. Planned Target Node & Text */}
                            <circle cx={x} cy={yTarget} r={isCamp ? "2.5" : "3.5"} fill="#2563EB" stroke="#FFFFFF" strokeWidth="1" />
                            <text
                              x={x}
                              y={yTarget - 7}
                              textAnchor="middle"
                              className="text-[8px] font-mono fill-blue-800 font-extrabold"
                              style={{ paintOrder: 'stroke', stroke: '#FFFFFF', strokeWidth: 2, strokeLinejoin: 'round' }}
                            >
                              {pt.targetCumulativeProgress}%
                            </text>

                            {/* 2. Earned Actual Node & Text */}
                            {yActual !== null && (
                              <g>
                                <circle cx={x} cy={yActual} r={isCamp ? "3" : "4.5"} fill="#F97316" stroke="#FFFFFF" strokeWidth="1.2" />
                                <text
                                  x={x}
                                  y={yActual + 12}
                                  textAnchor="middle"
                                  className="text-[8.5px] font-mono fill-orange-700 font-black"
                                  style={{ paintOrder: 'stroke', stroke: '#FFFFFF', strokeWidth: 2.5, strokeLinejoin: 'round' }}
                                >
                                  {pt.actualCumulativeProgress}%
                                </text>
                              </g>
                            )}

                            {/* 3. Recovery Path Node & Text */}
                            {yRecovery !== null && pt.recoveryCumulativeProgress !== pt.actualCumulativeProgress && (
                              <g>
                                <circle cx={x} cy={yRecovery} r={isCamp ? "2.5" : "3.5"} fill="#10B981" stroke="#FFFFFF" strokeWidth="1" />
                                <text
                                  x={x}
                                  y={yRecovery - 7}
                                  textAnchor="middle"
                                  className="text-[8px] font-mono fill-emerald-800 font-extrabold"
                                  style={{ paintOrder: 'stroke', stroke: '#FFFFFF', strokeWidth: 2, strokeLinejoin: 'round' }}
                                >
                                  {pt.recoveryCumulativeProgress}%
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* S-Curve Labels / Legend HUD Inside SVG */}
                  <rect x="55" y="35" width="410" height="22" fill="#F8FAFC" rx="4" stroke="#E2E8F0" strokeWidth="1" />
                  <g transform="translate(65, 41)">
                    <circle cx="5" cy="5" r="4" fill="#2563EB" />
                    <text x="14" y="8" className="text-[8.5px] font-sans fill-slate-705 font-bold">Planned Target Baseline S-Curve</text>
                    
                    <circle cx="170" cy="5" r="4" fill="#F97316" />
                    <text x="179" y="8" className="text-[8.5px] font-sans fill-slate-705 font-bold">Earned Actual Progress</text>

                    <circle cx="300" cy="5" r="4" fill="#10B981" />
                    <text x="309" y="8" className="text-[8.5px] font-sans fill-slate-705 font-bold">Catch-up Recovery Path</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* 2. DUAL-AXIS FINANCIAL DRAWDOWN CHART */}
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
              <span className="block text-[9.5px] font-bold text-slate-800 uppercase tracking-wider font-sans">
                Time-Phased Spend Drawdowns (Monthly Actual Spend vs Cumulative Budget Curve)
              </span>

              <div className="w-full flex justify-center">
                <svg viewBox="0 0 800 240" className="w-full h-auto text-slate-705 bg-white">
                  {/* Left Axis: Monthly Cash ticks and grid */}
                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y = 30 + (100 - tick) * 160 / 100;
                    const cashVal = Math.round(tick * maxMonthlyCash / 100);
                    const cumVal = Math.round(tick * maxCumulativeCash / 100);
                    return (
                      <g key={`print-cash-grid-${tick}`}>
                        <line x1="55" y1={y} x2="735" y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="1 3" />
                        {/* Monthly label (Left Axis) */}
                        <text x="43" y={y + 3} textAnchor="end" className="text-[8px] font-mono fill-blue-800 font-semibold">${cashVal.toLocaleString()}k</text>
                        {/* Cumulative label (Right Axis) */}
                        <text x="747" y={y + 3} textAnchor="start" className="text-[8px] font-mono fill-indigo-600 font-semibold">${cumVal.toLocaleString()}k</text>
                      </g>
                    );
                  })}

                  {/* Draw Monthly drawdowns as bars */}
                  {timelineData.map((pt, idx) => {
                    const xCenter = 55 + idx * 680 / (timelineData.length - 1);
                    const isCamp = config.chartsScope === 'campaign';
                    const barWidth = isCamp ? 3 : 7;
                    
                    // Monthly Plan Bar
                    const planHeight = pt.targetCashFlow * 160 / maxMonthlyCash;
                    const planY = 30 + 160 - planHeight;
                    // Monthly Actual Bar
                    const actHeight = pt.actualCashFlow !== null ? pt.actualCashFlow * 160 / maxMonthlyCash : 0;
                    const actY = 30 + 160 - actHeight;

                    const showLabel = !isCamp ? (idx % 2 === 0 || idx === 11) : (idx % 6 === 0 || idx === timelineData.length - 1);

                    return (
                      <g key={`print-bar-${idx}`}>
                        {/* Target Monthly Bar */}
                        <rect
                          x={xCenter - barWidth - 1}
                          y={planY}
                          width={barWidth}
                          height={planHeight}
                          fill="#DBEAFE"
                          stroke="#3B82F6"
                          strokeWidth="0.5"
                          rx="0.5"
                        />

                        {/* Actual Monthly Bar */}
                        {pt.actualCashFlow !== null && (
                          <rect
                            x={xCenter + 1}
                            y={actY}
                            width={barWidth}
                            height={actHeight}
                            fill="#FFEDD5"
                            stroke="#F97316"
                            strokeWidth="0.5"
                            rx="0.5"
                          />
                        )}

                        {/* Axis X Month Marker Label */}
                        {showLabel && (
                          <text x={xCenter} y="206" textAnchor="middle" className="text-[8.5px] font-bold fill-slate-600 font-mono">{pt.label}</text>
                        )}
                      </g>
                    );
                  })}

                  {/* Cumulative Planned Cost Line (Overlay Indigo) */}
                  <path
                    d={timelineData.map((p, i) => `${i === 0 ? 'M' : 'L'} ${55 + i * 680 / (timelineData.length - 1)} ${30 + (maxCumulativeCash - cumulativeCashList[i].cumTarget) * 160 / maxCumulativeCash}`).join(' ')}
                    fill="none"
                    stroke="#4F46E5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Cumulative Actual Cost Line (Overlay Rose Red) */}
                  {timelineData.filter(p => p.actualCashFlow !== null).length > 0 && (
                    <path
                      d={timelineData.filter(p => p.actualCashFlow !== null).map((p, i) => `${i === 0 ? 'M' : 'L'} ${55 + i * 680 / (timelineData.length - 1)} ${30 + (maxCumulativeCash - cumulativeCashList[i].cumActual!) * 160 / maxCumulativeCash}`).join(' ')}
                      fill="none"
                      stroke="#E11D48"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Legend Inside Double-Axis Cash Flow Chart */}
                  <rect x="60" y="35" width="480" height="22" fill="#F8FAFC" rx="4" stroke="#E2E8F0" strokeWidth="1" />
                  <g transform="translate(70, 41)">
                    <rect x="0" y="1" width="10" height="7" fill="#DBEAFE" stroke="#3B82F6" strokeWidth="0.5" rx="0.5" />
                    <text x="14" y="8" className="text-[8.5px] font-sans fill-slate-705 font-bold">Planned Monthly Drawdown</text>

                    <rect x="150" y="1" width="10" height="7" fill="#FFEDD5" stroke="#F97316" strokeWidth="0.5" rx="0.5" />
                    <text x="164" y="8" className="text-[8.5px] font-sans fill-slate-705 font-bold">Actual Monthly Drawdown</text>

                    <circle cx="295" cy="5" r="3.5" fill="#4F46E5" />
                    <text x="303" y="8" className="text-[8.5px] font-sans fill-slate-705 font-bold">Cumulative Planned Baseline</text>

                    <circle cx="430" cy="5" r="3.5" fill="#E11D48" />
                    <text x="438" y="8" className="text-[8.5px] font-sans fill-slate-705 font-bold">Cumulative Actual Cost</text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CHRONOLOGICAL S-CURVE PROGRESS ANALYSIS TABLE */}
      {config.includeLedger && (
        <div className="space-y-6 break-after-page">
          <div className={`border-b-2 ${themeColors.border} pb-2.5 flex justify-between items-end`}>
            <div>
              <span className="text-[9px] font-bold text-slate-500 font-mono tracking-widest uppercase block">Section 2.0</span>
              <h2 className={`text-base font-extrabold uppercase tracking-tight ${themeColors.primaryText}`}>12-Month Chronological S-Curve Table</h2>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Chronological Performance Plan vs. Actual Progress & Cash Flow Drawing
            </div>
          </div>

          <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden text-[9px] font-mono leading-tight">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600">
                <th className="p-2 font-bold font-sans">Mo.</th>
                <th className="p-2 font-bold font-sans">Reporting Date</th>
                <th className="p-2 text-right">Planned Monthly Progress (%)</th>
                <th className="p-2 text-right">Planned Cum S-Curve (%)</th>
                <th className="p-2 text-right">Actual Monthly Progress (%)</th>
                <th className="p-2 text-right">Actual Cum Progress (%)</th>
                <th className="p-2 text-right">Planned Cash Drawdown ($k)</th>
                <th className="p-2 text-right">Actual Cash Drawdown ($k)</th>
                <th className="p-2 text-right font-sans">Analysis Variance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {project.monthlyData.map((m, idx) => {
                const label = `${MONTH_NAMES[m.month - 1].substring(0, 3)}-${String(project.year).substring(2)}`;
                
                // Planned Monthly Progress
                const prevTarget = idx === 0 ? 0 : project.monthlyData[idx - 1].targetCumulativeProgress;
                const monthlyTargetProgress = m.targetCumulativeProgress - prevTarget;

                // Actual Progress
                const actualCumProgress = m.actualCumulativeProgress;
                let monthlyActProgress: number | null = null;
                if (m.month <= C && m.actualCumulativeProgress !== null) {
                  const prevActual = idx === 0 ? 0 : (project.monthlyData[idx - 1].actualCumulativeProgress ?? 0);
                  monthlyActProgress = m.actualCumulativeProgress - prevActual;
                }

                const actualDrawdown = m.actualCashFlow;
                const isPast = m.month <= C;

                // Variance calculation for the cell
                let progressVarText = "-";
                let isVarianceNegative = false;
                if (isPast && m.actualCumulativeProgress !== null) {
                  const variance = m.actualCumulativeProgress - m.targetCumulativeProgress;
                  progressVarText = `${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`;
                  isVarianceNegative = variance < -1.5;
                }

                return (
                  <tr key={m.month} className={`${isPast ? 'bg-blue-50/10' : 'bg-white opacity-80'}`}>
                    <td className="p-2 font-sans font-bold">M{m.month}</td>
                    <td className="p-2 font-sans text-slate-500">{label}</td>
                    <td className="p-2 text-right">{monthlyTargetProgress.toFixed(1)}%</td>
                    <td className="p-2 text-right font-bold text-slate-600">{m.targetCumulativeProgress.toFixed(1)}%</td>
                    <td className="p-2 text-right">{isPast && monthlyActProgress !== null ? `${monthlyActProgress.toFixed(1)}%` : 'N/A'}</td>
                    <td className="p-2 text-right font-bold text-blue-900">{isPast && actualCumProgress !== null ? `${actualCumProgress.toFixed(1)}%` : 'N/A'}</td>
                    <td className="p-2 text-right">${m.targetCashFlow.toLocaleString()}k</td>
                    <td className="p-2 text-right font-bold">{isPast && actualDrawdown !== null ? `$${actualDrawdown.toLocaleString()}k` : 'N/A'}</td>
                    <td className="p-2 text-right font-sans">
                      {isPast ? (
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[8px] font-mono ${isVarianceNegative ? 'bg-rose-100 text-rose-800' : progressVarText !== '-' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                          {progressVarText !== '-' ? `S-Curve Variance: ${progressVarText}` : 'N/A'}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Projected</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[9.5px] leading-relaxed">
            <strong>Chronological S-Curve Sizing Data Memo:</strong> The ledger illustrates plans for Month 1 (M1) up to Month 12 (M12). Planned budgets drawing totals and cumulative progress follow the S-shape logistic pattern. The actual curves track through the cutoff validation reporting boundary in Month M{C}. Future metrics represent baseline expectations or potential accelerated recovery targets.
          </div>
        </div>
      )}

      {/* 4. WORK BREAKDOWN STRUCTURE SUMMARY WBS HEALTH TABLE */}
      {config.includeWBS && (
        <div className="space-y-6 break-after-page">
          <div className={`border-b-2 ${themeColors.border} pb-2.5 flex justify-between items-end`}>
            <div>
              <span className="text-[9px] font-bold text-slate-500 font-mono tracking-widest uppercase block">Section 3.0</span>
              <h2 className={`text-base font-extrabold uppercase tracking-tight ${themeColors.primaryText}`}>Work Breakdown Structure (WBS) Cost Centers Ledger</h2>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              Individual WBS Package Budgets & Performance Metrics
            </div>
          </div>

          <table className="w-full text-left border border-slate-200 rounded-lg overflow-hidden text-[10px]">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-650 font-mono">
                <th className="p-2.5">WBS Index</th>
                <th className="p-2.5">Cost Center Operation Name</th>
                <th className="p-2.5 text-right">Approved BAC ($k)</th>
                <th className="p-2.5 text-right">Spent AC ($k)</th>
                <th className="p-2.5 text-right">Physical Earned (%)</th>
                <th className="p-2.5 text-right">Earned Value EV ($k)</th>
                <th className="p-2.5 text-right">Cost Variance CV ($k)</th>
                <th className="p-2.5 text-right">Status / Indicator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {project.wbsList.map((item, index) => {
                const itemEV = Math.round(item.budget * (item.progress / 100));
                const itemCV = itemEV - item.spent;
                const isOverBudget = item.spent > item.budget;
                const isUnderperforming = item.spent > 0 && item.progress === 0;

                let statusBadge = "text-emerald-800 bg-emerald-50 border-emerald-100";
                let statusLabel = "Within Budget";

                if (isOverBudget) {
                  statusBadge = "text-rose-800 bg-rose-50 border-rose-250";
                  statusLabel = "Budget Overrun";
                } else if (isUnderperforming) {
                  statusBadge = "text-amber-805 bg-amber-50 border-amber-200";
                  statusLabel = "Milestone Lag";
                } else if (item.progress >= 99 && item.spent <= item.budget) {
                  statusBadge = "text-blue-800 bg-blue-50 border-blue-105";
                  statusLabel = "Verified Done";
                }

                return (
                  <tr key={item.id}>
                    <td className="p-2.5 font-bold font-mono">WBS-{String(index + 1).padStart(2, '0')}</td>
                    <td className="p-2.5 font-medium">{item.name}</td>
                    <td className="p-2.5 text-right font-mono">${item.budget.toLocaleString()}k</td>
                    <td className="p-2.5 text-right font-mono">${item.spent.toLocaleString()}k</td>
                    <td className="p-2.5 text-right font-mono font-bold">{item.progress.toFixed(1)}%</td>
                    <td className="p-2.5 text-right font-mono">${itemEV.toLocaleString()}k</td>
                    <td className={`p-2.5 text-right font-mono font-bold ${itemCV >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      ${itemCV.toLocaleString()}k
                    </td>
                    <td className="p-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded border text-[8.5px] font-bold ${statusBadge}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Anomalies alert summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 p-3 rounded bg-white">
              <span className="block text-[8.5px] font-bold text-rose-800 uppercase font-mono tracking-wider mb-1">Flagged Cost Breeches ({overruns.length})</span>
              {overruns.length > 0 ? (
                <ul className="list-disc pl-4 text-[9.5px] space-y-1 text-slate-650">
                  {overruns.map(o => (
                    <li key={o.id}>
                      <strong>{o.name}</strong> over budget by <span className="text-red-650 font-bold font-mono">${(o.spent - o.budget).toLocaleString()}k</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[9.5px] text-slate-500 italic">No cost centers exceed authorized BAC allocations.</p>
              )}
            </div>

            <div className="border border-slate-200 p-3 rounded bg-white">
              <span className="block text-[8.5px] font-bold text-amber-800 uppercase font-mono tracking-wider mb-1">Unearned Accrual Delays ({hiddenDelays.length})</span>
              {hiddenDelays.length > 0 ? (
                <ul className="list-disc pl-4 text-[9.5px] space-y-1 text-slate-650">
                  {hiddenDelays.map(h => (
                    <li key={h.id}>
                      <strong>{h.name}</strong> has spent <span className="font-mono font-bold">${h.spent.toLocaleString()}k</span> with zero progress.
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[9.5px] text-slate-505 italic">No zero-progress payment anomalies detected.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. AI ADVISORY RECOMMENDATIONS & OPTIMIZATION DIAGNOSTICS */}
      {config.includeAdvisory && (
        <div className="space-y-6 break-after-page">
          <div className={`border-b-2 ${themeColors.border} pb-2.5 flex justify-between items-end`}>
            <div>
              <span className="text-[9px] font-bold text-slate-500 font-mono tracking-widest uppercase block">Section 4.0</span>
              <h2 className={`text-base font-extrabold uppercase tracking-tight ${themeColors.primaryText}`}>EVM Recovery Recommendations</h2>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              DrillControl™ Intelligent Asset Recovery & Schedule Optimization Advisory
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-slate-700 leading-normal">
              Based on deep-wells computational regressions of the current year’s variables, we advise implementing the following procedural adjustments to protect capital and realign S-Curve progress.
            </p>

            <div className="space-y-3.5">
              <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50 flex gap-3">
                <div className={`w-1.5 h-12 rounded-full ${themeColors.accentBar} shrink-0`} />
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-blue-800 uppercase font-mono">REC-01: Corrective Equipment Allocation (Schedule Delay Recovery)</span>
                  <p className="text-slate-650 leading-relaxed text-[11px]">
                    Reallocate casing crews and desert logistics personnel immediately to trailing WBS sections showing zero physical progress despite spending (specifically <strong className="text-slate-800">{hiddenDelays.length > 0 ? hiddenDelays.map(h => h.name).join(', ') : '"Mobilize Drilling Rigs"'}</strong>). This redistributes capital drawdowns to activate earned value and restore S-curve slopes before M10.
                  </p>
                </div>
              </div>

              <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50 flex gap-3">
                <div className={`w-1.5 h-12 rounded-full ${themeColors.accentBar} shrink-0`} />
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-blue-800 uppercase font-mono">REC-02: Apply Recovery Coefficient (Timeline Acceleration)</span>
                  <p className="text-slate-650 leading-relaxed text-[11px]">
                    Utilize the active physical recovery rate multiplier of <strong className="text-slate-800 font-mono">{project.accelerationFactor.toFixed(1)}x</strong>. Optimize desert truck-move transitions between coordinates, automate downhole drillstring rotations safely, and sequence casing completions dynamically. This is forecasted to recover the late <strong className="text-rose-700">{(targetProgress - actualProgress).toFixed(1)}% Progress Gap</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50 flex gap-3">
                <div className={`w-1.5 h-12 rounded-full ${themeColors.accentBar} shrink-0`} />
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-blue-800 uppercase font-mono">REC-03: Capital Expenditure Containment & Milestone Gates (Drawdown Risk Management)</span>
                  <p className="text-slate-650 leading-relaxed text-[11px]">
                    Cap and restrain further cost disbursements on heavily front-loaded work elements with CPI index less than 0.9. Standardize rigorous, multi-level supervisor-verified physical milestone checks before processing contractor pay certificates. This reduces the active <strong className="text-slate-800 font-mono">{frontLoadingRatio.toFixed(2)}x Front-Loading risk score</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. SIGNATURE STAGE BAR BLOCK */}
      {config.includeSignOff && (
        <div className="space-y-6 pt-12">
          {config.includeAdvisory && <div className="border-t border-slate-200 my-8" />}
          
          <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg">
            <h4 className="text-[10px] font-bold text-slate-850 uppercase tracking-widest font-mono mb-4">Report Review & Acceptance Signature Block</h4>
            
            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="space-y-4">
                <div className="border-b border-slate-300 pb-2">
                  <span className="block text-[8px] text-slate-400 font-mono text-slate-500 font-bold">PREPARED BY / REVIEWING AUTHORITY</span>
                  <div className="h-6" /> {/* Spacer for physical signature */}
                </div>
                <div className="text-[9.5px]">
                  <p className="font-bold text-slate-900">Drilling Project Control</p>
                  <p className="text-slate-500">Drilling MLN Phase 5 Project</p>
                  <p className="text-[8.5px] text-slate-400 mt-1">Date: ________________________</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b border-slate-300 pb-2">
                  <span className="block text-[8px] text-slate-400 font-mono text-slate-500 font-bold">APPROVED BY / APPROVING AUTHORITY</span>
                  <div className="h-6" /> {/* Spacer for physical signature */}
                </div>
                <div className="text-[9.5px]">
                  <p className="font-bold text-slate-900">Drilling Manager</p>
                  <p className="text-slate-500">Drilling MLN Phase 5 Project</p>
                  <p className="text-[8.5px] text-slate-400 mt-1">Date: ________________________</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Metadata */}
          <div className="flex justify-between items-center text-[8px] text-slate-400 font-mono tracking-wider uppercase pt-6">
            <span>MLN-DrillControl™ System Diagnostic: {currentDateString}</span>
            <span>Page End | CONFIDENTIAL</span>
          </div>
        </div>
      )}
    </div>
  );
}
