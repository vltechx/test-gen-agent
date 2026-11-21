import type { Trigger } from './types';

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function passedCount(tests: { status: string }[]): number {
  return tests.filter((t) => t.status === 'passed').length;
}

export function formatTrigger(trigger: Trigger): string {
  if (trigger.kind === 'local') return 'Local';
  return trigger.prNumber !== null ? `CI · PR #${trigger.prNumber}` : 'CI';
}

/** "suite > test" → ["suite", "test"] (the test name itself may contain " > "). */
export function splitTestName(name: string): [string, string] {
  const i = name.indexOf(' > ');
  return i === -1 ? ['', name] : [name.slice(0, i), name.slice(i + 3)];
}
