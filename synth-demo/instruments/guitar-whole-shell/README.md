# Webアプリ組み込み用・最新Bの凍結音源

2026-10-28。今週の音の追求はユーザー指示で終了。追加の物理検証・音変更は行わない。
聴取評価: 「まだ打撃音は目立って聞こえる」「弦の音色が格段に良くなった」。打撃音改善とは扱わない。

## すぐ使う

このフォルダ全体をWebアプリの静的ファイルとして配置する。外部パッケージ不要。
HTTPで `demo.html` を開けばE4を再生できる。file://での実行は避ける。
`e4.wav` は公開比較whole-shellのBとバイト単位で同一。追加の加工・音量調整なし。
`conditions.json` に計算条件と未解決の検算結果、`manifest.json` に音声仕様とSHA256。

```js
import { loadGuitar } from './instruments/guitar-whole-shell/instrument.js';
const context = new AudioContext();
// ボタン等のユーザー操作内で呼ぶ。特にiPhoneでは必須。
await context.resume();
const guitar = await loadGuitar(context);
guitar.play({ midi: 64 }); // E4: オリジナル
// guitar.play({ midi: 60, gain: 0.7 }); // C4: 簡易移調
```

loadGuitarは起動時に一度読み込み、各ノートではplayを呼ぶ。複数同時発音可。
戻り値はAudioBufferSourceNodeで、必要ならstop()できる。自然減衰の単音で、ノートオフ包絡は未実装。
同時発音時の全体音量は組み込みアプリのミキサーで管理する。

## できる範囲

これは最新音のサンプル再生版。リアルタイム物理エンジンの移植ではない。
基準は単線E4の1サンプル、約2秒。録音サンプルをフィットした音ではなく、物理モデルから生成した音。
移調すると弦だけでなくボディの共鳴・減衰時間も変わる。E2や巻弦の正しい再現には別の物理計算/サンプルが必要。
gainは再生音量であり、弦の引く力を物理的に変えるものではない。
2秒以降の尾は収録されず、共通の末尾30msフェードがある。無限サステインやループ素材ではない。
外部の実機参考録音はこのパッケージに含めない。

## 物理モデルを移植する場合の入口

リポジトリ: `/home/okonkore/projects/pmg/楽器/楽器`
研究場所: `experiments/string-v2/`（大部分は未追跡のローカルファイル。別マシンへGit cloneするだけでは揃わない）。

- `prototype-footprint-whole-instrument.py --layers=8 --p2-mortar --request=600`: 連成モデル構築
- `results/footprint-whole-held-p2mortar-p2-l8-o6-r600.npz`: 極・留数と生成波形
- `results/footprint-whole-state-footprint-p2mortar-held-p2mortar-p2-l8-o6-r600.npz`: 全状態モデル
- `validate-footprint-whole-wave.py --request=600`: 波形検算
- `render-footprint-whole-comparison.py --request=600`: 比較WAV生成
- `ITERATION-169-HARMONIC-LOAD-COMPARISON.md`: 最新計算の説明
- `NEXT-ACOUSTIC-STEP.md`: 研究経緯と未解決点（最新は末尾）

Python側はNumPy/SciPyが必要。現環境はWindows Python＋WSL上のデータを使用。
再計算は重いため、アプリ組み込みだけならWAV＋JSを利用し、研究スクリプトを起動しない。

最新B: 全体3565状態、構造512形、内部空気256形、外部縮約756形。動的な弦は1本。
高域の数値精度は未解決（独立3500Hzの相対誤差142%等）。全帯域精度・完成ギター音源とは認定していない。
採用研究基準positive-holeは変更せず、最新Bは弦音の聴取基準として保存。
既存の `synth-demo/physical-string-worklet.js` は別段階のエンジンであり、この最新Bと同じ実装とは扱わない。

## 次のチャットへの依頼文

「synth-demo/instruments/guitar-whole-shell/README.mdを読み、最新Bの音源をWebアプリへ組み込んでください。
音の研究は今週停止中です。まず同梱WAVをそのまま使い、移調の限界を踏まえて組み込んでください。
編集前にgit statusを確認し、既存変更を上書きしないでください。」
