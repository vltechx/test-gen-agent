import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { listInstances } from '../mocks/launchApi';
import { PageHeader } from '../components/PageHeader';
import { QueryState } from '../components/QueryState';
import ui from '../components/ui.module.css';
import styles from './InstancesPage.module.css';

export function InstancesPage() {
  const instances = useQuery({
    queryKey: ['instances'],
    queryFn: listInstances,
    // Poll only while something is still booting.
    refetchInterval: (query) => (query.state.data?.some((i) => i.status === 'booting') ? 2000 : false),
  });

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
                      {i.status === 'booting' ? 'Booting' : 'Running'}
                    </span>
                  </td>
                  <td className={ui.muted}>{new Date(i.launchedAt).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
