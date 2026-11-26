# Part Analyzer API

Small FastAPI service that analyzes an uploaded STL file and returns geometry facts,
simple DFM warnings, and a fake quote. Personal learning project (not production).

## Stack
- Python 3.12, FastAPI, Pydantic v2, trimesh, numpy
- pytest for tests
- AWS Lambda (via Mangum) + API Gateway HTTP API, deployed with AWS SAM
- Later: S3

## Scope (build in this order, one step per session)
1. [x] Project setup: venv, requirements.txt, app/main.py with GET /health
2. [x] POST /analyze: accept an STL upload, return volume, surface area, bounding box, watertight
3. [x] DFM checks: too large for a 380 x 284 x 380 mm build volume; mesh not watertight
4. [x] Fake quote: volume x material rate + setup fee, with lead time
5. [x] Pydantic response models (so OpenAPI docs are generated)
6. [x] pytest tests with small sample STL files

- [x] Lambda deploy: Mangum handler (app.main.handler), SAM template.yaml, deployed to us-east-2

7. [x] CORS for the console: FastAPI CORSMiddleware with origins read from an ALLOWED_ORIGINS
   env var (comma-separated, e.g. http://localhost:5173 for the Vite dev server). Set it in
   template.yaml for Lambda. No "*" wildcard.

## Rules
- I am learning Python and FastAPI. Explain every file you create and why, in plain words.
- Map Python ideas to TypeScript/Node equivalents when it helps.
- Small steps: one feature at a time, then stop and wait for me.
- Use type hints everywhere. Keep functions small.
- Never commit secrets or real company data.