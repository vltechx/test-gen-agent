from typing import Annotated

from fastapi import FastAPI, Form, HTTPException, UploadFile

from app.analysis import InvalidMeshError, analyze_stl, has_errors
from app.models import ANALYZE_RESPONSE_EXAMPLES, AnalyzeResponse, Material
from app.pricing import quote_part

app = FastAPI(title="Part Analyzer API")

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB
MAX_QUANTITY = 1000


@app.get("/health")
def health() -> dict[str, str]:
    """Lets a caller (or a load balancer) check that the service is up."""
    return {"status": "ok"}


@app.post(
    "/analyze",
    response_model=AnalyzeResponse,
    responses={
        200: {"content": {"application/json": {"examples": ANALYZE_RESPONSE_EXAMPLES}}},
        400: {"description": "Not a .stl file, or the file could not be read as STL."},
        413: {"description": "File is larger than 50 MB."},
    },
)
async def analyze(
    file: UploadFile,
    material: Annotated[Material, Form(description="Material to quote.")] = "PA12",
    quantity: Annotated[int, Form(ge=1, le=MAX_QUANTITY, description="Number of parts to quote.")] = 1,
) -> AnalyzeResponse:
    """Upload an STL file and get geometry facts, DFM warnings and a FAKE quote."""
    if not (file.filename or "").lower().endswith(".stl"):
        raise HTTPException(status_code=400, detail="Please upload a .stl file.")

    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 50 MB.")

    try:
        analysis = analyze_stl(data)
    except InvalidMeshError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    quote = None if has_errors(analysis.warnings) else quote_part(analysis.volume_mm3, material, quantity)
    return AnalyzeResponse(**analysis.model_dump(), quote=quote)
