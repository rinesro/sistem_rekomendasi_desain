"""Pydantic schemas: request input and the structured design-recommendation output.

The output schema is passed to Gemini as `response_schema` so the model is forced
to answer with this exact structure (fixed fields only — Gemini's structured
output does not support dynamic dict keys, so scales/lists use typed lists).
"""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class Platform(str, Enum):
    WEB = "web"
    MOBILE = "mobile"
    DESKTOP = "desktop"


class TechLiteracy(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


# ---------------------------------------------------------------------------
# Request (form input from the user)
# ---------------------------------------------------------------------------

class TargetUser(BaseModel):
    age_range: str = Field(..., examples=["25-40"])
    tech_literacy: TechLiteracy
    cultural_region: str = Field(..., examples=["Indonesia", "Global/Western"])
    accessibility_needs: List[str] = Field(default_factory=list)
    emotional_tone_desired: str = Field(
        ..., examples=["tenang dan terpercaya", "energik dan playful"]
    )


class RecommendationRequest(BaseModel):
    platform: Platform
    system_name: str = Field(..., examples=["Aplikasi kesehatan mental"])
    system_domain: str = Field(..., examples=["Kesehatan", "Fintech", "E-commerce"])
    system_goals: str
    brand_personality: str = Field(..., examples=["profesional, hangat, terpercaya"])
    target_user: TargetUser
    existing_brand_colors: Optional[List[str]] = None
    dark_mode: bool = False


# ---------------------------------------------------------------------------
# Response (structured recommendation produced by Gemini)
#
# Warna dikelompokkan mengikuti aturan proporsi 60-30-10 (bukan daftar token lepas),
# dan bentuk/ukuran dipecah per bagian UI konkret (tombol, kartu, input, dst) supaya
# pengguna non-desainer langsung tahu rekomendasi itu berlaku untuk elemen yang mana.
# ---------------------------------------------------------------------------

class ColorToken(BaseModel):
    name: str
    hex: str
    ui_parts: List[str]  # bagian UI yang cocok memakai warna ini, mis. ["Background halaman", "Card"]
    contrast_note: str


class ColorGroup(BaseModel):
    percentage_label: str  # "60%", "30%", atau "10%"
    role_title: str  # mis. "Warna Dominan (Netral)", "Warna Sekunder", "Warna Aksen"
    tokens: List[ColorToken]
    rationale: str


class ColorPalette(BaseModel):
    scheme_type: str
    dominant: ColorGroup  # ~60% dari tampilan
    secondary: ColorGroup  # ~30% dari tampilan
    accent: ColorGroup  # ~10% dari tampilan
    status_colors: List[ColorToken]  # success/warning/error - dipakai kontekstual, di luar rasio 60-30-10
    rationale: str


class ComponentRecommendation(BaseModel):
    component_name: str  # nama bagian UI, mis. "Tombol Utama", "Kartu/Card", "Jarak Antar Section"
    recommendation: str  # rekomendasi konkret dalam 1 kalimat singkat, sertakan angka px
    value_px: Optional[int] = None  # angka px utama dari rekomendasi (radius/tinggi/dll), null jika tidak relevan
    rationale: str


class ShapeRecommendation(BaseModel):
    overall_style: str  # mis. "rounded", "sharp", "mixed"
    components: List[ComponentRecommendation]
    icon_style: str
    rationale: str


class TypographyScaleStep(BaseModel):
    label: str
    size_px: int
    weight: str
    line_height_px: int


class SizingRecommendation(BaseModel):
    base_spacing_unit_px: int
    spacing_scale_px: List[int]
    min_touch_target_px: int
    typography_scale: List[TypographyScaleStep]
    breakpoints_px: List[int]
    components: List[ComponentRecommendation]
    rationale: str


class DesignPrinciple(BaseModel):
    name: str
    application: str


class DesignRecommendation(BaseModel):
    color_palette: ColorPalette
    shape: ShapeRecommendation
    sizing: SizingRecommendation
    principles_applied: List[DesignPrinciple]
    accessibility_notes: str
    research_notes: str
    sources: List[str] = Field(default_factory=list)
