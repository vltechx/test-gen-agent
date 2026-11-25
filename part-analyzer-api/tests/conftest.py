"""Shared pytest fixtures. pytest loads this file automatically before running tests."""

from collections.abc import Callable
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

SAMPLES_DIR = Path(__file__).parent.parent / "samples"


@pytest.fixture
def sample_bytes() -> Callable[[str], bytes]:
    """Returns a function that reads a file from samples/, e.g. sample_bytes("cube_10mm.stl")."""

    def read(name: str) -> bytes:
        return (SAMPLES_DIR / name).read_bytes()

    return read


@pytest.fixture
def client() -> TestClient:
    """Calls the FastAPI app in-process. No real server or network needed."""
    return TestClient(app)
