from fastapi import FastAPI, HTTPException, UploadFile

from app.analysis import Analysis, InvalidMeshError, analyze_stl

app = FastAPI(title="Part Analyzer API")

MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


@app.get("/health")
def health() -> dict[str, str]:
    """Lets a caller (or a load balancer) check that the service is up."""
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(file: UploadFile) -> Analysis:
    """Upload an STL file (multipart form field "file") and get its geometry facts."""
    if not (file.filename or "").lower().endswith(".stl"):
        raise HTTPException(status_code=400, detail="Please upload a .stl file.")

    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is larger than 50 MB.")

    try:
        return analyze_stl(data)
    except InvalidMeshError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
