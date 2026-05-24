/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { INITIAL_PROJECTS } from './data';
import { ProjectYearData } from './types';
import SidebarControls from './components/SidebarControls';
import KPICards from './components/KPICards';
import SCurveChart from './components/SCurveChart';
import CashFlowChart from './components/CashFlowChart';
import WBSCostChart from './components/WBSCostChart';
import AlertSystem from './components/AlertSystem';
import { Compass, CalendarDays, BarChart3, AlertCircle, FileSpreadsheet } from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<ProjectYearData[]>(INITIAL_PROJECTS);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const currentProject = projects.find((p) => p.year === selectedYear) || projects[0];

  const handleUpdateProject = (updated: ProjectYearData) => {
    setProjects((prev) => prev.map((proj) => (proj.year === updated.year ? updated : proj)));
  };

  const handleResetData = () => {
    if (window.confirm("Are you sure you want to restore default campaign baselines? Your simulated changes will be reset.")) {
      setProjects(JSON.parse(JSON.stringify(INITIAL_PROJECTS)));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none pb-12">
      {/* Top Professional Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-3.5 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-sm">
              <Compass className="w-5.5 h-5.5 text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50/80 px-2 py-0.5 rounded-sm tracking-widest font-mono">
                  MLN Phase 5 DrillControl™ Portal
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className="text-base font-black text-slate-900 tracking-tight leading-none mt-0.5">Drilling MLN Phase 5 Project EVM Simulator</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Quick indicators */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 font-medium">
              <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
              <span>Reporting Horizon: <span className="font-bold text-slate-800 font-mono">12 Months</span></span>
            </div>

            <button
              onClick={handleResetData}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50/80 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer shadow-2xs"
            >
              Reset Baseline
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-5 flex-1">
        {/* Project Context Summary Alert strip */}
        <div className="bg-slate-900 border border-slate-850 rounded-2xl px-5 py-3.5 mb-5 flex items-start gap-3.5 shadow-sm">
          <FileSpreadsheet className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed md:max-w-4xl">
            You are auditing <strong className="text-white font-extrabold">{currentProject.name}</strong>. Adjust parameters inside the Left Control Panel (e.g., historical Month markers, catch-up recovery factors, and active work package spent lines) to run time-phased S-Curve forecasting, cost-overrun alerts, and automatic EAC recalculations on the fly.
          </div>
        </div>

        {/* Responsive Grid Structure: Left controls, Right dashboard visualizations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Controls & Form configurations (col-span-4) */}
          <div className="lg:col-span-4 h-full lg:sticky lg:top-[88px] max-h-[calc(100vh-120px)] overflow-hidden">
            <SidebarControls
              currentProject={currentProject}
              allProjects={projects}
              onSelectProject={setSelectedYear}
              onUpdateProject={handleUpdateProject}
            />
          </div>

          {/* RIGHT COLUMN: Live KPI analytics & SVG Canvas drawing (col-span-8) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Row 1: Top KPIs Dynamic Badges and Forecasts */}
            <KPICards project={currentProject} />

            {/* Row 2: Animated S-Curve Target vs Actual Overlay Chart */}
            <section aria-labelledby="scurve-section">
              <h2 id="scurve-section" className="sr-only">S-Curve Analysis</h2>
              <SCurveChart project={currentProject} />
            </section>

            {/* Row 3: Stacked/Grouped Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cash flow drawdowns per month */}
              <section aria-labelledby="cashflow-section">
                <h2 id="cashflow-section" className="sr-only">Monthly Drawdowns</h2>
                <CashFlowChart project={currentProject} />
              </section>

              {/* Cost Center Bar Drawdowns with Highlight of Top Spenders */}
              <section aria-labelledby="wbs-cost-section">
                <h2 id="wbs-cost-section" className="sr-only">WBS Drawdown Analysis</h2>
                <WBSCostChart wbsList={currentProject.wbsList} />
              </section>
            </div>

            {/* Row 4: Discrepancy, Catch-up alerting systems, and forecasting text block */}
            <section aria-labelledby="alerts-recommendations-section">
              <h2 id="alerts-recommendations-section" className="sr-only">Real-time Warning and Action Advisor</h2>
              <AlertSystem project={currentProject} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
