# Batch6 — independent increment after frozen35-song candidate

Integration baseline: published `4c823d26915b7934faf64e9eafac9903e98c438c`, with the reviewed35-song candidate plus these3 pieces. `checkpoint35.json` fingerprints entire prior song objects, including notes, metadata and endings.

## Complete pieces and rights

| Piece | Credited engraving | License | Raw → performed notes | Performed bars / quarter beats | Sounding MIDI |
|---|---|---|---|---|---|
| Tárrega, Adelita (Lento) | Stewart Holmes,2006 | CC BY-SA2.5 |131 →313|40 /120|40–76 (E2–E5)|
| Aguado, Op.3No.1 (Valse) | Glen Larsen,2016 | CC BY-SA4.0 |325 →763|112 /168|40–72 (E2–C5)|
| Carcassi, Op.60No.2 (Moderato con espressivo) | Glen Larsen,2013 | CC BY-SA3.0 |413 →689|40 /160|40–77 (E2–F5)|

- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=808
- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=2041
- https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1853

Exact official Mutopia GitHub source bytes are vendored and pinned in manifest
and tests. Headers explicitly grant the corresponding licenses. Source lineage:
Adelita, Boije Collection/Swedish Music Library; Aguado, Mainz B.Schott Söhne
plate2674; Carcassi, Mayence B.Schott's Söhne. All new derived event data retains
its engraving's matching attribution/share-alike license and modification notice;
application code licensing is separate. Nothing imitates an unlicensed recording.

## Repeat and ending decisions

Original raw MIDI is not rewritten. It encodes each written section once;
`expand` maps verified section boundaries to a separate complete performed form.
No source note crosses a cut boundary; the importer rejects such a cut rather
than truncating it. Source grace timings and overlapping equal pitches survive.
D.C. return repeats are omitted as an explicit performance convention, not an
unqualified claim that every performance must use this particular convention.

Adelita:16 written bars of3/4. A=bars1–8 [0,24), B=9–16 [24,48).
Repeat signs plus D.C.al Fine yield A A B B A, at0/24/48/72/96/120beats.
The final return ends at Fine, bar8, with no repeat on that return. Last E2
quarter at118 releases119; final quarter rest completes120. Source first notes
are E2 bass plus E5 melody; all pitches already sounding, no -12 conversion.
The three source voices and appoggiaturas remain. Source quarter tempo70.

Aguado:48 written bars of3/8. A8/B8/C16/D16 have raw boundaries0/12/24/48/72.
Four volta sections then D.C. back through Fine at bar16 yield
A A B B C C D D A B,168quarterbeats/112performed bars. Return has no sectional
repeats. Closing C3/E3/C4 chord starts166.5, ends167.5, then eighth rest to168.
Opening C3 bass/C4 melody and grace timing establish sounding register; no octave
shift. Source quarter tempo90. Source editorial readings, including a commented
bass-duration correction, are retained as this credited edition, not promoted as
independently authenticated Urtext. Local nested voices ending58.5 do not truncate
the full source parts, whose track ends reach72.

Carcassi:24 written4/4 bars, A8 plus B16 with a repeat on B. A B B gives160beats.
The A2 onset exists in two voices, durations.25 and2; both are retained. Final A3
quarters are also duplicated across voices at158, ending159, with a quarter rest
to160. All MIDI pitches already sound at guitar register. Source quarter100,
with expressive rallentando/dynamics not translated into tempo automation.

Every source compiles without warnings with official convert-ly/LilyPond2.24.4.
Temporary per-voice MIDI performers avoid merging overlapping unisons. Original
source bytes/whitespace are untouched. Recompilation and regeneration are byte
identical. App88% gate/release remain separate from source durations. Range alone
is not evidence of a playable fingering/string assignment; no physical settings
or engine behavior is changed.

## Validation

```
python3 scripts/import_repertoire_batch6.py --lilypond /path/to/lilypond-2.24.4/bin/lilypond
python3 scripts/test_repertoire_batch6.py
node synth-demo/repertoire-batch6.test.cjs
node synth-demo/repertoire-catalog.test.cjs
PMG_PLAYBACK_AUDIT_REPORT=/tmp/repertoire38-playback-report.json node synth-demo/catalog-playback.test.cjs
python3 -m http.server 8772
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_repertoire_batch6_browser.cjs http://127.0.0.1:8772/synth-demo/
```

Python pins all3 source hashes, entire event transforms, section replicas, tempo/
bar/track-end structure, sounding-pitch witnesses and final rests, and rejects
boundary truncation. Node verifies licenses, protected originals, copy edits,
source/form/ending export/import/storage, and all35 baseline whole-song hashes.
Browser checks38songs/11groups, bilingual composer/title search, all3 scores'
piano-roll placement and playback ends, actual JSON download/import, literal
metadata rendering and reload. Full deterministic scheduling covers all38 songs
in four existing preset profiles; no520R stealing or natural pre-gate endings
were found at tested settings. Known SoftPad/frozen-B limitations remain separate
and unchanged; the new studies are not used to justify an engine rewrite.

No real-device Safari/listening/fingering review was performed. Four legacy
ending statuses remain explicitly unknown. Handel's source-access blocker is
unchanged; no network-policy bypass.
