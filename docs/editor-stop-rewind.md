# 編集画面の停止／先頭へ戻るボタン

再生中は同じボタンが「停止」、停止中は「先頭に戻る」として動く。途中停止では現在位置を保持し、次に押すと位置と横スクロールを先頭へ戻す。先頭に停止中に押しても再生しない。自然終了、ループ、他の停止操作も共通のtransport状態から表示を更新する。既存の独立した先頭ボタンや演奏画面の停止操作は維持。

従来UIではアイコンと短いラベル、V2ではアイコンを表示する。どちらにも状態に応じたaria-labelとtitleを付け、アイコンの幅と折返しを固定して位置ずれを防ぐ。保存データ・音響モデル・テンポ計算は変更しない。

検証コマンド（別途リポジトリをHTTP配信）:

- `PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_stop_rewind_browser.cjs http://127.0.0.1:8779/synth-demo/`
- `PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_ui_v2.cjs http://127.0.0.1:8779/synth-demo/`
- `node synth-demo/playback-timing.test.cjs`
- `node synth-demo/tempo-changes.test.cjs`

停止／先頭ボタンのテストは従来UI・V2双方でタッチ、途中再生と停止、自然終了、ループ境界、外部の停止、先頭停止中、ボタン位置、アクセシブル名、保存データの不変性を確認する。iPhone Safari実機は未検証。
