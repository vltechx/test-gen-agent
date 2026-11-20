import ui from './ui.module.css';

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={ui.card}>
      <div className={ui.statLabel}>{label}</div>
      <div className={ui.statValue}>{value}</div>
    </div>
  );
}
