import { createBrowserRouter, UIMatch } from 'react-router';
import { Shell } from './components/Shell';
import { AgentsPage } from './pages/AgentsPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RunDetailPage } from './pages/RunDetailPage';
import { RunsPage } from './pages/RunsPage';
import { LaunchPage } from './pages/LaunchPage';
import { InstancesPage } from './pages/InstancesPage';
import { PartAnalyzerPage } from './pages/PartAnalyzerPage';

// Shell is the layout route: its <Outlet /> renders the matched child page.
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    handle: { crumb: () => 'Home' },
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'runs',
        handle: { crumb: () => 'Runs' },
        children: [
          { index: true, element: <RunsPage /> },
          {
            path: ':runId',
            element: <RunDetailPage />,
            handle: { crumb: (m: UIMatch) => m.params.runId ?? '' },
          },
        ],
      },
      { path: 'agents', element: <AgentsPage />, handle: { crumb: () => 'Agents' } },
      { path: 'launch', element: <LaunchPage />, handle: { crumb: () => 'Launch instance' } },
      { path: 'instances', element: <InstancesPage />, handle: { crumb: () => 'Instances' } },
      {
        path: 'part-analyzer',
        element: <PartAnalyzerPage />,
        // Calls a real API, so the "sample data" banner doesn't apply.
        handle: { crumb: () => 'Part Analyzer', hideSampleBanner: true },
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
