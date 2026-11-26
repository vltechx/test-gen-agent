# Part Analyzer API

A small FastAPI service that analyzes an uploaded STL file. It returns geometry facts, design-for-manufacturing (DFM) warnings and a **fake** price quote. This is a personal learning project: the prices are made up and are not a real offer.

## What it does

`POST /analyze` takes a multipart upload with an `.stl` file. It also takes two optional form fields: `material` (`PA12` or `RESIN`, default `PA12`) and `quantity` (1–1000, default 1). It returns:

- **Geometry:** volume (mm³), surface area (mm²), bounding box, triangle count, and whether the mesh is watertight.
- **DFM warnings:** each has a `code`, a `severity` and a `message`.
  - `EXCEEDS_BUILD_VOLUME` (error): the part doesn't fit a 380 × 284 × 380 mm build volume, even after rotating it.
  - `NOT_WATERTIGHT` (warning): the mesh has holes.
- **Quote:** setup fee + volume (cm³) × material rate × quantity, plus a lead time in days. The quote is `null` when there is an error-severity warning.

`GET /health` returns `{"status": "ok"}`. Interactive docs with example responses are served at `/docs`.

## Architecture

```
client ──HTTP──▶ API Gateway (HTTP API) ──event──▶ Lambda: Mangum ──▶ FastAPI app
                                                                     ├─ app/analysis.py  trimesh geometry + DFM checks
                                                                     ├─ app/pricing.py   fake quote
                                                                     └─ app/models.py    Pydantic response models
```

- **FastAPI + Pydantic v2:** routing, input validation and the OpenAPI schema (`app/main.py`, `app/models.py`).
- **trimesh + numpy:** load the STL and measure it. The rotation-aware fit check compares sorted extents and a PCA-aligned box.
- **Mangum:** `app.main.handler` translates Lambda events into ASGI requests, so the same app runs locally under uvicorn and on Lambda.
- **API Gateway HTTP API:** a single catch-all route; FastAPI does the routing.
- **AWS SAM:** `template.yaml` defines the function (Python 3.12, arm64, 1024 MB, 30 s timeout), the HTTP API and a log group that keeps logs for 14 days. `samconfig.toml` holds the build and deploy defaults.

## Run locally

```bash
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Then open http://127.0.0.1:8000/docs, or:

```bash
curl -F file=@samples/cube_10mm.stl -F material=RESIN -F quantity=2 http://127.0.0.1:8000/analyze
```

## Tests

```bash
pytest
```

The 40 tests cover:
- the analysis and pricing modules;
- the API through FastAPI's `TestClient`, using the sample cube, open box and oversized bar in `samples/`;
- the Lambda handler, using fake API Gateway events.

No AWS account is needed.

## Deploy with SAM

You need the AWS CLI with credentials configured, the SAM CLI, and Docker running. The build runs inside a Lambda-like container, so numpy gets Linux arm64 wheels.

```bash
sam build             # container build (use_container = true in samconfig.toml)
sam local start-api   # optional: try it locally at http://127.0.0.1:3000
sam deploy            # first time: sam deploy --guided
```

The API URL is printed as the `ApiUrl` stack output. To remove everything, run `sam delete`.

**Upload limit:** Lambda caps request payloads at 6 MB, and API Gateway sends the file base64-encoded. In practice that means STL files of about 4.5 MB or less when deployed. Locally the limit is 50 MB.

## Performance

These figures were measured on the deployed function (arm64, 1024 MB):

| Metric | Value |
| --- | --- |
| Cold start | about 1.3 s |
| Warm request | 16–25 ms |
| Max memory used | about 120 MB |
