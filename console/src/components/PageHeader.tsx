import ui from './ui.module.css';
import { Breadcrumbs } from './Breadcrumbs';

export function PageHeader({ title, subtitle}: { title: string; subtitle?: string;}) {
  return (
    <header>
      <Breadcrumbs />
      <h1 className={ui.title}>{title}</h1>
      {subtitle && <p className={ui.subtitle}>{subtitle}</p>}
    </header>
  );
}
