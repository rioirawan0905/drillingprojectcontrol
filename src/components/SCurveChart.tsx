/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ProjectYearData } from '../types';

interface SCurveChartProps {
  project: ProjectYearData;
}

export default function SCurveChart({ project }: SCurveChartProps) {
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const C = project.reportingMonth;
  const alpha = project.accelerationFactor;
  const data = project.monthlyData;

  // Chart Dimensions
  const containerWidth = 700;
  const containerHeight = 300;
  const margin = { top: 20, right: 30, bottom: 45, left: 50 };

  const chartWidth = containerWidth - margin.left - margin.right;
  const chartHeight = containerHeight - margin.top - margin.bottom;

  // Coordinate mapping functions
  const getX = (monthNum: number) => {
    return margin.left + ((monthNum - 1) * chartWidth) / 11;
  };

  const getY = (percentage: number) => {
    return margin.top + chartHeight - (percentage * chartHeight) / 100;
  };

  // 1. Target Curve Line Points (Electric Blue)
  const targetPoints = data.map((m) => ({
    x: getX(m.month),
    y: getY(m.targetCumulativeProgress),
    raw: m.targetCumulativeProgress,
    month: m.month,
  }));

  const targetPath = targetPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // 2. Actual Curve Line Points (Vibrant Orange)
  const actualEntries = data.filter((m) => m.month <= C && m.actualCumulativeProgress !== null);
  const actualPoints = actualEntries.map((m) => ({
    x: getX(m.month),
    y: getY(m.actualCumulativeProgress!),
    raw: m.actualCumulativeProgress!,
    month: m.month,
  }));

  const actualPath = actualPoints.length > 0
    ? actualPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  // 3. Recovery Curve (Emerald Green)
  // Starts at the actual value of Month C, projects for months > C
  const actualAtC = C > 0 && data[C - 1]?.actualCumulativeProgress !== null
    ? (data[C - 1]?.actualCumulativeProgress ?? 0)
    : 0;

  const targetAtC = C > 0 ? (data[C - 1]?.targetCumulativeProgress ?? 0) : 0;

  const recoveryPoints: { x: number; y: number; raw: number; month: number }[] = [];

  // Anchor recovery point at the last actual progress point
  if (C > 0) {
    recoveryPoints.push({
      x: getX(C),
      y: getY(actualAtC),
      raw: actualAtC,
      month: C,
    });
  }

  for (let m = C + 1; m <= 12; m++) {
    const originalTarget = data[m - 1]?.targetCumulativeProgress ?? 100;
    
    // Remaining progress plan ratio
    const remainingPlanGrowth = 100 - targetAtC;
    const progressProportion = remainingPlanGrowth > 0 
      ? (originalTarget - targetAtC) / remainingPlanGrowth
      : 0;

    // Remaining physical gap
    const remainingActualNeeded = 100 - actualAtC;
    
    // Recovery with acceleration factor multiplier
    let recoveryVal = actualAtC + (progressProportion * remainingActualNeeded * alpha);
    recoveryVal = Math.min(100, Math.max(actualAtC, Math.round(recoveryVal)));

    recoveryPoints.push({
      x: getX(m),
      y: getY(recoveryVal),
      raw: recoveryVal,
      month: m,
    });
  }

  const recoveryPath = recoveryPoints.length > 0
    ? recoveryPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  // Calculate variances for hovering Month details
  const activeMonthData = hoveredMonth !== null ? data[hoveredMonth - 1] : null;

  const getRecoveryValueForMonth = (monthNum: number) => {
    if (monthNum < C) return null;
    const pt = recoveryPoints.find((rp) => rp.month === monthNum);
    return pt ? pt.raw : null;
  };

  // Y-axis tick mark guides (0%, 25%, 50%, 75%, 100%)
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div id="scurve-canvas-panel" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs font-sans relative flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Baseline VS Actual Physical S-Curve</h3>
          <p className="text-xs text-slate-400">Cumulative physical completion trajectory (%) across 12 periods</p>
        </div>
        
        {/* Colors Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-blue-600 rounded-full" />
            <span className="text-slate-600 font-medium">Target Plan</span>
          </div>
          {actualPoints.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-slate-600 font-medium">Actual Progress</span>
            </div>
          )}
          {C < 12 && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-500 rounded-full" />
              <span className="text-slate-600 font-medium">Recovery Projection</span>
            </div>
          )}
        </div>
      </div>

      {/* SVG Container wrapping drawing mechanics */}
      <div className="relative w-full overflow-x-auto min-h-[310px] flex justify-center">
        <svg
          viewBox={`0 0 ${containerWidth} ${containerHeight}`}
          className="w-full max-w-4xl h-auto"
          onMouseLeave={() => setHoveredMonth(null)}
        >
          {/* Background grid indicators */}
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
                {tick}%
              </text>
            </g>
          ))}

          {/* X Axis Month Labels */}
          {data.map((m) => (
            <g key={m.month}>
              <text
                x={getX(m.month)}
                y={containerHeight - margin.bottom + 18}
                textAnchor="middle"
                className={`text-[10px] font-semibold transition-colors ${
                  m.month === C 
                    ? 'text-blue-600 font-bold' 
                    : m.month === hoveredMonth 
                      ? 'text-slate-800' 
                      : 'text-slate-400'
                }`}
              >
                M{m.month}
              </text>
              {/* Vertical Tick Guide */}
              <line
                x1={getX(m.month)}
                y1={margin.top}
                x2={getX(m.month)}
                y2={containerHeight - margin.bottom}
                stroke={m.month === C ? '#3B82F6' : '#F8FAFC'}
                strokeWidth={m.month === C ? '1.5' : '1'}
                strokeDasharray={m.month === C ? '4 2' : 'none'}
              />
            </g>
          ))}

          {/* Current Month Vertical Split Screen Marker Label */}
          {C > 0 && C <= 12 && (
            <g>
              <rect
                x={getX(C) - 45}
                y={margin.top - 12}
                width="90"
                height="16"
                rx="4"
                fill="#3B82F6"
                className="shadow-xs"
              />
              <text
                x={getX(C)}
                y={margin.top}
                textAnchor="middle"
                className="text-[9px] font-bold text-white uppercase tracking-tight"
              >
                Cut-Off (M{C})
              </text>
            </g>
          )}

          {/* Line 1: Target Path (Blue) */}
          <path
            d={targetPath}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-500 ease-in-out"
          />

          {/* Line 2: Actual Plan Path (Orange) */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="#F97316"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="transition-all duration-500 ease-in-out"
            />
          )}

          {/* Line 3: Recovery Path (Emerald Green) */}
          {C < 12 && recoveryPath && (
            <path
              d={recoveryPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2.5"
              strokeDasharray="4 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-500 ease-in-out"
            />
          )}

          {/* Hover interactive vertical slices */}
          {data.map((m) => (
            <rect
              key={m.month}
              x={getX(m.month) - (chartWidth / 22)}
              y={margin.top}
              width={chartWidth / 11}
              height={chartHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredMonth(m.month)}
            />
          ))}

          {/* Dots on Target Path */}
          {targetPoints.map((p) => (
            <circle
              key={`target-dot-${p.month}`}
              cx={p.x}
              cy={p.y}
              r={p.month === hoveredMonth ? 5 : 3}
              fill="#2563EB"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              className="transition-all cursor-pointer"
            />
          ))}

          {/* Dots on Actual Path */}
          {actualPoints.map((p) => (
            <circle
              key={`actual-dot-${p.month}`}
              cx={p.x}
              cy={p.y}
              r={p.month === hoveredMonth ? 6 : 4.5}
              fill="#F97316"
              stroke="#FFFFFF"
              strokeWidth="2"
              className="transition-all cursor-pointer shadow-md"
            />
          ))}

          {/* Dots on Recovery Path (Only future periods) */}
          {C < 12 && recoveryPoints.filter(p => p.month > C).map((p) => (
            <circle
              key={`recovery-dot-${p.month}`}
              cx={p.x}
              cy={p.y}
              r={p.month === hoveredMonth ? 5 : 3}
              fill="#10B981"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              className="transition-all cursor-pointer"
            />
          ))}
        </svg>

        {/* Hover Info Tooltip Box HUD style */}
        {hoveredMonth !== null && activeMonthData && (
          <div
            className="absolute rounded-xl bg-slate-900/95 backdrop-blur-xs text-white p-3 shadow-xl border border-slate-700/60 z-10 w-48 text-xs font-sans transition-all pointer-events-none"
            style={{
              left: `${Math.min(
                containerWidth - 210,
                Math.max(10, getX(hoveredMonth) - 90)
              )}px`,
              top: '120px',
            }}
          >
            <p className="font-bold border-b border-slate-700 pb-1 mb-1 text-blue-400">Month {hoveredMonth} Data</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Cumulative:</span>
                <span className="font-mono font-bold text-blue-300">{activeMonthData.targetCumulativeProgress}%</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-slate-400">Actual Cumulative:</span>
                <span className="font-mono font-bold text-orange-400">
                  {activeMonthData.actualCumulativeProgress !== null 
                    ? `${activeMonthData.actualCumulativeProgress}%` 
                    : 'N/A'}
                </span>
              </div>

              {hoveredMonth >= C && (
                <div className="flex justify-between">
                  <span className="text-slate-400 animate-pulse">Recovery Proj:</span>
                  <span className="font-mono font-bold text-emerald-400 font-semibold">
                    {getRecoveryValueForMonth(hoveredMonth)}%
                  </span>
                </div>
              )}

              {activeMonthData.actualCumulativeProgress !== null && (
                <div className="flex justify-between border-t border-slate-800 pt-1 mt-1 text-[10px]">
                  <span className="text-slate-400">Variance:</span>
                  <span className={`font-mono font-bold ${
                    activeMonthData.actualCumulativeProgress - activeMonthData.targetCumulativeProgress >= 0 
                      ? 'text-emerald-400' 
                      : 'text-rose-400'
                  }`}>
                    {(activeMonthData.actualCumulativeProgress - activeMonthData.targetCumulativeProgress).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* S-curve summary stats bar */}
      <div className="mt-2 text-center text-xs text-slate-500 font-mono bg-slate-50 border border-slate-100/50 rounded-xl p-3 flex justify-around">
        <div>
          <span className="text-slate-400 block text-[10px] uppercase">Plan Target M12</span>
          <span className="font-bold text-blue-600">100%</span>
        </div>
        <div className="border-r border-slate-200" />
        <div>
          <span className="text-slate-400 block text-[10px] uppercase">Actual M{C}</span>
          <span className="font-bold text-orange-500">{actualAtC}%</span>
        </div>
        <div className="border-r border-slate-200" />
        <div>
          <span className="text-slate-400 block text-[10px] uppercase">Catch-Up Target M12</span>
          <span className={`font-bold ${
            C < 12 
              ? (recoveryPoints[recoveryPoints.length - 1]?.raw === 100 ? 'text-emerald-600' : 'text-rose-500') 
              : 'text-slate-600'
          }`}>
            {C < 12 ? `${recoveryPoints[recoveryPoints.length - 1]?.raw}%` : '100%'}
          </span>
        </div>
      </div>
    </div>
  );
}
