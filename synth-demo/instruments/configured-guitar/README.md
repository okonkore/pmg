# Device-prepared physical guitar

Choose **Physical Guitar（弦を設定）** in the public synth app. Configure six
strings, confirm, and keep the page open while it prepares. The default range is
the visible keyboard plus the selected song; all 88 piano pitches are optional.
New pitches are prepared when needed. Preparation can take minutes on a phone.
Completed notes survive cancellation/reload in IndexedDB; changing settings
creates a separate bank. Browser storage may be evicted by the OS.

No Python or compute server runs during use. A module Worker assembles the
string/body system with ml-matrix, then Float64 WebAssembly generates mono PCM.
PCM24 is persisted with a reversible encoding scale (not listening normalization).
Decoded AudioBuffers use an LRU cache capped at 64 MiB. Playback reuses the app's
keyboard, transport and voice registry; preparation never runs on the audio thread.
The first few song pitches are decoded before the transport clock starts.

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
is detuned. Only one speaking string is simulated per note. There is no finger
contact or sympathetic vibration between voices. Velocity scales the prepared
wave, so it does not recompute nonlinear pluck strength; change force in setup
for a different physical pluck. Initial displacement is limited to 5 mm, reported
in per-note physics metadata. Pluck distance is clamped only if the speaking
length is too short. String modes are limited to 61 per polarization and to
45% of the AudioContext sample rate. Natural tails are generated up to 50 s;
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
`buildModel(settings,midi,body,{sampleRate})` returns the integrator coefficient
binary and physical metadata. `worker.js` renders and encodes one pitch at a time.
Preparation errors retain previously saved pitches and surface in the app.

Reproduction scripts: `build_configurable_body_rom.py` extracts the full body
from frozen research inputs; `export_configured_body_library.py` makes the adopted
projection/observer library. `audit_configured_prepare.cjs` generates comparison
waveforms; `audit_configured_guitar_energy.py` checks reference error and physical
energy decay. UI/integration/range tests are in `scripts/test_configured_guitar_*`.
Vendored ml-matrix 6.12.1 is MIT licensed (license in `vendor/`). The existing
physical-guitar `kernel.wasm` and `engine.js` are reused unchanged.
