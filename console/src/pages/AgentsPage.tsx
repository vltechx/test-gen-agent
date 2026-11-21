import { Link } from 'react-router';
import { AGENTS, AGENT_IDS } from '../api/agents';
import { useRuns } from '../api/runs';
import { pct, statsByAgent } from '../api/stats';
import { PageHeader } from '../components/PageHeader';
import { QueryState } from '../components/QueryState';
import ui from '../components/ui.module.css';

export function AgentsPage() {
  const { data: runs, isPending, error } = useRuns();

  return (
    <>
      <PageHeader title="Agents" subtitle="The same agent in three frameworks, compared on the same task." />
      <QueryState isPending={isPending} error={error} />
      {runs && (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Who decides the steps</th>
                <th>Language</th>
                <th>Runs</th>
                <th>Pass rate</th>
                <th>Avg attempts</th>
                <th>Possible bugs</th>
              </tr>
            </thead>
            <tbody>
              {AGENT_IDS.map((id) => {
                const a = AGENTS[id];
                const s = statsByAgent(runs, id);
                return (
                  <tr key={id}>
                    <td>
                      <Link to={`/runs?agent=${id}`}>{a.name}</Link>
                      <div className={`${ui.mono} ${ui.muted}`}>{a.folder}</div>
                    </td>
                    <td>{a.decidesSteps}</td>
                    <td>{a.language}</td>
                    <td>{s.total}</td>
                    <td>{pct(s.passRate)}</td>
                    <td>{s.avgAttempts.toFixed(1)}</td>
                    <td>{s.suspectedBugs}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
