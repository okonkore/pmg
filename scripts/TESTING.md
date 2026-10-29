# 安定版の検証

リポジトリのルートで実行する。Node.js24、Python3、Playwright1.62.1とChromium154で確認。
Windowsの固定パスは不要。別環境ではPlaywrightと対応ブラウザを用意する。

```sh
export PMG_BROWSER_EXECUTABLE=/usr/bin/chromium
node scripts/test_guitar_parallel_pool.cjs
node scripts/test_configured_guitar_ui.cjs
node scripts/test_configured_guitar_integration.cjs
node scripts/test_guitar_wasm_coefficients.cjs
node scripts/test_configured_guitar_physics.cjs
node scripts/test_nylon_history_reference.cjs
python3 scripts/test_repertoire_batch1.py
python3 scripts/test_bwv1012.py
```

`PMG_PLAYWRIGHT_MODULE` でPlaywrightのパス、`PMG_BROWSER_CHANNEL` でブラウザchannelも
指定可能。channelとexecutableは同時指定不可。上のブラウザ3本はサーバーを自動起動/終了。
数値レポートはgitignoreされた `test-results/configured-body/` へ保存する。

全28Nodeファイル（失敗しても全件確認）：

```sh
python3 - <<'PY'
from pathlib import Path
import subprocess
results=[(str(p),subprocess.run(['node',str(p)]).returncode) for p in sorted(Path('synth-demo').glob('*.test.cjs'))]
for name,code in results: print(code,name)
raise SystemExit(any(code for _,code in results))
PY
```

楽曲とタッチのブラウザ確認は別ターミナルで `python3 -m http.server 8766` を起動後：

```sh
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_repertoire_browser.cjs
PMG_BROWSER_EXECUTABLE=/usr/bin/chromium node scripts/test_touch_fields.cjs
```

曲数22、JSON出典/ライセンス、末尾休符、終端編集、鍵盤/ノート操作を確認する。
モバイルChromium模擬であり、実機iPhone Safariの検証ではない。
Nylonの固定リリース参照と旧テスト修復の根拠は `NYLON_TEST_REPAIR.md` を参照。
物理モデル・製品WASM・承認JSONは変更せず、音響研究用コード/音声はこの安定版に含めない。
