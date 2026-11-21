import { useState } from 'react';
import { useParams } from 'react-router';
import { AGENTS } from '../api/agents';
import { formatDate, formatDuration, formatTrigger, passedCount, splitTestName } from '../api/format';
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

  const tests = failedOnly ? run.finalTests.filter((t) => t.status === 'failed') : run.finalTests;
  const testFileName = run.testFile.split('/').pop();

  return (
    <>
      <PageHeader title={run.runId} crumbs={crumbs} />
      <div className={styles.meta}> 
        <StatusChip outcome={run.outcome} />
        <span>
          Agent <b>{AGENTS[run.agent].name}</b>
        </span>
        <span>
          Trigger <b>{formatTrigger(run.trigger)}</b>
        </span>
        <span>
          Commit <b className={ui.mono}>{run.trigger.commit}</b>
        </span>
        <span>
          Model <b>{run.model}</b>
        </span>
        <span>
          Started <b>{formatDate(run.startedAt)}</b>
        </span>
        <span>
          Finished {formatDate(run.finishedAt)}
        </span>
        <span>
          Test file <b>{run.final.testLines} lines</b>
        </span>
      </div>

      <div className={ui.statGrid}>
        <Stat label="Tests passed" value={`${passedCount(run.finalTests)} / ${run.final.testCount}`} />
        <Stat label="Attempts" value={`${run.attempts.length} / ${run.maxRuns}`} />
        <Stat label="Possible bugs" value={String(run.suspectedBugs.length)} />
        <Stat label="Duration" value={formatDuration(run.durationMs)} />
      </div>

      {run.suspectedBugs.length > 0 && (
        <>
          <h2 className={ui.sectionTitle}>Possible bugs in the source</h2>
          {run.suspectedBugs.map((b) => (
            <div key={b.line} className={`${ui.card} ${styles.bug}`}>
              <div className={styles.suite}>
                {testFileName}, line {b.line}
              </div>
              <code>{b.text}</code>
            </div>
          ))}
        </>
      )}

      <h2 className={ui.sectionTitle}>Attempts</h2>
      <ol className={styles.timeline}>
        {run.attempts.map((a) => (
          <li key={a.n} className={`${ui.card} ${styles.attempt}`}>
            <div>
              <div className={ui.statLabel}>Attempt {a.n}</div>
              <div className={ui.muted}>{formatDuration(a.durationMs)}</div>
            </div>
            <div>
              <div className={styles.attemptHead}>
                <Chip tone={a.passed ? 'passed' : 'failed'}>{a.passed ? 'Passed' : `${a.tests.failed} failed`}</Chip>
                <span className={ui.muted}>
                  {a.tests.passed} of {a.tests.total} tests passed
                </span>
              </div>
              {a.failures.length > 0 && (
                <ul className={styles.failures}>
                  {a.failures.map((f) => (
                    <li key={f.name}>
                      {splitTestName(f.name).join(' › ')}
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
            {tests.map((t) => {
              const [suite, test] = splitTestName(t.name);
              return (
                <tr key={t.name}>
                  <td className={ui.mono}>{suite}</td>
                  <td>{test}</td>
                  <td>
                    <Chip tone={t.status}>{t.status === 'passed' ? 'Passed' : 'Failed'}</Chip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {tests.length === 0 && <div className={ui.empty}>No failed tests.</div>}
      </div>
    </>
  );
}
