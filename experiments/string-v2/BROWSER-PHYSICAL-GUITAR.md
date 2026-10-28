# Browser migration — 2026-10-29

Implemented independent browser app and reusable API at synth-demo/instruments/physical-guitar/. E2 plus sixth-fret10 and fourth-open D3 coefficient models copied byte-for-byte from approved exports; no WAV inputs, no pitch shifting. Full 1948 retained complex/real modes, 125 nonlinear ports. Float64 SIMD WASM generated with standard Python; no software/toolchain installation.

Fast integration: exponential midpoint four output samples, paired nonlinear Q/B sparsity tolerance .03, unchanged full linear propagation and output, stored-state linear continuation after 12 s, 50 s total. Underflow guard 1e-200 avoids catastrophic denormal slowdown. Reference sample-wise symmetric kick path retained for comparison. No EQ, onset alteration, sound-specific damping or harmonic adjustment.

48 kHz / standard initial states: first15s waveform relative differences E2 .0289%, sixth-fret10 .0510%, fourth-open .0734%; nonlinear correction errors 1.09%, 1.24%, 2.25%. Sampled physical energy decreases in all3. Terminal pressure bounds -121.25, -134.07, -158.21 dBFS. Reference20ms path differs from native by ~3.5e-8 relative. See public validation.json. Strong initial scaling and other rates have no generic error guarantee.

AudioWorklet generates ongoing audio when Worker benchmark p95 <65% quantum budget; otherwise Worker computes on the device before playback. No server computations. One active voice, three prepared configurations, no main keyboard/sequence integration yet. Offline matrix assembly/eigenbasis remain Python. Initial-state displacement scaling differs from specifying a new force and solving its static equilibrium.

Real Edge: Worker and offline AudioWorklet waveforms identical; actual live API start and model switch passed. Cancellation, generated-buffer reuse, mobile dialog, no audio-file requests verified. Preexisting six edited tracked files left unchanged.
