# Listening comparisons

On 2026-10-21 the user authorized public hosting so they can compare from iPhone. Selected 3.1-second excerpts (24 wound and 144 treble WAVs) are copied into `synth-demo/reference-comparison/` and deployed to GitHub Pages. Original recordings and analysis stay in gitignored `reference-recordings/`.

Public hub: https://okonkore.github.io/pmg/reference-comparison/

After rebuilding locally, run `python3 scripts/publish_reference_comparisons.py` to update these authorized excerpts. The script copies only the comparison files, leaving unrelated recordings and trial audio out.

With the existing private server on port 8769:

- `/` links to both comparisons.
- `/wound-comparison/` preserves the reviewed sixth-string E2 page, including reference / previous synthesis / accepted synthesis, full / low / mid / high bands and optional band gain matching. Its audio and manifest were copied before creating the treble page. Do not overwrite this snapshot during further tuning.
- `/treble-comparison/` compares G3 and E4/F♯4/A4 recordings with the unmodified current plain-string synthesis. B3 is synth-only because no second-string recording has been supplied.

Both sides use identical complementary 2049-tap FIR filters; the three bands reconstruct the full signal before final WAV fade and quantization. Treble boundaries default to 500/2000Hz; 180/800Hz is selectable for direct consistency with the wound comparison. The full signal's 40–140ms RMS and pitch are matched first. Optional band matching uses the first 50ms and changes the relative band levels; leave it off when judging how much high-frequency energy is present. These are frequency bands, not separate string/body sources. Playback uses pre-rendered WAVs, with no live synthesis load.

To rebuild only the treble page after a model change, with existing Node and Python/numpy:

```sh
node scripts/render_reference_comparison.cjs
python scripts/build_reference_comparisons.py
python reference-recordings/tuning-2026-10-20/reference-comparison/serve.py
```

Do not rerun older generators that overwrite the root page. The new builder updates the treble page and root navigation, leaving the saved wound page intact. The server script is part of the existing local reference data.

`PMG_PLAYWRIGHT_MODULE=/path/to/existing/playwright node scripts/test_reference_comparisons.cjs` exercises all 144 treble clips, two boundaries, both gain modes, missing-reference controls, sequences, cancellation, Range requests and the preserved wound page. It expects the private server on 8769 and the repo HTTP server on 8766. Public tuning changes are limited to Drop D default OFF, applying accepted wound settings to string 7, and a B1 preview button. Strings 1–3 have not been retuned yet.
