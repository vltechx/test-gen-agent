import { createBrowserRouter } from 'react-router';
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
    children: [
      { index: true, element: <HomePage /> },
      { path: 'runs', element: <RunsPage /> },
      { path: 'runs/:runId', element: <RunDetailPage /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
