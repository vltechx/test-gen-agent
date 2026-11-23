import type { ReactNode } from 'react';
import ui from './ui.module.css';
import { Breadcrumbs } from './Breadcrumbs';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header>
      <Breadcrumbs />
      <div className={ui.titleRow}>
        <h1 className={ui.title}>{title}</h1>
        {actions && <div className={ui.actions}>{actions}</div>}
      </div>
      {subtitle && <p className={ui.subtitle}>{subtitle}</p>}
    </header>
  );
}
