/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectYearData } from './types';

export const INITIAL_PROJECTS: ProjectYearData[] = [
  {
    year: 2025,
    name: "Drilling MLN Phase 5 — Exploration & Infrastructure Build (Completed)",
    reportingMonth: 12,
    accelerationFactor: 1.0,
    wbsList: [
      { id: "wbs-11", name: "Project Management", budget: 350, spent: 345, progress: 100 },
      { id: "wbs-12", name: "Engineering & Permitting", budget: 550, spent: 540, progress: 100 },
      { id: "wbs-13", name: "Site Prep & Rig Mobilization", budget: 850, spent: 870, progress: 100 },
      { id: "wbs-14", name: "Drilling Operations", budget: 3200, spent: 3150, progress: 100 },
      { id: "wbs-15", name: "Desert Logistics & Rig Supply", budget: 650, spent: 660, progress: 100 }
    ],
    monthlyData: [
      { month: 1, targetCumulativeProgress: 4, actualCumulativeProgress: 4, targetCashFlow: 150, actualCashFlow: 145 },
      { month: 2, targetCumulativeProgress: 10, actualCumulativeProgress: 9, targetCashFlow: 250, actualCashFlow: 240 },
      { month: 3, targetCumulativeProgress: 18, actualCumulativeProgress: 17, targetCashFlow: 400, actualCashFlow: 410 },
      { month: 4, targetCumulativeProgress: 28, actualCumulativeProgress: 26, targetCashFlow: 550, actualCashFlow: 535 },
      { month: 5, targetCumulativeProgress: 42, actualCumulativeProgress: 40, targetCashFlow: 650, actualCashFlow: 670 },
      { month: 6, targetCumulativeProgress: 56, actualCumulativeProgress: 55, targetCashFlow: 700, actualCashFlow: 690 },
      { month: 7, targetCumulativeProgress: 68, actualCumulativeProgress: 69, targetCashFlow: 600, actualCashFlow: 615 },
      { month: 8, targetCumulativeProgress: 78, actualCumulativeProgress: 77, targetCashFlow: 500, actualCashFlow: 490 },
      { month: 9, targetCumulativeProgress: 88, actualCumulativeProgress: 89, targetCashFlow: 450, actualCashFlow: 460 },
      { month: 10, targetCumulativeProgress: 95, actualCumulativeProgress: 96, targetCashFlow: 350, actualCashFlow: 355 },
      { month: 11, targetCumulativeProgress: 99, actualCumulativeProgress: 99, targetCashFlow: 150, actualCashFlow: 145 },
      { month: 12, targetCumulativeProgress: 100, actualCumulativeProgress: 100, targetCashFlow: 50, actualCashFlow: 45 }
    ]
  },
  {
    year: 2026,
    name: "Drilling MLN Phase 5 — High-Pressure Drilling & Well Execution (Active)",
    reportingMonth: 6,
    accelerationFactor: 1.0,
    wbsList: [
      { id: "wbs-1", name: "Project Management", budget: 400, spent: 220, progress: 58 },
      { id: "wbs-2", name: "Engineering & Mud Logging", budget: 750, spent: 680, progress: 85 },
      { id: "wbs-3", name: "Rig Positioning & Onsite Civil Works", budget: 900, spent: 890, progress: 100 },
      { id: "wbs-4", name: "Drilling Operations & Casing", budget: 4200, spent: 2600, progress: 52 },
      { id: "wbs-5", name: "Desert Logistics & Rig Supply", budget: 850, spent: 510, progress: 60 }
    ],
    monthlyData: [
      { month: 1, targetCumulativeProgress: 5, actualCumulativeProgress: 4, targetCashFlow: 200, actualCashFlow: 195 },
      { month: 2, targetCumulativeProgress: 12, actualCumulativeProgress: 10, targetCashFlow: 350, actualCashFlow: 370 },
      { month: 3, targetCumulativeProgress: 24, actualCumulativeProgress: 20, targetCashFlow: 600, actualCashFlow: 640 },
      { month: 4, targetCumulativeProgress: 38, actualCumulativeProgress: 32, targetCashFlow: 900, actualCashFlow: 960 },
      { month: 5, targetCumulativeProgress: 53, actualCumulativeProgress: 45, targetCashFlow: 1150, actualCashFlow: 1200 },
      { month: 6, targetCumulativeProgress: 68, actualCumulativeProgress: 58, targetCashFlow: 1300, actualCashFlow: 1320 },
      { month: 7, targetCumulativeProgress: 80, actualCumulativeProgress: null, targetCashFlow: 1100, actualCashFlow: null },
      { month: 8, targetCumulativeProgress: 89, actualCumulativeProgress: null, targetCashFlow: 800, actualCashFlow: null },
      { month: 9, targetCumulativeProgress: 95, actualCumulativeProgress: null, targetCashFlow: 500, actualCashFlow: null },
      { month: 10, targetCumulativeProgress: 98, actualCumulativeProgress: null, targetCashFlow: 300, actualCashFlow: null },
      { month: 11, targetCumulativeProgress: 99, actualCumulativeProgress: null, targetCashFlow: 150, actualCashFlow: null },
      { month: 12, targetCumulativeProgress: 100, actualCumulativeProgress: null, targetCashFlow: 50, actualCashFlow: null }
    ]
  },
  {
    year: 2027,
    name: "Drilling MLN Phase 5 — Production Tie-Back & Multi-Lateral Wells (Planned)",
    reportingMonth: 1,
    accelerationFactor: 1.0,
    wbsList: [
      { id: "wbs-21", name: "Project Management", budget: 450, spent: 30, progress: 5 },
      { id: "wbs-22", name: "Engineering & Flowline Procurement", budget: 800, spent: 200, progress: 25 },
      { id: "wbs-23", name: "Wellhead Hookup & Desert Rig Move", budget: 1100, spent: 100, progress: 10 },
      { id: "wbs-24", name: "Production Testing & Slickline", budget: 4500, spent: 0, progress: 0 },
      { id: "wbs-25", name: "Heavy Lift Haulage & Camp Logistics", budget: 950, spent: 0, progress: 0 }
    ],
    monthlyData: [
      { month: 1, targetCumulativeProgress: 3, actualCumulativeProgress: 2, targetCashFlow: 250, actualCashFlow: 240 },
      { month: 2, targetCumulativeProgress: 8, actualCumulativeProgress: null, targetCashFlow: 400, actualCashFlow: null },
      { month: 3, targetCumulativeProgress: 16, actualCumulativeProgress: null, targetCashFlow: 650, actualCashFlow: null },
      { month: 4, targetCumulativeProgress: 27, actualCumulativeProgress: null, targetCashFlow: 900, actualCashFlow: null },
      { month: 5, targetCumulativeProgress: 41, actualCumulativeProgress: null, targetCashFlow: 1200, actualCashFlow: null },
      { month: 6, targetCumulativeProgress: 56, actualCumulativeProgress: null, targetCashFlow: 1400, actualCashFlow: null },
      { month: 7, targetCumulativeProgress: 71, actualCumulativeProgress: null, targetCashFlow: 1200, actualCashFlow: null },
      { month: 8, targetCumulativeProgress: 83, actualCumulativeProgress: null, targetCashFlow: 850, actualCashFlow: null },
      { month: 9, targetCumulativeProgress: 92, actualCumulativeProgress: null, targetCashFlow: 550, actualCashFlow: null },
      { month: 10, targetCumulativeProgress: 97, actualCumulativeProgress: null, targetCashFlow: 300, actualCashFlow: null },
      { month: 11, targetCumulativeProgress: 99, actualCumulativeProgress: null, targetCashFlow: 150, actualCashFlow: null },
      { month: 12, targetCumulativeProgress: 100, actualCumulativeProgress: null, targetCashFlow: 50, actualCashFlow: null }
    ]
  },
  {
    year: 2028,
    name: "Drilling MLN Phase 5 — Commissioning & Closeout Integration (Concept)",
    reportingMonth: 0,
    accelerationFactor: 1.0,
    wbsList: [
      { id: "wbs-31", name: "Project Management & Closeout Audits", budget: 500, spent: 0, progress: 0 },
      { id: "wbs-32", name: "As-Built Field Survey Engineering", budget: 400, spent: 0, progress: 0 },
      { id: "wbs-33", name: "Flowline & Manifold Commissioning", budget: 1500, spent: 0, progress: 0 },
      { id: "wbs-34", name: "Well Testing & Permanent Handover", budget: 2200, spent: 0, progress: 0 },
      { id: "wbs-35", name: "Civil De-mobilization & Site Restoration", budget: 800, spent: 0, progress: 0 }
    ],
    monthlyData: [
      { month: 1, targetCumulativeProgress: 2, actualCumulativeProgress: null, targetCashFlow: 100, actualCashFlow: null },
      { month: 2, targetCumulativeProgress: 6, actualCumulativeProgress: null, targetCashFlow: 200, actualCashFlow: null },
      { month: 3, targetCumulativeProgress: 12, actualCumulativeProgress: null, targetCashFlow: 400, actualCashFlow: null },
      { month: 4, targetCumulativeProgress: 22, actualCumulativeProgress: null, targetCashFlow: 600, actualCashFlow: null },
      { month: 5, targetCumulativeProgress: 36, actualCumulativeProgress: null, targetCashFlow: 800, actualCashFlow: null },
      { month: 6, targetCumulativeProgress: 52, actualCumulativeProgress: null, targetCashFlow: 1000, actualCashFlow: null },
      { month: 7, targetCumulativeProgress: 68, actualCumulativeProgress: null, targetCashFlow: 1100, actualCashFlow: null },
      { month: 8, targetCumulativeProgress: 81, actualCumulativeProgress: null, targetCashFlow: 900, actualCashFlow: null },
      { month: 9, targetCumulativeProgress: 91, actualCumulativeProgress: null, targetCashFlow: 650, actualCashFlow: null },
      { month: 10, targetCumulativeProgress: 97, actualCumulativeProgress: null, targetCashFlow: 400, actualCashFlow: null },
      { month: 11, targetCumulativeProgress: 99, actualCumulativeProgress: null, targetCashFlow: 200, actualCashFlow: null },
      { month: 12, targetCumulativeProgress: 100, actualCumulativeProgress: null, targetCashFlow: 50, actualCashFlow: null }
    ]
  }
];
