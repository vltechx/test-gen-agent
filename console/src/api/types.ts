// The JSON shape every agent run is saved in. The console reads /api/runs.json.
// Sample data: scripts/make-sample-data.py. Later, each agent writes this shape.

export type AgentId = 'langgraph' | 'semantic-kernel' | 'agent-framework';
export type RunStatus = 'passed' | 'failed' | 'limit_reached';
export type Trigger = 'ci' | 'local';

export interface TestFailure {
  suite: string;
  test: string;
  message: string;
}

export interface Attempt {
  number: number;
  passed: boolean;
  testsTotal: number;
  testsFailed: number;
  durationMs: number;
  failures: TestFailure[];
}

export interface TestResult {
  suite: string;
  name: string;
  status: 'passed' | 'failed';
}

export interface PossibleBug {
  suite: string;
  test: string;
  note: string;
}

export interface Run {
  id: string;
  agent: AgentId;
  trigger: Trigger;
  pullRequest: number | null;
  model: string;
  sourceFile: string;
  testFile: string;
  startedAt: string; // ISO 8601
  durationMs: number;
  status: RunStatus;
  attempts: Attempt[];
  tests: TestResult[];
  possibleBugs: PossibleBug[];
  sample?: boolean;
}

export interface RunsResponse {
  runs: Run[];
}
