/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, Calculator, Info, HelpCircle } from 'lucide-react';
import { ProjectYearData } from '../types';

interface FormulaGlossaryProps {
  project: ProjectYearData;
  highlightedAbbr: string | null;
  onNavigateToAbbr: (abbr: string) => void;
}

export default function FormulaGlossary({ project, highlightedAbbr, onNavigateToAbbr }: FormulaGlossaryProps) {
  const C = project.reportingMonth;
  const currentMonthData = project.monthlyData.find((m) => m.month === C) || project.monthlyData[C - 1];

  // Live Math calculations for interactive display
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

  const EAC = CPI > 0 ? Math.round(totalBudget / CPI) : totalBudget + (AC - EV);
  const VAC = totalBudget - EAC;

  const spendRatio = totalBudget > 0 ? (totalSpent / totalBudget) : 0;
  const progressRatio = actualProgress / 100;
  const FLR = progressRatio > 0 ? spendRatio / progressRatio : 0;

  const glossaryItems = [
    {
      id: 'pv',
      abbr: 'PV',
      name: 'Planned Value',
      desc: 'The authorized budget baseline allocated to physical work scheduled to be completed by the active reporting date.',
      formula: 'Total Budget × Planned Cumulative Progress %',
      calculation: `$${totalBudget.toLocaleString()}k × ${targetProgress}% = $${PV.toLocaleString()}k`,
      interpretation: 'Represents the master project plan baseline. It sets the standard for schedule and spending expectations.'
    },
    {
      id: 'ev',
      abbr: 'EV',
      name: 'Earned Value',
      desc: 'The measure of work physically completed in the field, expressed in terms of the budget approved for that work (also known as BCWP - Budgeted Cost of Work Performed).',
      formula: 'Total Budget × Actual Cumulative Progress %',
      calculation: `$${totalBudget.toLocaleString()}k × ${actualProgress.toFixed(1)}% = $${EV.toLocaleString()}k`,
      interpretation: 'The true indicator of actual physical completion expressed as capital worth. Essential for determining efficiency.'
    },
    {
      id: 'ac',
      abbr: 'AC',
      name: 'Actual Cost',
      desc: 'The real capital expenditures in currency incurred for the physical work performed on active cost centers during the period.',
      formula: 'Sum of All Accrued Field Expenditures on Cost Centers',
      calculation: `$${totalSpent.toLocaleString()}k`,
      interpretation: 'Total verified outlays disbursed. Compare this with Earned Value (EV) to evaluate financial waste or efficiency.'
    },
    {
      id: 'sv',
      abbr: 'SV',
      name: 'Schedule Variance',
      desc: 'The mathematical difference between physical progress earned and the authorized baseline schedule, in capital terms.',
      formula: 'Earned Value (EV) - Planned Value (PV)',
      calculation: `$${EV.toLocaleString()}k - $${PV.toLocaleString()}k = ${SV >= 0 ? '+' : ''}$${SV.toLocaleString()}k`,
      interpretation: 'A positive variance indicates we are ahead of schedule. A negative variance means drilling or mobilization is dragging.'
    },
    {
      id: 'cv',
      abbr: 'CV',
      name: 'Cost Variance',
      desc: 'The mathematical difference between physical progress earned (EV) and the actual cash burnt (AC).',
      formula: 'Earned Value (EV) - Actual Cost (AC)',
      calculation: `$${EV.toLocaleString()}k - $${AC.toLocaleString()}k = ${CV >= 0 ? '+' : ''}$${CV.toLocaleString()}k`,
      interpretation: 'Positive CV represents a financial surplus (under-budget). Negative CV reveals a hard resource or logistics costing overrun.'
    },
    {
      id: 'spi',
      abbr: 'SPI',
      name: 'Schedule Performance Index',
      desc: 'A ratio showing schedule efficiency. Measures drilling velocity relative to the master planned progress curve.',
      formula: 'Earned Value (EV) / Planned Value (PV)',
      calculation: `$${EV.toLocaleString()}k / $${PV.toLocaleString()}k = ${SPI.toFixed(2)}`,
      interpretation: 'SPI ≥ 1.0 means progress is on-time or fast. SPI < 1.0 indicates critical timeline deviations (delay risk).'
    },
    {
      id: 'cpi',
      abbr: 'CPI',
      name: 'Cost Performance Index',
      desc: 'A ratio showing financial efficiency. Evaluates physical progress earned for every dollar spent at the rig site.',
      formula: 'Earned Value (EV) / Actual Cost (AC)',
      calculation: `$${EV.toLocaleString()}k / $${AC.toLocaleString()}k = ${CPI.toFixed(2)}`,
      interpretation: 'CPI ≥ 1.0 indicates excellent financial stewardship (cost efficiency). CPI < 1.0 denotes financial overruns.'
    },
    {
      id: 'eac',
      abbr: 'EAC',
      name: 'Estimate at Completion',
      desc: 'The projected final total budget requirement for the entire campaign, based on active cost center performance to date.',
      formula: 'Total Budget / Cost Performance Index (CPI)',
      calculation: `$${totalBudget.toLocaleString()}k / ${CPI.toFixed(2)} = $${EAC.toLocaleString()}k`,
      interpretation: 'Calculates the real expected final project envelope if current drilling cost efficiencies persist. Absolute key metric for desert site auditors.'
    },
    {
      id: 'vac',
      abbr: 'VAC',
      name: 'Variance at Completion',
      desc: 'The forecasted final deficit or surplus at the completion of all physical milestones against the authorized baseline.',
      formula: 'Total Budget - Estimate at Completion (EAC)',
      calculation: `$${totalBudget.toLocaleString()}k - $${EAC.toLocaleString()}k = ${VAC >= 0 ? '+' : ''}$${VAC.toLocaleString()}k`,
      interpretation: 'Negative numbers show expected dollar magnitude overruns by project end. Positive denotes a projected capital surplus.'
    },
    {
      id: 'flr',
      abbr: 'FLR',
      name: 'Front-Loading Ratio',
      desc: 'An indicator representing the severity of early cash drawdowns by contractors compared to actual physically verified milestones.',
      formula: 'Spent % / Actual Progress %',
      calculation: `${(spendRatio * 100).toFixed(1)}% / ${actualProgress.toFixed(1)}% = ${FLR.toFixed(2)}x`,
      interpretation: 'FLR > 1.30 indicates critical risk where funds are drained prior to hitting key physical drilling depths.'
    }
  ];

  return (
    <div id="project-controls-abbreviation-formula-glossary" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden font-sans">
      <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              EVM Formula & Metric Reference Manual
            </h3>
            <p className="text-[11px] text-slate-400 font-medium">
              Click individual metric indicators across the panels to jump directly to their mathematical formulas and explanations.
            </p>
          </div>
        </div>

        <span className="text-[10px] hidden sm:inline-flex items-center gap-1 font-mono text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          EVM Standards Compliant
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {glossaryItems.map((item) => {
          const isHighlighted = highlightedAbbr === item.id;
          return (
            <div
              key={item.id}
              id={`abbr-${item.id}`}
              className={`p-4 rounded-xl border transition-all duration-300 ${
                isHighlighted
                  ? 'bg-amber-50/40 border-amber-400 ring-4 ring-amber-100 scale-[1.01] shadow-md'
                  : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-sm ${
                    isHighlighted ? 'bg-amber-100 text-amber-900 font-black' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {item.abbr}
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 tracking-tight">{item.name}</h4>
                </div>
                <button
                  onClick={() => onNavigateToAbbr(item.id)}
                  title="Reference link"
                  className="text-slate-300 hover:text-slate-500 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11.5px] text-slate-500 leading-relaxed mb-3">{item.desc}</p>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 font-mono text-[10px]">
                <div className="flex items-start gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-400 uppercase text-[8px] font-bold block">EVM Formula</span>
                    <code className="text-slate-700 font-bold break-words whitespace-normal block">{item.formula}</code>
                  </div>
                </div>

                <div className="flex items-start gap-1.5 pt-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-[8px] tracking-tighter shrink-0 mt-0.5 font-sans">
                    LIVE
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-400 uppercase text-[8px] font-bold block">Simulator Current Result</span>
                    <span className="text-emerald-700 font-extrabold break-words whitespace-normal block">{item.calculation}</span>
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-400 font-sans italic pt-1 mb-0 mt-2 leading-relaxed">
                  <strong>Interpretation:</strong> {item.interpretation}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
