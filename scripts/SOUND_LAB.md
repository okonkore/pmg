# PMG 音源実験室 — 独立ページ

初期検証基準: `4c823d26915b7934faf64e9eafac9903e98c438c`。公開版の統合基準: `e8765a4839c8af4a24de4cf5811da1df9c7be8ba`。
公開範囲はこの実験室のみ。
本体のindex、app-shell、音源、設定、曲一覧には変更を加えない。
本体に組み込む調弦UIやA/B候補は含めない。

## 公開経路

専用URL: `https://okonkore.github.io/pmg/sound-lab/`。
同じPagesの静的artifactに `synth-demo/sound-lab/` をコピーするだけでよい。
既存ファイル変更は `.github/workflows/pages.yml` のコピー1行だけ。
本体からのimportやリンク追加はない。本体から独立した専用ディレクトリとこの1行だけをmainへ追加する。

同一originのHTTPキャッシュで既存WASM・body/default資産を読み取り共有するが、準備済み音のIndexedDB・本体localStorageには接続しない。実験PCMは専用RAMキャッシュのみで、reloadで消える。別URLは別originではないが、この実装に本体設定の読み書きはない。

## 比較の意味

- **A 現行モデル・瞬時解放**: 既存エンジンのblock4、sparse .03、linearAfter12。通常WorkerがPCM24へ保存する前のFloat32出力と一致する。
- **B 候補・有限時間解放**: 同じ初期状態から規定力を0.513msまたは2msの半余弦で解放。指・爪の接触モデルではない。
- **C 共通計算の瞬時解放**: 説明欄の補助ボタン。Bと同じ積分精度・handoffを使い、外力だけ初時刻から0にする。AとBには積分条件の差もあるため、C対Bで解放時間の影響を分離する。

固定条件: 既存520R推定条件、650mm、ブリッジから80mm、1.5457651114447049N、標準調弦、E2の6弦またはE4の1弦、48kHz、各0.5秒。
再生は3条件ともgain0.65と同じ12ms終端fade。ピーク正規化・EQ・音高補正はしない。本体のPCM24量子化・エフェクト・コンプレッサーを通らないため「本体演奏をそのまま録音した音」ではない。実機GC12Sや『本物の音』として校正・認定していない。

試聴タップまでAudioContextを作成しない。準備はA→C→Bの順で最大1Worker、3音すべて成功して初めて比較を交換する。失敗・取消・背景移動・pagehideではWorkerを終了し、古い応答を無視する。失敗・取消前の完全な比較は保持する。閉じたページの結果を再利用しない。

## 計算コストと初版の範囲

このexecutorの初回UI計測では、3条件の準備がE2約27.3秒、E4約24.5秒（0.513ms、0.5秒）。端末依存であり、iPhoneの推定値ではない。準備中に進捗・経過時間を表示する。
まず検証済みの短いE2/E4を対象とする。フレーズ・650/700mm比較・全88音生成は初版に追加しない。特に多音フレーズは条件数×音数の計算費用と割込みを別途検証する必要がある。2msは安全側のfine積分を使い、最適化の適用条件を広げない。

## ファイルと依存

`sound-lab/index.html` / `lab.css` / `lab.js` と `runtime/` 内の実験エンジン・Worker・controllerを新規追加。
旧統合候補から実験モジュールをコピーし、読み取り資産への相対importを変更した。`lab-comparison.js` が現行Aと既存のC/Bペアをまとめて原子的に確定する。通常のbankはimportしない。既存のcoefficients.wasm、kernel.wasm、body-library、default-settings、production engineは変更しない。

## 再現と検証

```sh
# checkout root
python3 -m http.server 8775 --bind 127.0.0.1
# 別terminal。既存Playwrightを使う。
export PMG_BROWSER_EXECUTABLE=/usr/bin/chromium
node scripts/test_sound_lab_numerics.cjs
node scripts/test_sound_lab_worker.cjs
node scripts/test_sound_lab_ui.cjs
node scripts/test_app_shell.cjs http://127.0.0.1:8775/synth-demo/
```

- 数値テスト: 実WorkerでAを既存エンジンとPCM完全一致、Cを独立に組んだfine/block2スケジュールと完全一致、C/Bの外力差、2ms fine fallback、途中失敗・取消で旧比較保持。
- Workerテスト: finite/default直接計算との一致、資産ゲート、入力上限、RAMキャッシュ、返却PCMの分離、再要求、timeout、dispose、実際の通常bankのactive・IndexedDB sentinel保持。開始17Worker全て終了。
- UIテスト: 実E2/E4生成、準備連打、共通gain、停止、HTTP失敗→再試行、取消、遅延応答、背景化中の遅延resume、pagehide、ナビゲーション、モバイル幅。本体から実験コードを取得しないこと、labのStorage書込み0・IndexedDB open0を確認。
- Pagesと同じコピー配置でも `test_sound_lab_ui.cjs http://127.0.0.1:8776/sound-lab/` を実行。公開URLにアクセスした結果ではない。

ログ `/workspace/pmg-sound-lab-logs/`。Chromiumのモバイル模擬であり、実機iPhone Safari、自動音声割込み、端末速度は未検証。本体の既存ファイルが不変であることもdiffで確認する。

最終結果: 数値、Worker、source配置UI、Pages配置UI、本体app-shellの5コマンドすべて成功。Pages配置の追加計測はE2約25.2秒、E4約23.2秒。`git diff --check`成功、既存synth-demo追跡ファイルは基準commitと同一。過去3候補の全ファイルSHA256も維持した。

公開統合検証（e8765a4上）: 関連16コマンド成功。実験室3検証、Pages配置UI、最新本体のapp-shell・音量/reverb・生成表示・停止・configured UI/実Worker・38曲browser・sequencer/playback/timing・batch6・全38曲×4音源のスケジュールを確認。本体の既存ファイルはすべて不変。実機iPhoneの検証は含まない。
