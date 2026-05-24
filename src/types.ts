/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WBSItem {
  id: string;
  name: string;
  budget: number; // in $k
  spent: number;  // in $k
  progress: number; // 0 - 100 % physical progress
}

export interface MonthlyData {
  month: number; // 1 to 12
  targetCumulativeProgress: number; // %
  actualCumulativeProgress: number | null; // %
  targetCashFlow: number; // $k
  actualCashFlow: number | null; // $k
}

export interface ProjectYearData {
  year: number;
  name: string;
  reportingMonth: number;
  accelerationFactor: number;
  wbsList: WBSItem[];
  monthlyData: MonthlyData[];
}
