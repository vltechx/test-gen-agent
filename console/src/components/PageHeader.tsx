import { Fragment } from 'react';
import { Link } from 'react-router';
import ui from './ui.module.css';

interface Crumb {
  label: string;
  to?: string;
}

export function PageHeader({ title, subtitle, crumbs = [] }: { title: string; subtitle?: string; crumbs?: Crumb[] }) {
  return (
    <header>
      {crumbs.length > 0 && (
        <nav className={ui.breadcrumbs} aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <Fragment key={c.label}>
              {i > 0 && ' / '}
              {c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
            </Fragment>
          ))}
        </nav>
      )}
      <h1 className={ui.title}>{title}</h1>
      {subtitle && <p className={ui.subtitle}>{subtitle}</p>}
    </header>
  );
}
