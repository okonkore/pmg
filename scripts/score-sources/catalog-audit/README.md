# Catalog quality audit — 2026-10-30

Scope:32 existing/local candidates; no new songs and no note-event changes.
Original published base4c823d2 has25 songs; batches3/4 add7. Application-code
licensing is separate from each engraving/derived score's declared rights.

## Availability, attribution and coverage

`availability.json` records successful HTTP200 retrievals and SHA256 for all32
individual source entries (BourréesI/II share one source), plus both shared Bach
headers. Sources were retrieved directly from the official Mutopia GitHub tree.
An initial guessed BWV1007 header path returned404; the correct `bwv1007-lys`
path succeeded and matched the already-vendored header byte for byte. BWV1009's
shared header also matches. No IMSLP access was attempted.

The12 old Bach movement sources are newly vendored byte-exact here. BWV1012
headers explicitly credit Hajo Dezelski and CC BY-SA3.0. BWV1007's header in
repertoire-batch1 explicitly credits Andreas Scherer and Public Domain. Original
Sor source headers are already vendored under sor-op60/sor-op6; the fresh remote
headers confirm Fabrice De Volder CC BY-SA2.5 (Nos.1,2,4), CC BY-SA3.0 (Nos.3,5),
Hajo Dezelski CC BY-SA3.0 (No.12), Glen Larsen CC BY-SA4.0 (Op.6No.8).
Existing credit/license/source URL strings are preserved;19 dedicated licenseUrl
fields are added, along with license retention terms. No PD source was relabeled
CC0 or a new license.

`catalog-review.json` lists all32 identities, full movement/piece coverage,
counts, sounding ranges, below-E2 counts, note releases and known/unknown ends.
BWV1007 and1012 each have all seven individual movements; BWV1009 contains only
BourréesI/II, explicitly separate movements, not the whole suite. Sor entries
are individual complete studies/pieces, not complete opus collections. Written
sections generally play once; existing alternate endings remain as encoded.
No automatic da capo between paired dances is claimed. Bach trill handling
remains as imported; the batch3 BourréeII specifically discloses unrealized trill.
32 keys/options and event fingerprints are unique. All16 Bach selections have
some pitches below standard-guitar E2; they remain cello data, not validated
six-string arrangements. All16 Sor entries are within the standard E2 lower
bound, but that does not establish fingering or string allocation.

## Ending verification and unresolved differences

`legacy-metadata.json` records19 independent recompilation results and manually
reviewed closing notation. Official LilyPond2.24.4/convert-ly compile all19;
15 reproduce every existing event exactly. Their ends are taken from written
ending/rest/skip structure and MIDI track ends together, not max note release.
Numbers follow this credited engraving, including its pickup/padding conventions;
they are not a claim of Urtext or an independent editorial correction.

Explicit endBeat additions (quarter beats):
- BWV1007 Prelude168, Allemande128, Courante126, Sarabande48.
- BWV1012 Prelude624, Allemande80.5, Courante217, Sarabande192, GavotteI116.
- Sor Op.60 Nos.1/2/3/4/5:64/120/96/73/120; Op.6No.8:117.

Four remain without endBeat and carry an exported/displayed `endingStatus`
identifying the ending as unverified. Existing playback's note-derived extent
remains its fallback; it is not relabeled a verified score end.
- BWV1007 Gigue: three staccato notes at18.5/19/19.5 shorten from.5 to.25 in
  current compilation. Counts/pitches/onsets match; retain original data and
  review articulation policy before adopting a newly compiled rendition.
- BWV1012 Gigue: same duration difference at86.5/87/87.5. Original655 events retained.
- BWV1012 GavotteII: source recompilation yields215 vs214 events; F-sharp3 at18
  becomes two eighth notes at18/18.5 instead of one quarter. Review source tie/
  repeated-note encoding before changing the published data.
- Sor Op.60No.12: all149 events reproduce, but source bar checks fail at3/8 near
  alternate endings. Independently reconcile pickup/ending timing before assigning
  a score end. Candidate compiled50.5 is recorded only as evidence, not applied.

BWV1012 Allemande emits a beam warning, not a timing/bar warning;541 events
match, and final d,8. s16 plus source pickups support80.5. Batch3 SorNo.10's
previous audit decision is unchanged; no original source normalization was done.

## Required tuning

Sor Op.1No.6 source `La 6e corde en Fa` is represented as
`source.requiredTuning = {instrument:'guitar', pitchesLowToHigh:[41,45,50,55,59,64],
automaticallyApplied:false}`. Validation rejects malformed or auto-applied tuning
claims; copy, save, export/import preserve a deep copy. Help/source summary states
F2 A2 D3 G3 B3 E4 is a requirement, not automatically applied to the instrument.
Playback continues ordinary MIDI-pitch synthesis. This does not simulate correct
string choice, fingering, or physical retuning. Imported arbitrary valid tunings
are displayed from their own MIDI values rather than hard-coded as F2.

## Reproduce

```
python3 scripts/import_catalog_quality.py
python3 scripts/audit_catalog_sources.py --lilypond /path/to/lilypond-2.24.4/bin/lilypond
node synth-demo/repertoire-catalog.test.cjs
python3 -m http.server 8770
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_repertoire_batch4_browser.cjs http://127.0.0.1:8770/synth-demo/
```

The audit compiler writes only temporary files and reports discrepancies; it
never updates notes or automatically approves endings. `event-fingerprints.json`
anchors every song's pre-quality-pass events. Browser checks cover source display,
actual JSON export/import and reload. Real-device Safari and human listening/
fingering review remain unrun. No independent agent review was performed.
