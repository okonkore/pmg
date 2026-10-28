# ブラウザ計算版・物理ギター

現在の C 緩和＋保存的な幾何学的張力変化モデルのブラウザ移植です。
`demo.html` は独立した演奏ページです。既存アプリと既存の音源は変更していません。

## 組み込み

HTTPS または localhost から配信してください。ビルド用サーバー、Pythonサーバー、外部CDNは不要です。このフォルダ全体を同じ配置で配信します。

```js
import { loadPhysicalGuitar } from './instruments/physical-guitar/instrument.js';
const context = new AudioContext({ sampleRate: 48000, latencyHint: 'interactive' });
// ユーザーのクリックなどの操作から呼び出す。
await context.resume();
const guitar = await loadPhysicalGuitar(context, {
  destination: context.destination,
  mode: 'auto', // 'buffered': 端末内の事前計算、'realtime': リアルタイムを指定
  onStatus: event => console.log(event),
});
await guitar.prepare('e2'); // 'sixth-fret10', 'fourth-open' も選択可能
await guitar.play({ scale: 1 });
// guitar.stop();
// guitar.dispose(); // Worker・音声ノードを解放
```

単音版です。`prepare()` は係数を取得・SHA-256確認し、Workerで速度を測ります。AudioWorkletの処理予算に65%以内で収まる場合のみ自動的にリアルタイムを選びます。それ以外ではWorkerが端末内で計算し、生成したAudioBufferを再生します。画面でもリアルタイムを直接選択できます。測定は処理能力の目安であり、他アプリの負荷変動を保証するものではありません。

`scale` は初期の変位状態全体の倍率（APIは0.25〜2、画面は0.5〜2）。弾く力の再指定や、その力に対する非線形静的釣り合いの再計算ではありません。標準状態は従来と一致します。再生は50秒、途中停止は操作に応じた停止です。自然減衰への末尾フェードはありません。事前計算版の `seconds` は短いプレビューに使えます。リアルタイム版は50秒まで発音します。

同条件の再生は、ブラウザが作ったAudioBufferを最大3件再利用します。WAV/録音の取得、サンプル移調はありません。メモリに保持する係数は1モデル約8MBです。ブラウザの実行時メモリは係数サイズより大きくなります。

## 計算の範囲

- 行列組み立て・固有分解・初期釣り合いはPythonで準備。`.bin` は音声でなく極・固有座標・力の入出力行列・初期状態です。
- 発音時はブラウザがすべての書き出されたモードと125の非線形ポートを時間積分します。線形の弦・ボディ・内部空気・外部放射・Maxwell緩和の結合を保持します。
- 既に消えた振動の極小値による演算の低速化を避け、状態の絶対値1e-200未満をゼロ扱いにします。音色の減衰ではなく浮動小数点の処理です。
- 精度を保つため状態とカーネル計算はFloat64。SIMDは2個のdoubleをまとめた演算です。
- 高速経路：4出力サンプルごとの指数中点法。非線形Q/B結合を、各ポートの最大複素係数に対する0.03の相対許容値で対にして疎化します。全モードの線形自由振動と音圧読み出しは残します。これは数値近似で、元の非線形作用を厳密に同一に保つとの主張ではありません。
- `reference: true, sparseTolerance: 0` のエンジン設定は従来のサンプル単位の対称キックを再現します。遅いため演奏画面では使用しません。
- 12秒以降はその時点の状態を保持して線形自由減衰へ移ります。従来の50秒版と同様に小さくなった非線形作用を省く近似です。音色用の減衰やフェードではありません。
- 元モデルの幾何・芯の推定・物性・押弦接触・高周波放射精度の制限も引き継ぎます。任意の材料や音高の行列をブラウザで再構築する版ではありません。

## 検証と再現

`validation.json` に3標準状態の参照波形との差、非線形成分の誤差、物理エネルギーのサンプル検査、末尾の上限値を保存します。時間積分・疎化を合わせた差です。サンプル間のエネルギー単調性や、任意のモデル・強い初期変位に対する一般的な誤差保証ではありません。

- `scripts/export_physical_guitar_models.py`：既存の全モデルをパッケージ
- `scripts/build_physical_guitar_wasm.py`：標準Pythonだけでカーネルを生成（追加コンパイラ不要）
- `scripts/audit_physical_guitar_browser.cjs <id>`：WASM版50秒・状態と厳密参照を生成
- `scripts/validate_physical_guitar_browser.py`：元のC++結果との波形・エネルギー検証
- `scripts/test_physical_guitar_browser.cjs`：実EdgeのWorker/AudioWorklet一致、キャンセル、生成キャッシュ、画面ダイアログを検証

現時点の実測精度は48kHz・標準初期状態に対するものです。強い初期変位は新しい比較条件として確認が必要です。
