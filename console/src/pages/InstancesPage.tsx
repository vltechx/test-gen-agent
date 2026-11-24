import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import { listInstances, terminateInstance, type InstanceStatus } from '../mocks/launchApi';
import { PageHeader } from '../components/PageHeader';
import { QueryState } from '../components/QueryState';
import { useToast } from '../components/Toast';
import ui from '../components/ui.module.css';
import styles from './InstancesPage.module.css';

const STATUS_LABEL: Record<InstanceStatus, string> = {
  booting: 'Booting',
  running: 'Running',
  terminating: 'Terminating',
};

export function InstancesPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const instances = useQuery({
    queryKey: ['instances'],
    queryFn: listInstances,
    // Poll only while something is booting or terminating.
    refetchInterval: (query) => (query.state.data?.some((i) => i.status !== 'running') ? 2000 : false),
  });

  const terminate = useMutation({
    mutationFn: terminateInstance,
    onSuccess: (_data, id) => {
      showToast(`Terminating ${id}.`);
      queryClient.invalidateQueries({ queryKey: ['instances'] });
    },
    onError: (err) => showToast(err.message),
  });

  function handleTerminate(id: string) {
    if (window.confirm(`Terminate ${id}? This can't be undone.`)) {
      terminate.mutate(id);
    }
  }

  const launchButton = (
    <Link to="/launch" className={ui.secondaryButton}>
      Launch instance
    </Link>
  );

  return (
    <>
      <PageHeader title="Instances" actions={launchButton} />

      <QueryState isPending={instances.isPending} error={instances.error} />

      {instances.data?.length === 0 && (
        <div className={styles.empty}>
          <h2>No running instances</h2>
          <p>Launch an instance to see it here. Its status updates on its own.</p>
          {launchButton}
        </div>
      )}

      {instances.data && instances.data.length > 0 && (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Instance type</th>
                <th>Region</th>
                <th>Image</th>
                <th>Status</th>
                <th>Launched</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {instances.data.map((i) => (
                <tr key={i.id}>
                  <td className={ui.mono}>{i.id}</td>
                  <td>{i.instanceType}</td>
                  <td>{i.region}</td>
                  <td>{i.image}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[i.status]}`}>
                      {STATUS_LABEL[i.status]}
                    </span>
                  </td>
                  <td className={ui.muted}>{new Date(i.launchedAt).toLocaleTimeString()}</td>
                  <td>
                    {i.status !== 'terminating' && (
                      <button
                        type="button"
                        className={ui.secondaryButton}
                        disabled={terminate.isPending && terminate.variables === i.id}
                        onClick={() => handleTerminate(i.id)}
                      >
                        Terminate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
