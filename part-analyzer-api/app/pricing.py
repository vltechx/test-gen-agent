"""FAKE quote calculator. Rates and lead times are invented for learning, not real prices."""

from typing import Literal, TypedDict

Material = Literal["PA12", "RESIN"]

MM3_PER_CM3 = 1000.0
SETUP_FEE_USD = 25.0  # charged once per order, whatever the quantity
PARTS_PER_EXTRA_DAY = 25  # every 25 parts after the first batch add a day of lead time
DISCLAIMER = "FAKE QUOTE for a learning project. Not a real price or offer."


class MaterialRate(TypedDict):
    name: str
    usd_per_cm3: float
    base_lead_time_days: int


# Made-up numbers, loosely shaped like real 3D-printing services.
MATERIAL_RATES: dict[Material, MaterialRate] = {
    "PA12": {"name": "Nylon PA12 (SLS)", "usd_per_cm3": 0.30, "base_lead_time_days": 5},
    "RESIN": {"name": "Standard resin (SLA)", "usd_per_cm3": 0.45, "base_lead_time_days": 3},
}


class Quote(TypedDict):
    is_fake: Literal[True]
    disclaimer: str
    material: Material
    material_name: str
    quantity: int
    volume_cm3: float
    usd_per_cm3: float
    unit_price_usd: float  # material cost of one part
    setup_fee_usd: float
    total_usd: float  # setup fee + unit price x quantity
    lead_time_days: int


def lead_time_days(material: Material, quantity: int) -> int:
    extra_days = (quantity - 1) // PARTS_PER_EXTRA_DAY
    return MATERIAL_RATES[material]["base_lead_time_days"] + extra_days


def quote_part(volume_mm3: float, material: Material, quantity: int) -> Quote:
    """Price = setup fee + volume (cm³) x material rate x quantity."""
    if quantity < 1:
        raise ValueError("Quantity must be at least 1.")
    rate = MATERIAL_RATES[material]
    volume_cm3 = volume_mm3 / MM3_PER_CM3
    unit_price = volume_cm3 * rate["usd_per_cm3"]
    return {
        "is_fake": True,
        "disclaimer": DISCLAIMER,
        "material": material,
        "material_name": rate["name"],
        "quantity": quantity,
        "volume_cm3": round(volume_cm3, 3),
        "usd_per_cm3": rate["usd_per_cm3"],
        "unit_price_usd": round(unit_price, 2),
        "setup_fee_usd": SETUP_FEE_USD,
        "total_usd": round(SETUP_FEE_USD + unit_price * quantity, 2),
        "lead_time_days": lead_time_days(material, quantity),
    }
