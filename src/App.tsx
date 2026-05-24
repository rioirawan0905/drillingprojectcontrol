/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { INITIAL_PROJECTS } from './data';
import { ProjectYearData } from './types';
import SidebarControls from './components/SidebarControls';
import KPICards from './components/KPICards';
import MainChartPanel from './components/MainChartPanel';
import SpreadsheetEditor from './components/SpreadsheetEditor';
import WBSCostChart from './components/WBSCostChart';
import AICopilotTerminal from './components/AICopilotTerminal';
import AlertSystem from './components/AlertSystem';
import FormulaGlossary from './components/FormulaGlossary';
import { Compass, CalendarDays, FileSpreadsheet, Download, FileText, RotateCcw } from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<ProjectYearData[]>(INITIAL_PROJECTS);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [highlightedAbbr, setHighlightedAbbr] = useState<string | null>(null);

  const handleNavigateToAbbr = (abbr: string) => {
    setHighlightedAbbr(abbr);
    const element = document.getElementById(`abbr-${abbr.toLowerCase()}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // Auto-clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedAbbr((prev) => (prev === abbr ? null : prev));
    }, 3000);
  };

  const currentProject = projects.find((p) => p.year === selectedYear) || projects[0];

  const handleUpdateProject = (updated: ProjectYearData) => {
    setProjects((prev) => prev.map((proj) => (proj.year === updated.year ? updated : proj)));
  };

  const handleResetData = () => {
    if (window.confirm("Are you sure you want to restore default campaign baselines? Your simulated changes will be reset.")) {
      setProjects(JSON.parse(JSON.stringify(INITIAL_PROJECTS)));
    }
  };

  const handleExportCSV = () => {
    let csvContent = "";
    
    csvContent += `DRILLING PROJECT CONTROLS SIMULATION LEDGER\n`;
    csvContent += `Project Name,${currentProject.name}\n`;
    csvContent += `Selected Plan Year,${currentProject.year}\n`;
    csvContent += `Active Reporting Month,M${currentProject.reportingMonth}\n`;
    csvContent += `Future Recovery Rate Factor,${currentProject.accelerationFactor}x\n\n`;

    csvContent += `SECTION 1: WORK BREAKDOWN STRUCTURE (WBS) BUDGETS & PROGRESS\n`;
    csvContent += `WBS Index,Cost Center Name,Approved Budget ($k),Verified Spent ($k),Physical Progress (%)\n`;
    currentProject.wbsList.forEach((item, index) => {
      csvContent += `WBS-${String(index + 1).padStart(2, '0')},"${item.name.replace(/"/g, '""')}",${item.budget},${item.spent},${item.progress}\n`;
    });
    csvContent += `\n`;

    csvContent += `SECTION 2: 12-MONTH CHRONOLOGICAL S-CURVE DATA\n`;
    csvContent += `Month,Date Label,Planned Incremental Target (%),Planned Cumulative Target (%),Actual Incremental Progress (%),Actual Cumulative Progress (%),Planned Drawdown ($k),Actual Drawdown ($k)\n`;
    
    const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    currentProject.monthlyData.forEach((m, idx) => {
      const label = `${MONTH_NAMES[m.month - 1]}-${String(selectedYear).substring(2)}`;
      const prevTarget = idx === 0 ? 0 : currentProject.monthlyData[idx - 1].targetCumulativeProgress;
      const incTarget = m.targetCumulativeProgress - prevTarget;

      let incActual: string | number = "N/A";
      let cumActual: string | number = "N/A";
      let actCash: string | number = "N/A";

      if (m.month <= currentProject.reportingMonth) {
        const prevActual = idx === 0 ? 0 : (currentProject.monthlyData[idx - 1].actualCumulativeProgress ?? 0);
        incActual = (m.actualCumulativeProgress ?? 0) - prevActual;
        cumActual = m.actualCumulativeProgress ?? 0;
        actCash = m.actualCashFlow ?? 0;
      }

      csvContent += `M${m.month},${label},${incTarget}%,${m.targetCumulativeProgress}%,${incActual}%,${cumActual}%,${m.targetCashFlow},${actCash}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MLN_Phase5_ProjectControls_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
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
                <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50/80 px-2 py-0.5 rounded-sm tracking-widest font-mono border border-blue-105">
                  MLN Phase 5 DrillControl™ Portal
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h1 className="text-base font-black text-slate-900 tracking-tight leading-none mt-0.5">Drilling MLN Phase 5 Project EVM Simulator</h1>
            </div>
          </div>

          <div id="header-action-rails" className="flex items-center gap-2.5 flex-wrap self-end sm:self-auto">
            {/* Quick indicators */}
            <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 font-medium">
              <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
              <span>Reporting Horizon: <span className="font-bold text-slate-800 font-mono">12 Months</span></span>
            </div>

            {/* Export buttons */}
            <button
              onClick={handleExportCSV}
              className="text-xs font-bold text-slate-700 border border-slate-200 hover:border-blue-200 bg-white hover:bg-blue-50/50 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              Export CSV
            </button>

            <button
              onClick={handleExportPDF}
              className="text-xs font-bold text-slate-700 border border-slate-200 hover:border-emerald-200 bg-white hover:bg-emerald-50/50 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Export PDF / Print
            </button>

            <button
              onClick={handleResetData}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-250 bg-white hover:bg-rose-50/40 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 mt-5 flex-1">
        
        {/* Project Context Summary Alert strip */}
        <div id="alert-hud-marquee" className="bg-slate-900 border border-slate-850 rounded-2xl px-5 py-3.5 mb-5 flex items-start gap-3.5 shadow-sm">
          <FileSpreadsheet className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed md:max-w-4xl">
            You are auditing <strong className="text-white font-extrabold">{currentProject.name}</strong> (Menzel Ledjmet Nord, Algerian Sahara). Expand the charts or edit increments in the scrollable ledger below. Changes sync live across the S-Curve lines, EAC metrics, and the AI advisory co-pilot.
          </div>
        </div>

        {/* Responsive Grid Structure: Left controls, Right dashboard visualizations */}
        <div id="main-content-layout" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
            <KPICards project={currentProject} onNavigateToAbbr={handleNavigateToAbbr} />

            {/* Row 2: Tabbed S-Curve chart VS Cash Drawdown chart panel */}
            <MainChartPanel
              project={currentProject}
              allProjects={projects}
              onUpdateProject={handleUpdateProject}
            />

            {/* Row 3: Live Spreadsheet Style Ledger Input */}
            <SpreadsheetEditor
              project={currentProject}
              onUpdateProject={handleUpdateProject}
            />

            {/* Row 4: Side By Side cost center bars and AI Advisory advisory blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WBSCostChart wbsList={currentProject.wbsList} onNavigateToAbbr={handleNavigateToAbbr} />
              <AICopilotTerminal project={currentProject} allProjects={projects} />
            </div>

            {/* Row 5: Detailed alert thresholds warnings advisory text block */}
            <AlertSystem project={currentProject} />

            {/* Row 6: Abbreviation glossary explanations and live computations reference */}
            <FormulaGlossary
              project={currentProject}
              highlightedAbbr={highlightedAbbr}
              onNavigateToAbbr={handleNavigateToAbbr}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
