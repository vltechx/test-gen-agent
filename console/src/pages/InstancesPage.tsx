import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { listInstances } from '../mocks/launchApi';
import { PageHeader } from '../components/PageHeader';
import ui from '../components/ui.module.css';

export function InstancesPage() {
  const instances = useQuery({
    queryKey: ['instances'],
    queryFn: listInstances,
    refetchInterval: (query) =>
      query.state.data?.some((i) => i.status === 'booting') ? 2000 : false,
  });

  return (
    <>
      <PageHeader
        title="Instances"
        actions={<Link to="/launch" className={ui.primaryButton}>Launch instance</Link>}
      />
      {instances.isPending && <p>Loading…</p>}
      {instances.data?.length === 0 && <p>No running instances.</p>}
      <ul>
        {instances.data?.map((i) => (
          <li key={i.id}>
            {i.id} · {i.instanceType} · {i.region} · <strong>{i.status}</strong>
          </li>
        ))}
      </ul>
    </>
  );
}