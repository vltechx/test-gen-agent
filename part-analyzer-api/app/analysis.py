"""Geometry analysis for STL files. No web code here, so it is easy to test on its own."""

from io import BytesIO
from typing import Literal, TypedDict

import numpy as np
import trimesh

# STL files have no units. We assume millimetres, the usual convention for 3D printing.

BUILD_VOLUME_MM: tuple[float, float, float] = (380.0, 284.0, 380.0)
FIT_TOLERANCE_MM = 1e-6  # ignore floating-point noise when a part exactly touches the limit

Severity = Literal["error", "warning"]
WarningCode = Literal["EXCEEDS_BUILD_VOLUME", "NOT_WATERTIGHT"]


class DfmWarning(TypedDict):
    code: WarningCode  # stable, machine-readable id for clients to switch on
    severity: Severity  # "error" = cannot be made as-is, "warning" = may cause problems
    message: str  # human-readable explanation


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
    warnings: list[DfmWarning]


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


def _fits(size: np.ndarray, volume: tuple[float, float, float]) -> bool:
    """True if a box of `size` fits in `volume` when turned in 90-degree steps.

    Sorting both lists pairs the part's shortest side with the machine's shortest side,
    and so on, which is the best of the 6 possible axis swaps.
    """
    return all(p <= v + FIT_TOLERANCE_MM for p, v in zip(sorted(size), sorted(volume)))


def _principal_axes_size(mesh: trimesh.Trimesh) -> np.ndarray:
    """Size of a box aligned to the part's own main directions (PCA), not to X/Y/Z.

    This catches parts modelled at an angle, like a long bar drawn diagonally. It is a
    good approximation of the smallest box, not a guaranteed minimum.
    """
    centered = mesh.vertices - mesh.vertices.mean(axis=0)
    _, axes = np.linalg.eigh(np.cov(centered.T))  # columns are the part's main directions
    projected = centered @ axes
    return projected.max(axis=0) - projected.min(axis=0)


def _format_size(size: np.ndarray | tuple[float, ...]) -> str:
    return " × ".join(f"{v:g}" for v in np.round(size, 1))


def check_build_volume(mesh: trimesh.Trimesh) -> DfmWarning | None:
    candidates = [np.asarray(mesh.extents), _principal_axes_size(mesh)]
    if any(_fits(size, BUILD_VOLUME_MM) for size in candidates):
        return None
    smallest = min(candidates, key=lambda s: float(np.prod(s)))
    return {
        "code": "EXCEEDS_BUILD_VOLUME",
        "severity": "error",
        "message": (
            f"Part is about {_format_size(smallest)} mm and does not fit the "
            f"{_format_size(BUILD_VOLUME_MM)} mm build volume in any orientation checked."
        ),
    }


def check_watertight(mesh: trimesh.Trimesh) -> DfmWarning | None:
    if mesh.is_watertight:
        return None
    return {
        "code": "NOT_WATERTIGHT",
        "severity": "warning",
        "message": (
            "Mesh has holes or gaps, so it is not a closed solid. "
            "It may not print correctly, and the reported volume is unreliable."
        ),
    }


def check_dfm(mesh: trimesh.Trimesh) -> list[DfmWarning]:
    """Run every design-for-manufacturing check and keep the ones that found a problem."""
    results = [check_build_volume(mesh), check_watertight(mesh)]
    return [w for w in results if w is not None]


def has_errors(warnings: list[DfmWarning]) -> bool:
    """True if any warning means the part cannot be made as-is."""
    return any(w["severity"] == "error" for w in warnings)


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
        "warnings": check_dfm(mesh),
    }


def analyze_stl(data: bytes) -> Analysis:
    return analyze_mesh(load_mesh(data))
