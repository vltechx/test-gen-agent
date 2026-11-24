"""Geometry analysis for STL files. No web code here, so it is easy to test on its own."""

from io import BytesIO
from typing import TypedDict

import trimesh

# STL files have no units. We assume millimetres, the usual convention for 3D printing.


class BoundingBox(TypedDict):
    min: list[float]  # [x, y, z] of the lowest corner, in mm
    max: list[float]  # [x, y, z] of the highest corner, in mm
    size: list[float]  # [x, y, z] width, depth, height, in mm


class Analysis(TypedDict):
    volume_mm3: float
    surface_area_mm2: float
    bounding_box: BoundingBox
    watertight: bool
    triangle_count: int


class InvalidMeshError(ValueError):
    """The uploaded bytes are not a usable STL mesh."""


def load_mesh(data: bytes) -> trimesh.Trimesh:
    """Parse STL bytes (ASCII or binary) into a mesh, or raise InvalidMeshError."""
    try:
        mesh = trimesh.load(BytesIO(data), file_type="stl", force="mesh")
    except Exception as exc:  # trimesh raises many different error types for bad input
        raise InvalidMeshError("Could not read the file as STL.") from exc
    if not isinstance(mesh, trimesh.Trimesh) or len(mesh.faces) == 0:
        raise InvalidMeshError("The STL file contains no triangles.")
    return mesh


def _rounded(values: list[float]) -> list[float]:
    return [round(float(v), 3) for v in values]


def analyze_mesh(mesh: trimesh.Trimesh) -> Analysis:
    """Measure a mesh. Volume is only meaningful when the mesh is watertight."""
    low, high = mesh.bounds
    return {
        "volume_mm3": round(float(abs(mesh.volume)), 3),
        "surface_area_mm2": round(float(mesh.area), 3),
        "bounding_box": {
            "min": _rounded(low),
            "max": _rounded(high),
            "size": _rounded(mesh.extents),
        },
        "watertight": bool(mesh.is_watertight),
        "triangle_count": int(len(mesh.faces)),
    }


def analyze_stl(data: bytes) -> Analysis:
    return analyze_mesh(load_mesh(data))
