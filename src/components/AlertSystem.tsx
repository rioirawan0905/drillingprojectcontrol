/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectYearData } from '../types';
import { AlertTriangle, Lightbulb, Clock, ShieldAlert } from 'lucide-react';

interface AlertSystemProps {
  project: ProjectYearData;
}

export default function AlertSystem({ project }: AlertSystemProps) {
  const C = project.reportingMonth;
  const alpha = project.accelerationFactor;
  const data = project.monthlyData;

  const totalBudget = project.wbsList.reduce((acc, curr) => acc + curr.budget, 0);
  const totalSpent = project.wbsList.reduce((acc, curr) => acc + curr.spent, 0);

  const currentMonthData = data.find((m) => m.month === C) || data[C - 1];
  const actualAtC = currentMonthData ? (currentMonthData.actualCumulativeProgress ?? 0) : 0;
  const targetAtC = currentMonthData ? currentMonthData.targetCumulativeProgress : 0;

  // 1. Calculate Velocity Risk
  // Reconstruct catch up curve to detect increments > 25% MoM
  let velocityRiskDetected = false;
  let maxMomIncrement = 0;

  const recoveryCurve: number[] = [];
  // Populate recovery array
  recoveryCurve[C] = actualAtC;

  for (let m = C + 1; m <= 12; m++) {
    const originalTarget = data[m - 1]?.targetCumulativeProgress ?? 100;
    const remainingPlanGrowth = 100 - targetAtC;
    const progressProportion = remainingPlanGrowth > 0
      ? (originalTarget - targetAtC) / remainingPlanGrowth
      : 0;
    const remainingActualNeeded = 100 - actualAtC;
    let recoveryVal = actualAtC + (progressProportion * remainingActualNeeded * alpha);
    recoveryVal = Math.min(100, Math.max(actualAtC, Math.round(recoveryVal)));
    recoveryCurve[m] = recoveryVal;

    const increment = recoveryCurve[m] - recoveryCurve[m - 1];
    if (increment > maxMomIncrement) {
      maxMomIncrement = increment;
    }
  }

  if (maxMomIncrement > 25) {
    velocityRiskDetected = true;
  }

  // 2. Identify WBS Hidden Delays
  const hiddenDelayItems = project.wbsList.filter(
    (item) => item.spent > 0 && item.progress === 0
  );

  // 3. Project status general indicators
  const scheduleVariance = actualAtC - targetAtC;
  const isBehind = scheduleVariance < -1.5;

  // 4. Burn Rate Forecast Projection
  const burnRate = C > 0 ? actualAtC / C : 0;
  let projectedTotalMonths = 12;
  let completionDateOffset = 0;

  if (burnRate > 0) {
    const remainingProgress = 100 - actualAtC;
    projectedTotalMonths = C + (remainingProgress / burnRate);
    completionDateOffset = projectedTotalMonths - 12;
  }

  return (
    <div id="project-controls-alerts" className="font-sans grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* SECTION 3: REAL-TIME WARNING TERMINAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg text-slate-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Control Alert Monitor</span>
          </div>

          <div className="space-y-3">
            {/* Alert 1: Velocity Risk */}
            {velocityRiskDetected ? (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-orange-950/40 border border-orange-800/40 text-orange-200 text-xs">
                <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold uppercase tracking-tight text-orange-300">Velocity Risk: Unrealistic Catch-Up</h5>
                  <p className="mt-0.5 text-orange-400/90 leading-relaxed">
                    Target acceleration factors demand a peak progress velocity of <strong>{maxMomIncrement.toFixed(1)}% MoM</strong>. Standard campaigns rarely sustain over 25% MoM. Consider scaling down acceleration multiplier or extending targets.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50 text-slate-400 text-xs border border-slate-850">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Future recovery slope baseline is realistic (&lt;25% MoM progress required).</span>
              </div>
            )}

            {/* Alert 2: Hidden Delays */}
            {hiddenDelayItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-200 text-xs animate-pulse"
              >
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold uppercase tracking-tight text-rose-300">Hidden Delay: {item.name}</h5>
                  <p className="mt-0.5 text-rose-400/90 leading-relaxed">
                    Capital drawdown of <strong>${item.spent}k</strong> has been logged to cost ledger, but overall physical progress for <strong>{item.name}</strong> remains at <strong>0%</strong>. Audit vendor invoices.
                  </p>
                </div>
              </div>
            ))}

            {hiddenDelayItems.length === 0 && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/50 text-slate-400 text-xs border border-slate-850">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>No hidden delay discrepancies detected in current WBS entries.</span>
              </div>
            )}
            
            {/* S-curve warning */}
            {isBehind && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/20 border border-rose-900/30 text-rose-250 text-xs">
                <Clock className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-rose-300 uppercase tracking-tight">Cumulative Lag Alert</h5>
                  <p className="mt-0.5 text-rose-400/90">
                    S-Curve is currently trailing target by <strong>{Math.abs(scheduleVariance).toFixed(1)}%</strong>. Recovery actions required.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-[10px] font-mono text-slate-500 mt-4 text-right">
          INTELLIGENT DIAGNOSTICS ACTIVE
        </div>
      </div>

      {/* SECTION 4: SMART DRILLING RECOMMENDATIONS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Controls Advisor Action Plan</h3>
          </div>

          <div className="space-y-3">
            {isBehind && (
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-800">1. Combat Schedule Slippage:</p>
                <p className="text-slate-500 leading-relaxed">
                  Rig operational and tripping velocities are trailing historical limits. Authorize back-to-back shifts or optimize Desert Rig-Move cycles. Scale recovery rate upwards.
                </p>
              </div>
            )}

            {velocityRiskDetected && (
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-800">2. Mitigate Catch-Up Velocity Fatigue:</p>
                <p className="text-slate-500 leading-relaxed">
                  Peak rate ({maxMomIncrement.toFixed(0)}% progress / Month) creates severe operational risk on MLN onshore rigs during high-pressure reservoir intervals. Re-negotiate Project Phase 5 Milestones or authorize a <strong>{Math.ceil(completionDateOffset)} Month</strong> schedule extension.
                </p>
              </div>
            )}

            {hiddenDelayItems.length > 0 && (
              <div className="text-xs space-y-1">
                <p className="font-bold text-slate-800">3. Audit Capital Drawdowns:</p>
                <p className="text-slate-500 leading-relaxed">
                  Halt further cost allocations to <strong>{hiddenDelayItems.map(i => i.name).join(', ')}</strong> until desert site supervisors submit physical casing and wellbore checklists to confirm real progress.
                </p>
              </div>
            )}

            {!isBehind && !velocityRiskDetected && hiddenDelayItems.length === 0 && (
              <div className="text-xs text-slate-500 italic space-y-2">
                <p className="font-bold text-emerald-600 not-italic">✓ Project Campaign Healthy & Audited</p>
                <p>
                  No critical deviations logged. Maintain current operating expenditure. Cash drawdown trajectories remain closely aligned to material physical work packages.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Projected Duration:</span>
          <span className="font-mono font-bold text-slate-700">{projectedTotalMonths.toFixed(1)} Months</span>
        </div>
      </div>
    </div>
  );
}
