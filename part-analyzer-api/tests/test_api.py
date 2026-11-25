"""End-to-end tests for the HTTP API, using FastAPI's in-process TestClient."""

from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx2 import Response

from app.models import ANALYZE_RESPONSE_EXAMPLES

SampleBytes = Callable[[str], bytes]


def post_analyze(client: TestClient, filename: str, content: bytes, **form: Any) -> Response:
    """POST a file to /analyze as multipart form data, with optional form fields."""
    files = {"file": (filename, content, "application/octet-stream")}
    return client.post("/analyze", files=files, data={k: str(v) for k, v in form.items()})


def test_health(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cube_is_quoted(client: TestClient, sample_bytes: SampleBytes) -> None:
    response = post_analyze(client, "cube_10mm.stl", sample_bytes("cube_10mm.stl"))

    assert response.status_code == 200
    body = response.json()
    assert body["warnings"] == []
    assert body["quote"]["material"] == "PA12"  # default
    assert body["quote"]["quantity"] == 1  # default
    assert body["quote"]["total_usd"] == pytest.approx(25.30)
    assert body["quote"]["is_fake"] is True


def test_open_box_warns_but_is_still_quoted(client: TestClient, sample_bytes: SampleBytes) -> None:
    response = post_analyze(client, "open_box_10mm.stl", sample_bytes("open_box_10mm.stl"))

    assert response.status_code == 200
    body = response.json()
    assert body["watertight"] is False
    assert [w["code"] for w in body["warnings"]] == ["NOT_WATERTIGHT"]
    assert body["quote"] is not None


def test_bar_gets_error_and_no_quote(client: TestClient, sample_bytes: SampleBytes) -> None:
    response = post_analyze(client, "bar_400x20x20mm.stl", sample_bytes("bar_400x20x20mm.stl"))

    assert response.status_code == 200
    body = response.json()
    assert [(w["code"], w["severity"]) for w in body["warnings"]] == [("EXCEEDS_BUILD_VOLUME", "error")]
    assert body["quote"] is None


def test_material_and_quantity_are_used(client: TestClient, sample_bytes: SampleBytes) -> None:
    response = post_analyze(client, "cube_10mm.stl", sample_bytes("cube_10mm.stl"), material="RESIN", quantity=30)

    assert response.status_code == 200
    quote = response.json()["quote"]
    assert (quote["material"], quote["quantity"]) == ("RESIN", 30)
    assert quote["total_usd"] == pytest.approx(38.50)


def test_bad_material_is_rejected(client: TestClient, sample_bytes: SampleBytes) -> None:
    response = post_analyze(client, "cube_10mm.stl", sample_bytes("cube_10mm.stl"), material="STEEL")

    assert response.status_code == 422
    error = response.json()["detail"][0]
    assert error["loc"] == ["body", "material"]


@pytest.mark.parametrize("quantity", [0, 1001])
def test_quantity_out_of_range_is_rejected(client: TestClient, sample_bytes: SampleBytes, quantity: int) -> None:
    response = post_analyze(client, "cube_10mm.stl", sample_bytes("cube_10mm.stl"), quantity=quantity)

    assert response.status_code == 422
    assert response.json()["detail"][0]["loc"] == ["body", "quantity"]


def test_non_stl_filename_is_rejected(client: TestClient) -> None:
    response = post_analyze(client, "notes.txt", b"hello")

    assert response.status_code == 400
    assert response.json() == {"detail": "Please upload a .stl file."}


def test_garbage_stl_is_rejected(client: TestClient) -> None:
    response = post_analyze(client, "broken.stl", b"not an stl")

    assert response.status_code == 400
    assert "STL" in response.json()["detail"]


@pytest.mark.parametrize(
    ("filename", "example_key"),
    [
        ("cube_10mm.stl", "printable_cube"),
        ("open_box_10mm.stl", "open_mesh"),
        ("bar_400x20x20mm.stl", "too_large"),
    ],
)
def test_docs_examples_match_real_responses(
    client: TestClient, sample_bytes: SampleBytes, filename: str, example_key: str
) -> None:
    """If the API output changes, the examples shown in /docs must be updated too."""
    response = post_analyze(client, filename, sample_bytes(filename))

    assert response.json() == ANALYZE_RESPONSE_EXAMPLES[example_key]["value"]
