"""Unit tests for app/pricing.py: the FAKE quote maths."""

import pytest

from app.pricing import SETUP_FEE_USD, lead_time_days, quote_part

CUBE_VOLUME_MM3 = 1000.0  # samples/cube_10mm.stl, which is 1 cm³


def test_pa12_single_part() -> None:
    quote = quote_part(CUBE_VOLUME_MM3, "PA12", 1)

    assert quote.volume_cm3 == pytest.approx(1.0)
    assert quote.unit_price_usd == pytest.approx(0.30)
    assert quote.setup_fee_usd == pytest.approx(25.0)
    assert quote.total_usd == pytest.approx(25.30)
    assert quote.lead_time_days == 5


def test_resin_thirty_parts() -> None:
    quote = quote_part(CUBE_VOLUME_MM3, "RESIN", 30)

    assert quote.material_name == "Standard resin (SLA)"
    assert quote.total_usd == pytest.approx(25.0 + 0.45 * 30)  # 38.50
    assert quote.lead_time_days == 4  # 3 base days + 1 for going past 25 parts


def test_setup_fee_is_charged_once_per_order() -> None:
    one = quote_part(CUBE_VOLUME_MM3, "PA12", 1)
    ten = quote_part(CUBE_VOLUME_MM3, "PA12", 10)

    assert ten.total_usd - SETUP_FEE_USD == pytest.approx(10 * (one.total_usd - SETUP_FEE_USD))


@pytest.mark.parametrize(
    ("quantity", "expected_days"),
    [(1, 5), (25, 5), (26, 6), (50, 6), (51, 7), (1000, 44)],
)
def test_lead_time_adds_a_day_per_25_parts(quantity: int, expected_days: int) -> None:
    assert lead_time_days("PA12", quantity) == expected_days


def test_quote_is_labelled_fake() -> None:
    quote = quote_part(CUBE_VOLUME_MM3, "PA12", 1)

    assert quote.is_fake is True
    assert "FAKE" in quote.disclaimer


@pytest.mark.parametrize("quantity", [0, -1])
def test_quantity_below_one_is_rejected(quantity: int) -> None:
    with pytest.raises(ValueError, match="at least 1"):
        quote_part(CUBE_VOLUME_MM3, "PA12", quantity)
