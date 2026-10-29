# C++ coefficient module notices

`coefficients.wasm` includes unmodified Eigen 3.4.0 headers, primarily under
MPL-2.0, with applicable BSD/MINPACK notices alongside this file. The build defines
EIGEN_MPL2_ONLY. No Eigen headers have been modified. The corresponding source is
available from https://gitlab.com/libeigen/eigen/-/tree/3.4.0 and the complete
archive https://gitlab.com/libeigen/eigen/-/archive/3.4.0/eigen-3.4.0.tar.gz .

The compiler is the official WASI SDK 34.0:
https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-34 .
Pinned SDK submodules: LLVM `895aa2c896ada719451be2e3673c83da8ddf1141`,
wasi-libc `2e6fb9d8ee0cdf9e431fbcabe8af3115de000a13`.

Its C++ runtime/compiler builtins use the Apache-2.0 license with LLVM exceptions;
wasi-libc is multi-licensed and includes musl (MIT) and dlmalloc (CC0) components.
The applicable license texts and notices are included here. The source code for
this application's coefficient calculations is `../cpp/coefficients.cpp`.

The JavaScript `ml-matrix` package remains an unmodified MIT-licensed reference
backend for tests; the production coefficient worker does not load it.
