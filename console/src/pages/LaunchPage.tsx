import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { getLaunchOptions, launchInstance } from '../mocks/launchApi';
import { useToast } from '../components/Toast';
import { PageHeader } from '../components/PageHeader';
import { QueryState } from '../components/QueryState';
import ui from '../components/ui.module.css';
import styles from './LaunchPage.module.css';

export function LaunchPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [instanceType, setInstanceType] = useState('');
  const [region, setRegion] = useState('');
  const [image, setImage] = useState('');

  const options = useQuery({ queryKey: ['launchOptions'], queryFn: getLaunchOptions });

  const launch = useMutation({
    mutationFn: launchInstance,
    onSuccess: (res) => {
      showToast(`Instance ${res.id} is launching.`);
      navigate('/runs');
    },
    onError: (err) => showToast(err.message),
  });

  const header = <PageHeader title="Launch instance" subtitle="Choose an instance type, region and image." />;

  if (options.isPending || options.isError) {
    return (
      <>
        {header}
        <QueryState isPending={options.isPending} error={options.error} />
      </>
    );
  }

  const { instanceTypes, regions, images } = options.data;
  const canLaunch = instanceType && region && image && !launch.isPending;

  return (
    <>
      {header}
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          launch.mutate({ instanceType, region, image });
        }}
      >
        <label className={styles.field}>
          Instance type
          <select className={ui.select} value={instanceType} onChange={(e) => setInstanceType(e.target.value)}>
            <option value="">Choose…</option>
            {instanceTypes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Region
          <select className={ui.select} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Choose…</option>
            {regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Image
          <select className={ui.select} value={image} onChange={(e) => setImage(e.target.value)}>
            <option value="">Choose…</option>
            {images.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </label>
        <button type="submit" className={`${ui.primaryButton} ${styles.submit}`} disabled={!canLaunch}>
          {launch.isPending ? 'Launching…' : 'Launch instance'}
        </button>
      </form>
    </>
  );
}
