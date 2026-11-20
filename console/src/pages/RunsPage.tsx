import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AGENTS, AGENT_IDS } from '../api/agents';
import { formatDate, formatDuration, passedCount } from '../api/format';
import { useRuns } from '../api/runs';
import type { RunStatus } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { QueryState } from '../components/QueryState';
import { Chip, StatusChip } from '../components/StatusChip';
import ui from '../components/ui.module.css';

const STATUSES: { value: RunStatus; label: string }[] = [
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'limit_reached', label: 'Limit reached' },
];

export function RunsPage() {
  const { data: runs, isPending, error } = useRuns();
  // Filters live in the URL (?agent=...&status=...&q=...), so a filtered view can be shared.
  const [params, setParams] = useSearchParams();
  const agent = params.get('agent') ?? '';
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';

  function setFilter(key: string, value: string) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }

  // Derived state: computed during render, not stored in useState.
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (runs ?? []).filter(
      (r) =>
        (!agent || r.agent === agent) &&
        (!status || r.status === status) &&
        (!term || r.id.includes(term) || String(r.pullRequest ?? '').includes(term)),
    );
  }, [runs, agent, status, q]);

  return (
    <>
      <PageHeader title="Runs" subtitle="Every test-generation run, newest first." />

      <div className={ui.filters}>
        <input
          className={ui.input}
          type="search"
          placeholder="Search by run ID or PR number"
          aria-label="Search runs"
          value={q}
          onChange={(e) => setFilter('q', e.target.value)}
        />
        <select className={ui.select} aria-label="Filter by agent" value={agent} onChange={(e) => setFilter('agent', e.target.value)}>
          <option value="">All agents</option>
          {AGENT_IDS.map((id) => (
            <option key={id} value={id}>
              {AGENTS[id].name}
            </option>
          ))}
        </select>
        <select className={ui.select} aria-label="Filter by status" value={status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {(agent || status || q) && (
          <button type="button" className={ui.button} onClick={() => setParams({}, { replace: true })}>
            Clear filters
          </button>
        )}
      </div>

      <QueryState isPending={isPending} error={error} />

      {runs && (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Run</th>
                <th>Agent</th>
                <th>Trigger</th>
                <th>Status</th>
                <th>Tests passed</th>
                <th>Attempts</th>
                <th>Possible bugs</th>
                <th>Started</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className={ui.mono}>
                    <Link to={`/runs/${r.id}`}>{r.id}</Link>
                  </td>
                  <td>{AGENTS[r.agent].name}</td>
                  <td>{r.trigger === 'ci' ? `CI · PR #${r.pullRequest}` : 'Local'}</td>
                  <td>
                    <StatusChip status={r.status} />
                  </td>
                  <td>
                    {passedCount(r.tests)} / {r.tests.length}
                  </td>
                  <td>{r.attempts.length} / 3</td>
                  <td>{r.possibleBugs.length > 0 ? <Chip tone="limit_reached">{r.possibleBugs.length}</Chip> : <span className={ui.muted}>0</span>}</td>
                  <td className={ui.muted}>{formatDate(r.startedAt)}</td>
                  <td className={ui.muted}>{formatDuration(r.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className={ui.empty}>No runs match these filters.</div>}
        </div>
      )}
    </>
  );
}
