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
 * Chip groups (single & multi select, with optional "Lainnya" custom input)
 * ------------------------------------------------------------------- */
document.querySelectorAll(".chip-group").forEach((group) => {
  const isMulti = group.dataset.multi === "true";
  const customTargetId = group.dataset.custom;

  group.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (isMulti) {
        chip.classList.toggle("active");
      } else {
        group.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
      }

      if (customTargetId) {
        const customInput = document.getElementById(customTargetId);
        const customChip = group.querySelector('.chip[data-value="custom"]');
        if (customChip && customChip.classList.contains("active")) {
          customInput.classList.remove("hidden");
          customInput.focus();
        } else {
          customInput.classList.add("hidden");
        }
      }

      clearFieldError(group.closest(".field"));
    });
  });
});

function getChipGroupValue(name) {
  const group = document.querySelector(`.chip-group[data-name="${name}"]`);
  if (!group) return null;
  const isMulti = group.dataset.multi === "true";
  const customTargetId = group.dataset.custom;

  const activeChips = Array.from(group.querySelectorAll(".chip.active"));
  const values = activeChips.map((chip) => {
    if (chip.dataset.value === "custom" && customTargetId) {
      return document.getElementById(customTargetId).value.trim();
    }
    return chip.dataset.value;
  }).filter(Boolean);

  if (isMulti) return values;
  return values[0] || null;
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
 * Result rendering
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

  resultEl.innerHTML = `
    <div class="result-block">
      <h3>Palet Warna &middot; skema ${data.color_palette.scheme_type} &middot; proporsi 60-30-10</h3>
      ${colorGroupBlock(data.color_palette.dominant)}
      ${colorGroupBlock(data.color_palette.secondary)}
      ${colorGroupBlock(data.color_palette.accent)}
      <div class="color-group">
        <div class="color-group-header">
          <span class="color-group-title">Warna Status <em>(dipakai sesuai konteks, di luar rasio 60-30-10)</em></span>
        </div>
        <div class="color-grid">${statusColorCards}</div>
      </div>
      <p class="notes-box">${data.color_palette.rationale}</p>
    </div>

    <div class="result-block">
      <h3>Bentuk &middot; gaya ${data.shape.overall_style}</h3>
      <div class="component-list">${shapeComponents}</div>
      <p class="notes-box">Gaya ikon yang disarankan: <strong>${data.shape.icon_style}</strong></p>
      <p class="notes-box">${data.shape.rationale}</p>
    </div>

    <div class="result-block">
      <h3>Ukuran &amp; Jarak Antar Elemen</h3>
      <div class="component-list">${sizingComponents}</div>
      <div class="spacing-row">${spacingBars}</div>
      <p class="notes-box">
        Ukuran minimum tombol/area sentuh: <strong>${data.sizing.min_touch_target_px}px</strong> ·
        Titik responsif (breakpoint): ${data.sizing.breakpoints_px.join("px, ")}px
      </p>
      <p class="notes-box">${data.sizing.rationale}</p>
    </div>

    <div class="result-block">
      <h3>Skala Ukuran Teks</h3>
      <div class="type-scale-list">${typeScale}</div>
    </div>

    <div class="result-block">
      <h3>Kenapa desain ini yang disarankan</h3>
      <div class="principle-list">${principles}</div>
    </div>

    <div class="result-block">
      <h3>Catatan Aksesibilitas</h3>
      <p class="notes-box">${data.accessibility_notes}</p>
    </div>

    <div class="result-block">
      <h3>Sumber Riset (Gemini + Google Search)</h3>
      <p class="notes-box">${data.research_notes}</p>
      ${sources ? `<ul class="sources-list">${sources}</ul>` : ""}
    </div>
  `;

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
 * Submit
 * ------------------------------------------------------------------- */
const form = document.getElementById("rec-form");
const submitBtn = document.getElementById("submit-btn");
const errorBox = document.getElementById("error-box");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateStep(1) || !validateStep(2)) {
    showStep(!validateStep(1) ? 1 : 2);
    return;
  }
  errorBox.classList.add("hidden");

  // Pindah ke halaman 2 (hasil) dan tampilkan status loading di sana.
  resultEl.classList.add("hidden");
  resultActionsEl.classList.add("hidden");
  resultErrorEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");
  showPage("page-result");
  submitBtn.disabled = true;

  try {
    const payload = buildPayload();
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Request gagal (${res.status})`);
    }

    const data = await res.json();
    renderResult(data);
  } catch (err) {
    resultErrorEl.textContent = err.message || "Terjadi kesalahan. Coba lagi ya.";
    resultErrorEl.classList.remove("hidden");
  } finally {
    loadingEl.classList.add("hidden");
    submitBtn.disabled = false;
  }
});

/* ---------------------------------------------------------------------
 * Navigasi antar halaman: Edit Input & Mulai Ulang
 * ------------------------------------------------------------------- */
document.getElementById("edit-btn").addEventListener("click", () => {
  showPage("page-form");
});

document.getElementById("restart-btn").addEventListener("click", () => {
  resultEl.classList.add("hidden");
  resultActionsEl.classList.add("hidden");
  resultErrorEl.classList.add("hidden");
  showStep(1);
  showPage("page-form");
});
