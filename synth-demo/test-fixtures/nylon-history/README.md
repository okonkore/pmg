# Immutable Nylon release source references

These are exact Git blobs from existing PMG release commits, **not newly approved
PCM rendered from the working tree**. `manifest.json` records full commit IDs,
original paths and SHA-256. Common blobs are deduplicated. No Git checkout/network
is needed during tests, including shallow clones and source archives.

| Reference | Release commit | Contract retained |
| --- | --- | --- |
| reference | 3587693 | Reference-tone OFF preserves the preceding implementation |
| wound | 022fb83 | Released wound strings and unchanged plain path |
| third | 70f60f4 | Released G3, before first/second-string changes |
| plain | ea71262 | Adopted first/third/wound strings while second-string option changes |

`nylon-history-helper.cjs` verifies source integrity, evaluates the historical
model in an isolated VM, and compares every Float32 sample byte in the **same
JavaScript engine** as the current model. No numerical tolerance is introduced.
A changed waveform, including a one-ULP change, still fails. Current and reference
implementations do not import one another. Existing energy, envelope, harmonic,
OFF-path, worker ordering/yield and UI assertions remain.

The original approved-*.json files are retained unchanged as historical records.
Some original hashes depend on Node/Chromium Math rounding: one G3 sample differs
by 1.46e-11, B1 by 1.82e-12 in the audited runtimes. Some E2/F#4 historical hashes
remain unreproducible in both runtimes even at their release source; the original
recording environment is unknown. This method asserts **no regression from the
pinned release source**, not recovery of every historical listening approval's
exact PCM. It does not certify realistic guitar sound. Tests still preserve the
specific acoustic/physical assertions that accompanied those releases.

To verify provenance in a checkout containing history:

```sh
# Substitute each manifest commit/path and compare its SHA-256 with the manifest.
git show 022fb83:synth-demo/nylon-bridge-model.js | sha256sum
node scripts/test_nylon_history_reference.cjs
```

Do not regenerate these files from HEAD to make tests pass. Any intentional sound
change needs a separately reviewed reference change; retaining matching current
and historical implementation bugs is a limitation of regression testing.
