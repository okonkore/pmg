# First-string listening trial — 2026-10-21

The user chose to work on string 1 while no second-string reference exists. This trial uses the supplied open E4, second-fret F♯4 and fifth-fret A4 recordings. The accepted third-string tone remains in the main instrument; first-string changes are opt-in via `firstTone:1` for the comparison only.

The three notes have substantially different excitation spectra. E4's third/eighth partials were too prominent and its tail too long; F♯4 lacked several middle/upper partials; A4's sixth partial was about 19dB too strong in the selected reference comparison. A common high shelf would not fix these differences.

`NylonFirstExcitation` contains three fret anchors, with continuous interpolation of log-amplitude excitation gains, nonnegative per-mode losses and measured stiffness. Beyond the highest anchor, stiffness scales gradually with shortening and is capped. Each note redistributes the same initial pluck energy. The body radiation profile is retained, and no reference sample is played by the model. A 12ms acoustic onset window softens the original immediate rise. These are fitted excitation/observation coefficients, not uniquely identified physical guitar parameters or a claim to remove microphone effects.

All ten recorded takes inform stiffness/decay and variability. Initial timbre is fitted mainly to the second take used by the public comparison, with a small contribution from the take median to limit outliers. F♯4's unusually rapid recorded decay is deliberately not copied: its extra loss interpolates between E4/A4, honoring the user's earlier preference. In the selected windows the candidate's F♯ tail at about 1.15s is around -14.7dB, versus the recording's -20.7dB.

For the selected reference, initial (40–140ms) mean absolute level error over harmonics 2–12 fell approximately from 4.6 to 0.2dB on E4, 7.8 to 0.3dB on F♯4, and 7.3 to 0.4dB on A4. These are diagnostics on the fitting excerpt, not an independent listening evaluation. Later envelope shape, transient texture and microphone/room differences still require the user's comparison.

`/reference-comparison/first-comparison/` lets the listener select E4/F♯4/A4, then reference/before/after in full, below500Hz, 500–2000Hz or above2000Hz. `?note=66` selects F♯ directly. All sources use the same complementary FIRs, initial full-note RMS and pitch alignment, final fade and common headroom. The optional band matching changes attack levels; start with it OFF. Only authorized 3.1-second excerpts are public; originals and measurements remain under ignored `reference-recordings/first-string-2026-10-21/`.

Reproduce with existing Node and Python/numpy:

```sh
node scripts/render_first_string_comparison.cjs
python scripts/analyze_first_string.py
python scripts/build_first_string_comparison.py
python scripts/publish_reference_comparisons.py
```

Validation: `nylon-first-tone.test.cjs` checks the targeted E/F♯/A partial changes, bounded passive energy, preserved initial pluck energy, finite interpolated/higher notes, retained F♯ sustain, OFF paths and exact accepted third/wound/second strings at 44.1/48kHz. Third-approved and responsive-worker regressions pass. `test_first_comparison.cjs` checks all 72 listening clips, three note/source selections, both gain modes, mobile width, sequence cancellation, deep links and absence of JS errors. It accepts a base URL and the existing `PMG_PLAYWRIGHT_MODULE` override.

## Revision first-mid-2

User feedback prioritized the middle band, then the high band. The first fit matched the initial partial levels but missed their later evolution: in E4 take 2, partial 2 falls below partial 3 around 0.65s. The old candidate kept partial 2 dominant. Five first-string partials (2–6) now use fitted pairs of transverse components, with continuous fret interpolation of amplitude ratio, frequency separation and circular phase. Nonnegative losses and a fixed initial pluck budget are retained. These are phenomenological fits, not proof that polarization alone causes the recorded envelope.

In E4 the 0.5–0.8s levels of partials 2/3, relative to the initial fundamental, were about -26.5/-34.8dB before and -43.3/-23.4dB now, versus -40.4/-24.4dB in the selected recording. Initial levels remain approximately unchanged. High-band differences remain, particularly the E4 2–4kHz tail. This revision prioritizes the middle-band evolution rather than claiming a complete match.

The comparison now uses the previous published first-string candidate as “前回” and this revision as “今回”; the main instrument still retains its existing first-string tone. Building requires the saved previous candidate PCM files under the private analysis folder.

## Revision first-high-3

The listener accepted the middle band and described the remaining high band as unnaturally consolidated. Analysis distinguishes two problems: almost purely periodic high output in the model's onset, and a shared monotonic envelope for upper partials. The recording also becomes strongly tonal after its first contact; this does not justify continuous broadband hiss.

Paired-component fitting now extends through harmonic 24, but only partials above about 2100Hz at each recorded fret are refitted. Initial 5–40ms behavior is included as well as the later envelope. For example, F♯'s seventh partial previously started stronger than its 40–140ms level; the new candidate starts much weaker and emerges later. High partials now have differing separations, phases and nonnegative losses. These remain phenomenological fits to the supplied excerpts, not uniquely identified physics. F♯'s overall decay is still not forced to match the unusually short reference.

A seeded, finite contact reservoir excites four strongly damped body states at 4.8/6.5/8.5/10.5kHz through a separate orthogonal port. Its energy is taken from the same pluck, its force lasts at most 180ms, and unused energy is included in detached release energy. No reference sample or noise is mixed directly into the output. The existing third-string reservoir and all other strings retain their exact output. The added high response is only enabled by the comparison's firstTone and attack settings.

The approved first-mid-2 middle-partial envelopes are stored in nylon-first-middle-approved.json. The high-band regression checks them at three notes, four time windows and both sample rates; measured change stays below 0.02dB relative to the initial fundamental. This does not assert that the entire listening band is mathematically identical. High-band differences remain, including some F♯ early sustain and individual late partial levels, and need listening feedback.

The comparison uses first-mid-2 as “前回” and first-high-3 as “今回”. The instrument's main first-string tone remains unchanged pending listening approval. In addition to existing regressions, nylon-first-high.test.cjs checks preserved middle envelopes, delayed high-partial onset, bounded contact energy and passive energy accounting.

## Adoption and second-string interpolation

The user approved first-high-3 and requested string 2 derived from the approved strings 3 and 1. The main instrument now enables firstTone and secondTone together with the reference-tone control. Cache/import version is plain-approved-2026-10-21. The first-string comparison stays available and is marked adopted.

NylonSecondExcitation derives model coefficients at equal fret positions. B3 is 4 of the 9 semitones from open G3 to E4, so the first-string weight is 4/9. Excitation gains interpolate in dB, extra losses linearly, positive stiffness/contact energy geometrically, and component phase over the shortest circular arc. Polarization ratios/separations and finite contact timing interpolate between the two models; body modes remain shared. This is parameter interpolation, not mixing recorded or rendered notes. There is no B3 reference, so this is an estimate rather than a recording fit.

All five automatically selected second-string pitches B3–D♯4 are checked at 44.1/48kHz for finite output and passive, fixed initial energy. Exact waveform hashes for the adopted first, third and wound strings (including 7) are in nylon-plain-approved.json. API defaults preserve earlier comparisons when the new settings are absent; disabling reference/body fit retains the old path. Browser regressions check the actual UI routes to adopted first and interpolated second notes, responsive worker cancellation and cache limits.

To refresh only the 16 B3 listening clips, run render_second_string.cjs, build_second_string_comparison.py (numpy), then publish_reference_comparisons.py. The other pitches in the older treble comparison are historical; use the dedicated adopted-first and adopted-third comparison pages.
