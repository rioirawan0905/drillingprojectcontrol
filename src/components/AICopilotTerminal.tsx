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
      return `Based on our SPI coefficient of **${spi.toFixed(2)}**, the Drilling MLN Phase 5 project is currently tracking **${spi < 1 ? 'behind schedule' : 'ahead/on timeline'}**. Primary friction stems from ${hiddenDelays.length > 0 ? `unearned progress in cost centers like **${hiddenDelays[0].name}**` : 'mild execution constraints in the active rig operations channel'}. To recover, we advise applying the active acceleration rate of **${alpha.toFixed(1)}x** to adjust drillstring rotational speeds, optimizing desert rig-move operations between Menzel Ledjmet Nord coordinates, and minimizing tripping frequencies. Schedule correction is targeted at **M10-${String(selectedYear).substring(2)}**.`;
    } else if (qLower.includes('overrun') || qLower.includes('cost') || qLower.includes('spent') || qLower.includes('money') || qLower.includes('budget')) {
      return `The aggregate spending ratio shows **$${totalSpent.toLocaleString()}k** disbursed against an approved **$${totalBudget.toLocaleString()}k** authorized baseline (${budgetSpentPercent.toFixed(1)}% burned). ${overruns.length > 0 ? `We have flagged cost overruns in **${overruns.map(o => o.name).join(', ')}**. For instance, **${overruns[0].name}** has exceeded its budget ceiling by **$${(overruns[0].spent - overruns[0].budget).toLocaleString()}k**.` : 'Currently, no singular cost center has breached its approved budget ceiling, which indicates disciplined field expenditure routing.'} The resulting project-wide Cost Performance Index (CPI) stands at a solid **${cpi.toFixed(2)}**. However, with a Front-Loading Risk index of **${frontLoadingRatio.toFixed(1)}x**, capital is moving faster than physical mechanical progress. We recommend capping mobilization drawdowns until rig-up verification is fully signed off.`;
    } else if (qLower.includes('sahara') || qLower.includes('algeria') || qLower.includes('field') || qLower.includes('mln')) {
      return `The **Menzel Ledjmet Nord (MLN)** campaign is characterized by tight Saharan well spacing, deep high-pressure carbonaceous zones, and complex logistical supply chains from Hassi Messaoud. Mud logging reports indicate that heavy mud-weights (clamped at 1.45–1.62 SG with barite additions) are vital during drilling of the active reservoir phases to counteract deep gas influx. We recommend establishing key sand-filter mitigation parameters on all shale shakers, especially during desert windstorms (sirocco seasons), to avoid physical equipment deterioration.`;
    } else {
      return `Diagnostic audit completed for your custom query concerning "${question}". Our MLN Controls Engine has cross-referenced your input with the 12-month spreadsheet ledger.\n\n**Current Year KPI Overlay**: Approved Budget: **$${totalBudget.toLocaleString()}k** | Current SPI: **${spi.toFixed(2)}** | Earned CPI: **${cpi.toFixed(2)}** | Wellbore Confidence: **${confidencePercent}%**.\n\nTo maximize efficiency, we recommend maintaining physical milestones ahead of cash outlays and auditing field contractor work orders weekly.`;
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
    const reportText = `DRILLCONTROL™ AI CONTROL WELLBORE AUDIT REPORT (${selectedYear})
============================================================
Campaign: ${project.name}
Reporting Month: Month ${C}
Wellbore Confidence Score: ${confidencePercent}%
Schedule Performance Index (SPI): ${spi.toFixed(2)} (${spi >= 1.0 ? 'On/Ahead of Schedule' : 'Behind Schedule'})
Cost Performance Index (CPI): ${cpi.toFixed(2)} (${cpi >= 1.0 ? 'Within Budget' : 'Overrun Risk'})
Front-Loading Ratio: ${frontLoadingRatio.toFixed(2)}x

FINANCIAL & PHYSICAL HEALTH BRIEF:
- Baseline Approved Capital: $${totalBudget.toLocaleString()}k
- Verified Accrued Spend (AC): $${totalSpent.toLocaleString()}k (${budgetSpentPercent.toFixed(1)}% consumed)
- Earned Value (EV) Physical Worth: $${Math.round(totalEarnedValue).toLocaleString()}k
${overruns.length > 0 ? `- EXPENDITURE CRITICAL OVERRUNS: ${overruns.length} cost centers flagged (${overruns.map(o => o.name).join(', ')})` : '- EXPENDITURE STATUS: No individual cost center limits breached.'}
${hiddenDelays.length > 0 ? `- MILESTONES CAUTION: ${hiddenDelays.length} centers have accrued spent cash but 0% progress (${hiddenDelays.map(h => h.name).join(', ')})` : '- MILESTONES STATUS: No zero-earned progress outliers.'}

AI RECOMMENDED DECISIONS CHECKLIST:
1. Target remaining rigging activities on lazy or zero-earned items like "${hiddenDelays.length > 0 ? hiddenDelays[0].name : 'undeclared cost centers'}" first.
2. Maintain mud logging specific gravity (SG) at 1.45–1.62 range under active recovery rate ${alpha.toFixed(1)}x to avoid deep gas influx delays in the Saharan reservoir.
3. Tighten monthly audit cycles to correct the active ${frontLoadingRatio.toFixed(1)}x Front-Loading drawdowns.

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
              DrillControl™ MLN AI Advisory Copilot
            </h3>
            <p className="text-[11px] text-slate-400 font-medium leading-tight">
              S-Curve analytical diagnostic model optimized for deep Saharan onshore campaigns.
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

            {/* Confidence Slider Card */}
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-left flex flex-col justify-center">
              <div className="flex justify-between text-[9px] text-slate-500 uppercase font-bold font-mono tracking-wider">
                <span>Wellbore Confidence</span>
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
                    Execute the controls audit to inspect deep-well mathematical variances, desert logistical forecasting, mud logging requirements, and contract performance trends.
                  </p>
                  <button
                    onClick={handleStartAudit}
                    className="mx-auto py-2 px-5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300" />
                    <span>Execute AI Controls & Wellbore Audit</span>
                  </button>
                </div>
              </div>
            )}

            {isAuditing && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-3.5">
                <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
                <div className="font-mono text-[10px] text-slate-500 space-y-1 max-w-sm">
                  <p className="text-blue-400 font-bold">[LOG] COMPILING GEOLOGICAL AND LEDGER REGRESSIONS...</p>
                  {auditStep >= 1 && <p className="animate-fade-in text-slate-400">▶ Loaded monthly S-curve points for M1-M12 on Year {selectedYear}</p>}
                  {auditStep >= 2 && <p className="animate-fade-in text-slate-400">▶ Solved differential equations for active front-loading ratios</p>}
                  {auditStep >= 3 && <p className="animate-fade-in text-amber-400">▶ Evaluated unearned capital blockages in critical drilling zones</p>}
                </div>
              </div>
            )}

            {showResult && !isAuditing && (
              <div className="space-y-4 animate-fade-in text-xs max-h-[350px] overflow-y-auto pr-1 select-text">
                <p className="text-slate-300">
                  We have concluded the project controls assessment for the <strong className="text-blue-400 font-black">{project.name}</strong> campaign. The active data highlights a 
                  <span className={`font-semibold ${spi < 1 ? ' text-rose-300' : ' text-emerald-300'}`}>
                    {spi < 1 ? ' schedule latency' : ' fast-track operational schedule status'}
                  </span> with an index of <span className="font-mono font-bold">{spi.toFixed(2)}</span>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/50 p-3 rounded-lg border border-slate-850">
                  <div className="space-y-1">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono">Cost Ledger Status</span>
                    <p className="text-[11px]">
                      Disbursed cap: <span className="font-mono font-bold text-slate-200">${totalSpent.toLocaleString()}k</span> vs limit <span className="font-mono text-slate-200">${totalBudget.toLocaleString()}k</span>. Cost Performance Index (CPI) stands at <strong className="text-slate-200">{cpi.toFixed(2)}</strong>.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono">Geotechnical Condition</span>
                    <p className="text-[11px]">
                      Menzel Ledjmet Nord requires mud density between <span className="font-mono text-slate-200 text-semibold">1.45-1.62 SG</span> to resist pressure zones. Under the active <span className="font-mono font-bold text-emerald-400">{alpha.toFixed(1)}x</span> recovery rate, casing cycle speeds must be protected.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 text-slate-400">
                  <span className="block text-[9px] uppercase font-bold text-slate-500 font-mono">Flagged Work Center Anomalies</span>
                  <ul className="list-disc pl-4 space-y-1 text-[11px]">
                    {overruns.length > 0 ? (
                      <li className="text-rose-300">
                        <strong>Budget Breach</strong>: Cost center <span className="text-rose-200 underline decoration-dotted">{overruns[0].name}</span> is overspent by <span className="font-mono text-rose-250 font-black">${(overruns[0].spent - overruns[0].budget).toLocaleString()}k</span>.
                      </li>
                    ) : (
                      <li className="text-emerald-400/90 font-medium">No active individual work-center budget breaches recorded.</li>
                    )}
                    {hiddenDelays.length > 0 ? (
                      <li className="text-amber-300/90">
                        <strong>Milestone Stagnation</strong>: Spent cash detected on <span className="text-amber-200 font-bold">{hiddenDelays[0].name}</span> while verified progress is <span className="font-mono">0%</span>.
                      </li>
                    ) : (
                      <li className="text-emerald-400/90 font-medium">No zero-progress payment anomalies flagged.</li>
                    )}
                  </ul>
                </div>

                <div className="p-3 bg-slate-950 text-[10.5px] rounded-lg border border-slate-850 text-slate-350 space-y-1 font-mono leading-relaxed">
                  <span className="font-bold text-blue-400 uppercase text-[9px] block">AI RECOMMENDED DECISIONS CHECKLIST</span>
                  <div>• Redirect drill rig crews to lazy milestone blocks like {hiddenDelays.length > 0 ? `"${hiddenDelays[0].name}"` : 'undeclared work centers'} immediately.</div>
                  <div>• Add barite blocks to maintain drilling mud specific gravity high to control carbonaceous reservoir pressure.</div>
                  <div>• Tighten drawdowns to suppress the active high {frontLoadingRatio.toFixed(2)}x Front-Loading multiplier.</div>
                </div>

                <div className="flex justify-between items-center bg-slate-950 px-3 py-1 text-[9px] text-slate-500 rounded font-mono">
                  <span>Audit Code: MLN-DIAG-001-COMPLIANT</span>
                  <span>Engine: Controls-v5.3</span>
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
