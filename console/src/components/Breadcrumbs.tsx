import { Fragment } from 'react';
import { Link, useMatches, type UIMatch } from 'react-router';
import styles from './ui.module.css';

type CrumbHandle = { crumb?: (m: UIMatch) => string };

export function Breadcrumbs() {
  const matches = useMatches() as UIMatch<unknown, CrumbHandle>[];

  const crumbs = matches
    .filter((m) => m.handle?.crumb)
    .map((m) => ({ label: m.handle!.crumb!(m), to: m.pathname }));

  return (
    <nav className={styles.breadcrumbs}>
      {crumbs.map((crumb, i) => (
        <Fragment key={crumb.to}>
          {i > 0 && <span className={styles.separator}>/</span>}
          <Link to={crumb.to}>{crumb.label}</Link>
        </Fragment>
      ))}
    </nav>
  );
}
