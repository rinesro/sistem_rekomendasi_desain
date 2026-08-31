/* ---------------------------------------------------------------------
 * Wizard state & navigation
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
  document.getElementById("form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
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
const placeholderEl = document.getElementById("placeholder");
const loadingEl = document.getElementById("loading");
const resultActionsEl = document.getElementById("result-actions");
let lastRecommendation = null;

function colorCard(token) {
  return `
    <div class="color-card">
      <div class="color-swatch" style="background:${token.hex}" data-copy="${token.hex}">
        <span class="copy-hint">Klik untuk salin</span>
      </div>
      <div class="color-meta">
        <div class="hex">${token.hex}</div>
        <div class="name">${token.name}</div>
        <div class="usage">${token.usage}</div>
        <div class="contrast">✓ ${token.contrast_note}</div>
      </div>
    </div>`;
}

function renderResult(data) {
  lastRecommendation = data;
  const colorKeys = [
    "primary", "secondary", "accent", "background", "surface",
    "text_primary", "text_secondary", "success", "warning", "error",
  ];

  const colorCards = colorKeys
    .map((k) => data.color_palette[k])
    .filter(Boolean)
    .map(colorCard)
    .join("");

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

  resultEl.innerHTML = `
    <div class="result-block">
      <h3>Ringkasan untuk kamu</h3>
      <div class="summary-box">${data.summary}</div>
    </div>

    <div class="result-block">
      <h3>Palet Warna &middot; skema ${data.color_palette.scheme_type}</h3>
      <div class="color-grid">${colorCards}</div>
      <p class="notes-box">${data.color_palette.rationale}</p>
    </div>

    <div class="result-block">
      <h3>Bentuk &middot; gaya ${data.shape.style}</h3>
      <div class="shape-preview-row">
        <div class="shape-box small" style="border-radius:${data.shape.corner_radius_small_px}px">S<br/>${data.shape.corner_radius_small_px}px</div>
        <div class="shape-box medium" style="border-radius:${data.shape.corner_radius_medium_px}px">M<br/>${data.shape.corner_radius_medium_px}px</div>
        <div class="shape-box large" style="border-radius:${data.shape.corner_radius_large_px}px">L<br/>${data.shape.corner_radius_large_px}px</div>
      </div>
      <p class="notes-box">Gaya ikon yang disarankan: <strong>${data.shape.icon_style}</strong><br/>${data.shape.rationale}</p>
    </div>

    <div class="result-block">
      <h3>Ukuran &amp; Jarak Antar Elemen</h3>
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
  placeholderEl.classList.add("hidden");
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
  const css = `:root {
  /* Warna */
  --color-primary: ${c.primary.hex};
  --color-secondary: ${c.secondary.hex};
  --color-accent: ${c.accent.hex};
  --color-background: ${c.background.hex};
  --color-surface: ${c.surface.hex};
  --color-text-primary: ${c.text_primary.hex};
  --color-text-secondary: ${c.text_secondary.hex};
  --color-success: ${c.success.hex};
  --color-warning: ${c.warning.hex};
  --color-error: ${c.error.hex};

  /* Bentuk */
  --radius-small: ${sh.corner_radius_small_px}px;
  --radius-medium: ${sh.corner_radius_medium_px}px;
  --radius-large: ${sh.corner_radius_large_px}px;

  /* Ukuran */
  --spacing-unit: ${s.base_spacing_unit_px}px;
  --touch-target-min: ${s.min_touch_target_px}px;
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
  resultEl.classList.add("hidden");
  resultActionsEl.classList.add("hidden");
  placeholderEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");
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
    errorBox.textContent = err.message || "Terjadi kesalahan. Coba lagi ya.";
    errorBox.classList.remove("hidden");
    placeholderEl.classList.remove("hidden");
  } finally {
    loadingEl.classList.add("hidden");
    submitBtn.disabled = false;
  }
});

/* ---------------------------------------------------------------------
 * Restart
 * ------------------------------------------------------------------- */
document.getElementById("restart-btn").addEventListener("click", () => {
  resultEl.classList.add("hidden");
  resultActionsEl.classList.add("hidden");
  placeholderEl.classList.remove("hidden");
  showStep(1);
});
