"""Ringkasan teori UI/UX tervalidasi yang dipakai sebagai basis pengetahuan (grounding
konseptual) saat meminta Gemini menyusun rekomendasi bentuk, ukuran, dan warna.

Ini BUKAN pengganti pencarian data real-time (itu dilakukan Gemini lewat Google
Search grounding pada tahap riset), melainkan kerangka kerja baku yang dipakai
desainer UI/UX profesional di seluruh dunia, supaya keluaran model tetap
berpijak pada prinsip yang sudah teruji, bukan sekadar tebakan estetis.
"""

UI_UX_THEORY_KNOWLEDGE_BASE = """
# BASIS TEORI UI/UX TERVALIDASI

## 1. Prinsip Gestalt (persepsi visual)
- Proximity: elemen yang berdekatan dipersepsikan sebagai satu kelompok -> pakai jarak
  (spacing) untuk mengelompokkan konten yang related, dan jarak lebih besar untuk memisahkan.
- Similarity: elemen dengan bentuk/warna/ukuran serupa dipersepsikan sebagai satu kategori
  -> konsisten-kan bentuk tombol, warna status, ukuran ikon per kategori fungsi.
- Closure & Continuity: mata melengkapi bentuk yang terputus dan mengikuti alur -> gunakan
  grid dan alignment yang konsisten agar layout terasa "utuh" dan mudah dipindai (scannable).
- Figure-ground: kontras antara elemen (figure) dan latar (ground) menentukan keterbacaan.

## 2. Hukum Fitts (Fitts's Law)
  Waktu untuk mencapai target = fungsi dari jarak ke target dan ukuran target.
  Target kecil/jauh butuh waktu & presisi lebih -> elemen yang sering disentuh (tombol
  utama, CTA, ikon navigasi) harus BESAR dan dekat area jangkauan ibu jari (mobile) atau
  kursor (desktop). Minimum target sentuh: 44x44pt (Apple HIG) / 48x48dp (Material Design).

## 3. Hukum Hick (Hick's Law)
  Waktu keputusan meningkat seiring jumlah & kompleksitas pilihan -> batasi jumlah opsi
  utama yang ditampilkan sekaligus, gunakan progressive disclosure untuk target user
  dengan tech literacy rendah, dan sederhanakan hierarki visual.

## 4. 10 Heuristik Usability Nielsen (poin relevan ke desain visual)
  - Visibility of system status, match real world, consistency & standards,
    recognition rather than recall, aesthetic & minimalist design,
    error prevention & help users recover from errors.
  -> Warna status (success/warning/error) harus konsisten & mengikuti konvensi umum
     (hijau=sukses, merah=error, kuning/oranye=peringatan) agar "recognition" instan.

## 5. Sistem grid 8pt (8-point Grid System)
  Semua spacing, sizing, dan posisi elemen dikelipatkan dari basis 8px (atau 4px untuk
  komponen kecil) -> 4, 8, 12, 16, 24, 32, 48, 64px. Ini dipakai Google (Material Design),
  Apple (turunan 4pt), dan hampir semua design system industri karena render konsisten
  di berbagai kerapatan piksel (device pixel ratio) dan memudahkan skala responsif.

## 6. Material Design 3 (Google) - acuan utama untuk Android & web berorientasi Android
  - Shape scale: none(0), extra-small(4px), small(8px), medium(12px), large(16px),
    extra-large(28px), full(pill/circular) — dipilih berdasar ukuran & "pentingnya"
    komponen (kartu besar boleh lebih membulat, tombol kecil lebih kecil radiusnya).
  - Touch target minimum 48x48dp.
  - Type scale (Material 3): Display/Headline/Title/Body/Label masing-masing large/
    medium/small, mengikuti modular scale ~1.125-1.2.

## 7. Apple Human Interface Guidelines (HIG) - acuan utama iOS/macOS
  - Touch target minimum 44x44pt.
  - Corner radius kontinu (squircle), umumnya lebih membulat & "soft" dibanding Material.
  - Tipografi mengikuti SF Pro Text/Display dengan Dynamic Type scale untuk aksesibilitas.
  - Menekankan clarity, deference (konten > chrome), depth.

## 8. Fluent Design (Microsoft) - acuan desktop/Windows
  - Corner radius kecil-menengah (4-8px), depth via elevation/shadow, konsisten dengan
    konteks produktivitas & multi-window desktop.

## 9. Kontras & Aksesibilitas WCAG 2.1/2.2
  - Rasio kontras teks normal vs background minimal 4.5:1 (AA), 7:1 (AAA).
  - Teks besar (>=18pt/24px atau bold >=14pt/18.66px) minimal 3:1 (AA).
  - Elemen UI non-teks (border tombol, ikon fungsional) minimal 3:1 terhadap background.
  - Jangan gunakan warna sebagai satu-satunya penanda status (tambahkan ikon/label teks).
  - Untuk target user lansia / low-vision / tech literacy rendah: naikkan ukuran font dasar
    (16-18px) dan perbesar touch target melebihi minimum.

## 10. Teori Warna & Psikologi Warna
  - Aturan 60-30-10: 60% warna dominan/netral (background/surface), 30% warna sekunder,
    10% warna aksen (CTA, highlight) -> mencegah UI terasa "ramai"/noisy.
  - Skema harmoni warna: monochromatic (tenang, minimal), analogous (harmonis, natural),
    complementary (kontras tinggi, energik, cocok untuk CTA), triadic (vibrant, playful).
  - Asosiasi psikologis umum (lintas budaya Barat & cenderung berlaku juga di Indonesia,
    namun tetap dicek terhadap `cultural_region` yang diberikan user):
      Biru = terpercaya/tenang (bank, kesehatan, korporat)
      Hijau = sehat/pertumbuhan/aman (kesehatan, keuangan positif, lingkungan)
      Merah = urgensi/energi/peringatan (gunakan hemat sebagai aksen/error)
      Kuning/Oranye = optimis/hangat/perhatian (CTA sekunder, warning)
      Ungu = premium/kreatif
      Netral (abu-abu/putih/hitam) = profesional, modern, minimalis
  - Untuk aplikasi finansial/kesehatan: prioritaskan warna yang menimbulkan RASA PERCAYA
    (biru/hijau, saturasi sedang, kontras tinggi tapi tidak agresif).
  - Untuk aplikasi anak/gaming/lifestyle: saturasi lebih tinggi, skema triadic/complementary
    boleh lebih berani.

## 11. Skala Tipografi Modular (Modular Type Scale)
  Ukuran font dihitung dari base size (umumnya 16px) dikalikan rasio tetap (1.125 - "Major
  Second" hingga 1.333 - "Perfect Fourth"), menghasilkan hierarki H1..Body..Caption yang
  proporsional dan enak dipindai mata. Line-height ideal ~1.4-1.6x dari font-size untuk body
  text agar keterbacaan optimal.

## 12. Breakpoint Responsif (acuan industri: Bootstrap 5 / Material)
  Mobile: <600px, Tablet: 600-904px, Desktop kecil: 905-1239px, Desktop besar: >=1240px.

## 13. Bentuk (Shape) sebagai bahasa desain
  - Sudut membulat (rounded) -> terkesan ramah, aman, playful, cocok untuk consumer app,
    kesehatan mental, edukasi anak.
  - Sudut tajam (sharp/square) -> terkesan tegas, presisi, profesional/teknikal, cocok
    untuk dashboard data, fintech B2B, tools produktivitas.
  - Mixed (kombinasi) -> kartu/container agak membulat, tombol lebih membulat (afforda-
    nce "bisa ditekan"), elemen data/table lebih tajam untuk kejelasan struktur.
"""
