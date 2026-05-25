/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ProjectYearData, WBSItem } from '../types';
import { Sparkles, Terminal, BookOpen, AlertTriangle, Play, HelpCircle, Send, CheckCircle2, RefreshCw, Copy, Check } from 'lucide-react';

interface AICopilotTerminalProps {
  project: ProjectYearData;
  allProjects: ProjectYearData[];
}

export default function AICopilotTerminal({ project, allProjects }: AICopilotTerminalProps) {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditStep, setAuditStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [qaPairs, setQaPairs] = useState<Array<{ q: string; a: string }>>([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [copied, setCopied] = useState(false);

  // Project control metrics
  const selectedYear = project.year;
  const C = project.reportingMonth;
  const alpha = project.accelerationFactor;

  const totalBudget = project.wbsList.reduce((sum, item) => sum + item.budget, 0);
  const totalSpent = project.wbsList.reduce((sum, item) => sum + item.spent, 0);

  // Earned Value = Sum of (WBS Item Progress * WBS Item Budget)
  const totalEarnedValue = project.wbsList.reduce((sum, item) => sum + (item.progress / 100) * item.budget, 0);

  // CPI = EV / AC
  const cpi = totalSpent > 0 ? totalEarnedValue / totalSpent : 1.0;

  // SPI = Actual S-Curve Progress / Planned S-Curve Progress at cutoff
  const plannedProgressAtCutoff = C > 0 ? (project.monthlyData[C - 1]?.targetCumulativeProgress ?? 0) : 0;
  const actualProgressAtCutoff = C > 0 ? (project.monthlyData[C - 1]?.actualCumulativeProgress ?? 0) : 0;
  const spi = plannedProgressAtCutoff > 0 ? actualProgressAtCutoff / plannedProgressAtCutoff : 1.0;

  // Find cost overruns
  const overruns = project.wbsList.filter(item => item.spent > item.budget);
  // Find hidden delays
  const hiddenDelays = project.wbsList.filter(item => item.spent > 0 && item.progress === 0);

  // Calculate Front-Loading Coefficient
  const budgetSpentPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const frontLoadingRatio = actualProgressAtCutoff > 0 ? budgetSpentPercent / actualProgressAtCutoff : 1.0;

  // Wellbore Confidence score
  const varianceScore = (spi + cpi) / 2;
  const confidencePercent = Math.max(0, Math.min(100, Math.round(varianceScore * 92 - (hiddenDelays.length * 15))));

  // Trigger auditing sequence simulation
  const handleStartAudit = () => {
    setIsAuditing(true);
    setShowResult(false);
    setAuditStep(1);

    const stepTimers = [
      setTimeout(() => setAuditStep(2), 550),
      setTimeout(() => setAuditStep(3), 1150),
      setTimeout(() => setAuditStep(4), 1750),
      setTimeout(() => {
        setIsAuditing(false);
        setShowResult(true);
      }, 2300)
    ];

    return () => stepTimers.forEach(clearTimeout);
  };

  // Pre-bake response generator
  const getSimulatedAIResponse = (question: string) => {
    const qLower = question.toLowerCase();
    
    if (qLower.includes('delay') || qLower.includes('late') || qLower.includes('behind')) {
      return `Based on our Schedule Performance Index (SPI) of **${spi.toFixed(2)}**, the project is currently tracking **${spi < 1 ? 'behind schedule' : 'ahead/on timeline'}**. Quantitative schedule variance (SV) shows a progress deviation of **${(actualProgressAtCutoff - plannedProgressAtCutoff).toFixed(1)}%** compared to the target plan at Month **M${C}**. The delay delta stems from ${hiddenDelays.length > 0 ? `zero physical progress milestones on key items like **${hiddenDelays[0].name}** despite accrued spend` : 'minor coordination lag across late activities'}. **Recovery Recommendations**: (1) Accelerate physical resource allocation by applying the active acceleration rate of **${alpha.toFixed(1)}x** to underperforming work breakdown packages. (2) Re-baseline remaining tasks to align chronological planned vs actual S-curve targets by **M10-${String(selectedYear).substring(2)}**. (3) Establish bi-weekly performance checkpoints on trailing activities.`;
    } else if (qLower.includes('overrun') || qLower.includes('cost') || qLower.includes('spent') || qLower.includes('money') || qLower.includes('budget')) {
      return `The aggregate spending ratio shows **$${totalSpent.toLocaleString()}k** disbursed against an approved **$${totalBudget.toLocaleString()}k** authorized baseline (${budgetSpentPercent.toFixed(1)}% of total budget burned). The resulting project-wide Cost Performance Index (CPI) stands at **${cpi.toFixed(2)}**, indicating **${cpi < 1 ? 'cost overruns' : 'positive budget savings'}** with a net Cost Variance (CV) of **$${Math.round(totalEarnedValue - totalSpent).toLocaleString()}k**. ${overruns.length > 0 ? `We have flagged budget breaches in **${overruns.map(o => o.name).join(', ')}** (e.g., **${overruns[0].name}** is overspent by **$${(overruns[0].spent - overruns[0].budget).toLocaleString()}k**).` : ''} The critical Front-Loading Ratio of **${frontLoadingRatio.toFixed(2)}x** indicates funding draws are pacing ahead of verified physical achievements. **Recovery Recommendations**: (1) Freeze further drawdowns for overspent cost centers. (2) Tighten milestone-gated payment approval criteria to protect capital. (3) Restructure contract deliverables to lock in fixed-cost guarantees.`;
    } else if (qLower.includes('variance') || qLower.includes('indicator') || qLower.includes('spi') || qLower.includes('cpi') || qLower.includes('evm')) {
      return `The integrated EVM control indicators identify an SPI of **${spi.toFixed(2)}** and CPI of **${cpi.toFixed(2)}**. These metrics indicate a **${spi < 1 ? 'schedule-delayed' : 'schedule-stable'}** and **${cpi < 1 ? 'cost-deficient' : 'cost-disciplined'}** performance matrix. The Front-Loading Ratio of **${frontLoadingRatio.toFixed(2)}x** warns of capital consumption pacing ahead of physical work package completion. **Recovery Recommendations**: (1) Shift active labor coordinates from highly funded but low-progress tasks to high-weight underperforming tasks. (2) Standardize monthly S-curve slope checks to catch cash-burn deviations early. (3) Utilize the progressive **${alpha.toFixed(1)}x** acceleration coefficient to protect overall project internal rate of return (IRR).`;
    } else {
      return `Diagnostic audit completed for your custom query concerning "${question}". Our MLN Controls Engine has cross-referenced your input with the 12-month spreadsheet ledger.\n\n**Current Year KPI Overlay**: Approved Budget: **$${totalBudget.toLocaleString()}k** | Current SPI: **${spi.toFixed(2)}** | Earned CPI: **${cpi.toFixed(2)}** | Controls Health Score: **${confidencePercent}%**.\n\nTo maximize efficiency, we recommend maintaining physical milestones ahead of cash outlays and auditing field contractor work progress weekly.`;
    }
  };

  const handleAskQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;

    setIsAnswering(true);
    const userQ = customQuestion;
    setCustomQuestion('');

    setTimeout(() => {
      const gResult = getSimulatedAIResponse(userQ);
      setQaPairs(prev => [...prev, { q: userQ, a: gResult }]);
      setIsAnswering(false);
      
      const debugBox = document.getElementById('ai-qa-ledger');
      if (debugBox) {
        setTimeout(() => {
          debugBox.scrollTop = debugBox.scrollHeight;
        }, 100);
      }
    }, 850);
  };

  // Function to copy report contents
  const handleCopyReport = () => {
    const reportText = `DRILLCONTROL™ PROJECT CONTROLS PERFORMANCE ANALYTICAL REPORT (${selectedYear})
============================================================
Project Campaign: ${project.name}
Reporting Index: Month M${C}
Performance Confidence Score: ${confidencePercent}%
Schedule Performance Index (SPI): ${spi.toFixed(2)} (${spi >= 1.0 ? 'Schedule Compliant/Ahead' : 'Schedule Critical Delay'})
Cost Performance Index (CPI): ${cpi.toFixed(2)} (${cpi >= 1.0 ? 'Cost Efficient' : 'Cost Overrun Risk'})
Front-Loading Coefficient: ${frontLoadingRatio.toFixed(2)}x

FINANCIAL & PERFORMANCE HEALTH METRICS:
- Approved Baseline Capital (BAC): $${totalBudget.toLocaleString()}k
- Actual Cost of Work Performed (ACWP): $${totalSpent.toLocaleString()}k (${budgetSpentPercent.toFixed(1)}% budget consumed)
- Earned Value of Work Performed (BCWP): $${Math.round(totalEarnedValue).toLocaleString()}k
- Schedule Variance (SV): ${(actualProgressAtCutoff - plannedProgressAtCutoff).toFixed(1)}% S-curve progress deviation
- Cost Variance (CV): $${Math.round(totalEarnedValue - totalSpent).toLocaleString()}k
${overruns.length > 0 ? `- OVERRUN OUTLIERS: ${overruns.length} cost centers flagged (${overruns.map(o => o.name).join(', ')})` : '- EXPENDITURE STATUS: All individual accounts remain within approved budget ceilings.'}
${hiddenDelays.length > 0 ? `- UNDERPERFORMING WBS ACCRUALS: ${hiddenDelays.length} accounts have recorded cash expenditures but 0% physical progress (${hiddenDelays.map(h => h.name).join(', ')})` : '- WORK ACCRUAL STATUS: No zero-progress transaction anomalies detected.'}

AI PROJECT CONTROLS RECOVERY & ACCELERATION RECOMMENDATIONS:
1. Reallocate physical equipment and personnel to underperforming high-weight WBS work packages with zero-earned progress, particularly "${hiddenDelays.length > 0 ? hiddenDelays[0].name : 'pending WBS areas'}", to restore schedule velocity.
2. Apply the active physical acceleration rate of ${alpha.toFixed(1)}x to re-engineering chronological target dates and recover the S-curve trajectory by M10.
3. Structure tighter milestone-gated funding approvals to address and correct the active high ${frontLoadingRatio.toFixed(2)}x Front-Loading multiplier.

Generated via DrillControl™ AI Systems on ${new Date().toISOString().split('T')[0]}`;

    // Robust copying support
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(reportText)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(() => {
          fallbackCopyText(reportText);
        });
    } else {
      fallbackCopyText(reportText);
    }
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Fallback copy failed", err);
    }
  };

  return (
    <div id="ai-controls-advisory-panel" className="bg-slate-950 border border-slate-800 rounded-2xl shadow-xl overflow-hidden font-sans">
      
      {/* Dynamic Header Block with neat Status Indicator */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shadow-inner">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
              DrillControl™ MLN Project Controls AI Advisory Copilot
            </h3>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">
              EVM and S-Curve performance diagnostic module for real-time tracking, forecasting, and recovery.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-mono font-bold leading-none uppercase text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20 self-start sm:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          AI Core Online
        </span>
      </div>

      {/* Spacious Sequential Stack Layout — Replaces the tight, crowded side-by-side split grid on desktop */}
      <div className="p-5 space-y-5">
        
        {/* SECTION 1: Diagnostic Metrics row */}
        <div className="p-4 bg-slate-900 border border-slate-850 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
              Live Algorithmic Performance Coefficients
            </h4>
            <span className="text-[9px] font-mono text-slate-500">Menzel Ledjmet Nord Baseline</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* SPI Indicator Card */}
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center flex flex-col justify-center">
              <span className="text-[9px] text-slate-500 uppercase font-bold font-mono tracking-wider">Schedule Velocity (SPI)</span>
              <span className={`text-xl font-mono font-black mt-1 ${spi >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {spi.toFixed(2)}
              </span>
              <span className="text-[8px] text-slate-400 font-medium mt-0.5">
                {spi >= 1.0 ? '✓ Progressive Pace' : '⚠ Delay Deviation'}
              </span>
            </div>

            {/* CPI Indicator Card */}
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-center flex flex-col justify-center">
              <span className="text-[9px] text-slate-500 uppercase font-bold font-mono tracking-wider">Cost Efficiency (CPI)</span>
              <span className={`text-xl font-mono font-black mt-1 ${cpi >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {cpi.toFixed(2)}
              </span>
              <span className="text-[8px] text-slate-400 font-medium mt-0.5">
                {cpi >= 1.0 ? '✓ Cost Optimized' : '⚠ Capital Leakage'}
              </span>
            </div>

            {/* Controls Health Score Slider Card */}
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-left flex flex-col justify-center">
              <div className="flex justify-between text-[9px] text-slate-500 uppercase font-bold font-mono tracking-wider">
                <span>Controls Health Score</span>
                <span className="text-blue-400 font-extrabold">{confidencePercent}%</span>
              </div>
              <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    confidencePercent >= 80 ? 'bg-emerald-500' : confidencePercent >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <span className="text-[8px] text-slate-400 font-medium mt-1 font-sans text-center">
                Refined by actuals & hidden delays
              </span>
            </div>
          </div>

          {/* Inline Advisory Flags Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/60 text-[10.5px]">
            <div className="flex items-center justify-between px-2 py-1 bg-slate-950/40 rounded border border-slate-800/40">
              <span className="text-slate-500">Front-Loading Index:</span>
              <span className={`font-mono font-bold ${frontLoadingRatio > 1.3 ? 'text-amber-400' : 'text-slate-300'}`}>
                {frontLoadingRatio.toFixed(2)}x
              </span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 bg-slate-950/40 rounded border border-slate-800/40">
              <span className="text-slate-500">Overrun Cost Centers:</span>
              <span className={`font-mono font-bold ${overruns.length > 0 ? 'text-rose-400 font-black' : 'text-slate-300'}`}>
                {overruns.length} units
              </span>
            </div>
            <div className="flex items-center justify-between px-2 py-1 bg-slate-950/40 rounded border border-slate-800/40">
              <span className="text-slate-500">Unearned Progress (Capital lockup):</span>
              <span className={`font-mono font-bold ${hiddenDelays.length > 0 ? 'text-amber-400 font-black' : 'text-slate-300'}`}>
                {hiddenDelays.length} centers
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Main Executive AI Report Area */}
        <div className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[190px]">
          
          {/* Header of Report Box with Copy Controls */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800/80">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              Controls Audit Report Output
            </span>

            {showResult && !isAuditing && (
              <button
                onClick={handleCopyReport}
                className={`py-1 px-3 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  copied 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 hover:text-white'
                }`}
                title="Copy full executive statement to your clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Report Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-400" />
                    <span>Copy Full AI Report</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="p-4 flex-1 text-slate-300 text-xs leading-relaxed">
            {!showResult && !isAuditing && (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-3.5">
                <div className="p-3 rounded-full bg-slate-950 border border-slate-850 text-slate-500">
                  <BookOpen className="w-6 h-6 text-slate-500/80" />
                </div>
                <div className="max-w-md">
                  <h5 className="font-bold text-slate-200">Advisory Engine Idle</h5>
                  <p className="text-[11px] text-slate-500 mt-1 mb-4 leading-normal">
                    Execute the controls audit to analyze earned value indicators, schedule/cost variances, S-curve regressions, and project health indicators.
                  </p>
                  <button
                    onClick={handleStartAudit}
                    className="mx-auto py-2 px-5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300" />
                    <span>Execute AI Performance & EVM Analysis</span>
                  </button>
                </div>
              </div>
            )}

            {isAuditing && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3.5">
                <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
                <div className="font-mono text-[10px] text-slate-500 space-y-1 max-w-sm">
                  <p className="text-blue-400 font-bold">[LOG] COMPILING EARNED VALUE (EVM) AND LEDGER INTEGRATIONS...</p>
                  {auditStep >= 1 && <p className="animate-fade-in text-slate-400">▶ Loaded monthly S-curve performance targets for Year {selectedYear}</p>}
                  {auditStep >= 2 && <p className="animate-fade-in text-slate-400">▶ Calculated cumulative planned vs actual variances and ratios</p>}
                  {auditStep >= 3 && <p className="animate-fade-in text-amber-400">▶ Identified work breakdown components with spent-to-progress gaps</p>}
                </div>
              </div>
            )}

            {showResult && !isAuditing && (
              <div className="space-y-4 animate-fade-in text-xs max-h-[350px] overflow-y-auto pr-1 select-text">
                <p className="text-slate-300">
                  Analytical assessment concluded for project <strong className="text-blue-400 font-black">{project.name}</strong>. At Month <span className="font-mono text-slate-200">M{C}</span>, the project shows <span className={`font-semibold ${spi < 1 ? ' text-rose-300' : ' text-emerald-300'}`}>
                    {spi < 1 ? 'cumulative schedule delay' : 'steady progress alignment'}
                  </span> with an Schedule Performance Index (SPI) of <span className="font-mono font-bold text-slate-200">{spi.toFixed(2)}</span> and a Cost Performance Index (CPI) of <span className="font-mono font-bold text-slate-200">{cpi.toFixed(2)}</span>.
                </p>

                <div className="overflow-x-auto border border-slate-800 rounded-lg">
                  <table className="w-full text-left border-collapse text-[10.5px] font-mono">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <th className="p-2">EVM Performance Indicator</th>
                        <th className="p-2 text-right">Value</th>
                        <th className="p-2 text-right">Variance / Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 bg-slate-900/40">
                      <tr>
                        <td className="p-2 text-slate-300">Baseline Capital Budget (BAC)</td>
                        <td className="p-2 text-right font-bold text-slate-200">${totalBudget.toLocaleString()}k</td>
                        <td className="p-2 text-right text-slate-500">Authorized</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-slate-300">Earned Value (EV / BCWP)</td>
                        <td className="p-2 text-right font-bold text-slate-200">${Math.round(totalEarnedValue).toLocaleString()}k</td>
                        <td className="p-2 text-right text-slate-400">Physical Worth</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-slate-300">Actual Spent Cost (AC / ACWP)</td>
                        <td className="p-2 text-right font-bold text-slate-200">${totalSpent.toLocaleString()}k</td>
                        <td className="p-2 text-right text-slate-400">({budgetSpentPercent.toFixed(1)}% burned)</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-slate-300">Cost Variance (CV = EV - AC)</td>
                        <td className={`p-2 text-right font-extrabold ${(totalEarnedValue - totalSpent) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ${Math.round(totalEarnedValue - totalSpent).toLocaleString()}k
                        </td>
                        <td className={`p-2 text-right text-[9px] font-bold ${(totalEarnedValue - totalSpent) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {((totalEarnedValue - totalSpent) >= 0) ? 'SURPLUS' : 'DEFICIT OVERRUN'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 text-slate-300">Schedule Progress Variance (SV)</td>
                        <td className={`p-2 text-right font-extrabold ${(actualProgressAtCutoff - plannedProgressAtCutoff) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {(actualProgressAtCutoff - plannedProgressAtCutoff).toFixed(1)}%
                        </td>
                        <td className={`p-2 text-right text-[9px] font-bold ${(actualProgressAtCutoff - plannedProgressAtCutoff) >= 0 ? 'text-emerald-500' : 'text-rose-455'}`}>
                          {((actualProgressAtCutoff - plannedProgressAtCutoff) >= 0) ? 'AHEAD' : 'BEHIND STATUS'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="space-y-1.5 text-slate-400">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono">Flagged Work Package Anomalies</span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    {overruns.length > 0 ? (
                      <li className="text-rose-300">
                        <strong>Budget Breach</strong>: Cost center <span className="text-rose-200 underline decoration-dotted">{overruns[0].name}</span> is overspent by <span className="font-mono text-rose-250 font-black">${(overruns[0].spent - overruns[0].budget).toLocaleString()}k</span>.
                      </li>
                    ) : (
                      <li className="text-emerald-400/90 font-medium">No active individual work-package budget breaches recorded.</li>
                    )}
                    {hiddenDelays.length > 0 ? (
                      <li className="text-amber-300/90">
                        <strong>Milestone Stagnation</strong>: Spent cash detected on <span className="text-amber-200 font-bold">{hiddenDelays[0].name}</span> while verified physical progress is <span className="font-mono">0%</span>.
                      </li>
                    ) : (
                      <li className="text-emerald-400/90 font-medium">No zero-progress payment anomalies flagged.</li>
                    )}
                  </ul>
                </div>

                <div className="p-3.5 bg-slate-950 text-[10.5px] rounded-lg border border-slate-850 space-y-2 leading-relaxed">
                  <span className="font-bold text-blue-400 uppercase text-[9px] tracking-widest font-mono block">AI RECOMMENDED RECOVERY ACTIONS</span>
                  <ul className="space-y-2 list-none text-slate-350">
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-500 font-bold shrink-0 mt-0.5 font-mono">REC-01:</span>
                      <div>
                        <strong>Physical Resource Redistribution</strong>: Allocate high-priority equipment and personnel to underperforming, zero-earning nodes with accumulated expenditures (mainly <span className="text-amber-300 font-bold font-mono">"{hiddenDelays.length > 0 ? hiddenDelays[0].name : 'pending WBS elements'}"</span>). This will directly improve physical progress and correct the schedule velocity index to targets.
                      </div>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-500 font-bold shrink-0 mt-0.5 font-mono">REC-02:</span>
                      <div>
                        <strong>Apply S-Curve Trajectory Recovery</strong>: Leverage the active S-curve <span className="font-bold text-slate-200 font-mono">{alpha.toFixed(1)}x</span> recovery acceleration factor to expedite sequential critical path activities. This adjusts scheduled targets dynamically to close the current <span className="text-rose-300 font-bold font-mono">{(plannedProgressAtCutoff - actualProgressAtCutoff).toFixed(1)}%</span> schedule target gap.
                      </div>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-500 font-bold shrink-0 mt-0.5 font-mono">REC-03:</span>
                      <div>
                        <strong>Cap Front-Loading Multipliers</strong>: Tighten drawdowns and align monthly contractor cash disbursements directly to verified milestone percentages. Addressing the high <span className="font-bold text-slate-200 font-mono">{frontLoadingRatio.toFixed(2)}x</span> front-loading ratio reduces capital exposure during early phases.
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="flex justify-between items-center bg-slate-950 px-3 py-1 text-[9px] text-slate-500 rounded font-mono">
                  <span>Performance Reference Code: MLN-INDICATORS-001-COMPLIANT</span>
                  <span>EVM Engine: Controls-v5.3</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Bottom Custom Q&A Terminal */}
        <div className="border-t border-slate-800/80 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              On-Demand Query Dialog Terminal
            </h5>
            {qaPairs.length > 0 && (
              <button 
                onClick={() => setQaPairs([])}
                className="text-[9px] text-slate-500 hover:text-slate-300 font-mono transition-colors"
              >
                Clear History
              </button>
            )}
          </div>

          {/* Historical Dialog Box */}
          {qaPairs.length > 0 && (
            <div id="ai-qa-ledger" className="max-h-[160px] overflow-y-auto space-y-3 pb-2 border-b border-slate-800/50 pr-1 custom-scrollbar">
              {qaPairs.map((pair, idx) => (
                <div key={idx} className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-blue-400 font-bold font-mono">
                    <span className="text-[8px] bg-blue-950 text-blue-300 px-1 py-0.5 rounded font-mono border border-blue-500/20">USER</span>
                    <span className="truncate max-w-xs sm:max-w-md">{pair.q}</span>
                  </div>
                  <div className="text-slate-300 bg-slate-900 border border-slate-850 p-2.5 rounded-lg leading-relaxed text-[11px]">
                    <p>{pair.a}</p>
                  </div>
                </div>
              ))}
              
              {isAnswering && (
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-mono animate-pulse bg-slate-900/40 p-2 rounded">
                  <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                  <span>Processing neural audit equations...</span>
                </div>
              )}
            </div>
          )}

          {/* Custom Ask Q Input Form */}
          <form onSubmit={handleAskQuestion} className="flex gap-2">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Query of anomalies (e.g. 'spent', 'behind', 'sahara')"
              className="flex-1 bg-slate-950 font-mono text-xs rounded-lg px-3 py-2 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isAnswering || !customQuestion.trim()}
              className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 text-white rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
              title="Submit custom query to copilot"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
