"""Calls the Lambda handler with fake API Gateway (HTTP API, payload v2.0) events. No AWS needed."""

import base64
import json
from collections.abc import Callable
from typing import Any

import httpx2

from app.main import handler

SampleBytes = Callable[[str], bytes]


class FakeLambdaContext:
    """Stand-in for the context object AWS passes to every Lambda call."""

    function_name = "part-analyzer-api"
    aws_request_id = "test-request-id"


def http_api_event(method: str, path: str, headers: dict[str, str], body: bytes = b"") -> dict[str, Any]:
    """The JSON an API Gateway HTTP API sends to Lambda. Bodies arrive base64-encoded."""
    return {
        "version": "2.0",
        "routeKey": "$default",
        "rawPath": path,
        "rawQueryString": "",
        "headers": headers,
        "requestContext": {
            "http": {"method": method, "path": path, "protocol": "HTTP/1.1", "sourceIp": "127.0.0.1", "userAgent": "pytest"},
            "requestId": "test-request-id",
            "stage": "$default",
        },
        "body": base64.b64encode(body).decode(),
        "isBase64Encoded": True,
    }


def test_health_through_lambda() -> None:
    response = handler(http_api_event("GET", "/health", {}), FakeLambdaContext())

    assert response["statusCode"] == 200
    assert json.loads(response["body"]) == {"status": "ok"}


def test_stl_upload_through_lambda(sample_bytes: SampleBytes) -> None:
    # Let httpx build a real multipart body and Content-Type header, as a browser or curl would.
    upload = httpx2.Request(
        "POST",
        "https://example.test/analyze",
        files={"file": ("cube_10mm.stl", sample_bytes("cube_10mm.stl"), "application/octet-stream")},
        data={"material": "RESIN", "quantity": "2"},
    )
    event = http_api_event("POST", "/analyze", {"content-type": upload.headers["content-type"]}, upload.read())

    response = handler(event, FakeLambdaContext())

    assert response["statusCode"] == 200
    body = json.loads(response["body"])
    assert body["volume_mm3"] == 1000.0
    assert (body["quote"]["material"], body["quote"]["quantity"]) == ("RESIN", 2)
