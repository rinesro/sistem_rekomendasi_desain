const form = document.getElementById("rec-form");
const submitBtn = document.getElementById("submit-btn");
const loadingEl = document.getElementById("loading");
const resultEl = document.getElementById("result");
const placeholderEl = document.getElementById("placeholder");
const errorBox = document.getElementById("error-box");

function splitCsv(value) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function buildPayload(formData) {
  return {
    platform: formData.get("platform"),
    system_name: formData.get("system_name"),
    system_domain: formData.get("system_domain"),
    system_goals: formData.get("system_goals"),
    brand_personality: formData.get("brand_personality"),
    dark_mode: formData.get("dark_mode") === "on",
    existing_brand_colors: splitCsv(formData.get("existing_brand_colors") || ""),
    target_user: {
      age_range: formData.get("age_range"),
      tech_literacy: formData.get("tech_literacy"),
      cultural_region: formData.get("cultural_region"),
      accessibility_needs: splitCsv(formData.get("accessibility_needs") || ""),
      emotional_tone_desired: formData.get("emotional_tone_desired"),
    },
  };
}

function colorCard(token) {
  return `
    <div class="color-card">
      <div class="color-swatch" style="background:${token.hex}"></div>
      <div class="color-meta">
        <div class="hex">${token.hex} — ${token.name}</div>
        <div class="usage">${token.usage}</div>
        <div class="contrast">${token.contrast_note}</div>
      </div>
    </div>`;
}

function renderResult(data) {
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
        <span style="font-size:${t.size_px}px; font-weight:${t.weight}; line-height:${t.line_height_px}px;">
          ${t.label} — Contoh Teks
        </span>
        <span class="label-text">${t.size_px}px / ${t.weight} / lh ${t.line_height_px}px</span>
      </div>`
    )
    .join("");

  const principles = data.principles_applied
    .map(
      (p) => `<div class="principle-item"><strong>${p.name}:</strong> ${p.application}</div>`
    )
    .join("");

  const sources = (data.sources || [])
    .map((s) => `<li>${s}</li>`)
    .join("");

  resultEl.innerHTML = `
    <div class="result-block">
      <h3>Ringkasan</h3>
      <div class="summary-box">${data.summary}</div>
    </div>

    <div class="result-block">
      <h3>Palet Warna (${data.color_palette.scheme_type})</h3>
      <div class="color-grid">${colorCards}</div>
      <p class="notes-box">${data.color_palette.rationale}</p>
    </div>

    <div class="result-block">
      <h3>Bentuk (${data.shape.style})</h3>
      <div class="shape-preview-row">
        <div class="shape-box small" style="border-radius:${data.shape.corner_radius_small_px}px">S<br/>${data.shape.corner_radius_small_px}px</div>
        <div class="shape-box medium" style="border-radius:${data.shape.corner_radius_medium_px}px">M<br/>${data.shape.corner_radius_medium_px}px</div>
        <div class="shape-box large" style="border-radius:${data.shape.corner_radius_large_px}px">L<br/>${data.shape.corner_radius_large_px}px</div>
      </div>
      <p class="notes-box">Gaya ikon: ${data.shape.icon_style}<br/>${data.shape.rationale}</p>
    </div>

    <div class="result-block">
      <h3>Ukuran &amp; Spacing (basis ${data.sizing.base_spacing_unit_px}px)</h3>
      <div class="spacing-row">${spacingBars}</div>
      <p class="notes-box">
        Minimum touch target: ${data.sizing.min_touch_target_px}px ·
        Breakpoints: ${data.sizing.breakpoints_px.join("px, ")}px
      </p>
      <p class="notes-box">${data.sizing.rationale}</p>
    </div>

    <div class="result-block">
      <h3>Skala Tipografi</h3>
      <div class="type-scale-list">${typeScale}</div>
    </div>

    <div class="result-block">
      <h3>Prinsip UI/UX yang Diterapkan</h3>
      <div class="principle-list">${principles}</div>
    </div>

    <div class="result-block">
      <h3>Catatan Aksesibilitas</h3>
      <p class="notes-box">${data.accessibility_notes}</p>
    </div>

    <div class="result-block">
      <h3>Catatan Riset (Gemini + Google Search)</h3>
      <p class="notes-box">${data.research_notes}</p>
      ${sources ? `<ul class="sources-list">${sources}</ul>` : ""}
    </div>
  `;

  resultEl.classList.remove("hidden");
  placeholderEl.classList.add("hidden");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.classList.add("hidden");
  resultEl.classList.add("hidden");
  placeholderEl.classList.add("hidden");
  loadingEl.classList.remove("hidden");
  submitBtn.disabled = true;

  try {
    const payload = buildPayload(new FormData(form));
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
    errorBox.textContent = err.message || "Terjadi kesalahan.";
    errorBox.classList.remove("hidden");
    placeholderEl.classList.remove("hidden");
  } finally {
    loadingEl.classList.add("hidden");
    submitBtn.disabled = false;
  }
});
