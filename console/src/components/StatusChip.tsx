import type { ReactNode } from 'react';
import type { Outcome } from '../api/types';
import ui from './ui.module.css';

const LABELS: Record<Outcome, string> = {
  passed: 'Passed',
  failed: 'Failed',
  limit_reached: 'Limit reached',
};

type Tone = 'neutral' | Outcome;

export function StatusChip({ outcome }: { outcome: Outcome }) {
  return <span className={`${ui.chip} ${ui[outcome]}`}>{LABELS[outcome]}</span>;
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`${ui.chip} ${ui[tone]}`}>{children}</span>;
}
