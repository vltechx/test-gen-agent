import { NavLink, Outlet } from 'react-router';
import styles from './Shell.module.css';

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navItem} ${styles.active}` : styles.navItem;

export function Shell() {
  return (
    <div className={styles.shell}>
      <div className={styles.banner} role="status">
        Showing sample data. Real runs appear once the agents save their results as JSON.
      </div>
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
