# Device-prepared physical guitar

Choose **Physical Guitar（弦を設定）** in the public synth app. Configure six
strings, confirm, and keep the page open while it prepares. The default range is
the visible keyboard plus the selected song; all 88 piano pitches are optional.
New pitches are prepared when needed. Preparation can take minutes on a phone.
Previously saved 50-second notes are truncated to 15 seconds without recalculation.
Completed notes survive cancellation/reload in IndexedDB; changing settings
creates a separate bank. Browser storage may be evicted by the OS.

No Python or compute server runs during use. A module Worker uses C++17/Eigen
compiled to Float64 SIMD WebAssembly for matrix assembly, Cholesky/LU solves,
nonlinear static initialization, real eigendecomposition, and pressure-observer
composition. The existing Float64 waveform WASM then generates mono PCM.
Body matrices, endpoint maps and body-mass products are initialized once per
worker. Each configuration validates and computes six string sections/open
tensions once; only pitch-dependent coupling is rebuilt for each note.
PCM24 is persisted with a reversible encoding scale (not listening normalization).
Decoded AudioBuffers use an LRU cache capped at 64 MiB. Playback reuses the app's
keyboard, transport and voice registry; preparation never runs on the audio thread.
The first few song pitches are decoded before the transport clock starts.

## Choose preparation concurrency and measure on your device

The performance/setup screen offers **1–4 parallel preparation workers**. The
initial value is 1 and the preference is saved separately from physical string
settings. Changing it does not invalidate compatible prepared PCM. More workers
increase memory use; on a phone compare 1 then 2 before trying higher values.
Actual iPhone speed/memory has not been measured by the developer.

**同じ4音で速度を測る** calculates E2/A2/D3/E4 afresh with the selected worker
count, even when the notes already exist in IndexedDB. It does not change the
active bank, performance settings, string sets or saved PCM. Each note is at
most 15 seconds (the existing quiet-tail criterion may stop earlier). The latest
elapsed calculation time for each worker count is stored/displayed locally.
Comparisons reset when physical settings or the AudioContext sample rate differ.
Timing includes worker/data initialization, coefficient preparation, rendering,
PCM encoding and transfer; it excludes writing these benchmark notes to storage.

Normal preparation uses the same selected concurrency and reuses cached notes.
Only missing notes occupy workers; the actual count is limited by missing-note
count. Progress shows all notes currently calculating. Cancellation or any lane
failure terminates the entire pool. Completed saved notes survive, while the
previous active bank is retained until a full preparation succeeds. Every
worker retains its own common body/settings context while processing its lane.

```js
await guitar.prepare(settings, {midis: [40, 45, 50, 64], concurrency: 2});
console.log(guitar.lastPreparation); // elapsedMs, generated, reused, workersUsed
const result = await guitar.benchmark(settings, {concurrency: 2});
console.log(result.elapsedMs); // always recalculates; does not replace active bank
```

## Model and approximation

The body/air geometry and coefficients come from the current Python model.
Body mobility is projected to 256 passive energy coordinates. All 1704 original
positive/real pressure observer modes are retained and composed analytically;
only the smaller coupled mechanical eigensystem is solved on the device.
String mass, bending, air/internal loss, wound-core Maxwell relaxation, moving
endpoints and geometric stretching are calculated from the current settings.
There is no recording fit, notch filter or added knock-masking damping.
The original six-string body preload is updated for the configured tensions;
the body geometry/prestress reference itself is not remeshed on the phone.

This is an **approximation**, not bit-identical to the full Python system.
See `validation.json`: first 100 ms relative waveform L2 error is 0.13–0.76%,
and three-second error 2.16–9.79% for the three frozen E2/D3 comparisons.
These figures include phase drift and do not prove perceptual equivalence.
Actual iPhone hardware performance has not been measured.

Standard open pitches are E4/B3/G3/D3/A2/E2. Higher pitches use the highest
available string, shortened at its nominal tension; below E2 the sixth string
is detuned. Only one speaking string is simulated per note. There is no resolved finger contact geometry or sympathetic vibration between voices.
Explicit stopped notes now use the rotational contact proxy described below. Velocity scales the prepared
wave, so it does not recompute nonlinear pluck strength; change force in setup
for a different physical pluck. Initial displacement is limited to 5 mm, reported
in per-note physics metadata. Pluck distance is clamped only if the speaking
length is too short. String modes are limited to 61 per polarization and to
45% of the AudioContext sample rate. Natural tails are generated up to 15 s;
a conservative modal bound can stop earlier below 1e-6. There is no end fade.
The app's note-off is a separate 12 ms release action.

## API

```js
import {createPreparedGuitar} from './bank.js';
const guitar = await createPreparedGuitar(audioContext, {onProgress: console.log});
await guitar.prepare(settings, {midis: [40, 50, 55, 64]});
await guitar.ensure(40); // preload for precise first-note timing
const voice = guitar.play({midi: 40, when: audioContext.currentTime + .1});
await voice.ready;
voice.release(audioContext.currentTime + 2);
// guitar.cancel(); guitar.dispose();
```

`settings.js` validates/normalizes the serializable settings schema.
`default-settings.json` preserves the inferred original 520R string conditions;
selecting a generic material uses explicit assumed properties instead.
`GuitarCoefficients.create(body,wasmBytes)` initializes the shared C++ body.
Its `build(settings,midi,{sampleRate})` returns the integrator coefficient binary
and physical metadata; the settings context is reused while inputs are unchanged.
`worker.js` renders and encodes one pitch at a time. `prepare.js` and `observer.js`
remain JavaScript reference implementations for regression tests, and are not
loaded on the production preparation path.
Preparation errors retain previously saved pitches and surface in the app.

Reproduction scripts: `build_configurable_body_rom.py` extracts the full body
from frozen research inputs; `export_configured_body_library.py` makes the adopted
projection/observer library. `audit_configured_prepare.cjs` generates comparison
waveforms; `audit_configured_guitar_energy.py` checks reference error and physical
energy decay. UI/integration/range tests are in `scripts/test_configured_guitar_*`.
Vendored ml-matrix 6.12.1 is MIT licensed (license in `vendor/`). The existing
physical-guitar `kernel.wasm` and `engine.js` are reused unchanged.

## Coefficient WASM build and verification

The implementation is C++ (not Rust), compiled using WASI SDK 34.0 and Eigen
3.4.0. Build with external toolchain/header directories:

```sh
PMG_WASI_SDK=/path/to/wasi-sdk-34.0-x86_64-linux \
PMG_EIGEN=/path/to/eigen-3.4.0 \
bash scripts/build_guitar_coefficients_wasm.sh
node scripts/test_guitar_wasm_coefficients.cjs
```

The compiler is only needed by developers. Clients download `coefficients.wasm`
(about 272 KiB). No filesystem/network capabilities are exposed to the numerical
module. The coefficient memory grows on demand up to a 256 MiB maximum; measured
high-water usage is recorded in `coefficients-validation.json`. The waveform
integrator has its separate memory. iPhone hardware performance is unmeasured.

The JS-to-C++ comparison includes E2, D3 on two strings, plain-string notes,
lowest/highest piano pitches, and 44.1/48/96 kHz. Modal basis and floating-point
roundoff can differ; the preexisting 3% sparse nonlinear-port threshold is also
basis-dependent. The original backend migration did not change the physical model.
The stopped-contact revision uses a new PCM namespace; previous records are retained but not reused.
See the numerical report for measured waveform error and coefficient timings;
these timings do not include 15-second waveform rendering or storage.

Eigen is used unmodified with `EIGEN_MPL2_ONLY`. Sources and notices for the
compiled third-party components are listed in `vendor/COEFFICIENT-NOTICES.md`.

## Stopped-end rotational resistance

Explicit `stringNumber` plus MIDI determines a fret in 0–20. A positive fret
receives `c = 8e-7 N·m·s/rad`; open notes now receive the separate nut resistance below. Pitch-only non-open notes, including old songs
without string assignments and virtual basses, retain zero
contact resistance even when the synthesis algorithm shortens a chosen string.
The model never treats inferred string selection as a physical fingering.
The existing note editor/string layers, stored fifth event field and explicit
user-invoked string assignment feed the same `stringNumber` path to the worker.
TAB suggestions alone do not alter songs. No separate fret field is introduced.

At x=0 (the stopped/nut end), relative to the moving endpoint chord,
`thetaDot[p] = sum(k[n] * v[n,p] / sqrt(mu*L/2))`.
Torque is `-c*thetaDot`; the generalized velocity damping for each of the two
transverse axes is `C[i,j] = c*k[i]*k[j]/(mu*L/2)`, including cross-mode terms.
JS and C++ subtract this matrix before the coupled mass solve. Added dissipation
is `c*sum(thetaDot**2) >= 0`; c=0 removes the term exactly.

This unmeasured proxy was selected by listening to separate experiments, not
validated against recorded fingers or frets. It also damps low partials. It does
not simulate finger mass, distributed contact, slip, fret buzz, or the string
behind the fret. Its inherent length dependence is not evidence for nut support.
It applies only to the configured physical instrument, not other sound presets.

Default internal loss remains **0.02**; no Loss7 preset migration occurs. Auditions
used **0.14 on the speaking string**. The contact coefficient has the same units
and meaning in both settings, but resulting timbre and decay can differ.
Contact notes start integration at block2 with the existing refinement/fresh
block1 retry; notes without added contact resistance retain their prior block4/2/1 policy.

Settings/song schema and storage keys are unchanged. The PCM cache prefix and
module/WASM URLs are versioned; old cached audio is kept, new audio is generated
on demand. No stored user song, setting or old PCM is deleted. Coefficient ABI2
adds the resistance value and fails clearly if an old WASM is accidentally loaded.
The coefficient binary consumed by the waveform integrator keeps its layout.

Regression: `node scripts/test_stopped_contact.cjs` covers six strings at 20F,
sixth-string 5/12F, both losses, JS/WASM equivalence, step refinement, no clipping,
open/unspecified behavior and boundary validation. This does not establish
physical validity over every material, scale or device.


## Provisional open-nut rotational resistance

Open notes now receive `c_nut = 2e-7 N·m·s/rad` using the same passive,
cross-mode, two-axis rotational dashpot at x=0. This applies when the selected
string's open MIDI equals the requested MIDI, whether the string was specified
or selected automatically. Explicit stopped notes retain exactly `8e-7`;
non-open unspecified notes and virtual basses retain zero added resistance.
`contactAssignment` continues to record the user's assignment provenance;
an automatic open still says `unspecified`, while `contactDampingNms` records
the applied nut coefficient. Only the configured physical instrument changes.

The nut/body translational coupling and its existing losses remain. This is an
**additional** lumped loss in relative endpoint slope, not evidence that the nut
previously absorbed no energy. It assumes an isotropic, frequency-independent
rotational resistance relative to the moving endpoint chord. It does not resolve
nut material, groove slip, headstock/neck impedance or the string behind the nut.
There is no new EQ, envelope, gain normalization, or per-note fitted coefficient.

The value is an explicit provisional choice, one quarter of the existing finger
proxy, not a literature measurement, recording fit, or acoustically validated
optimum. For an isolated weakly damped mode the approximate added amplitude
attenuation is `8.686*c_nut*(n*pi/L)^2/(mu*L)` dB/s; it grows as n² and L⁻³
at fixed linear density. Coupling changes actual modal decays, so this is only
an estimate, especially at short scales or for high partials. Added passive
loss does not guarantee faster decay at every frequency in observed pressure.
Short-scale numerical stability is not proof of a realistic short-scale nut.

The delegated prior recording analysis reported fourth-string open fundamental
4.7–5.3 dB/s versus 19.5 dB/s in the old model. This change can worsen that
existing over-damping. Those recordings were **not reloaded or remeasured** in
this change; no claim is made that all open recordings now match or improve.
Listening and a per-partial comparison are still needed to calibrate this value.

The PCM namespace is now `full-pressure-m256-stopped-8e-7-nut-2e-7-v1`;
module URLs are refreshed through the application entry point. Existing stored
settings/songs and old PCM are preserved. No coefficient ABI or WASM build
change is needed: both backends already accept the same endpoint resistance.
Open notes use the existing contact block2→block1 refinement/retry policy.

Validation commands: `node scripts/test_nut_contact.cjs`,
`node scripts/test_stopped_contact.cjs`, `node scripts/test_short_scale_render.cjs`,
and `PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_stopped_contact_browser.cjs`.
The nut test compares unaffected coefficient binaries to pinned baseline
`ffa847989198917828302974b3df6c74c4b62a3f`, and exercises all six opens at
650/100 mm, stable poles, finite/unclipped output, JS/WASM agreement and
step-refinement diagnostics. The 100 mm case does not meet the normal-scale
accuracy budgets; see `../../../docs/NUT_DAMPING.md` for observed results.
