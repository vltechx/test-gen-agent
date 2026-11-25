from typing import Annotated

from fastapi import FastAPI, Form, HTTPException, UploadFile

from app.analysis import Analysis, InvalidMeshError, analyze_stl, has_errors
from app.pricing import Material, Quote, quote_part

app = FastAPI(title="Part Analyzer API")

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB
MAX_QUANTITY = 1000


class AnalyzeResponse(Analysis):
    quote: Quote | None  # None when an error-severity DFM warning blocks manufacturing


@app.get("/health")
def health() -> dict[str, str]:
    """Lets a caller (or a load balancer) check that the service is up."""
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(
    file: UploadFile,
    material: Annotated[Material, Form()] = "PA12",
    quantity: Annotated[int, Form(ge=1, le=MAX_QUANTITY)] = 1,
) -> AnalyzeResponse:
    """Upload an STL file (multipart form field "file") and get geometry facts,
    DFM warnings and a FAKE quote. Optional form fields: material, quantity."""
    if not (file.filename or "").lower().endswith(".stl"):
        raise HTTPException(status_code=400, detail="Please upload a .stl file.")

    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 50 MB.")

    try:
        analysis = analyze_stl(data)
    except InvalidMeshError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    quote = None if has_errors(analysis["warnings"]) else quote_part(analysis["volume_mm3"], material, quantity)
    return {**analysis, "quote": quote}
