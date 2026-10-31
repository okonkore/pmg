# BWV1004 Chaconne — complete literal-score local candidate

Base `906559afe0b04657fe6f5b33880aafff661304a7`,50 songs. Add **one** Chaconne selection:51 songs/13 groups. Existing50 whole song objects (including all source metadata) are pinned in `checkpoint50.json` and unchanged. This does not add the other BWV1004 movements. No commit/push/Pages publication, sound-engine changes, unrelated TAB/depth research or UI behavior changes. Current main's settings/audio/Undo changes are preserved; app changes are only a data script and catalog wiring.

## Edition and rights

Original violin score, Hajo Dezelski/Mutopia, updated2019-05-30, after Bach-Gesellschaft Edition1879 volume27.1:
https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=1426
Raw source:
https://raw.githubusercontent.com/MutopiaProject/MutopiaProject/master/ftp/BachJS/BWV1004/bwv-1004_5/bwv-1004_5.ly

The edition is explicitly **CC BY-SA3.0** in its source header and official listing. Source bytes and all generated MIDI/score data retain the attribution, license, transformation notice and share-alike terms: https://creativecommons.org/licenses/by-sa/3.0/ . The public-domain composition does not remove the modern engraving's license. Application code is separate. No Segovia/Schott arrangement or recording transcribed, no new bass notes or accompaniment invented. `manifest.json` pins exact original-source and five MIDI hashes. Raw source whitespace and historical header remain intact.

## Complete score representation, not an arpeggio realization

All **3123 MIDI note events** from four source voices are retained, including simultaneous/overlapping unisons and their exact durations. Four separately compiled voice files have2085/306/117/615 notes; their union exactly matches full MIDI. The existing MIDI reader normalizes first-note onset; isolated voice3 therefore restores its explicitly written initial `s2` (2 beats) before comparison. Full score starts at0, so no opening sound/rest is removed.

The edition has an opening2-beat partial followed by256 full3-beat segments: **770 quarter beats**, source comments1–257. MIDI end-of-track agrees for all voices. There are no repeat signs to unfold. Final two independent D unisons start767 and last3 beats; neither is collapsed. The final fermata is not extended. This is the credited edition's literal timing, not a silently normalized alternative bar count or claim of urtext correctness.

D minor → D major → D minor is preserved; source-comment bars133/209 begin at beats395/623. Source **violin sounding** range G3–G6 (55–91) is intentionally lowered12 semitones to G2–G5 (43–79). This is an authorized whole-score octave transposition, **not** guitar notation-octave correction. No individual low/high notes are shifted separately, removed, or shortened. Audition quarter=60 is a fixed choice (12m50s); source contains no explicit tempo.

**Arpeggio limitation is intentional and visible:** the text `arpeggio` at source-comment bars89 and201 is not an encoded running-note pattern. We keep the written notes literally, e.g. the held D/F/A chord at beat264 and the written onset at599. Written-out32nd/16th-note figures elsewhere are retained exactly. We do not invent repeated broken-chord patterns from a commercial arrangement, and do not claim a performance realization of the implied arpeggios. Chords in these passages sound simultaneously/held according to the written durations unless users separately apply app playback settings; the generic strum control is not a historically verified realization. The selection's edition label, source metadata and exported JSON explicitly say the arpeggio instructions are unexpanded. The trill sign and expressive fermata/bowing/dynamics are also not interpreted; app articulation remains separate.

## Guitar feasibility and playback limits

Necessary assignment screening retains each event on its string for the entire source duration, standard6 strings E2 A2 D3 G3 B3 E4, frets0–19: a valid assignment exists, peak4 simultaneous notes. With an additional conservative non-open fret-spread<=4 restriction, the first failure is beat491.5 (two overlapping A3 voice events). Neither screening proves human fingering, barre/hand movement feasibility or a finished classical-guitar arrangement. No tuning settings changed; no voice removed to force a pass.

`playback-audit.json` records this piece's actual app-scheduler audit using a deterministic mocked AudioContext and real sample durations. All3123 events are scheduled in each preset. Pluck and standard520R: no forced voice stealing or sample exhaustion before gate. Soft Pad reclaims801 release tails; whole-shell preset reclaims1578 tails and has16 natural sample endings before gate. These are reported limitations, not fixed here. The new source does not change engines. The default classical-guitar520R path passed, but there is no physical-device or acoustic listening guarantee.

## Checks / reproduction

```
python scripts/import_bwv1004_chaconne.py --lilypond /path/to/lilypond-2.24.4/bin/lilypond
python -m unittest discover -s scripts -p 'test_bwv1004_chaconne.py'
node --test synth-demo/repertoire*.test.cjs synth-demo/bach-1012.test.cjs synth-demo/bwv100*-*.test.cjs synth-demo/catalog-playback.test.cjs
python -m http.server 8774 --bind 127.0.0.1
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_bwv1004_chaconne_browser.cjs http://127.0.0.1:8774/synth-demo/
```

Without `--lilypond`, importer uses vendored MIDI without network/compiler. Official convert-ly and LilyPond2.24.4 compile all five files without warnings. Python2 tests pass (source pins, four-voice union, pitch-only transposition, beginning/arpeggio/final-chord checkpoints, whole length, source markings, string limits). Related Node12 test files pass, including all50 original fingerprints, full51-song schedules and extra Chaconne2-loop/seek-from623 tests. The long-score test verifies every onset/pitch/gate and checkpoints0/264/395/599/623/767 rather than merely starting playback.

Chromium passes51 choices/13 groups, name/opus search, all3123 piano-roll positions including final unison,770-beat transport endpoint, license/limitations display, actual JSON download/import and persisted metadata via the latest shared-menu UI. Browser playback is a start/endpoint smoke check; full-length coverage comes from the deterministic clock audit. Other existing browser scripts had catalog counts updated only; their older menu selectors were not migrated as part of this data task.

Known Actions API network403 was not retried or bypassed. The public source download succeeded via the approved raw GitHub host; the web reader's `.ly` content-type error was format support, not a network-policy denial. No source acquisition blocker remains. This is a local full-score candidate with the above explicit realization/fingering limitations, awaiting separate publication approval.
