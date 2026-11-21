// The JSON shape every agent run is saved in (schemaVersion 1). The console reads
// { runs: Run[] } from /api/runs.json, newest first.
// Sample data: scripts/make-sample-data.py. Later, each agent writes runs/<runId>.json.

export type AgentId = 'langgraph' | 'semantic-kernel' | 'agent-framework';
export type Outcome = 'passed' | 'failed' | 'limit_reached';

export interface Trigger {
  kind: 'local' | 'ci';
  prNumber: number | null;
  commit: string;
}

export interface TestCounts {
  total: number;
  passed: number;
  failed: number;
}

export interface TestFailure {
  name: string; // "suite > test"
  message: string;
}

export interface Attempt {
  n: number;
  passed: boolean;
  durationMs: number;
  tests: TestCounts;
  failures: TestFailure[];
}

export interface FinalTest {
  name: string; // "suite > test"
  status: 'passed' | 'failed';
}

export interface SuspectedBug {
  line: number; // line in the test file
  text: string; // "// POSSIBLE BUG: ..."
}

export interface Run {
  schemaVersion: 1;
  runId: string; // e.g. "2026-11-18T10-42-07Z_langgraph"
  agent: AgentId;
  model: string;
  startedAt: string; // ISO 8601
  finishedAt: string; // ISO 8601
  durationMs: number;
  trigger: Trigger;
  sourceFile: string;
  testFile: string;
  outcome: Outcome;
  maxRuns: number;
  attempts: Attempt[];
  finalTests: FinalTest[];
  final: { testLines: number; testCount: number };
  suspectedBugs: SuspectedBug[];
}

export interface RunsResponse {
  runs: Run[];
}
