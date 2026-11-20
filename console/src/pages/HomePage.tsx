import { Link } from 'react-router';
import { AGENTS } from '../api/agents';
import { formatDate } from '../api/format';
import { useRuns } from '../api/runs';
import { computeStats, pct } from '../api/stats';
import { PageHeader } from '../components/PageHeader';
import { QueryState } from '../components/QueryState';
import { Stat } from '../components/Stat';
import { StatusChip } from '../components/StatusChip';
import ui from '../components/ui.module.css';

export function HomePage() {
  const { data: runs, isPending, error } = useRuns();

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="One test-generation agent, built three ways: LangGraph, Semantic Kernel and Microsoft Agent Framework."
      />
      <QueryState isPending={isPending} error={error} />
      {runs && <Overview runs={runs} />}
    </>
  );
}

function Overview({ runs }: { runs: NonNullable<ReturnType<typeof useRuns>['data']> }) {
  const s = computeStats(runs);
  const latest = runs.slice(0, 5);

  return (
    <>
      <div className={ui.statGrid}>
        <Stat label="Runs" value={String(s.total)} />
        <Stat label="Pass rate" value={pct(s.passRate)} />
        <Stat label="Average attempts" value={s.avgAttempts.toFixed(1)} />
        <Stat label="Possible bugs flagged" value={String(s.possibleBugs)} />
      </div>

      <h2 className={ui.sectionTitle}>Latest runs</h2>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th>Run</th>
              <th>Agent</th>
              <th>Status</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            {latest.map((r) => (
              <tr key={r.id}>
                <td className={ui.mono}>
                  <Link to={`/runs/${r.id}`}>{r.id}</Link>
                </td>
                <td>{AGENTS[r.agent].name}</td>
                <td>
                  <StatusChip status={r.status} />
                </td>
                <td className={ui.muted}>{formatDate(r.startedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <Link to="/runs">View all runs</Link>
      </p>
    </>
  );
}
