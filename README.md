# PMG — Physical-model guitar

A browser synthesizer with a physically modelled Nylon Guitar. String vibration and body resonance are calculated locally; the guitar does not replay recorded samples.

## Play

https://okonkore.github.io/pmg/

Select **Nylon Guitar** in the instrument menu and press the audio enable button. The first preparation may take a moment. Use the on-screen keyboard or play one of the Bach pieces. Initial guitar preparation covers the visible keyboard; uncached previews and score pitches are prepared when requested. Changing settings or stopping cancels obsolete preparation. The synthesis worker pauses between short calculation slices to keep interaction responsive.

## Guitar reference tone

Nylon Guitar includes a shared body-output adjustment guided by six isolated guitar notes. **録音を参考にした音色** switches it on; switch it off to compare the previous sound. E2, A2, D3, G3, E4, F♯4 and A4 preview buttons are available alongside D2 and seventh-string B1. Drop D defaults to off, matching the standard-tuning reference recordings. Recordings remain local and are not included in the site.

The 2026-10-21 update also adjusts wound strings 4–6: their high-frequency attack remains, while upper partials decay faster. The seventh string now uses the same wound-string excitation, texture and fast high-frequency decay, retaining its B1 tuning. Plain strings 1–3 retain their published waveforms. The approved texture settings are enabled with the same reference-tone checkbox.

Details and limitations: [wound-string update](scripts/guitar-wound-release-2026-10-21.md), [earlier shared-body adjustment](scripts/guitar-tone-2026-10-20.md).

Local reference/low/mid/high comparisons are preserved separately from the public site: [comparison setup](scripts/reference-comparisons.md).

## Piano-roll editor

Open **ピアノロール** to inspect a score. Built-in pieces are read-only; choose **コピーして編集** to create an independent editable copy in **マイソング**. **新しい曲** creates an empty score.

- Select and drag notes to move them; drag their right edges to resize them. The pencil or a double click in empty space adds notes.
- Shift-click or drag a selection rectangle to select multiple notes. Delete removes them; arrow keys move them; Shift + up/down transposes an octave.
- Set the grid, note length, BPM, meter and selected-note velocity. Quantize aligns selected note onsets to the grid.
- Undo/redo and internal note copy/paste use Ctrl/Command shortcuts. The ruler sets the playback cursor; Space starts/stops playback. Loop repeats from the cursor to the final note.
- Edits are automatically stored in this browser. JSON export/import transfers editable songs between browsers or keeps a backup; it does not sync through GitHub. Source credits are preserved in copies and exports.

`node synth-demo/sequencer-model.test.cjs` checks original-score protection, undo/redo and persistence. With the local server running, open `http://127.0.0.1:8765/scripts/sequencer-browser-test.html` for the browser integration checks; it temporarily backs up and restores the song storage key. The test covers real DOM editing, transport scheduling and reload, and is excluded from the Pages deployment.

## Sample pieces

BWV 1012 includes Prélude, Allemande, Courante, Sarabande, Gavotte I, Gavotte II, and Gigue, in score order. Each movement plays through once without repeats, using the selected synthesizer sound. The existing BWV 1007 selections are retained in a separate menu group.

BWV 1012 note data is adapted from Hajo Dezelski's Mutopia engraving under CC BY-SA 3.0. Source links, licenses and reproduction instructions are in [scripts/score-sources/bwv1012](scripts/score-sources/bwv1012/README.md).

## Run locally

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/synth-demo/ . No build or package installation is needed.

## Tests

With Node.js installed:

```sh
for test in synth-demo/*.test.cjs; do
  node "$test" || exit
done
```

Worker scheduling and preparation changes are described in [the responsiveness note](scripts/guitar-preparation-performance-2026-10-21.md), including the optional existing-Playwright browser test.

The MIDI converter can be checked with `python3 scripts/test_bwv1012.py`.

The selected files in `analysis-1007` are regression fixtures for these tests. Reference recordings and generated analysis outputs are not included.

## Deployment

GitHub Actions publishes the HTML, JavaScript, CSS and selected synthesis-only comparison WAV from `synth-demo` to Pages. Reference recordings remain local. The repository root also contains an earlier Bar Drop prototype, which is not the Pages entry point.

Score credits and licenses are shown in the app footer.
