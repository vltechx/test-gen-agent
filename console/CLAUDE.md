# Test-Gen Console

React front end for my side projects: Test-Gen Agent runs (sample data) and
the Part Analyzer page (live API on AWS Lambda). Personal learning project.

## Stack
- Vite, React 19, TypeScript, React Router 7, TanStack Query 5
- CSS modules (components/ui.module.css for shared styles)
- Deployed on Vercel (vercel.json rewrites everything except /api/ to index.html)

## Patterns to follow
- Pages in src/pages, one per route; routes in src/router.tsx with a crumb.
- Data access in src/api/*.ts: fetch functions + hooks (useQuery for reads,
  useMutation for writes, as in LaunchPage). Query keys in one object.
- Reuse PageHeader, QueryState, StatusChip, Stat and Toast before adding new ones.
- Config from import.meta.env (VITE_* variables). Real values in .env.local,
  never committed; placeholders in .env.example.

## Scope now
- Part Analyzer page at /part-analyzer: upload STL, material, quantity;
  show measurements, DFM checklist and quote from POST /analyze.
  Types must match part-analyzer-api/app/models.py.

## Rules
- I'm strong in Angular and learning React. Explain each file, and map React
  ideas to Angular equivalents when it helps.
- Small steps: one feature at a time, then stop and wait for me.
- npm run typecheck must pass before you stop.
- Never commit secrets, .env.local or the live API URL.