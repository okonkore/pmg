# PMG — Physical-model guitar

A browser synthesizer with a physically modelled Nylon Guitar. String vibration and body resonance are calculated locally; the guitar does not replay recorded samples.

## Play

https://okonkore.github.io/pmg/

Select **Nylon Guitar** in the instrument menu and press the audio enable button. The first preparation may take a moment. Use the on-screen keyboard or play one of the Bach pieces.

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

The MIDI converter can be checked with `python3 scripts/test_bwv1012.py`.

The selected files in `analysis-1007` are regression fixtures for these tests. Reference recordings and generated analysis outputs are not included.

## Deployment

GitHub Actions publishes only `synth-demo/index.html` and its JavaScript files to Pages. The repository root also contains an earlier Bar Drop prototype, which is not the Pages entry point.

Score credits and licenses are shown in the app footer.
