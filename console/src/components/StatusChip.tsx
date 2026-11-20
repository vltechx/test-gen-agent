import type { ReactNode } from 'react';
import type { RunStatus } from '../api/types';
import ui from './ui.module.css';

const LABELS: Record<RunStatus, string> = {
  passed: 'Passed',
  failed: 'Failed',
  limit_reached: 'Limit reached',
};

type Tone = 'neutral' | RunStatus;

export function StatusChip({ status }: { status: RunStatus }) {
  return <span className={`${ui.chip} ${ui[status]}`}>{LABELS[status]}</span>;
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`${ui.chip} ${ui[tone]}`}>{children}</span>;
}
