# Sistem Rekomendasi Desain UI/UX

Sistem yang merekomendasikan **bentuk, ukuran, dan warna** untuk UI website, aplikasi
mobile, maupun aplikasi desktop — berdasarkan kebutuhan sistem dan target user yang kamu
tentukan. Menggunakan **Gemini** sebagai mesin riset data otomatis (grounded Google
Search), dan disintesis berpijak pada **teori UI/UX yang tervalidasi** (Gestalt, Fitts's
Law, Hick's Law, Nielsen Heuristics, 8pt grid, Material Design 3, Apple HIG, WCAG
2.1/2.2, teori warna 60-30-10, modular type scale).

## Arsitektur

```
frontend/  -> form input + tampilan hasil (HTML/CSS/JS statis, tanpa build step)
backend/
  knowledge_base.py -> rangkuman teori UI/UX tervalidasi, disuntikkan ke prompt
  schemas.py         -> skema Pydantic untuk request & output terstruktur
  gemini_service.py  -> 2 tahap panggilan Gemini:
                         1) riset (tool google_search) -> data/tren terkini
                         2) sintesis (structured output/JSON) -> rekomendasi final
  main.py             -> FastAPI app (API + serve frontend)
```

Dipisah jadi 2 panggilan Gemini karena API saat ini tidak mendukung penggabungan tool
`google_search` dengan `response_schema` terstruktur dalam satu request.

## Menjalankan

1. Buat virtual environment & install dependency:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. Salin `.env.example` menjadi `.env`, isi `GEMINI_API_KEY` (dapatkan gratis di
   https://aistudio.google.com/apikey). Hanya baris ini yang wajib diisi — model sudah
   diset default ke Gemini 3 Flash.

3. Jalankan server:
   ```bash
   uvicorn backend.main:app --reload
   ```

4. Buka `http://127.0.0.1:8000` di browser, isi form kebutuhan sistem & target user, lalu
   klik **Buat Rekomendasi**.

## API

`POST /api/recommend`

Body (lihat `backend/schemas.py:RecommendationRequest`):
```json
{
  "platform": "mobile",
  "system_name": "Aplikasi Kesehatan Mental Tenang",
  "system_domain": "Kesehatan",
  "system_goals": "Membantu pengguna memantau mood harian dan konsultasi psikolog online",
  "brand_personality": "profesional, hangat, terpercaya",
  "dark_mode": false,
  "existing_brand_colors": [],
  "target_user": {
    "age_range": "18-35",
    "tech_literacy": "medium",
    "cultural_region": "Indonesia",
    "accessibility_needs": [],
    "emotional_tone_desired": "tenang dan aman"
  }
}
```

Response: objek `DesignRecommendation` berisi palet warna (dengan alasan & catatan
kontras), rekomendasi bentuk (radius kecil/menengah/besar + alasan), rekomendasi ukuran
(spacing scale, touch target minimum, skala tipografi, breakpoint), daftar prinsip UI/UX
yang diterapkan, catatan aksesibilitas, dan ringkasan riset (dengan sumber jika tersedia).

## Basis Teori yang Dipakai

Lihat `backend/knowledge_base.py` untuk rangkuman lengkap. Poin utama:

- **Gestalt Principles** (proximity, similarity, closure, continuity, figure-ground)
- **Fitts's Law** & **Hick's Law** — ukuran target & jumlah pilihan
- **10 Usability Heuristics** (Nielsen Norman Group)
- **8-point grid system** untuk semua spacing/sizing
- **Material Design 3** (Google) & **Apple HIG** & **Fluent Design** (Microsoft) sebagai
  acuan platform-spesifik
- **WCAG 2.1/2.2** untuk rasio kontras warna & aksesibilitas
- **Teori warna** (aturan 60-30-10, skema harmoni warna, psikologi warna per industri)
- **Modular type scale** untuk hierarki tipografi

## Catatan

- Kualitas hasil bergantung pada kejelasan input (semakin spesifik kebutuhan sistem &
  target user, semakin relevan rekomendasinya).
- Satu model dipakai untuk seluruh proses (riset & sintesis): `gemini-3-flash-preview`
  (Gemini 3 Flash). Bisa diganti lewat env var `GEMINI_MODEL` di `.env` bila suatu saat
  ingin memakai model Gemini lain.
- UI dibagi 2 halaman: **halaman form** (wizard 3 langkah) dan **halaman hasil**, tanpa
  perlu reload — navigasi ditangani di `frontend/app.js`.
