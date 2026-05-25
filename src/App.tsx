/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { Compass, CalendarDays, FileSpreadsheet, Download, FileText, Check, Upload } from 'lucide-react';

const normalizeProjectData = (project: ProjectYearData): ProjectYearData => {
  const C = project.reportingMonth;
  return {
    ...project,
    monthlyData: project.monthlyData.map((m) => {
      if (m.month > C) {
        return {
          ...m,
          actualCumulativeProgress: null,
          actualCashFlow: null,
        };
      }
      return m;
    }),
  };
};

export default function App() {
  const [projects, setProjects] = useState<ProjectYearData[]>(() => {
    const saved = localStorage.getItem('mln_drilling_projects_sim');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ProjectYearData[];
        return parsed.map(normalizeProjectData);
      } catch (e) {
        console.error("Failed to parse saved projects data", e);
      }
    }
    return INITIAL_PROJECTS.map(normalizeProjectData);
  });

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const saved = localStorage.getItem('mln_drilling_selected_year');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return 2026;
  });

  const [highlightedAbbr, setHighlightedAbbr] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('mln_drilling_projects_sim', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('mln_drilling_selected_year', String(selectedYear));
  }, [selectedYear]);

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
    const normalized = normalizeProjectData(updated);
    setProjects((prev) => prev.map((proj) => (proj.year === normalized.year ? normalized : proj)));
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

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      
      let year = selectedYear;
      let name = currentProject.name;
      let reportingMonth = currentProject.reportingMonth;
      let accelerationFactor = currentProject.accelerationFactor;
      const wbsList: typeof currentProject.wbsList = [];
      const monthlyData: typeof currentProject.monthlyData = [];

      let currentSection = "";

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.startsWith("Project Name,")) {
          name = line.substring("Project Name,".length).replace(/^"|"$/g, '').trim();
          continue;
        }
        if (line.startsWith("Selected Plan Year,")) {
          const val = parseInt(line.substring("Selected Plan Year,".length).trim(), 10);
          if (!isNaN(val)) year = val;
          continue;
        }
        if (line.startsWith("Active Reporting Month,")) {
          const valStr = line.substring("Active Reporting Month,".length).replace(/^M/, '').trim();
          const val = parseInt(valStr, 10);
          if (!isNaN(val)) reportingMonth = val;
          continue;
        }
        if (line.startsWith("Future Recovery Rate Factor,")) {
          const valStr = line.substring("Future Recovery Rate Factor,".length).replace(/x$/, '').trim();
          const val = parseFloat(valStr);
          if (!isNaN(val)) accelerationFactor = val;
          continue;
        }

        if (line.includes("SECTION 1: WORK BREAKDOWN STRUCTURE")) {
          currentSection = "WBS";
          continue;
        }
        if (line.includes("SECTION 2: 12-MONTH CHRONOLOGICAL S-CURVE DATA")) {
          currentSection = "SCURVE";
          continue;
        }

        if (line.startsWith("WBS Index,") || line.startsWith("Month,Date Label,")) {
          continue;
        }

        const cells: string[] = [];
        let inQuotes = false;
        let currentCell = "";
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            cells.push(currentCell.trim());
            currentCell = "";
          } else {
            currentCell += char;
          }
        }
        cells.push(currentCell.trim());

        if (currentSection === "WBS" && cells.length >= 5) {
          const wbsIndex = cells[0];
          const wbsName = cells[1].replace(/^"|"$/g, '');
          const budget = parseFloat(cells[2].replace(/[$,]/g, ''));
          const spent = parseFloat(cells[3].replace(/[$,]/g, ''));
          const progress = parseFloat(cells[4].replace(/%/g, ''));

          if (wbsIndex && !isNaN(budget) && !isNaN(spent) && !isNaN(progress)) {
            wbsList.push({
              id: `wbs-imported-${wbsIndex.replace(/[^a-zA-Z0-9]/g, '')}`,
              name: wbsName || `Work Area ${wbsIndex}`,
              budget,
              spent,
              progress: Math.min(100, Math.max(0, progress))
            });
          }
        } else if (currentSection === "SCURVE" && cells.length >= 8) {
          const mStr = cells[0].replace(/^M/, '').trim();
          const monthNum = parseInt(mStr, 10);
          
          const targetCumulativeProgress = parseFloat(cells[3].replace(/%/g, ''));
          const actualCumStr = cells[5];
          const actualCumulativeProgress = (actualCumStr === "N/A" || actualCumStr === "") ? null : parseFloat(actualCumStr.replace(/%/g, ''));

          const targetCashFlow = parseFloat(cells[6].replace(/[$,]/g, ''));
          const actualCashStr = cells[7];
          const actualCashFlow = (actualCashStr === "N/A" || actualCashStr === "") ? null : parseFloat(actualCashStr.replace(/[$,]/g, ''));

          if (!isNaN(monthNum) && !isNaN(targetCumulativeProgress) && !isNaN(targetCashFlow)) {
            monthlyData.push({
              month: monthNum,
              targetCumulativeProgress,
              actualCumulativeProgress: isNaN(actualCumulativeProgress as number) ? null : actualCumulativeProgress,
              targetCashFlow,
              actualCashFlow: isNaN(actualCashFlow as number) ? null : actualCashFlow,
            });
          }
        }
      }

      if (wbsList.length > 0 || monthlyData.length > 0) {
        const importedProject: ProjectYearData = {
          year,
          name: name || `Project ${year} (Imported)`,
          reportingMonth: reportingMonth,
          accelerationFactor: accelerationFactor,
          wbsList: wbsList.length > 0 ? wbsList : currentProject.wbsList,
          monthlyData: monthlyData.length === 12 ? monthlyData : currentProject.monthlyData,
        };

        setSelectedYear(year);
        setProjects((prev) => {
          const exists = prev.some((p) => p.year === year);
          if (exists) {
            return prev.map((p) => (p.year === year ? normalizeProjectData(importedProject) : p));
          } else {
            return [...prev, normalizeProjectData(importedProject)];
          }
        });
      } else {
        alert("Could not identify valid WBS or S-Curve blocks in the CSV. Please make sure the layout matches the exported format.");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans select-none pb-12">
      {/* Print-Only Professional Document Header (Hidden during standard screen viewing) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3.5 mb-5 mx-6 mt-4">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[9px] font-mono font-black tracking-widest uppercase bg-slate-900 text-white px-2 py-0.5 rounded-xs">
              OFFICIAL ENGINEERING PROJECT SIMULATION LEDGER
            </span>
            <h1 className="text-xl font-black text-slate-950 tracking-tight mt-1 leading-none uppercase">
              {currentProject.name} Project Controls Report
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Phase 5 S-Curve Analytics & Earned Value Management (EVM) Suite • Algerian Sahara
            </p>
          </div>
          <div className="text-right text-[10px] text-slate-500 font-mono leading-tight bg-slate-50 border border-slate-200 rounded-lg p-2.5">
            <div><strong>Report Created:</strong> {new Date().toISOString().split('T')[0]}</div>
            <div><strong>Nominal Plan Year:</strong> {currentProject.year}</div>
            <div><strong>Active Reporting Cutoff Month:</strong> M{currentProject.reportingMonth}</div>
            <div className="font-bold text-red-600 mt-0.5">CLASSIFICATION: CO-PILOT INTEGRITY VERIFIED</div>
          </div>
        </div>
      </div>

      {/* Top Professional Header Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-3.5 shadow-xs print:hidden">
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
            <div className="flex items-center gap-1.5 bg-emerald-55/65 border border-emerald-200/50 rounded-lg px-2.5 py-1.5 text-xs text-emerald-800 font-medium font-sans">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Auto-Saved to Browser</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-500 font-medium">
              <CalendarDays className="w-3.5 h-3.5 text-blue-500" />
              <span>Reporting Horizon: <span className="font-bold text-slate-800 font-mono">12 Months</span></span>
            </div>

            {/* Export & Import buttons */}
            <label
              htmlFor="import-csv-file"
              className="text-xs font-bold text-slate-700 border border-slate-200 hover:border-violet-200 bg-white hover:bg-violet-50/50 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-3xs flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-violet-600" />
              Import CSV
            </label>
            <input
              type="file"
              id="import-csv-file"
              accept=".csv"
              className="hidden"
              onChange={handleImportCSV}
            />

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
