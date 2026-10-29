#!/usr/bin/env bash
set -eu
# Use an external compiler/header checkout; no toolchain is shipped to clients.
# Reproduction tested with WASI SDK 34.0 and Eigen 3.4.0.
: "${PMG_WASI_SDK:?Set PMG_WASI_SDK to the WASI SDK directory}"
: "${PMG_EIGEN:?Set PMG_EIGEN to the Eigen source directory}"
root=$(cd -- "$(dirname -- "$0")/.." && pwd)
"$PMG_WASI_SDK/bin/clang++" \
 --target=wasm32-wasip1 -O3 -msimd128 -DNDEBUG -DEIGEN_DONT_PARALLELIZE -DEIGEN_MPL2_ONLY \
 -std=c++17 -fno-exceptions -fno-rtti -I"$PMG_EIGEN" \
 "$root/synth-demo/instruments/configured-guitar/cpp/coefficients.cpp" \
 -mexec-model=reactor -Wl,--initial-memory=16777216 -Wl,--max-memory=268435456 \
 -Wl,-z,stack-size=2097152 -Wl,--strip-all \
 -Wl,--export=allocate -Wl,--export=deallocate -Wl,--export=last_error \
 -Wl,--export=initialize_body -Wl,--export=prepare_coefficients \
 -Wl,--export=result_data -Wl,--export=result_size -Wl,--export=result_metadata \
 -o "$root/synth-demo/instruments/configured-guitar/coefficients.wasm"
