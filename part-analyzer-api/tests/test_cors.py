"""CORS: which browser origins may call the API. Browsers send an Origin header; the API answers with
Access-Control-Allow-Origin only for origins it trusts, and the browser blocks the response otherwise."""

import pytest
from fastapi.testclient import TestClient

from app.main import allowed_origins


@pytest.mark.parametrize(
    ("origin", "allowed"),
    [("http://localhost:5173", True), ("https://evil.example.com", False)],
    ids=["console-dev-server", "other-origin"],
)
def test_cors_header_only_for_allowed_origin(client: TestClient, origin: str, allowed: bool) -> None:
    response = client.get("/health", headers={"Origin": origin})

    assert response.status_code == 200  # CORS doesn't block on the server; the browser does
    assert response.headers.get("access-control-allow-origin") == (origin if allowed else None)


def test_allowed_origins_parses_env_value() -> None:
    value = " https://a.example.com, https://b.example.com/ ,, *, http://localhost:5173"

    assert allowed_origins(value) == ["http://localhost:5173", "https://a.example.com", "https://b.example.com"]
