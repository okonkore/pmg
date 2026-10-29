# 既存Nylonテスト10件の修復

対象は現行画面・Workerから利用できるNylon Guitar。不要と判断したテストはなく、
全28ファイルを保持した。製品のNylon音響コード、承認JSON、音色設定は変更しない。

## 各失敗の扱い

| ファイル（`synth-demo/`） | 修復と保持した保証 |
| --- | --- |
| `nylon-brightness.test.cjs` | VMに必要な `nylon-body-fit.js` を追加。旧モデルとのD3第8倍音増加、低域/F#4維持の数値条件はそのまま。 |
| `nylon-treble.test.cjs` | 同じ依存読み込みを追加。低音の倍音差1.2dB以内、F#4第5/6倍音と後期高域の減衰条件を保持。 |
| `nylon-preparation-cancel.test.cjs` | `guitarPreparation` と `setGuitarLoading` のVM依存を定義。停止時の待機解消、旧Workerエラー無視、交換Worker保持、真の失敗時の後始末を維持し、loading解除も確認。 |
| `nylon-reference-tone.test.cjs` | OFF波形を固定した3587693の実装で同一エンジン再生成し全サンプル比較。初期エネルギー、平弦機構、F#4減衰、全音域/Worker条件を保持。 |
| `nylon-wound-release.test.cjs` | 022fb83のリリース実装との全サンプル比較。第7弦は固定参照の旧OFF設定との差を確認。最初25ms、生エネルギー、放射収支、スイッチ、UI条件を保持。 |
| `nylon-third-tone.test.cjs` | 旧G3を022fb83の実装と比較。高次倍音の周波数/振幅、低次倍音抑制、エネルギー、他弦/OFFの同一性を保持。 |
| `nylon-third-approved.test.cjs` | WorkerのG3を70f60f4、変更されない他弦を022fb83と比較。両サンプルレートとUI採用条件を保持。 |
| `nylon-first-tone.test.cjs` | 旧第1弦/他弦は022fb83、採用済みG3は70f60f4と比較。E/F#/A倍音条件、時間発展、受動性、OFF条件を保持。 |
| `nylon-second-tone.test.cjs` | 他弦をea71262の採用済み実装と比較。B3〜D#4の変化、補間の範囲、受動性、OFF/UI条件を保持。 |
| `nylon-worker-responsive.test.cjs` | 非同期出力を022fb83の固定参照および現在の同期出力と全サンプル比較。CPU譲渡、FIFO、同時ジョブ最大1を保持。 |

## なぜ固定PCMハッシュを置き換えたか

以前の監査で、失敗する代表波形は導入時コミットと現在で同一エンジンの全サンプルが一致。
Node/Chromium間ではわずか1〜3サンプルの丸め差でもSHA全体が変わった。
G3/B1では別エンジンが旧ハッシュに一致する事例もあった。一方、E2/F#4の一部は
履歴へ戻しても両エンジンで旧ハッシュを再現できず、元の生成環境は特定できていない。

したがって、現在の波形を新しい承認ハッシュに登録するのではなく、既存リリースの
**ソース**を固定参照にした。4コミットのGit blobを無改変で取り出し、同一ファイルを
重複排除した11ファイル（約100KB）と完全なコミットID/元パス/SHA-256を保存。
`nylon-history-helper.cjs` は整合性確認後、独立VMで評価する。
浅いcloneやソースアーカイブでも参照ソースは揃い、実行中のGit/ネットワークは不要。
参照ソースは現在の実装をimportせず、現在の実装も参照ソースを利用しない。

許容誤差は追加しない。**全Float32サンプルのバイト一致**を求める。
同じエンジンで両実装を動かすため、エンジン依存のMath丸めを共有しつつ、
リリースからの実装・出力の変化を検出できる。1 ULP変更・切り詰め・未固定参照の
拒否を `node scripts/test_nylon_history_reference.cjs` で検証した。

保証は「固定リリース実装からの回帰なし」であり、元の試聴承認PCMの完全回収ではない。
参照と現行に共通するモデル上の問題は、この比較だけでは発見できない。
そのため既存の独立した倍音・減衰・エネルギー・非同期動作の条件も保持した。
旧 `nylon-*-approved.json` は履歴資料として無変更で残す。

## 再現・証拠

- 全Node検証：`TESTING.md` の全 `synth-demo/*.test.cjs` 実行例。
- 参照の説明と固定コミット：`synth-demo/test-fixtures/nylon-history/README.md` / `manifest.json`。
- UI、楽曲、configured-guitarも独立して検証。実行手順は `TESTING.md`。

比較対象をHEADで再生成してテストを緑にする運用は禁止。意図した製品音の変更なら、
変更理由と既存数値条件への影響をレビューしてから固定参照の更新を検討する。

## 最終結果

- `synth-demo/*.test.cjs`：**28/28成功、失敗0、削除0**。
- ブラウザ5コマンド成功：repertoire、touch fields、configured UI、parallel pool、configured integration。
- WASM coefficients、configured physics、固定参照mutation test、repertoire Python、BWV1012 Pythonも成功。
- `git diff --check` 成功。固定参照11ファイルを元のGit blobと照合。
  製品Nylon/physical/configured音響ソース・WASM・承認JSONはHEADと同一。

ここに記載した時間は他の検証とのCPU競合を含み、演奏/準備速度のベンチマークではない。
実機iPhoneや実ギター録音との比較は今回のテスト修復の対象外。
