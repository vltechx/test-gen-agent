import ui from './ui.module.css';

/** Shows loading or error for a query; renders nothing once data is ready. */
export function QueryState({ isPending, error }: { isPending: boolean; error: Error | null }) {
  if (error) return <div className={ui.error} role="alert">{error.message}</div>;
  if (isPending) return <div className={ui.loading}>Loading…</div>;
  return null;
}
