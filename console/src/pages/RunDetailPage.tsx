import { useState } from 'react';
import { useParams } from 'react-router';
import { AGENTS } from '../api/agents';
import { formatDate, formatDuration, passedCount } from '../api/format';
import { useRun } from '../api/runs';
import { PageHeader } from '../components/PageHeader';
import { Stat } from '../components/Stat';
import { QueryState } from '../components/QueryState';
import { Chip, StatusChip } from '../components/StatusChip';
import ui from '../components/ui.module.css';
import styles from './RunDetailPage.module.css';

export function RunDetailPage() {
  const { runId } = useParams();
  const { data: run, isPending, error } = useRun(runId);
  const [failedOnly, setFailedOnly] = useState(false);

  const crumbs = [{ label: 'Runs', to: '/runs' }, { label: runId ?? '' }];

  if (isPending || error) {
    return (
      <>
        <PageHeader title={runId ?? 'Run'} crumbs={crumbs} />
        <QueryState isPending={isPending} error={error} />
      </>
    );
  }

  if (!run) {
    return (
      <>
        <PageHeader title="Run not found" crumbs={crumbs} />
        <p className={ui.muted}>There is no run with ID {runId}.</p>
      </>
    );
  }

  const tests = failedOnly ? run.tests.filter((t) => t.status === 'failed') : run.tests;

  return (
    <>
      <PageHeader title={run.id} crumbs={crumbs} />
      <div className={styles.meta}>
        <StatusChip status={run.status} />
        <span>
          Agent <b>{AGENTS[run.agent].name}</b>
        </span>
        <span>
          Trigger <b>{run.trigger === 'ci' ? `CI, PR #${run.pullRequest}` : 'Local'}</b>
        </span>
        <span>
          Model <b>{run.model}</b>
        </span>
        <span>
          Started <b>{formatDate(run.startedAt)}</b>
        </span>
      </div>

      <div className={ui.statGrid}>
        <Stat label="Tests passed" value={`${passedCount(run.tests)} / ${run.tests.length}`} />
        <Stat label="Attempts" value={`${run.attempts.length} / 3`} />
        <Stat label="Possible bugs" value={String(run.possibleBugs.length)} />
        <Stat label="Duration" value={formatDuration(run.durationMs)} />
      </div>

      {run.possibleBugs.length > 0 && (
        <>
          <h2 className={ui.sectionTitle}>Possible bugs in the source</h2>
          {run.possibleBugs.map((b) => (
            <div key={b.suite + b.test} className={`${ui.card} ${styles.bug}`}>
              <div className={styles.suite}>{b.suite}</div>
              <strong>{b.test}</strong>
              <p>{b.note}</p>
            </div>
          ))}
        </>
      )}

      <h2 className={ui.sectionTitle}>Attempts</h2>
      <ol className={styles.timeline}>
        {run.attempts.map((a) => (
          <li key={a.number} className={`${ui.card} ${styles.attempt}`}>
            <div>
              <div className={ui.statLabel}>Attempt {a.number}</div>
              <div className={ui.muted}>{formatDuration(a.durationMs)}</div>
            </div>
            <div>
              <div className={styles.attemptHead}>
                <Chip tone={a.passed ? 'passed' : 'failed'}>{a.passed ? 'Passed' : `${a.testsFailed} failed`}</Chip>
                <span className={ui.muted}>
                  {a.testsTotal - a.testsFailed} of {a.testsTotal} tests passed
                </span>
              </div>
              {a.failures.length > 0 && (
                <ul className={styles.failures}>
                  {a.failures.map((f) => (
                    <li key={f.suite + f.test}>
                      {f.suite} › {f.test}
                      <br />
                      <code>{f.message}</code>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className={ui.filters} style={{ marginTop: 28 }}>
        <h2 className={ui.sectionTitle} style={{ margin: 0 }}>
          Final tests
        </h2>
        <label className={styles.toggle}>
          <input type="checkbox" checked={failedOnly} onChange={(e) => setFailedOnly(e.target.checked)} />
          Failed only
        </label>
      </div>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th>Suite</th>
              <th>Test</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.suite + t.name}>
                <td className={ui.mono}>{t.suite}</td>
                <td>{t.name}</td>
                <td>
                  <Chip tone={t.status}>{t.status === 'passed' ? 'Passed' : 'Failed'}</Chip>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tests.length === 0 && <div className={ui.empty}>No failed tests.</div>}
      </div>
    </>
  );
}
