# String presets, local implementation

Base: `1807fc70f08500a643d3a916d9a6ca9627a25a0e`, verified against remote main on 2026-10-29. No default JSON or physical engine changes. Settings changes only reject nonfinite/nonpositive derived inputs.

Catalog API: `createStringPresetCatalog(defaultConfig)` in `synth-demo/instruments/configured-guitar/string-preset-catalog.js`. Returns a deeply frozen array of six-string factory sets with stable IDs, `readonly`, `category`, and `provenance` (`kind`, revision, sources, assumptions, limitations). `StringSetLibrary.builtins` is the catalog; `builtin` remains the original default for existing integrations. `list()` and `get()` return detached copies. Factory IDs are persisted as active selection only; the existing v1 storage key/schema and 100-user-set limit are unchanged.

## Presets

All diameters below are mm, ordered string 1–6. All experimental sets are monofilaments. EADGBE standard tuning is derived from geometry, material, scale and bending stiffness; tension is not an independently forced parameter.

| ID | Diameters | Density kg/m³ | Young GPa | Loss angle | Total tension N at 650 mm |
| --- | --- | --- | --- | --- | --- |
| default | unchanged existing JSON | unchanged | unchanged | unchanged | unchanged |
| factory-nylon-mono-v1 | .70 .82 1.02 1.30 1.65 2.00 | 1140 | 2 | .02 | 349.0985 |
| factory-nylon-quarter-mass-v1 | .35 .41 .51 .65 .825 1.00 | 1140 | 2 | .02 | 87.2867 |
| factory-steel-mono-v1 | .25 .33 .42 .56 .74 .98 | 7850 | 200 | .001 | 417.6863 |
| factory-steel-thick-v1 | .70 .82 1.02 1.30 1.65 2.00 | 7850 | 200 | .001 | 2397.8917 |

All new material coefficients are explicit generic assumptions, not measurements or manufacturer values. Geometry is deliberately designed for virtual comparison. Lightweight means quarter linear density (kg/m) relative to the all-nylon preset, and quarter vibrating mass at equal scale; material density is unchanged. The existing nonlinear preparation solver limits pluck force in the lightweight E2 test (`forceLimited=true`); no new force/tone adjustment was introduced. No structural safety, breakage, creep, or commercial tone fidelity is claimed. Extreme steel may exceed the body model's small-deformation validity even when numerical preparation succeeds.

## UI integration

Minimal changes only in `configured-guitar-app.js`: replace all factory protection/save-copy checks based on `id === 'default'` with `item.readonly`; selection menus already consume `list()`. `showSetProvenance(item)` renders a collapsed `#string-sets-details` panel with assumptions/limits/source links plus calculated factory-original tension and vibrating mass at current performance scale. Editing inputs does not change those factory-original figures. New user copies hide factory provenance because they are independently editable. Retain `#string-sets-provenance`, or move this function into the new UI's detail screen. User inputs are rendered with `textContent`.

## Commercial profiles: deferred for evidence

Manufacturer pages inspected via web tooling:

- https://www.daddario.com/products/ej45-pro-arte-nylon-classical-guitar-strings-normal-tension — confirms clear nylon trebles, multifilament nylon bass cores, silver-plated copper winding, and six published tensions. Retrieved page does not supply six diameters.
- https://www.daddario.com/globalassets/pdfs/accessories/tension_chart_13934.pdf — redirects to https://www.daddario.com/pages/string-tension-pro-string-tension-calculator rather than exposing the old chart.
- https://hannabach.com/en/strings/815-silver-special — confirms 65 cm scale, plain nylon trebles and wound Silver-Special basses, but retrieved page lacks all gauges/tensions.
- https://www.daddario.com/products/high-carbon-steel-single-guitar-strings — confirms commercial plain steel singles, but no complete six-string profile with all required gauges/tensions was established.

No new commercial reference profile was added because the requested primary-source diameter/material/tension evidence is incomplete. Retailer dimensions were intentionally not substituted. This is an evidence limitation, not an authorization denial.

## Verification

- `node synth-demo/string-sets.test.cjs`: saved-set create/edit/copy, migration, default compatibility, storage failure atomicity, all factory immutability/select/reload, and 100-user cap.
- `node scripts/test_string_presets.cjs`: six-string validation; all 88 note conditions for every preset; tuning equation reconstruction; quarter linear mass and steel/nylon density ratios; invalid/nonfinite regimes; C++/WASM E2 preparation and 4,800 finite nonzero output samples per new preset.
- `PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_configured_guitar_ui.cjs`: 390×844 layout; every experimental selection; read-only delete protection; factory save creates user copy with correct steel properties; material switches; modal/cancel flow and persisted concurrency. No page errors.

- `PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_configured_guitar_integration.cjs`: two real pitches, keyboard/sequencer playback, cache reuse, cancellation, two-worker preparation, four-worker benchmark, unchanged benchmark settings; no page errors.

Browser tests need the installed system Chromium override; Playwright's default downloaded browser is absent in this environment.
