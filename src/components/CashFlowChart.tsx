/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ProjectYearData } from '../types';

interface CashFlowChartProps {
  project: ProjectYearData;
}

export default function CashFlowChart({ project }: CashFlowChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const C = project.reportingMonth;
  const data = project.monthlyData;

  // Chart Dimensions
  const containerWidth = 750;
  const containerHeight = 220;
  const margin = { top: 20, right: 30, bottom: 40, left: 55 };

  const chartWidth = containerWidth - margin.left - margin.right;
  const chartHeight = containerHeight - margin.top - margin.bottom;

  // Find maximum cash flow to scale the bar chart dynamically
  const maxCashInTimeline = Math.max(
    ...data.map((m) => Math.max(m.targetCashFlow, m.actualCashFlow ?? 0)),
    300 // default minimum peak
  );
  // Add 15% head room for readability
  const scaleMax = maxCashInTimeline * 1.15;

  // Coordinate functions
  const getX = (monthNum: number) => {
    return margin.left + ((monthNum - 1) * chartWidth) / 11;
  };

  const getBarHeight = (value: number) => {
    return (value * chartHeight) / scaleMax;
  };

  const getY = (value: number) => {
    return margin.top + chartHeight - getBarHeight(value);
  };

  const yTicks = [
    0,
    Math.round(scaleMax * 0.25),
    Math.round(scaleMax * 0.5),
    Math.round(scaleMax * 0.75),
    Math.round(scaleMax),
  ];

  const barWidth = 10;

  return (
    <div id="cash-flow-canvas-panel" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs font-sans relative flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Time-Phased Cash Drawdowns ($k)</h3>
          <p className="text-xs text-slate-400">Monthly Target Cash Flows versus Actual Expenditures to date</p>
        </div>
        
        {/* Colors Legend */}
        <div className="flex items-center gap-x-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-blue-100 border border-blue-400 rounded-xs" />
            <span className="text-slate-600">Planned Spend</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 bg-orange-100 border border-orange-500 rounded-xs animate-pulse" />
            <span className="text-slate-600">Actual Spend</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto min-h-[220px] flex justify-center">
        <svg
          viewBox={`0 0 ${containerWidth} ${containerHeight}`}
          className="w-full max-w-4xl h-auto"
          onMouseLeave={() => setHoveredMonth(null)}
        >
          {/* Background Tick Guides */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={margin.left}
                y1={getY(tick)}
                x2={containerWidth - margin.right}
                y2={getY(tick)}
                stroke="#F1F5F9"
                strokeWidth="1"
              />
              <text
                x={margin.left - 10}
                y={getY(tick) + 4}
                textAnchor="end"
                className="text-[10px] font-mono font-medium text-slate-400"
              >
                ${tick}k
              </text>
            </g>
          ))}

          {/* Month vertical line indicators */}
          {data.map((m) => (
            <g key={`month-tick-${m.month}`}>
              {/* Highlight month vertical zone when hovered */}
              {hoveredMonth === m.month && (
                <rect
                  x={getX(m.month) - (chartWidth / 22)}
                  y={margin.top}
                  width={chartWidth / 11}
                  height={chartHeight}
                  fill="#F8FAFC"
                  rx="4"
                  className="opacity-60"
                />
              )}
              {/* Dotted border separators */}
              <line
                x1={getX(m.month)}
                y1={margin.top}
                x2={getX(m.month)}
                y2={containerHeight - margin.bottom}
                stroke="#F8FAFC"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              {/* X scale text */}
              <text
                x={getX(m.month)}
                y={containerHeight - margin.bottom + 18}
                textAnchor="middle"
                className={`text-[10px] font-bold ${
                  m.month === hoveredMonth ? 'text-slate-800' : 'text-slate-400'
                }`}
              >
                M{m.month}
              </text>
            </g>
          ))}

          {/* Draw planned bars and actual bars */}
          {data.map((m) => {
            const hasActual = m.month <= C && m.actualCashFlow !== null;
            const xCenter = getX(m.month);
            
            const pvX = xCenter - barWidth - 1;
            const acX = xCenter + 1;

            const pvY = getY(m.targetCashFlow);
            const pvH = getBarHeight(m.targetCashFlow);

            const acY = hasActual ? getY(m.actualCashFlow!) : getY(0);
            const acH = hasActual ? getBarHeight(m.actualCashFlow!) : 0;

            const isFuture = m.month > C;

            return (
              <g key={`bars-group-${m.month}`}>
                {/* Planned / Target cash bar */}
                <rect
                  x={pvX}
                  y={pvY}
                  width={barWidth}
                  height={pvH}
                  fill="#EFF6FF"
                  stroke="#3B82F6"
                  strokeWidth="1.5"
                  rx="2"
                  className="transition-all duration-300"
                />

                {/* Actual cash bar */}
                {hasActual && (
                  <rect
                    x={acX}
                    y={acY}
                    width={barWidth}
                    height={acH}
                    fill="#FFEDD5"
                    stroke="#F97316"
                    strokeWidth="1.5"
                    rx="2"
                    className="transition-all duration-300"
                  />
                )}

                {/* Invisible hover trigger zone representing monthly slice */}
                <rect
                  x={getX(m.month) - (chartWidth / 22)}
                  y={margin.top}
                  width={chartWidth / 11}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredMonth(m.month)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover info tooltip box */}
        {hoveredMonth !== null && (
          <div
            className="absolute rounded-xl bg-slate-950/90 text-white p-3 shadow-xl border border-slate-700/60 z-10 w-44 text-xs font-sans pointer-events-none"
            style={{
              left: `${Math.min(
                containerWidth - 190,
                Math.max(10, getX(hoveredMonth) - 75)
              )}px`,
              top: '40px',
            }}
          >
            <p className="font-bold border-b border-slate-700 pb-1 mb-1.5 text-blue-400">Month {hoveredMonth} Cash Details</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Planned Target:</span>
                <span className="font-mono font-bold text-blue-300">
                  ${data[hoveredMonth - 1]?.targetCashFlow}k
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Actual Spent:</span>
                <span className="font-mono font-bold text-orange-400">
                  {hoveredMonth <= C && data[hoveredMonth - 1]?.actualCashFlow !== null
                    ? `$${data[hoveredMonth - 1].actualCashFlow}k`
                    : 'N/A (Future)'}
                </span>
              </div>

              {hoveredMonth <= C && data[hoveredMonth - 1]?.actualCashFlow !== null && (
                <div className="flex justify-between border-t border-slate-800 pt-1 mt-1 text-[10px]">
                  <span className="text-slate-400">Variance:</span>
                  <span className={`font-mono font-bold ${
                    (data[hoveredMonth - 1].actualCashFlow || 0) - data[hoveredMonth - 1].targetCashFlow <= 0 
                      ? 'text-emerald-400' 
                      : 'text-rose-400'
                  }`}>
                    {(data[hoveredMonth - 1].actualCashFlow || 0) - data[hoveredMonth - 1].targetCashFlow >= 0 ? '+' : ''}
                    {(data[hoveredMonth - 1].actualCashFlow || 0) - data[hoveredMonth - 1].targetCashFlow}k
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
