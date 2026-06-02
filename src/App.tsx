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
import PrintReportView from './components/PrintReportView';
import { Compass, CalendarDays, FileSpreadsheet, Download, FileText, Check, Upload, Settings, X, Printer, Layout, Palette } from 'lucide-react';

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

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [printConfig, setPrintConfig] = useState({
    title: "Drilling MLN Phase 5 Project Controls Summary",
    subtitle: "Earned Value Management (EVM) & S-Curve Analytical Report",
    preparedBy: "Project Controls Dept.",
    classification: "CONFIDENTIAL / INTERNAL USE ONLY",
    includeCoverPage: true,
    includeKPIs: true,
    includeCharts: true,
    chartsScope: 'year' as 'year' | 'campaign',
    showDataLabels: true,
    includeLedger: true,
    includeWBS: true,
    includeAdvisory: true,
    includeSignOff: true,
    colorTheme: 'executive' as 'executive' | 'slate' | 'emerald' | 'monochrome'
  });

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

  const parseSingleYearBlock = (defaultYear: number, blockLines: string[]) => {
    let year = defaultYear;
    let name = "";
    let reportingMonth = 1;
    let accelerationFactor = 1.0;
    const wbsList: any[] = [];
    const monthlyData: any[] = [];
    let currentSection = "";

    for (let line of blockLines) {
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
            id: `wbs-imported-${year}-${wbsIndex.replace(/[^a-zA-Z0-9]/g, '')}`,
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

    return {
      year,
      name,
      reportingMonth,
      accelerationFactor,
      wbsList,
      monthlyData,
    };
  };

  const handleExportCSV = () => {
    let csvContent = "";
    
    // Export all year campaigns, ordered chronologically
    const sortedProjects = [...projects].sort((a, b) => a.year - b.year);
    
    sortedProjects.forEach((proj) => {
      csvContent += `=== START CAMPAIGN YEAR: ${proj.year} ===\n`;
      csvContent += `DRILLING PROJECT CONTROLS SIMULATION LEDGER\n`;
      csvContent += `Project Name,${proj.name}\n`;
      csvContent += `Selected Plan Year,${proj.year}\n`;
      csvContent += `Active Reporting Month,M${proj.reportingMonth}\n`;
      csvContent += `Future Recovery Rate Factor,${proj.accelerationFactor}x\n\n`;

      csvContent += `SECTION 1: WORK BREAKDOWN STRUCTURE (WBS) BUDGETS & PROGRESS\n`;
      csvContent += `WBS Index,Cost Center Name,Approved Budget ($k),Verified Spent ($k),Physical Progress (%)\n`;
      proj.wbsList.forEach((item, index) => {
        csvContent += `WBS-${String(index + 1).padStart(2, '0')},"${item.name.replace(/"/g, '""')}",${item.budget},${item.spent},${item.progress}\n`;
      });
      csvContent += `\n`;

      csvContent += `SECTION 2: 12-MONTH CHRONOLOGICAL S-CURVE DATA\n`;
      csvContent += `Month,Date Label,Planned Incremental Target (%),Planned Cumulative Target (%),Actual Incremental Progress (%),Actual Cumulative Progress (%),Planned Drawdown ($k),Actual Drawdown ($k)\n`;
      
      const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      proj.monthlyData.forEach((m, idx) => {
        const label = `${MONTH_NAMES[m.month - 1]}-${String(proj.year).substring(2)}`;
        const prevTarget = idx === 0 ? 0 : proj.monthlyData[idx - 1].targetCumulativeProgress;
        const incTarget = m.targetCumulativeProgress - prevTarget;

        let incActual: string | number = "N/A";
        let cumActual: string | number = "N/A";
        let actCash: string | number = "N/A";

        if (m.month <= proj.reportingMonth) {
          const prevActual = idx === 0 ? 0 : (proj.monthlyData[idx - 1].actualCumulativeProgress ?? 0);
          incActual = (m.actualCumulativeProgress ?? 0) - prevActual;
          cumActual = m.actualCumulativeProgress ?? 0;
          actCash = m.actualCashFlow ?? 0;
        }

        csvContent += `M${m.month},${label},${incTarget}%,${m.targetCumulativeProgress}%,${incActual}%,${cumActual}%,${m.targetCashFlow},${actCash}\n`;
      });
      csvContent += `=== END CAMPAIGN YEAR: ${proj.year} ===\n\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `MLN_Phase5_ProjectControls_All_Campaign_Years.csv`);
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
      const containsCampaignBlocks = text.includes("=== START CAMPAIGN YEAR:");

      if (containsCampaignBlocks) {
        // Multi-year campaign import
        const importedProjectsMap = new Map<number, {
          year: number;
          name: string;
          reportingMonth: number;
          accelerationFactor: number;
          wbsList: any[];
          monthlyData: any[];
        }>();

        let currentBlockYear: number | null = null;
        let blockLines: string[] = [];

        for (let line of lines) {
          const rLine = line.trim();
          if (!rLine) continue;

          const startMatch = rLine.match(/^===\s*START CAMPAIGN YEAR:\s*(\d+)\s*===/i);
          const endMatch = rLine.match(/^===\s*END CAMPAIGN YEAR:\s*(\d+)\s*===/i);

          if (startMatch) {
            currentBlockYear = parseInt(startMatch[1], 10);
            blockLines = [];
            continue;
          }

          if (endMatch) {
            if (currentBlockYear !== null) {
              const parsedBlock = parseSingleYearBlock(currentBlockYear, blockLines);
              if (parsedBlock) {
                importedProjectsMap.set(currentBlockYear, parsedBlock);
              }
              currentBlockYear = null;
            }
            continue;
          }

          if (currentBlockYear !== null) {
            blockLines.push(line);
          }
        }

        if (importedProjectsMap.size > 0) {
          setProjects((prev) => {
            const updated = prev.map((proj) => {
              const imported = importedProjectsMap.get(proj.year);
              if (imported) {
                return normalizeProjectData({
                  year: proj.year,
                  name: imported.name || proj.name,
                  reportingMonth: imported.reportingMonth,
                  accelerationFactor: imported.accelerationFactor,
                  wbsList: imported.wbsList.length > 0 ? imported.wbsList : proj.wbsList,
                  monthlyData: imported.monthlyData.length === 12 ? imported.monthlyData : proj.monthlyData,
                });
              }
              return proj;
            });

            // Put any years of the campaign we imported but don't exist in previous list
            const finalProjects = [...updated];
            for (const [yr, imported] of importedProjectsMap.entries()) {
              if (!finalProjects.some((p) => p.year === yr)) {
                finalProjects.push(normalizeProjectData({
                  year: yr,
                  name: imported.name || `Project ${yr} (Imported)`,
                  reportingMonth: imported.reportingMonth,
                  accelerationFactor: imported.accelerationFactor,
                  wbsList: imported.wbsList.length > 0 ? imported.wbsList : [],
                  monthlyData: imported.monthlyData.length === 12 ? imported.monthlyData : [],
                }));
              }
            }

            return finalProjects;
          });

          // Set active view to the first imported year, or keep current if it was updated
          const years = Array.from(importedProjectsMap.keys());
          if (years.includes(selectedYear)) {
            // Keep selected year as is since it was updated
          } else if (years.length > 0) {
            setSelectedYear(years[0]);
          }
        } else {
          alert("Could not identify valid campaign year blocks in the multi-year CSV. Please check the format.");
        }
      } else {
        // Fallback to single project parsing for backward compatibility
        const parsedBlock = parseSingleYearBlock(selectedYear, lines);
        
        if (parsedBlock.wbsList.length > 0 || parsedBlock.monthlyData.length > 0) {
          const importedProject: ProjectYearData = {
            year: parsedBlock.year,
            name: parsedBlock.name || `Project ${parsedBlock.year} (Imported)`,
            reportingMonth: parsedBlock.reportingMonth,
            accelerationFactor: parsedBlock.accelerationFactor,
            wbsList: parsedBlock.wbsList.length > 0 ? parsedBlock.wbsList : currentProject.wbsList,
            monthlyData: parsedBlock.monthlyData.length === 12 ? parsedBlock.monthlyData : currentProject.monthlyData,
          };

          setSelectedYear(parsedBlock.year);
          setProjects((prev) => {
            const exists = prev.some((p) => p.year === parsedBlock.year);
            if (exists) {
              return prev.map((p) => (p.year === parsedBlock.year ? normalizeProjectData(importedProject) : p));
            } else {
              return [...prev, normalizeProjectData(importedProject)];
            }
          });
        } else {
          alert("Could not identify valid WBS or S-Curve blocks in the CSV. Please make sure the layout matches the exported format.");
        }
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const handleExportPDF = () => {
    setIsPrintModalOpen(true);
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

      {/* Print dynamic orientation injection */}
      <style>{`
        @media print {
          @page { 
            size: ${printOrientation}; 
            margin: 15mm 15mm 15mm 15mm; 
          }
        }
      `}</style>

      {/* Dedicate print-only component rendered on-demand */}
      <PrintReportView
        project={currentProject}
        allProjects={projects}
        config={printConfig}
        orientation={printOrientation}
      />

      {/* PRINT CONFIGURATOR modal/dialog */}
      {isPrintModalOpen && (
        <div id="print-configurator-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 select-text">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Printer className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wide">Professional Management PDF Configurator</h3>
                  <p className="text-[11px] text-slate-400">Tailored Earned Value Report for Operations & Execs</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1 text-slate-850">
              {/* Orientation Option */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-2 font-mono">1. Report Page Orientation</span>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPrintOrientation('portrait')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${printOrientation === 'portrait' ? 'border-slate-800 bg-slate-50' : 'border-slate-150 hover:border-slate-350'}`}
                  >
                    <div className="w-5 h-7 border border-slate-400 rounded bg-white flex items-center justify-center shrink-0 shadow-3xs">
                      <div className="w-3.5 h-0.5 bg-slate-300" />
                    </div>
                    <div>
                      <span className="block font-black text-xs text-slate-900 font-sans">Portrait Orientation</span>
                      <span className="text-[10px] text-slate-450 block">Best for standard vertical, clean tables, & summaries</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setPrintOrientation('landscape')}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${printOrientation === 'landscape' ? 'border-slate-800 bg-slate-50' : 'border-slate-150 hover:border-slate-350'}`}
                  >
                    <div className="w-7 h-5 border border-slate-400 rounded bg-white flex items-center justify-center shrink-0 shadow-3xs">
                      <div className="w-5 h-0.5 bg-slate-300" />
                    </div>
                    <div>
                      <span className="block font-black text-xs text-slate-900 font-sans">Landscape Orientation</span>
                      <span className="text-[10px] text-slate-450 block">Excellent for broad S-Curve chronological data grids</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Theme Settings Selection */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-2 font-mono">2. Executive Visual Style Theme</span>
                <div className="grid grid-cols-4 gap-2.5">
                  {[
                    { id: 'executive', name: 'Navy Corporate', color: 'bg-blue-800' },
                    { id: 'slate', name: 'Charcoal Minimal', color: 'bg-slate-700' },
                    { id: 'emerald', name: 'Operations Green', color: 'bg-emerald-800' },
                    { id: 'monochrome', name: 'High-Contrast B&W', color: 'bg-black' }
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setPrintConfig(prev => ({ ...prev, colorTheme: theme.id as any }))}
                      className={`flex flex-col items-center p-2.5 border rounded-xl hover:bg-slate-50 transition-all text-center cursor-pointer ${printConfig.colorTheme === theme.id ? 'border-slate-800 ring-2 ring-slate-800/20' : 'border-slate-150'}`}
                    >
                      <div className={`w-5 h-5 rounded-full ${theme.color} mb-1.5`} />
                      <span className="text-[9.5px] font-bold text-slate-800 tracking-tight leading-none block">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Report Metadata Form */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 col-span-1 md:col-span-2 select-text">
                <div className="col-span-1 md:col-span-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-550 mb-0.5 font-mono">3. Document Metadata</span>
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">Report Master Title</label>
                  <input
                    type="text"
                    value={printConfig.title}
                    onChange={(e) => setPrintConfig(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-850 text-slate-800 font-medium"
                    placeholder="E.g. Drilling Report"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-500 uppercase mb-1">Subtitle / Purpose</label>
                  <input
                    type="text"
                    value={printConfig.subtitle}
                    onChange={(e) => setPrintConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-850 text-slate-805 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-505 uppercase mb-1">Prepared By (Authority)</label>
                  <input
                    type="text"
                    value={printConfig.preparedBy}
                    onChange={(e) => setPrintConfig(prev => ({ ...prev, preparedBy: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-850 text-slate-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-slate-505 uppercase mb-1">Control Classification</label>
                  <input
                    type="text"
                    value={printConfig.classification}
                    onChange={(e) => setPrintConfig(prev => ({ ...prev, classification: e.target.value }))}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-slate-850 text-slate-800 font-medium font-mono"
                  />
                </div>
              </div>

              {/* S-Curve and Cost Charts Options */}
              <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4 col-span-1 md:col-span-2 select-text">
                <div className="col-span-1 md:col-span-2 flex justify-between items-center bg-blue-50/50 p-2 rounded">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-900 font-mono">4. Performance Graphics Selector</span>
                  <button
                    type="button"
                    onClick={() => setPrintConfig(prev => ({ ...prev, includeCharts: !prev.includeCharts }))}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded text-[10px] font-bold transition-all border shrink-0 cursor-pointer ${printConfig.includeCharts ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-505 border-slate-200'}`}
                  >
                    {printConfig.includeCharts ? '✓ Graphs Included' : '✖ Graphs Excluded'}
                  </button>
                </div>
                {printConfig.includeCharts && (
                  <div className="col-span-1 md:col-span-2 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setPrintConfig(prev => ({ ...prev, chartsScope: 'year' }))}
                        className={`flex flex-col p-2.5 border rounded-lg text-left transition-all cursor-pointer ${printConfig.chartsScope === 'year' ? 'border-blue-600 bg-white ring-2 ring-blue-600/10' : 'border-slate-200 hover:bg-white bg-slate-50/20'}`}
                      >
                        <span className="text-[10px] font-bold text-slate-850 leading-none">Selected Year ({selectedYear})</span>
                        <span className="text-[9px] text-slate-455 mt-1 block leading-tight">Plots S-Curve and expenditure drawdown specifically for the single selected fiscal timeline.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPrintConfig(prev => ({ ...prev, chartsScope: 'campaign' }))}
                        className={`flex flex-col p-2.5 border rounded-lg text-left transition-all cursor-pointer ${printConfig.chartsScope === 'campaign' ? 'border-blue-600 bg-white ring-2 ring-blue-600/10' : 'border-slate-200 hover:bg-white bg-slate-50/20'}`}
                      >
                        <span className="text-[10px] font-bold text-slate-855 leading-none">Full Campaign (2025-2028)</span>
                        <span className="text-[9px] text-slate-455 mt-1 block leading-tight">Amalgamates data across all four physical wells to graph the complete master project milestone trajectory.</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 bg-white/70 rounded-lg border border-blue-100 hover:bg-white transition-all">
                      <button
                        type="button"
                        onClick={() => setPrintConfig(prev => ({ ...prev, showDataLabels: !prev.showDataLabels }))}
                        className="flex items-center gap-2.5 text-left cursor-pointer w-full"
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${printConfig.showDataLabels ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {printConfig.showDataLabels && <Check className="w-3 h-3 text-white stroke-[3.5px]" />}
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-850 leading-none block">Display Data Labels on S-Curves</span>
                          <span className="text-[9px] text-slate-455 mt-1 block">Renders exact percentages over plotting coordinate bubbles for direct auditing</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Toggles for Section Inclusions */}
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-2.5 font-mono">5. Select Sections to Include in Report</span>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'includeCoverPage', label: 'Formal Cover Page' },
                    { key: 'includeKPIs', label: 'EVM KPI Brief Panel' },
                    { key: 'includeLedger', label: '12-Month S-Curve Matrix' },
                    { key: 'includeWBS', label: 'WBS Cost Centers health' },
                    { key: 'includeAdvisory', label: 'AI Risk Advisory Memo' },
                    { key: 'includeSignOff', label: 'Acceptance Sign-Off Block' },
                  ].map((sec) => {
                    const active = (printConfig as any)[sec.key];
                    return (
                      <button
                        key={sec.key}
                        type="button"
                        onClick={() => setPrintConfig(prev => ({ ...prev, [sec.key]: !active }))}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all text-left cursor-pointer ${active ? 'border-slate-855 bg-slate-50/50' : 'border-slate-150 text-slate-400'}`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white'}`}>
                          {active && <Check className="w-3 h-3 text-white stroke-[3.5px]" />}
                        </div>
                        <span className="text-[10px] font-bold text-slate-850 leading-none">{sec.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-between items-center shrink-0">
              <span className="text-[10px] text-slate-450 font-mono tracking-wide">
                Configured: {printOrientation.toUpperCase()} size page margin ready
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-808 border border-slate-200 hover:border-slate-350 px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPrintModalOpen(false);
                    setTimeout(() => {
                      window.print();
                    }, 180);
                  }}
                  className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-5 py-2 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  Print / Save PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
