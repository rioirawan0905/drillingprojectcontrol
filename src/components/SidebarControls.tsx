/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProjectYearData, WBSItem, MonthlyData } from '../types';
import { Plus, Trash2, Sliders, Layers, DollarSign, Copy } from 'lucide-react';
import SafeNumberInput from './SafeNumberInput';

interface SidebarControlsProps {
  currentProject: ProjectYearData;
  allProjects: ProjectYearData[];
  onSelectProject: (year: number) => void;
  onUpdateProject: (updated: ProjectYearData) => void;
}

export default function SidebarControls({
  currentProject,
  allProjects,
  onSelectProject,
  onUpdateProject,
}: SidebarControlsProps) {
  const [activeTab, setActiveTab] = useState<'wbs' | 'timephased'>('wbs');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const prevProject = allProjects.find((p) => p.year === currentProject.year - 1);

  // Carry over previous year's WBS
  const carryOverPreviousYearWBS = () => {
    if (!prevProject) return;

    if (
      window.confirm(
        `Are you sure you want to carry over the WBS structure from ${prevProject.year} (${prevProject.name})? This will replace your current WBS Cost Centers. Budget values will be copied, while Spent and Physical Progress will be reset to 0.`
      )
    ) {
      const carriedWBS: WBSItem[] = prevProject.wbsList.map((item, idx) => ({
        id: `wbs-${Date.now()}-${idx}`,
        name: item.name,
        budget: item.budget,
        spent: 0,
        progress: 0,
      }));

      onUpdateProject({
        ...currentProject,
        wbsList: carriedWBS,
      });
    }
  };

  // Handle Month slider update
  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    
    // Auto sync actual cumulative progress / actual cash flows when active month moves down or up
    const updatedMonthly = currentProject.monthlyData.map((m) => {
      if (m.month > val) {
        // Clear future actuals to null
        return {
          ...m,
          actualCumulativeProgress: null,
          actualCashFlow: null,
        };
      } else {
        // If it was null but is now historical, set it to plan progress or 0 as baseline
        const progressVal = m.actualCumulativeProgress ?? Math.min(100, Math.round(m.targetCumulativeProgress * 0.9));
        const cashValue = m.actualCashFlow ?? Math.round(m.targetCashFlow * 0.95);
        return {
          ...m,
          actualCumulativeProgress: progressVal,
          actualCashFlow: cashValue,
        };
      }
    });

    onUpdateProject({
      ...currentProject,
      reportingMonth: val,
      monthlyData: updatedMonthly,
    });
  };

  // Handle Acceleration factor slider
  const handleAccelerationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onUpdateProject({
      ...currentProject,
      accelerationFactor: val,
    });
  };

  // Update specific WBS item
  const updateWBSItem = (id: string, key: keyof WBSItem, value: string | number) => {
    const updatedWBS = currentProject.wbsList.map((item) => {
      if (item.id === id) {
        let parsedVal = value;
        if (key !== 'name' && typeof value === 'string') {
          const num = parseFloat(value);
          parsedVal = isNaN(num) ? 0 : num;
        }

        // Apply clamping where necessary, support decimals
        if (key === 'progress') {
          parsedVal = Math.round(Math.max(0, parsedVal as number) * 10) / 10;
        } else if (key === 'budget' || key === 'spent') {
          parsedVal = Math.max(0, parsedVal as number);
        }

        return { ...item, [key]: parsedVal };
      }
      return item;
    });

    onUpdateProject({
      ...currentProject,
      wbsList: updatedWBS,
    });
  };

  // Add a new WBS item
  const addWBSItem = () => {
    const newItem: WBSItem = {
      id: `wbs-${Date.now()}`,
      name: "New Cost Center",
      budget: 100,
      spent: 0,
      progress: 0,
    };
    onUpdateProject({
      ...currentProject,
      wbsList: [...currentProject.wbsList, newItem],
    });
  };

  // Delete a WBS item
  const deleteWBSItem = (id: string) => {
    const filtered = currentProject.wbsList.filter((item) => item.id !== id);
    onUpdateProject({
      ...currentProject,
      wbsList: filtered,
    });
  };

  // Update specific monthly cell
  const updateMonthlyCell = (month: number, key: keyof MonthlyData, value: string | number | null) => {
    const updatedMonthlyList = currentProject.monthlyData.map((m) => {
      if (m.month === month) {
        if (value === null || value === '') {
          return { ...m, [key]: null };
        }
        
        let parsedVal = typeof value === 'string' ? parseFloat(value) : value;
        parsedVal = isNaN(parsedVal) ? 0 : parsedVal;

        if (key === 'targetCumulativeProgress') {
          parsedVal = Math.min(100, Math.max(0, Math.round(parsedVal * 10) / 10));
        } else if (key === 'actualCumulativeProgress') {
          parsedVal = Math.max(0, Math.round(parsedVal * 10) / 10);
        } else if (key === 'targetCashFlow' || key === 'actualCashFlow') {
          parsedVal = Math.max(0, parsedVal);
        }

        return { ...m, [key]: parsedVal };
      }
      return m;
    });

    onUpdateProject({
      ...currentProject,
      monthlyData: updatedMonthlyList,
    });
  };

  return (
    <div id="sim-sidebar-controls" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden h-full flex flex-col font-sans">
      {/* Title & Campaign Selector */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2 mb-3">
          <Sliders className="w-4.5 h-4.5 text-blue-600" id="controls-header-icon" />
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Project Control Panel</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label htmlFor="year-select" className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Select Year & Campaign</label>
            <select
              id="year-select"
              value={currentProject.year}
              onChange={(e) => onSelectProject(parseInt(e.target.value, 10))}
              className="w-full text-xs bg-white border border-slate-200 hover:border-slate-300 rounded-lg px-3 py-2 text-slate-750 font-bold focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition-colors cursor-pointer"
            >
              {allProjects.map((proj) => (
                <option key={proj.year} value={proj.year}>
                  {proj.year} — {proj.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="campaign-title-input" className="block text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Edit Campaign Title</label>
            <input
              id="campaign-title-input"
              type="text"
              value={currentProject.name}
              onChange={(e) => onUpdateProject({ ...currentProject, name: e.target.value })}
              placeholder="e.g. Phase 5 Infill Campaign"
              className="w-full text-xs bg-white text-slate-800 border border-slate-200 focus:ring-1 focus:ring-blue-500 focus:outline-hidden rounded-lg px-3 py-2 font-semibold transition-shadow"
            />
          </div>
        </div>
      </div>

      {/* Global Project Sim Sliders */}
      <div className="p-5 border-b border-slate-100 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="rep-month-slider" className="text-xs font-semibold text-slate-600">
              Reporting Month: <span className="font-bold text-blue-600 font-mono">M{currentProject.reportingMonth}</span>
            </label>
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-blue-50 font-mono text-blue-600 font-bold uppercase tracking-wider">Actuals Limit</span>
          </div>
          <input
            id="rep-month-slider"
            type="range"
            min="1"
            max="12"
            value={currentProject.reportingMonth}
            onChange={handleMonthChange}
            className="w-full accent-blue-600 h-1 bg-slate-200 rounded appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1 font-bold">
            <span>M1</span>
            <span>M4</span>
            <span className="text-blue-600 uppercase">Active (M{currentProject.reportingMonth})</span>
            <span>M10</span>
            <span>M12</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="accel-factor-slider" className="text-xs font-semibold text-slate-600">
              Future Recovery Rate: <span className="font-bold text-emerald-600 font-mono">{currentProject.accelerationFactor.toFixed(1)}x</span>
            </label>
            <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-emerald-50 font-mono text-emerald-600 font-bold uppercase tracking-wider">Catch-Up</span>
          </div>
          <input
            id="accel-factor-slider"
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={currentProject.accelerationFactor}
            onChange={handleAccelerationChange}
            className="w-full accent-emerald-500 h-1 bg-slate-200 rounded appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-1 font-bold">
            <span>0.5x (Diluted)</span>
            <span>1.0x (Baseline)</span>
            <span>1.5x (Uncapped)</span>
          </div>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-100 bg-slate-50/20">
        <button
          onClick={() => setActiveTab('wbs')}
          className={`flex-1 py-3 text-xs font-semibold border-b-2 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'wbs'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          WBS Work Centers
        </button>
        <button
          onClick={() => setActiveTab('timephased')}
          className={`flex-1 py-3 text-xs font-semibold border-b-2 text-center flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'timephased'
              ? 'border-blue-600 text-blue-600 bg-white'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          Time-Phased Matrix
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {activeTab === 'wbs' && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs text-slate-400 font-medium">Modify Work Breakdown Structure</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {prevProject && (
                  <button
                    onClick={carryOverPreviousYearWBS}
                    title={`Carry over WBS Work Centers structure from ${prevProject.year} (${prevProject.name})`}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100/70 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shadow-3xs"
                  >
                    <Copy className="w-3.5 h-3.5" /> Carry Over '{prevProject.year ? String(prevProject.year).substring(2) : ""} WBS
                  </button>
                )}
                <button
                  onClick={addWBSItem}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100/70 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Center
                </button>
              </div>
            </div>

            {currentProject.wbsList.map((item, index) => (
              <div
                key={item.id}
                className="p-3 bg-slate-50/70 border border-slate-100 hover:border-slate-200 rounded-xl space-y-2.5 transition-all relative group overflow-hidden"
              >
                {deletingId === item.id ? (
                  <div className="py-2 px-1 text-center space-y-3 animate-fade-in select-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="p-1.5 bg-rose-50 text-rose-600 rounded-full">
                        <Trash2 className="w-4 h-4 animate-bounce" />
                      </div>
                      <span className="text-xs font-bold text-rose-700">Delete Cost Center?</span>
                      <p className="text-[10px] text-slate-500 leading-normal max-w-[200px] mx-auto">
                        Are you sure you want to delete <strong className="font-bold text-slate-800">"{item.name || `WBS Center ${index + 1}`}"</strong>? All budget, spent, and progress tracking records for this center will be permanently removed.
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => setDeletingId(null)}
                        className="px-3 py-1.5 text-[10px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-800 cursor-pointer transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          deleteWBSItem(item.id);
                          setDeletingId(null);
                        }}
                        className="px-3 py-1.5 text-[10px] font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 cursor-pointer transition-all shadow-xs"
                      >
                        Confirm Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setDeletingId(item.id)}
                      title="Remove cost center"
                      className="absolute right-2 top-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-0.5">WBS Center {index + 1}</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateWBSItem(item.id, 'name', e.target.value)}
                        className="w-full text-xs bg-white text-slate-800 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded px-2 py-1.5 font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Budget ($k)</label>
                        <SafeNumberInput
                          step="5"
                          value={item.budget}
                          onChange={(val) => updateWBSItem(item.id, 'budget', val ?? 0)}
                          className="w-full text-xs bg-white text-slate-800 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 font-mono hover:border-slate-300 transition-colors text-center"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Spent ($k)</label>
                        <SafeNumberInput
                          step="5"
                          value={item.spent}
                          onChange={(val) => updateWBSItem(item.id, 'spent', val ?? 0)}
                          className="w-full text-xs bg-white text-slate-800 border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 font-mono hover:border-slate-300 transition-colors text-center"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>Physical Progress (EV)</span>
                        <span className="font-bold text-slate-700">{item.progress}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={item.progress > 100 ? Math.ceil(item.progress) : "100"}
                        step="0.1"
                        value={item.progress}
                        onChange={(e) => updateWBSItem(item.id, 'progress', parseFloat(e.target.value))}
                        className="w-full accent-blue-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </>
                )}
              </div>
            ))}
            
            {currentProject.wbsList.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                No WBS centers available. Click the button above to add one.
              </div>
            )}
          </div>
        )}

        {activeTab === 'timephased' && (
          <div className="space-y-4 animate-fade-in">
            <span className="text-xs text-slate-400 font-medium block">
              12-Month S-Curve Progress & Cash Flow (Target vs Actuals)
            </span>

            <div className="space-y-3">
              {currentProject.monthlyData.map((m) => {
                const isHistorical = m.month <= currentProject.reportingMonth;
                return (
                  <div
                    key={m.month}
                    className={`p-3 rounded-xl border ${
                      isHistorical 
                        ? 'bg-blue-50/10 border-blue-100/40 hover:border-blue-200/50' 
                        : 'bg-slate-50/40 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-dashed border-slate-100">
                      <span className="text-xs font-bold text-slate-700">Month {m.month}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-mono font-medium tracking-wide ${
                        isHistorical ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/80 text-slate-500'
                      }`}>
                        {isHistorical ? 'HISTORICAL' : 'TARGET/FUTURE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="block text-[9px] font-medium text-slate-500 mb-0.5">Target Cum %</label>
                        <SafeNumberInput
                          step="0.1"
                          value={m.targetCumulativeProgress}
                          onChange={(val) => updateMonthlyCell(m.month, 'targetCumulativeProgress', val)}
                          className="w-full text-xs bg-white text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-slate-500 mb-0.5">
                          Actual Cum %
                        </label>
                        <SafeNumberInput
                          step="0.1"
                          value={m.actualCumulativeProgress}
                          placeholder="0"
                          onChange={(val) => updateMonthlyCell(m.month, 'actualCumulativeProgress', val)}
                          className="w-full text-xs rounded px-1.5 py-0.5 font-mono border bg-white border-slate-200 text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                       <div>
                        <label className="block text-[9px] font-medium text-slate-500 mb-0.5">Target Cash Flow ($k)</label>
                        <SafeNumberInput
                          step="5"
                          value={m.targetCashFlow}
                          onChange={(val) => updateMonthlyCell(m.month, 'targetCashFlow', val)}
                          className="w-full text-xs bg-white text-slate-800 border border-slate-200 rounded px-1.5 py-0.5 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-medium text-slate-500 mb-0.5">
                          Actual Cash Flow ($k)
                        </label>
                        <SafeNumberInput
                          step="5"
                          value={m.actualCashFlow}
                          placeholder="0"
                          onChange={(val) => updateMonthlyCell(m.month, 'actualCashFlow', val)}
                          className="w-full text-xs rounded px-1.5 py-0.5 font-mono border bg-white border-slate-205 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
