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

import time
from typing import Callable, TypeVar

from google import genai
from google.genai import errors, types

from . import config
from .knowledge_base import UI_UX_THEORY_KNOWLEDGE_BASE
from .schemas import DesignRecommendation, RecommendationRequest

T = TypeVar("T")

# Error transient di sisi server Google (mis. 503 "model sedang high demand", 500
# internal error, 429 rate limit sesaat) biasanya berhasil kalau dicoba ulang setelah
# jeda singkat -> beda dengan 429 kuota harian habis yang tidak akan membaik walau
# di-retry (tapi tetap aman untuk dicoba, karena tidak merugikan selain menambah waktu
# tunggu beberapa detik).
_RETRYABLE_CODES = {429, 500, 503, 504}
_MAX_ATTEMPTS = 3
_BASE_DELAY_SECONDS = 3


class GeminiServiceError(RuntimeError):
    pass


def _call_with_retry(fn: Callable[[], T]) -> T:
    last_error: Exception | None = None
    for attempt in range(1, _MAX_ATTEMPTS + 1):
        try:
            return fn()
        except errors.APIError as exc:
            last_error = exc
            if exc.code not in _RETRYABLE_CODES or attempt == _MAX_ATTEMPTS:
                raise
            time.sleep(_BASE_DELAY_SECONDS * attempt)
    raise last_error  # pragma: no cover - unreachable, satisfies type checker


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
    response = _call_with_retry(
        lambda: client.models.generate_content(
            model=config.GEMINI_MODEL,
            contents=_build_research_prompt(req),
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )
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

Instruksi keluaran — PENTING, tulis untuk pembaca yang AWAM desain (bukan desainer),
jadi setiap rekomendasi harus konkret dan menyebutkan bagian UI-nya, bukan istilah
abstrak:

WARNA (`color_palette`) — WAJIB mengikuti aturan proporsi 60-30-10:
- `dominant` (~60%, `percentage_label` = "60%"): warna netral yang paling banyak
  dipakai. `tokens` berisi 1-3 warna (mis. background & surface) dan tiap token WAJIB
  isi `ui_parts` dengan daftar bagian UI konkret yang cocok pakai warna ini, contoh:
  ["Background halaman", "Latar kartu/card", "Area kosong di sekitar konten"].
- `secondary` (~30%, `percentage_label` = "30%"): warna pendukung. `ui_parts` contoh:
  ["Header/top bar", "Navigasi/tab bar", "Tombol sekunder", "Teks judul"].
- `accent` (~10%, `percentage_label` = "10%"): warna paling mencolok, dipakai sedikit
  tapi untuk elemen paling penting. `ui_parts` contoh: ["Tombol utama/CTA", "Badge
  notifikasi", "Link aktif", "Progress bar"].
- `status_colors`: 3 warna (success/warning/error), `ui_parts` jelaskan konteks
  pemakaian, mis. ["Pesan berhasil simpan", "Badge status aktif"].
- Semua kode warna HARUS hex valid dan lolos rasio kontras WCAG AA untuk perannya
  (jelaskan rasio/alasan singkat di `contrast_note` tiap warna).

BENTUK (`shape`) — isi `components` dengan rekomendasi PER BAGIAN UI (bukan cuma
ukuran S/M/L generik). Sesuaikan daftar bagian dengan platform ({req.platform.value}),
minimal cakup: Tombol Utama, Tombol Sekunder, Kartu/Card atau List Item, Input
Field/Form, Ikon, dan satu elemen Navigasi yang relevan (nav bar/tab bar/sidebar/menu).
Tiap `recommendation` harus 1 kalimat konkret dengan angka px, contoh: "Rounded penuh
(pill), tinggi 48px" untuk Tombol Utama. Isi `value_px` dengan angka radius utamanya
(mis. 24 untuk contoh di atas).

UKURAN (`sizing`) — isi `components` dengan rekomendasi PER BAGIAN UI juga, minimal
cakup: tinggi tombol utama, jarak antar section/blok konten, ukuran ikon, padding di
dalam kartu, dan lebar maksimum konten (khusus web/desktop). Tiap `recommendation` 1
kalimat konkret dengan angka px, dan isi `value_px` dengan angka px utamanya (mis.
tinggi/ukuran/jarak). Field numerik (`base_spacing_unit_px`, `spacing_scale_px`,
`min_touch_target_px`, `typography_scale`, `breakpoints_px`) HARUS tetap diisi
mengikuti skala 8pt/4pt grid atau modular type scale (lihat basis teori).

Untuk `component_name` yang tidak punya satu angka px tunggal yang relevan (mis. gaya
ikon), boleh set `value_px` ke null.

LAINNYA:
- `principles_applied` isi minimal 4 prinsip dari basis teori di atas beserta penerapan
  konkretnya pada rekomendasi ini (bukan definisi umum, tapi aplikasi ke kasus ini).
- `research_notes` ringkas hasil riset kontekstual di atas jadi 2-4 kalimat.
- Tulis seluruh konten dalam Bahasa Indonesia, kalimat pendek dan jelas, hindari
  istilah teknis tanpa penjelasan.
""".strip()


def _run_synthesis(
    client: genai.Client, req: RecommendationRequest, research_notes: str
) -> DesignRecommendation:
    response = _call_with_retry(
        lambda: client.models.generate_content(
            model=config.GEMINI_MODEL,
            contents=_build_synthesis_prompt(req, research_notes),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=DesignRecommendation,
            ),
        )
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
