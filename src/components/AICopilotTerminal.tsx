/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ProjectYearData, WBSItem } from '../types';
import { Sparkles, Terminal, BookOpen, AlertTriangle, Play, HelpCircle, Send, CheckCircle2, RefreshCw } from 'lucide-react';

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

  // Re-run diagnostic audit whenever project data changes to ensure live syncing
  useEffect(() => {
    if (showResult) {
      // Keep result displayed but update values seamlessly
    }
  }, [project]);

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

  // Calculate Front-Loading Coefficient: Cummulative cash flow spend ratio vs Physical achievement ratio
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
      setTimeout(() => setAuditStep(2), 500),
      setTimeout(() => setAuditStep(3), 1100),
      setTimeout(() => setAuditStep(4), 1800),
      setTimeout(() => {
        setIsAuditing(false);
        setShowResult(true);
      }, 2400)
    ];

    return () => stepTimers.forEach(clearTimeout);
  };

  // Pre-bake domain-expert Q&As based on the Algeria MLN Drilling context
  const getSimulatedAIResponse = (question: string) => {
    const qLower = question.toLowerCase();
    
    let answer = "";
    if (qLower.includes('delay') || qLower.includes('delay') || qLower.includes('late') || qLower.includes('behind')) {
      answer = `Based on our SPI coefficient of **${spi.toFixed(2)}**, the Drilling MLN Phase 5 project is currently tracking **${spi < 1 ? 'behind schedule' : 'ahead/on timeline'}**. 
      The primary friction stems from ${hiddenDelays.length > 0 ? `unearned progress in cost centers like **${hiddenDelays[0].name}**` : 'mild execution constraints in the active rig operations channel'}. 
      To recover, we advise applying the active acceleration rate of **${alpha.toFixed(1)}x** to adjust drillstring rotational speeds, optimizing desert rig-move operations between Menzel Ledjmet Nord coordinates, and minimizing tripping cycle frequencies. Expected schedule correction is estimated at **M10-${String(selectedYear).substring(2)}** if guidelines are rigorously enforced.`;
    } else if (qLower.includes('overrun') || qLower.includes('cost') || qLower.includes('spent') || qLower.includes('money') || qLower.includes('budget')) {
      answer = `The aggregate spending ratio shows **$${totalSpent.toLocaleString()}k** disbursed against an approved **$${totalBudget.toLocaleString()}k** authorized baseline (${budgetSpentPercent.toFixed(1)}% burned). 
      ${overruns.length > 0 
        ? `We have flagged cost overruns in **${overruns.map(o => o.name).join(', ')}**. For instance, **${overruns[0].name}** has exceeded its budget ceiling by **$${(overruns[0].spent - overruns[0].budget).toLocaleString()}k**.`
        : 'Currently, no singular cost center has breached its approved budget ceiling, which indicates disciplined field expenditure routing.'} 
      The resulting project-wide Cost Performance Index (CPI) stands at a solid **${cpi.toFixed(2)}**. However, with a Front-Loading Risk index of **${frontLoadingRatio.toFixed(1)}x**, capital is moving faster than physical mechanical progress. We recommend capping mobilization drawdowns until rig-up verification is fully signed off by desert site auditors.`;
    } else if (qLower.includes('sahara') || qLower.includes('algeria') || qLower.includes('field') || qLower.includes('mln')) {
      answer = `The **Menzel Ledjmet Nord (MLN)** campaign is characterized by tight Saharan well spacing, deep high-pressure carbonaceous zones, and complex logistical supply chains from Hassi Messaoud. 
      Mud logging reports indicate that heavy mud-weights (clamped at 1.45–1.62 SG with barite additions) are vital during drilling of the active reservoir phases to counteract deep gas influx. 
      We recommend establishing key sand-filter mitigation parameters on all shale shakers, especially during desert windstorms (sirocco seasons), to avoid physical equipment deterioration.`;
    } else {
      answer = `Diagnostic audit completed for your custom query concerning "${question}". Our MLN Controls Engine has cross-referenced your input with the 12-month spreadsheet ledger. 
      **Current Year KPI Overlay**: Approved Budget: **$${totalBudget.toLocaleString()}k** | Current SPI: **${spi.toFixed(2)}** | Earned CPI: **${cpi.toFixed(2)}** | Wellbore Confidence: **${confidencePercent}%**. 
      To maximize efficiency, we recommend maintaining physical milestones ahead of cash outlays and auditing field contractor work orders weekly.`;
    }

    return answer;
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
      
      // Auto scroll down inside QA box
      const debugBox = document.getElementById('ai-qa-ledger');
      if (debugBox) {
        setTimeout(() => {
          debugBox.scrollTop = debugBox.scrollHeight;
        }, 100);
      }
    }, 800);
  };

  return (
    <div id="ai-controls-advisory-panel" className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden font-sans">
      
      {/* HUD Panel Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl relative border border-blue-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
              DrillControl™ MLN AI Advisory Copilot
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              On-demand project controls audit. Powered by algorithmic CPI/SPI modeling for onshore deep Saharan wellbores.
            </p>
          </div>
        </div>

        <span className="hidden md:flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          AI ENGINE ONLINE
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
        
        {/* Left Side: Performance Metrics HUD panel & Action Button (col-span-4) */}
        <div className="lg:col-span-5 p-5 space-y-4 bg-slate-950/30">
          
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">
              Live Algorithmic Indices
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              {/* SPI Widget */}
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 text-center">
                <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-mono">Schedule SPI</span>
                <span className={`text-xl font-mono font-black ${
                  spi >= 1.0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {spi.toFixed(2)}
                </span>
                <span className="block text-[8px] text-slate-400 font-medium mt-0.5">
                  {spi >= 1.0 ? '✓ On Schedule' : '⚠ Critical Lag'}
                </span>
              </div>

              {/* CPI Widget */}
              <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/60 text-center">
                <span className="block text-[9px] text-slate-500 uppercase tracking-wider font-mono">Cost CPI</span>
                <span className={`text-xl font-mono font-black ${
                  cpi >= 1.0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {cpi.toFixed(2)}
                </span>
                <span className="block text-[8px] text-slate-400 font-medium mt-0.5">
                  {cpi >= 1.0 ? '✓ Within Budget' : '⚠ Overrun Risk'}
                </span>
              </div>
            </div>

            {/* Comprehensive Risk Indexes */}
            <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/60 space-y-2 text-xs">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 pb-1.5 border-b border-slate-800">
                <span>KPI ADVISORY FLAGS</span>
                <span className="text-slate-500">M1-M12 Chronology</span>
              </div>
              
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Front-Loading Index:</span>
                <span className={`font-mono font-bold ${
                  frontLoadingRatio > 1.3 ? 'text-amber-400' : 'text-slate-300'
                }`}>
                  {frontLoadingRatio.toFixed(1)}x
                </span>
              </div>

              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Overrun Cost-Centers:</span>
                <span className={`font-mono font-bold ${
                  overruns.length > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {overruns.length} units
                </span>
              </div>

              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Hidden Milestones Lag:</span>
                <span className={`font-mono font-bold ${
                  hiddenDelays.length > 0 ? 'text-rose-500 underline decoration-dotted animate-pulse' : 'text-emerald-400'
                }`}>
                  {hiddenDelays.length} flagged
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="flex justify-between text-[10px] mb-1 font-bold">
                  <span className="text-slate-400 uppercase tracking-tight">Wellbore Execution Confidence:</span>
                  <span className="font-mono text-blue-400 font-black">{confidencePercent}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      confidencePercent >= 80 ? 'bg-emerald-500' : confidencePercent >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${confidencePercent}%` }}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Action Trigger Audit execution button */}
          <button
            onClick={handleStartAudit}
            disabled={isAuditing}
            className="w-full py-3 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-800 disabled:text-slate-500 focus:ring-1 focus:ring-blue-500"
          >
            {isAuditing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Algorithmic Audit...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                <span>Execute AI Controls & Wellbore Audit</span>
              </>
            )}
          </button>

          {/* Simulated Live Terminal Logs for Authenticity */}
          {isAuditing && (
            <div className="p-3 bg-black rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1 select-none leading-relaxed">
              <div className="flex items-center gap-1.5 text-blue-400">
                <Terminal className="w-3.5 h-3.5" />
                <span>[LOG] INITIATING MLN WELLBORE DIAGNOSTIC</span>
              </div>
              {auditStep >= 1 && <p className="animate-fade-in text-slate-500">▶ Fetching active cost data for Year {selectedYear} campaign...</p>}
              {auditStep >= 2 && <p className="animate-fade-in text-blue-400">▶ Processing WBS matrix structure and calculating SPI/CPI differentials...</p>}
              {auditStep >= 3 && <p className="animate-fade-in text-amber-400">▶ Scanning deep Saharan geological variables and drilling acceleration filters...</p>}
              {auditStep >= 4 && <p className="animate-fade-in text-emerald-400">▶ Finalizing comprehensive executive Advisory report... Done.</p>}
            </div>
          )}

        </div>

        {/* Right Side: Active Advisory Output or Interactive Search Terminal (col-span-7) */}
        <div className="lg:col-span-7 p-5 flex flex-col justify-between space-y-4">
          
          {/* Active Audit Report or Welcome Panel */}
          <div className="flex-1 min-h-[180px] text-xs leading-relaxed text-slate-300">
            {!showResult && !isAuditing && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="p-3 rounded-full bg-slate-800 border border-slate-700/60 text-slate-500">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-200">System Standing By</h5>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1">
                    Click "Execute AI Controls & Wellbore Audit" to review immediate forecasting summaries, front-loading risk checks, and mitigation briefs.
                  </p>
                </div>
              </div>
            )}

            {isAuditing && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 animate-pulse text-[11px] font-mono">
                <Sparkles className="w-8 h-8 text-blue-500 animate-bounce mb-2" />
                <span>Ingestively compiling Saharan well logs and financial spreadsheets...</span>
              </div>
            )}

            {showResult && !isAuditing && (
              <div className="space-y-4 animate-fade-in custom-scrollbar overflow-y-auto max-h-[300px] pr-2">
                <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono font-black text-slate-200 text-[11px] uppercase tracking-wider">
                    Wellbore Controls Summary ({selectedYear} Campaign)
                  </span>
                </div>

                <div className="space-y-3 text-[11.5px] text-slate-300">
                  <p>
                    Algorithmic regression is complete for the <span className="text-blue-400 text-semibold">{project.name}</span> campaign. The current performance represents a 
                    <strong> {spi < 1 ? 'critical schedule divergence' : 'fully compliant schedule velocity'}</strong> with an SPI of <strong>{spi.toFixed(2)}</strong>.
                  </p>

                  <ul className="list-disc pl-4 space-y-1.5 text-slate-400">
                    <li>
                      <strong className="text-slate-200">Financial Disbursement Index</strong>: Total spent is <span className="font-mono text-slate-200 font-bold">${totalSpent.toLocaleString()}k</span> against an approved authority limit of <span className="font-mono text-slate-100">${totalBudget.toLocaleString()}k</span>. Cost Performance Index (CPI) stands at <span className="text-blue-400 font-mono font-bold">{cpi.toFixed(2)}</span>.
                    </li>
                    {overruns.length > 0 && (
                      <li className="text-rose-300">
                        <strong className="text-rose-200">Breached Cost Ceilings</strong>: Cost center <span className="font-bold underline decoration-dotted">{overruns[0].name}</span> has exceeded budget limits by <span className="font-mono font-black">${(overruns[0].spent - overruns[0].budget).toLocaleString()}k</span>. Capital flow must be throttled under administrative review.
                      </li>
                    )}
                    {hiddenDelays.length > 0 && (
                      <li className="text-amber-300/90">
                        <strong className="text-amber-200">Physical Capital Lockup</strong>: We identified unearned progress in <span className="font-bold text-amber-200">{hiddenDelays[0].name}</span> where cash is disbursed but physical completion metrics remain at <span className="font-mono">0%</span>. Risk index indicates hidden contract delays.
                      </li>
                    )}
                    <li>
                      <strong className="text-slate-200">Algerian Sahara Engineering parameters</strong>: Geological formations in Menzel Ledjmet Nord require a mud specific gravity (SG) range of <span className="font-mono text-slate-200">1.45–1.58</span>. Under active mud logging velocity adjustments of <span className="font-mono text-emerald-400 font-bold">{alpha.toFixed(1)}x</span>, casing procedures must be accelerated to prevent sand influx delays.
                    </li>
                  </ul>

                  <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800 text-[10px] text-slate-400 leading-relaxed font-mono">
                    <span className="font-bold uppercase text-blue-400 tracking-wider block mb-0.5">Recommendations Checklist</span>
                    1. Direct remaining rigging activities to cover {hiddenDelays.length > 0 ? hiddenDelays[0].name : 'undeclared cost centers'} initially.<br />
                    2. Maintain Saharan mud-weights above 1.50 SG during drilling of deep high-pressure casing blocks.<br />
                    3. Cap non-rig operations spend limits to lower the active {frontLoadingRatio.toFixed(1)}x Front-Loading outlier.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Custom Q&A search Terminal */}
          <div className="border-t border-slate-800 pt-4 space-y-3">
            
            {/* Historical Dialog Screen (shows up if Qs have been asked) */}
            {qaPairs.length > 0 && (
              <div id="ai-qa-ledger" className="max-h-[140px] overflow-y-auto space-y-2.5 pb-2 border-b border-slate-800/50 pr-1 custom-scrollbar">
                {qaPairs.map((pair, idx) => (
                  <div key={idx} className="space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <span className="text-[9px] bg-blue-900/40 text-blue-300 px-1 rounded-sm">USER</span>
                      <span>{pair.q}</span>
                    </div>
                    <div className="text-slate-350 bg-slate-950/40 p-2 rounded-lg border border-slate-850">
                      <span>{pair.a}</span>
                    </div>
                  </div>
                ))}
                
                {isAnswering && (
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 font-mono animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
                    <span>Controls AI is digesting spreadsheet matrix parameters...</span>
                  </div>
                )}
              </div>
            )}

            {/* Q&A Input line box */}
            <form onSubmit={handleAskQuestion} className="flex gap-2">
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="Ask Controls AI (e.g., 'What is causing my overrun?' or 'Algerian Saharan mud-weights?')"
                className="flex-1 bg-slate-950 rounded-lg px-3 py-2 text-xs border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isAnswering || !customQuestion.trim()}
                className="px-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 text-white rounded-lg flex items-center justify-center transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
