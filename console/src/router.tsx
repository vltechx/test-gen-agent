import { createBrowserRouter, UIMatch } from 'react-router';
import { Shell } from './components/Shell';
import { AgentsPage } from './pages/AgentsPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RunDetailPage } from './pages/RunDetailPage';
import { RunsPage } from './pages/RunsPage';

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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
