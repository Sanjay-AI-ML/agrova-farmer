"""Crop Treatment Advisory Model (Model 2).

Provides agronomic recommendations, candidate active ingredients,
and precise spray dosage/tank volume calculations based on crop,
pathogen class, and farm area.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Any

_HERE = Path(__file__).resolve().parent
_ADVISORY_PATH = _HERE / "advisory.json"

with open(_ADVISORY_PATH, "r", encoding="utf-8") as f:
    _DATA = json.load(f)

GENERAL_SAFETY: str = _DATA.get("general_safety", "")
ADVISORIES: List[Dict[str, Any]] = _DATA.get("advisories", [])


def find_advice(class_name: str) -> Optional[Dict[str, Any]]:
    """Look up crop disease advice by predicted class name."""
    normalized = class_name.lower().replace(" ", "_").replace("-", "_")
    if "healthy" in normalized:
        return None

    for item in ADVISORIES:
        crop = item["crop"]
        disease = item["disease"]
        if crop in normalized and disease in normalized:
            return {
                "crop": crop,
                "disease": disease,
                "kind": item["kind"],
                "action": item["action"],
                "candidates": list(item["candidates"]),
                "safety": GENERAL_SAFETY,
            }

    return {
        "crop": "unknown",
        "disease": "unknown",
        "kind": "unknown",
        "action": "No stored advice for this class – consult local agriculture officer.",
        "candidates": [],
        "safety": GENERAL_SAFETY,
    }


def spray_requirement(
    label_dose_per_litre: float,
    area_ha: float,
    water_l_per_ha: float,
    tank_l: float = 16.0,
    unit: str = "g",
) -> Dict[str, Any]:
    """Calculate spray mix requirements.

    Args:
        label_dose_per_litre: Amount of product per litre of spray water (e.g. from label).
        area_ha: Area in hectares to be treated.
        water_l_per_ha: Measured or calibrated sprayer output per hectare.
        tank_l: Volume of rover spray tank in litres (default: 16 L).
        unit: Measurement unit for dose ('g' or 'mL').

    Returns:
        Dictionary with total product, total water, and dose per tank.
    """
    total_water = float(water_l_per_ha) * float(area_ha)
    total_product = float(label_dose_per_litre) * total_water
    per_tank = float(label_dose_per_litre) * float(tank_l)

    return {
        "product_total": f"{total_product:,.1f} {unit}",
        "water_total": f"{total_water:,.0f} L",
        "per_tank": f"{per_tank:,.1f} {unit} in {tank_l:g} L tank",
        "raw": {
            "product_total_val": total_product,
            "water_total_l": total_water,
            "dose_per_tank_val": per_tank,
            "tank_size_l": tank_l,
            "unit": unit,
        },
    }
