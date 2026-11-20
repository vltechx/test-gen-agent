import type { AgentId, Run } from './types';

export interface RunStats {
  total: number;
  passed: number;
  passRate: number; // 0..1
  avgAttempts: number;
  possibleBugs: number;
}

export function computeStats(runs: Run[]): RunStats {
  const total = runs.length;
  const passed = runs.filter((r) => r.status === 'passed').length;
  const attempts = runs.reduce((sum, r) => sum + r.attempts.length, 0);
  return {
    total,
    passed,
    passRate: total ? passed / total : 0,
    avgAttempts: total ? attempts / total : 0,
    possibleBugs: runs.reduce((sum, r) => sum + r.possibleBugs.length, 0),
  };
}

export function statsByAgent(runs: Run[], agent: AgentId): RunStats {
  return computeStats(runs.filter((r) => r.agent === agent));
}

export const pct = (n: number) => `${Math.round(n * 100)}%`;
