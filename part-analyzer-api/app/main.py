from fastapi import FastAPI

app = FastAPI(title="Part Analyzer API")


@app.get("/health")
def health() -> dict[str, str]:
    """Lets a caller (or a load balancer) check that the service is up."""
    return {"status": "ok"}
