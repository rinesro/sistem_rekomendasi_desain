/* ---------------------------------------------------------------------
 * Halaman: Form (halaman 1) <-> Hasil (halaman 2)
 * ------------------------------------------------------------------- */
const pageFormEl = document.getElementById("page-form");
const pageResultEl = document.getElementById("page-result");

function showPage(pageId) {
  pageFormEl.classList.toggle("hidden", pageId !== "page-form");
  pageResultEl.classList.toggle("hidden", pageId !== "page-result");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------------------------------------------------------------------
 * Wizard state & navigation (di dalam halaman form)
 * ------------------------------------------------------------------- */
const TOTAL_STEPS = 3;
let currentStep = 1;

const stepEls = Array.from(document.querySelectorAll(".step"));
const stepDots = Array.from(document.querySelectorAll("[data-step-dot]"));

function showStep(step) {
  currentStep = step;
  stepEls.forEach((el) => {
    el.classList.toggle("hidden", Number(el.dataset.step) !== step);
  });
  stepDots.forEach((dot) => {
    const n = Number(dot.dataset.stepDot);
    dot.classList.toggle("active", n === step);
    dot.classList.toggle("done", n < step);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll('[data-action="next"]').forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) showStep(currentStep + 1);
  });
});

document.querySelectorAll('[data-action="back"]').forEach((btn) => {
  btn.addEventListener("click", () => {
    if (currentStep > 1) showStep(currentStep - 1);
  });
});

/* ---------------------------------------------------------------------
 * Modal "Lainnya" — dipakai untuk semua chip-group agar user selalu bisa
 * mengisi jawabannya sendiri kalau pilihan yang tersedia belum cocok.
 * Mode "text": 1 input teks bebas. Mode "range": 2 input angka (usia
 * minimum & maksimum) supaya minim salah format dibanding teks bebas.
 * ------------------------------------------------------------------- */
const modalEl = document.getElementById("custom-input-modal");
const modalTitleEl = document.getElementById("modal-title");
const modalHintEl = document.getElementById("modal-hint");
const modalTextModeEl = document.getElementById("modal-text-mode");
const modalRangeModeEl = document.getElementById("modal-range-mode");
const modalTextInputEl = document.getElementById("modal-text-input");
const modalRangeMinEl = document.getElementById("modal-range-min");
const modalRangeMaxEl = document.getElementById("modal-range-max");
const modalErrorEl = document.getElementById("modal-error");

let modalConfirmHandler = null;

function truncateText(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function openCustomModal({ title, hint, mode, initialValue, onConfirm }) {
  modalTitleEl.textContent = title || "Input Lainnya";
  modalHintEl.textContent = hint || "";
  modalHintEl.classList.toggle("hidden", !hint);
  modalErrorEl.classList.add("hidden");

  const isRange = mode === "range";
  modalTextModeEl.classList.toggle("hidden", isRange);
  modalRangeModeEl.classList.toggle("hidden", !isRange);

  if (isRange) {
    modalRangeMinEl.value = "";
    modalRangeMaxEl.value = "";
  } else {
    modalTextInputEl.value = initialValue || "";
  }

  modalConfirmHandler = onConfirm;
  modalEl.showModal();
  (isRange ? modalRangeMinEl : modalTextInputEl).focus();
}

document.getElementById("modal-cancel").addEventListener("click", () => modalEl.close());
modalEl.addEventListener("click", (e) => {
  if (e.target === modalEl) modalEl.close();
});

document.getElementById("modal-confirm").addEventListener("click", () => {
  const isRangeMode = !modalRangeModeEl.classList.contains("hidden");
  let value;

  if (isRangeMode) {
    const min = parseInt(modalRangeMinEl.value, 10);
    const max = parseInt(modalRangeMaxEl.value, 10);
    if (Number.isNaN(min) || Number.isNaN(max)) {
      modalErrorEl.textContent = "Isi kedua angka usia minimum dan maksimum ya.";
      modalErrorEl.classList.remove("hidden");
      return;
    }
    if (min < 0 || max > 120 || min >= max) {
      modalErrorEl.textContent = "Rentang usia tidak valid. Pastikan usia minimum lebih kecil dari maksimum (0-120).";
      modalErrorEl.classList.remove("hidden");
      return;
    }
    value = `${min}-${max} tahun`;
  } else {
    value = modalTextInputEl.value.trim();
    if (!value) {
      modalErrorEl.textContent = "Tulis dulu ya sebelum disimpan.";
      modalErrorEl.classList.remove("hidden");
      return;
    }
  }

  modalEl.close();
  if (modalConfirmHandler) modalConfirmHandler(value);
});

/* ---------------------------------------------------------------------
 * Chip groups (single & multi select) + trigger "Lainnya" yang membuka modal
 * ------------------------------------------------------------------- */
function wireChip(group, chip) {
  const isMulti = group.dataset.multi === "true";

  chip.addEventListener("click", () => {
    if (chip.dataset.customTrigger === "true") {
      openCustomModal({
        title: chip.dataset.modalTitle,
        hint: chip.dataset.modalHint,
        mode: chip.dataset.modalMode,
        initialValue: isMulti ? "" : chip.dataset.confirmedValue || "",
        onConfirm: (value) => {
          if (isMulti) {
            addCustomChip(group, chip, value);
          } else {
            group.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
            chip.dataset.value = value;
            chip.dataset.confirmedValue = value;
            chip.querySelector(".chip-label").textContent = `✏️ ${truncateText(value, 24)}`;
            chip.title = value;
            chip.classList.add("active");
          }
          clearFieldError(group.closest(".field"));
        },
      });
      return;
    }

    if (isMulti) {
      chip.classList.toggle("active");
    } else {
      group.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
    }
    clearFieldError(group.closest(".field"));
  });
}

function addCustomChip(group, triggerChip, value) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip active";
  chip.dataset.value = value;
  chip.title = value;
  chip.innerHTML = `<span class="chip-label">${truncateText(value, 24)}</span>`;
  triggerChip.insertAdjacentElement("beforebegin", chip);
  wireChip(group, chip);
}

document.querySelectorAll(".chip-group").forEach((group) => {
  group.querySelectorAll(".chip").forEach((chip) => wireChip(group, chip));
});

function getChipGroupValue(name) {
  const group = document.querySelector(`.chip-group[data-name="${name}"]`);
  if (!group) return null;
  const isMulti = group.dataset.multi === "true";
  const values = Array.from(group.querySelectorAll(".chip.active"))
    .map((chip) => chip.dataset.value)
    .filter((v) => v && v !== "custom");
  return isMulti ? values : values[0] || null;
}

/* ---------------------------------------------------------------------
 * Validation (light touch — just enough to avoid empty submissions)
 * ------------------------------------------------------------------- */
function markFieldError(fieldEl) {
  if (fieldEl) fieldEl.classList.add("field-error-flash");
}
function clearFieldError(fieldEl) {
  if (fieldEl) fieldEl.classList.remove("field-error-flash");
}

function validateStep(step) {
  const errors = [];

  if (step === 1) {
    if (!document.getElementById("system_name").value.trim()) errors.push("Nama sistem");
    if (!getChipGroupValue("system_domain")) errors.push("Bidang sistem");
    if (!document.getElementById("system_goals").value.trim()) errors.push("Tujuan sistem");
  }
  if (step === 2) {
    if (!getChipGroupValue("age_range")) errors.push("Rentang usia");
    if (!getChipGroupValue("tech_literacy")) errors.push("Tingkat keterbiasaan teknologi");
    if (!document.getElementById("cultural_region").value.trim()) errors.push("Wilayah/budaya");
    if (!getChipGroupValue("emotional_tone_desired")) errors.push("Kesan yang diinginkan");
  }

  const errorBox = document.getElementById("error-box");
  if (errors.length) {
    errorBox.textContent = `Lengkapi dulu ya: ${errors.join(", ")}.`;
    errorBox.classList.remove("hidden");
    return false;
  }
  errorBox.classList.add("hidden");
  return true;
}

/* ---------------------------------------------------------------------
 * Brand color pickers (optional)
 * ------------------------------------------------------------------- */
const colorTouched = { 1: false, 2: false };
[1, 2].forEach((n) => {
  const input = document.getElementById(`brand_color_${n}`);
  const label = document.getElementById(`brand_color_${n}_label`);
  input.addEventListener("input", () => {
    colorTouched[n] = true;
    label.textContent = input.value.toUpperCase();
  });
});
document.getElementById("clear-colors").addEventListener("click", () => {
  [1, 2].forEach((n) => {
    colorTouched[n] = false;
    document.getElementById(`brand_color_${n}`).value = "#3454d1";
    document.getElementById(`brand_color_${n}_label`).textContent = "#3454D1";
  });
});

/* ---------------------------------------------------------------------
 * Build payload matching backend/schemas.py:RecommendationRequest
 * ------------------------------------------------------------------- */
function buildPayload() {
  const existingColors = [1, 2]
    .filter((n) => colorTouched[n])
    .map((n) => document.getElementById(`brand_color_${n}`).value.toUpperCase());

  return {
    platform: getChipGroupValue("platform"),
    system_name: document.getElementById("system_name").value.trim(),
    system_domain: getChipGroupValue("system_domain"),
    system_goals: document.getElementById("system_goals").value.trim(),
    brand_personality: getChipGroupValue("brand_personality").join(", ") || "tidak ditentukan, tentukan yang paling sesuai",
    dark_mode: document.getElementById("dark_mode").checked,
    existing_brand_colors: existingColors,
    target_user: {
      age_range: getChipGroupValue("age_range"),
      tech_literacy: getChipGroupValue("tech_literacy"),
      cultural_region: document.getElementById("cultural_region").value.trim(),
      accessibility_needs: getChipGroupValue("accessibility_needs"),
      emotional_tone_desired: getChipGroupValue("emotional_tone_desired"),
    },
  };
}

/* ---------------------------------------------------------------------
 * Result rendering — tiap bagian jadi accordion (bisa dibuka/tutup)
 * supaya user bisa memilah rekomendasi tanpa scroll panjang sekaligus.
 * Semua section terbuka secara default, KECUALI "Kenapa desain ini
 * disarankan" (alasan) yang tertutup di awal.
 * ------------------------------------------------------------------- */
const resultEl = document.getElementById("result");
const loadingEl = document.getElementById("loading");
const resultActionsEl = document.getElementById("result-actions");
const resultErrorEl = document.getElementById("result-error");
let lastRecommendation = null;

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function colorCard(token) {
  const partTags = (token.ui_parts || [])
    .map((part) => `<span class="ui-part-tag">${part}</span>`)
    .join("");
  return `
    <div class="color-card">
      <div class="color-swatch" style="background:${token.hex}" data-copy="${token.hex}">
        <span class="copy-hint">Klik untuk salin</span>
      </div>
      <div class="color-meta">
        <div class="hex">${token.hex}</div>
        <div class="name">${token.name}</div>
        <div class="ui-parts">${partTags}</div>
        <div class="contrast">✓ ${token.contrast_note}</div>
      </div>
    </div>`;
}

function colorGroupBlock(group) {
  return `
    <div class="color-group">
      <div class="color-group-header">
        <span class="percentage-badge">${group.percentage_label}</span>
        <span class="color-group-title">${group.role_title}</span>
      </div>
      <div class="color-grid">${group.tokens.map(colorCard).join("")}</div>
      <p class="notes-box">${group.rationale}</p>
    </div>`;
}

function componentCard(c) {
  const hasValue = c.value_px !== null && c.value_px !== undefined;
  return `
    <div class="component-card">
      <div class="component-card-head">
        <span class="component-name">${c.component_name}</span>
        ${hasValue ? `<span class="component-value">${c.value_px}px</span>` : ""}
      </div>
      <div class="component-rec">${c.recommendation}</div>
      <div class="component-rationale">${c.rationale}</div>
    </div>`;
}

function accordionSection(id, title, bodyHtml, startOpen) {
  return `
    <section class="accordion ${startOpen ? "open" : ""}" data-accordion="${id}">
      <button type="button" class="accordion-header">
        <h3>${title}</h3>
        <span class="accordion-chevron">▾</span>
      </button>
      <div class="accordion-body">
        <div class="accordion-body-inner"><div class="accordion-content">${bodyHtml}</div></div>
      </div>
    </section>`;
}

function renderResult(data) {
  lastRecommendation = data;

  const maxSpacing = Math.max(...data.sizing.spacing_scale_px, 1);
  const spacingBars = data.sizing.spacing_scale_px
    .map(
      (px) => `
      <div class="spacing-bar-wrap">
        <div class="spacing-bar" style="height:${Math.max(4, (px / maxSpacing) * 80)}px"></div>
        ${px}px
      </div>`
    )
    .join("");

  const typeScale = data.sizing.typography_scale
    .map(
      (t) => `
      <div class="type-scale-item">
        <span class="sample-text" style="font-size:${t.size_px}px; font-weight:${t.weight}; line-height:${t.line_height_px}px;">
          ${t.label} — Contoh Teks
        </span>
        <span class="label-text">${t.size_px}px · ${t.weight} · line-height ${t.line_height_px}px</span>
      </div>`
    )
    .join("");

  const principles = data.principles_applied
    .map(
      (p) => `<div class="principle-item"><strong>${p.name}:</strong> ${p.application}</div>`
    )
    .join("");

  const sources = (data.sources || []).map((s) => `<li>${s}</li>`).join("");

  const statusColorCards = (data.color_palette.status_colors || []).map(colorCard).join("");
  const shapeComponents = data.shape.components.map(componentCard).join("");
  const sizingComponents = data.sizing.components.map(componentCard).join("");

  const colorBody = `
    ${colorGroupBlock(data.color_palette.dominant)}
    ${colorGroupBlock(data.color_palette.secondary)}
    ${colorGroupBlock(data.color_palette.accent)}
    <div class="color-group">
      <div class="color-group-header">
        <span class="color-group-title">Warna Status <em>(dipakai sesuai konteks, di luar rasio 60-30-10)</em></span>
      </div>
      <div class="color-grid">${statusColorCards}</div>
    </div>
    <p class="notes-box">${data.color_palette.rationale}</p>`;

  const shapeBody = `
    <div class="component-list">${shapeComponents}</div>
    <p class="notes-box">Gaya ikon yang disarankan: <strong>${data.shape.icon_style}</strong></p>
    <p class="notes-box">${data.shape.rationale}</p>`;

  const sizingBody = `
    <div class="component-list">${sizingComponents}</div>
    <div class="spacing-row">${spacingBars}</div>
    <p class="notes-box">
      Ukuran minimum tombol/area sentuh: <strong>${data.sizing.min_touch_target_px}px</strong> ·
      Titik responsif (breakpoint): ${data.sizing.breakpoints_px.join("px, ")}px
    </p>
    <p class="notes-box">${data.sizing.rationale}</p>`;

  const typeScaleBody = `<div class="type-scale-list">${typeScale}</div>`;
  const principlesBody = `<div class="principle-list">${principles}</div>`;
  const accessibilityBody = `<p class="notes-box">${data.accessibility_notes}</p>`;
  const researchBody = `
    <p class="notes-box">${data.research_notes}</p>
    ${sources ? `<ul class="sources-list">${sources}</ul>` : ""}`;

  resultEl.innerHTML = [
    accordionSection("color", `Palet Warna &middot; skema ${data.color_palette.scheme_type} &middot; proporsi 60-30-10`, colorBody, true),
    accordionSection("shape", `Bentuk &middot; gaya ${data.shape.overall_style}`, shapeBody, true),
    accordionSection("sizing", "Ukuran &amp; Jarak Antar Elemen", sizingBody, true),
    accordionSection("type-scale", "Skala Ukuran Teks", typeScaleBody, true),
    accordionSection("principles", "Kenapa Desain Ini yang Disarankan", principlesBody, false),
    accordionSection("accessibility", "Catatan Aksesibilitas", accessibilityBody, false),
    accordionSection("research", "Sumber Riset (Gemini + Google Search)", researchBody, false),
  ].join("");

  resultEl.querySelectorAll(".accordion-header").forEach((header) => {
    header.addEventListener("click", () => {
      header.closest(".accordion").classList.toggle("open");
    });
  });

  resultEl.querySelectorAll("[data-copy]").forEach((el) => {
    el.addEventListener("click", () => copyToClipboard(el.dataset.copy, `${el.dataset.copy} disalin`));
  });

  resultEl.classList.remove("hidden");
  resultActionsEl.classList.remove("hidden");
}

/* ---------------------------------------------------------------------
 * Copy helpers
 * ------------------------------------------------------------------- */
function showToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("show"), 1600);
}

function copyToClipboard(text, toastMessage) {
  navigator.clipboard.writeText(text).then(() => showToast(toastMessage || "Disalin"));
}

document.getElementById("copy-css-btn").addEventListener("click", () => {
  if (!lastRecommendation) return;
  const c = lastRecommendation.color_palette;
  const s = lastRecommendation.sizing;
  const sh = lastRecommendation.shape;

  const colorLines = [];
  [c.dominant, c.secondary, c.accent].forEach((group) => {
    group.tokens.forEach((t) => colorLines.push(`  --color-${slugify(t.name)}: ${t.hex};`));
  });
  (c.status_colors || []).forEach((t) => colorLines.push(`  --color-${slugify(t.name)}: ${t.hex};`));

  const radiusLines = sh.components
    .filter((comp) => comp.value_px !== null && comp.value_px !== undefined)
    .map((comp) => `  --radius-${slugify(comp.component_name)}: ${comp.value_px}px;`);

  const sizeLines = s.components
    .filter((comp) => comp.value_px !== null && comp.value_px !== undefined)
    .map((comp) => `  --size-${slugify(comp.component_name)}: ${comp.value_px}px;`);

  const css = `:root {
  /* Warna (60-30-10 + status) */
${colorLines.join("\n")}

  /* Bentuk per komponen */
${radiusLines.join("\n")}

  /* Ukuran */
  --spacing-unit: ${s.base_spacing_unit_px}px;
  --touch-target-min: ${s.min_touch_target_px}px;
${sizeLines.join("\n")}
}`;
  copyToClipboard(css, "CSS variables disalin ke clipboard");
});

/* ---------------------------------------------------------------------
 * Submit — bisa dibatalkan lewat tombol "Batalkan" saat loading, yang
 * menghentikan request ke server dan mengembalikan user ke halaman input
 * paling akhir (step terakhir wizard) tanpa kehilangan isian mereka.
 * ------------------------------------------------------------------- */
const form = document.getElementById("rec-form");
const submitBtn = document.getElementById("submit-btn");
const errorBox = document.getElementById("error-box");
const editBtnEl = document.getElementById("edit-btn");
let activeRequestController = null;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateStep(1) || !validateStep(2)) {
    showStep(!validateStep(1) ? 1 : 2);
    return;
  }
  errorBox.classList.add("hidden");

  // Pindah ke halaman 2 (hasil) dan tampilkan status loading di sana.
  // Tombol "Edit Input" disembunyikan selama loading — jalan keluarnya
  // saat memproses adalah tombol "Batalkan" di bawah spinner.
  resultEl.classList.add("hidden");
  resultActionsEl.classList.add("hidden");
  resultErrorEl.classList.add("hidden");
  editBtnEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");
  showPage("page-result");
  submitBtn.disabled = true;

  activeRequestController = new AbortController();

  try {
    const payload = buildPayload();
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: activeRequestController.signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Request gagal (${res.status})`);
    }

    const data = await res.json();
    renderResult(data);
  } catch (err) {
    if (err.name === "AbortError") return; // dibatalkan lewat tombol "Batalkan"
    resultErrorEl.textContent = err.message || "Terjadi kesalahan. Coba lagi ya.";
    resultErrorEl.classList.remove("hidden");
  } finally {
    loadingEl.classList.add("hidden");
    editBtnEl.classList.remove("hidden");
    submitBtn.disabled = false;
    activeRequestController = null;
  }
});

document.getElementById("cancel-loading-btn").addEventListener("click", () => {
  if (activeRequestController) activeRequestController.abort();
  loadingEl.classList.add("hidden");
  resultErrorEl.classList.add("hidden");
  showStep(TOTAL_STEPS);
  showPage("page-form");
});

/* ---------------------------------------------------------------------
 * Navigasi antar halaman: Edit Input & Mulai Ulang
 * ------------------------------------------------------------------- */
editBtnEl.addEventListener("click", () => {
  showPage("page-form");
});

document.getElementById("restart-btn").addEventListener("click", () => {
  resultEl.classList.add("hidden");
  resultActionsEl.classList.add("hidden");
  resultErrorEl.classList.add("hidden");
  showStep(1);
  showPage("page-form");
});
