"""Unit tests for app/analysis.py: geometry facts and DFM checks, no web layer."""

from collections.abc import Callable

import numpy as np
import pytest
import trimesh

from app.analysis import InvalidMeshError, analyze_mesh, analyze_stl, check_build_volume, has_errors, load_mesh

SampleBytes = Callable[[str], bytes]


def make_box(x: float, y: float, z: float, tilt_deg: float = 0.0) -> trimesh.Trimesh:
    """A closed box of the given size, optionally rotated about the Z axis."""
    box = trimesh.creation.box(extents=[x, y, z])
    if tilt_deg:
        box.apply_transform(trimesh.transformations.rotation_matrix(np.radians(tilt_deg), [0, 0, 1]))
    return box


def test_cube_geometry(sample_bytes: SampleBytes) -> None:
    result = analyze_stl(sample_bytes("cube_10mm.stl"))

    assert result.volume_mm3 == pytest.approx(1000.0)
    assert result.surface_area_mm2 == pytest.approx(600.0)
    assert result.bounding_box.min == [0.0, 0.0, 0.0]
    assert result.bounding_box.max == [10.0, 10.0, 10.0]
    assert result.bounding_box.size == [10.0, 10.0, 10.0]
    assert result.watertight is True
    assert result.triangle_count == 12
    assert result.warnings == []


def test_open_box_is_not_watertight(sample_bytes: SampleBytes) -> None:
    result = analyze_stl(sample_bytes("open_box_10mm.stl"))

    assert result.watertight is False
    assert result.surface_area_mm2 == pytest.approx(500.0)  # one 10 x 10 side is missing
    assert [(w.code, w.severity) for w in result.warnings] == [("NOT_WATERTIGHT", "warning")]
    assert has_errors(result.warnings) is False


def test_bar_exceeds_build_volume(sample_bytes: SampleBytes) -> None:
    result = analyze_stl(sample_bytes("bar_400x20x20mm.stl"))

    assert result.watertight is True
    assert [(w.code, w.severity) for w in result.warnings] == [("EXCEEDS_BUILD_VOLUME", "error")]
    assert "400 × 20 × 20 mm" in result.warnings[0].message
    assert has_errors(result.warnings) is True


@pytest.mark.parametrize(
    ("size", "tilt_deg"),
    [
        ((380, 284, 380), 0),  # exactly the build volume
        ((300, 300, 200), 0),  # 300 deep is too much for the 284 axis, fits after a 90° turn
        ((370, 280, 280), 30),  # X/Y/Z box is 460 x 427, fits once straightened
    ],
    ids=["exact-fit", "needs-90-turn", "tilted-30"],
)
def test_parts_that_fit_after_rotation(size: tuple[float, float, float], tilt_deg: float) -> None:
    assert check_build_volume(make_box(*size, tilt_deg=tilt_deg)) is None


@pytest.mark.parametrize(
    ("size", "tilt_deg"),
    [
        ((381, 10, 10), 0),  # 1 mm longer than the longest axis
        ((300, 300, 300), 0),  # every side is wider than the 284 axis
        ((390, 290, 290), 30),  # too big even when straightened
    ],
    ids=["1mm-too-long", "too-wide-every-way", "tilted-30-too-big"],
)
def test_parts_that_do_not_fit(size: tuple[float, float, float], tilt_deg: float) -> None:
    warning = check_build_volume(make_box(*size, tilt_deg=tilt_deg))

    assert warning is not None
    assert warning.code == "EXCEEDS_BUILD_VOLUME"
    assert warning.severity == "error"


def test_binary_stl_gives_same_result_as_ascii(sample_bytes: SampleBytes) -> None:
    ascii_mesh = load_mesh(sample_bytes("cube_10mm.stl"))
    binary_bytes = ascii_mesh.export(file_type="stl")  # trimesh's default STL export is binary

    assert analyze_stl(binary_bytes) == analyze_mesh(ascii_mesh)


@pytest.mark.parametrize(
    "data",
    [b"", b"not an stl", b"solid empty\nendsolid empty\n"],
    ids=["empty-bytes", "random-text", "stl-with-no-triangles"],
)
def test_unreadable_or_empty_files_raise(data: bytes) -> None:
    with pytest.raises(InvalidMeshError):
        load_mesh(data)
