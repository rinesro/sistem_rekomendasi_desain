"""Integrasi dengan Gemini API, dua tahap:

1. RISET (grounded search) - Gemini memakai tool Google Search bawaan untuk mencari
   data/referensi terkini (tren desain, contoh aplikasi sejenis, standar aksesibilitas
   yang relevan) sesuai domain sistem & target user yang diinput -> ini peran Gemini
   sebagai "mesin search data otomatis" yang diminta user.
2. SINTESIS (structured output) - Hasil riset tahap 1 digabung dengan basis teori UI/UX
   tervalidasi (knowledge_base.py) dan input user, lalu Gemini diminta menghasilkan
   rekomendasi bentuk/ukuran/warna dalam format terstruktur (JSON, sesuai schemas.py).

Dipisah dua panggilan karena Gemini API saat ini tidak mendukung penggabungan tool
`google_search` dengan `response_schema` terstruktur dalam satu request yang sama.
"""

from google import genai
from google.genai import types

from . import config
from .knowledge_base import UI_UX_THEORY_KNOWLEDGE_BASE
from .schemas import DesignRecommendation, RecommendationRequest


class GeminiServiceError(RuntimeError):
    pass


def _get_client() -> genai.Client:
    if not config.GEMINI_API_KEY:
        raise GeminiServiceError(
            "GEMINI_API_KEY belum diset. Salin .env.example ke .env dan isi API key "
            "dari Google AI Studio (https://aistudio.google.com/apikey)."
        )
    return genai.Client(api_key=config.GEMINI_API_KEY)


def _build_research_prompt(req: RecommendationRequest) -> str:
    return f"""
Kamu adalah asisten riset UI/UX. Cari dan rangkum informasi TERKINI dan relevan (lewat
Google Search) untuk membantu mendesain antarmuka sebuah sistem dengan detail berikut:

- Platform: {req.platform.value}
- Nama sistem: {req.system_name}
- Domain/industri: {req.system_domain}
- Tujuan sistem: {req.system_goals}
- Kepribadian brand yang diinginkan: {req.brand_personality}
- Target user: rentang usia {req.target_user.age_range}, tingkat literasi teknologi
  {req.target_user.tech_literacy.value}, wilayah/budaya {req.target_user.cultural_region},
  kebutuhan aksesibilitas: {", ".join(req.target_user.accessibility_needs) or "tidak ada yang spesifik"}
  nuansa emosional yang diinginkan: {req.target_user.emotional_tone_desired}
- Mode gelap dibutuhkan: {"ya" if req.dark_mode else "tidak"}
- Warna brand yang sudah ada (jika ada): {", ".join(req.existing_brand_colors) if req.existing_brand_colors else "tidak ada"}

Cari dan rangkum (maksimal 400 kata, dalam Bahasa Indonesia):
1. Tren visual / pola desain yang umum dipakai aplikasi/website sejenis di domain ini saat ini.
2. Contoh aplikasi terkenal di domain serupa dan ciri khas visual (bentuk, warna) mereka.
3. Pertimbangan aksesibilitas atau kultural yang relevan untuk target user tersebut.
Sertakan sumber/nama referensi bila memungkinkan.
""".strip()


def _run_research(client: genai.Client, req: RecommendationRequest) -> tuple[str, list[str]]:
    response = client.models.generate_content(
        model=config.GEMINI_RESEARCH_MODEL,
        contents=_build_research_prompt(req),
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
        ),
    )

    text = response.text or ""
    sources: list[str] = []
    try:
        candidate = response.candidates[0]
        grounding = candidate.grounding_metadata
        if grounding and grounding.grounding_chunks:
            for chunk in grounding.grounding_chunks:
                web = getattr(chunk, "web", None)
                if web and getattr(web, "uri", None):
                    label = web.title or web.uri
                    if label not in sources:
                        sources.append(label)
    except (AttributeError, IndexError, TypeError):
        pass

    return text, sources


def _build_synthesis_prompt(req: RecommendationRequest, research_notes: str) -> str:
    return f"""
Kamu adalah seorang senior UI/UX designer. Susun rekomendasi BENTUK, UKURAN, dan WARNA
untuk antarmuka sebuah sistem, dengan WAJIB berpijak pada basis teori berikut (jangan
menyimpang dari prinsip-prinsip ini, jelaskan bagaimana tiap prinsip diterapkan):

{UI_UX_THEORY_KNOWLEDGE_BASE}

Berikut hasil riset kontekstual terkini (dari pencarian Google) tentang domain dan target
user terkait, gunakan sebagai konteks tambahan:
---
{research_notes}
---

Spesifikasi kebutuhan sistem:
- Platform: {req.platform.value}
- Nama sistem: {req.system_name}
- Domain/industri: {req.system_domain}
- Tujuan sistem: {req.system_goals}
- Kepribadian brand: {req.brand_personality}
- Target user: usia {req.target_user.age_range}, literasi teknologi
  {req.target_user.tech_literacy.value}, wilayah/budaya {req.target_user.cultural_region},
  kebutuhan aksesibilitas: {", ".join(req.target_user.accessibility_needs) or "tidak ada yang spesifik"},
  nuansa emosional diinginkan: {req.target_user.emotional_tone_desired}
- Mode gelap dibutuhkan: {"ya" if req.dark_mode else "tidak"}
- Warna brand existing (pertahankan/harmoniskan jika ada): {", ".join(req.existing_brand_colors) if req.existing_brand_colors else "tidak ada"}

Instruksi keluaran:
- Semua kode warna HARUS hex valid dan lolos rasio kontras WCAG AA untuk perannya
  (jelaskan rasio/alasan singkat di `contrast_note` tiap warna).
- Semua ukuran (spacing, radius, font, breakpoint) HARUS mengikuti skala 8pt/4pt grid
  atau modular type scale yang relevan (lihat basis teori di atas).
- `principles_applied` isi minimal 4 prinsip dari basis teori di atas beserta penerapan
  konkretnya pada rekomendasi ini (bukan definisi umum, tapi aplikasi ke kasus ini).
- `research_notes` ringkas hasil riset kontekstual di atas jadi 2-4 kalimat.
- Tulis seluruh konten dalam Bahasa Indonesia.
""".strip()


def _run_synthesis(
    client: genai.Client, req: RecommendationRequest, research_notes: str
) -> DesignRecommendation:
    response = client.models.generate_content(
        model=config.GEMINI_SYNTHESIS_MODEL,
        contents=_build_synthesis_prompt(req, research_notes),
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=DesignRecommendation,
        ),
    )

    parsed = response.parsed
    if parsed is None:
        raise GeminiServiceError(
            "Gemini tidak mengembalikan output terstruktur yang valid. Coba lagi."
        )
    if isinstance(parsed, DesignRecommendation):
        return parsed
    return DesignRecommendation.model_validate(parsed)


def generate_design_recommendation(req: RecommendationRequest) -> DesignRecommendation:
    client = _get_client()

    try:
        research_notes, sources = _run_research(client, req)
    except Exception as exc:  # noqa: BLE001 - surface as service error
        raise GeminiServiceError(f"Tahap riset Gemini gagal: {exc}") from exc

    try:
        recommendation = _run_synthesis(client, req, research_notes)
    except Exception as exc:  # noqa: BLE001
        raise GeminiServiceError(f"Tahap sintesis Gemini gagal: {exc}") from exc

    if not recommendation.sources:
        recommendation.sources = sources

    return recommendation
