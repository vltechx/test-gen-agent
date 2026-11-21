import { useQuery } from '@tanstack/react-query';
import type { Run, RunsResponse } from './types';

// Query keys live in one place, like Lambda's ["IAM","allRoles"] keys.
export const runKeys = {
  all: ['runs'] as const,
};

async function fetchRuns(): Promise<RunsResponse> {
  const res = await fetch('/api/runs.json');
  if (!res.ok) throw new Error(`Failed to load runs (HTTP ${res.status})`);
  return res.json() as Promise<RunsResponse>;
}

/** All runs, newest first. Fetched once and cached. */
export function useRuns() {
  return useQuery({ queryKey: runKeys.all, queryFn: fetchRuns, select: (d) => d.runs });
}

/** One run, read from the same cached list with `select` (no extra request). */
export function useRun(runId: string | undefined) {
  return useQuery({
    queryKey: runKeys.all,
    queryFn: fetchRuns,
    select: (d): Run | undefined => d.runs.find((r) => r.runId === runId),
  });
}
