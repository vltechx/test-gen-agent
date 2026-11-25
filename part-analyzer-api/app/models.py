"""Pydantic models for API responses. FastAPI turns these into the OpenAPI schema shown in /docs."""

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Material = Literal["PA12", "RESIN"]
Severity = Literal["error", "warning"]
WarningCode = Literal["EXCEEDS_BUILD_VOLUME", "NOT_WATERTIGHT"]

# Exactly three numbers: [x, y, z] in millimetres.
Vector3 = Annotated[list[float], Field(min_length=3, max_length=3)]


class BoundingBox(BaseModel):
    """Smallest X/Y/Z-aligned box around the part, in mm."""

    min: Vector3 = Field(description="[x, y, z] of the lowest corner, in mm.", examples=[[0.0, 0.0, 0.0]])
    max: Vector3 = Field(description="[x, y, z] of the highest corner, in mm.", examples=[[10.0, 10.0, 10.0]])
    size: Vector3 = Field(description="[x, y, z] width, depth and height, in mm.", examples=[[10.0, 10.0, 10.0]])


class DfmWarning(BaseModel):
    """One design-for-manufacturing problem found in the part."""

    code: WarningCode = Field(description="Stable, machine-readable id for clients to switch on.")
    severity: Severity = Field(description='"error" = cannot be made as-is (no quote). "warning" = may cause problems.')
    message: str = Field(description="Human-readable explanation.")

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "code": "NOT_WATERTIGHT",
                    "severity": "warning",
                    "message": "Mesh has holes or gaps, so it is not a closed solid. "
                    "It may not print correctly, and the reported volume is unreliable.",
                }
            ]
        }
    )


class Quote(BaseModel):
    """A FAKE price for printing the part. Invented rates, for learning only."""

    is_fake: Literal[True] = Field(default=True, description="Always true. This is not a real price.")
    disclaimer: str = Field(examples=["FAKE QUOTE for a learning project. Not a real price or offer."])
    material: Material = Field(description="Material code that was priced.")
    material_name: str = Field(examples=["Nylon PA12 (SLS)"])
    quantity: int = Field(ge=1, examples=[1])
    volume_cm3: float = Field(ge=0, description="Part volume in cm³ (1 cm³ = 1000 mm³).", examples=[1.0])
    usd_per_cm3: float = Field(ge=0, description="Material rate used.", examples=[0.3])
    unit_price_usd: float = Field(ge=0, description="Material cost of one part.", examples=[0.3])
    setup_fee_usd: float = Field(ge=0, description="Charged once per order.", examples=[25.0])
    total_usd: float = Field(ge=0, description="setup_fee_usd + unit_price_usd × quantity.", examples=[25.3])
    lead_time_days: int = Field(ge=1, examples=[5])


class Analysis(BaseModel):
    """Geometry facts and DFM warnings for one STL file. STL has no units; we assume mm."""

    volume_mm3: float = Field(ge=0, description="Enclosed volume. Unreliable if not watertight.", examples=[1000.0])
    surface_area_mm2: float = Field(ge=0, examples=[600.0])
    bounding_box: BoundingBox
    watertight: bool = Field(description="True if the mesh is a closed solid with no holes.", examples=[True])
    triangle_count: int = Field(ge=1, examples=[12])
    warnings: list[DfmWarning] = Field(description="Empty when no problems were found.")


class AnalyzeResponse(Analysis):
    """Response of POST /analyze."""

    quote: Quote | None = Field(description="null when any warning has severity \"error\".")


_FAKE_PA12_QUOTE: dict[str, Any] = {
    "is_fake": True,
    "disclaimer": "FAKE QUOTE for a learning project. Not a real price or offer.",
    "material": "PA12",
    "material_name": "Nylon PA12 (SLS)",
    "quantity": 1,
    "volume_cm3": 1.0,
    "usd_per_cm3": 0.3,
    "unit_price_usd": 0.3,
    "setup_fee_usd": 25.0,
    "total_usd": 25.3,
    "lead_time_days": 5,
}

# Real outputs for the files in samples/, shown as a dropdown of examples in /docs.
ANALYZE_RESPONSE_EXAMPLES: dict[str, dict[str, Any]] = {
    "printable_cube": {
        "summary": "Printable part (samples/cube_10mm.stl)",
        "value": {
            "volume_mm3": 1000.0,
            "surface_area_mm2": 600.0,
            "bounding_box": {"min": [0.0, 0.0, 0.0], "max": [10.0, 10.0, 10.0], "size": [10.0, 10.0, 10.0]},
            "watertight": True,
            "triangle_count": 12,
            "warnings": [],
            "quote": _FAKE_PA12_QUOTE,
        },
    },
    "open_mesh": {
        "summary": "Warning, still quoted (samples/open_box_10mm.stl)",
        "value": {
            "volume_mm3": 1000.0,
            "surface_area_mm2": 500.0,
            "bounding_box": {"min": [0.0, 0.0, 0.0], "max": [10.0, 10.0, 10.0], "size": [10.0, 10.0, 10.0]},
            "watertight": False,
            "triangle_count": 10,
            "warnings": [
                {
                    "code": "NOT_WATERTIGHT",
                    "severity": "warning",
                    "message": "Mesh has holes or gaps, so it is not a closed solid. "
                    "It may not print correctly, and the reported volume is unreliable.",
                }
            ],
            "quote": _FAKE_PA12_QUOTE,
        },
    },
    "too_large": {
        "summary": "Error, no quote (samples/bar_400x20x20mm.stl)",
        "value": {
            "volume_mm3": 160000.0,
            "surface_area_mm2": 32800.0,
            "bounding_box": {"min": [0.0, 0.0, 0.0], "max": [400.0, 20.0, 20.0], "size": [400.0, 20.0, 20.0]},
            "watertight": True,
            "triangle_count": 12,
            "warnings": [
                {
                    "code": "EXCEEDS_BUILD_VOLUME",
                    "severity": "error",
                    "message": "Part is about 400 × 20 × 20 mm and does not fit the "
                    "380 × 284 × 380 mm build volume in any orientation checked.",
                }
            ],
            "quote": None,
        },
    },
}
