import { NavLink, Outlet, useMatches } from 'react-router';
import styles from './Shell.module.css';

type ShellHandle = { hideSampleBanner?: boolean };

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navItem} ${styles.active}` : styles.navItem;

export function Shell() {
  // A route opts out of the banner with handle: { hideSampleBanner: true }.
  const hideBanner = useMatches().some((m) => (m.handle as ShellHandle | undefined)?.hideSampleBanner);

  return (
    <div className={styles.shell}>
      {!hideBanner && (
        <div className={styles.banner} role="status">
          Showing sample data. Real runs appear once the agents save their results as JSON.
        </div>
      )}
      <div className={styles.frame}>
        <aside className={styles.sidebar}>
          <div className={styles.logo}>
            Test-Gen <span>Console</span>
          </div>
          <nav aria-label="Primary">
            <NavLink to="/" end className={navClass}>
              Home
            </NavLink>
            <div className={styles.sectionLabel}>Test generation</div>
            <NavLink to="/runs" className={navClass}>
              Runs
            </NavLink>
            <NavLink to="/agents" className={navClass}>
              Agents
            </NavLink>
            <NavLink to="/instances" className={navClass}>
              Instances
            </NavLink>
            <div className={styles.sectionLabel}>Manufacturing</div>
            <NavLink to="/part-analyzer" className={navClass}>
              Part Analyzer
            </NavLink>
          </nav>
        </aside>
        <main className={styles.main}>
          <div className={styles.content}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
