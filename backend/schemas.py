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
# ---------------------------------------------------------------------------

class ColorToken(BaseModel):
    name: str
    hex: str
    usage: str
    contrast_note: str


class ColorPalette(BaseModel):
    scheme_type: str
    primary: ColorToken
    secondary: ColorToken
    accent: ColorToken
    background: ColorToken
    surface: ColorToken
    text_primary: ColorToken
    text_secondary: ColorToken
    success: ColorToken
    warning: ColorToken
    error: ColorToken
    rationale: str


class ShapeRecommendation(BaseModel):
    style: str
    corner_radius_small_px: int
    corner_radius_medium_px: int
    corner_radius_large_px: int
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
    rationale: str


class DesignPrinciple(BaseModel):
    name: str
    application: str


class DesignRecommendation(BaseModel):
    summary: str
    color_palette: ColorPalette
    shape: ShapeRecommendation
    sizing: SizingRecommendation
    principles_applied: List[DesignPrinciple]
    accessibility_notes: str
    research_notes: str
    sources: List[str] = Field(default_factory=list)
