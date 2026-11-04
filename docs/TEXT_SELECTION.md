# Display text selection

Local change based on published `e19b2dba02f0cf273ca9f249533ace23165a0e5f`.
`index.html` loads `text-selection.css` for both default and v2 presentation.
The universal rule covers static text and dynamically created dialogs, including
instrument preparation. `-webkit-user-select: none` and
`-webkit-touch-callout: none` address WebKit selection/callouts; the standard
`user-select` property is also present.

Inputs, native selects, textareas (including readonly TAB export), and
`:read-write` editing hosts/descendants keep selection and native editing menus.
A nested `contenteditable=false` region stays nonselectable. No touch, pointer,
contextmenu or keyboard event interception is added. Existing touch-action,
scrolling, viewport/zoom and score-editing policies are unchanged.

Serve synth-demo on port8803. With `PMG_BROWSER_EXECUTABLE=/usr/bin/chromium`:
- `node scripts/test_text_selection.cjs`: default/v2 preparation heading double
  click and emulated long press do not select; text replacement, readonly copy,
  nested editing and noneditable islands pass without page errors.
- `node scripts/test_touch_fields.cjs http://127.0.0.1:8803/`: passes native field
  selection, long presses, note creation/move/resize/cancel/undo, keyboard release,
  modal cancel, viewport width and zoom-permitting metadata checks.
- `node scripts/test_range_selection.cjs`: passes touch range selection,
  copy/paste, group move, Undo/redo, cancellation and legacy reload.

These are Chromium mobile emulation checks, not real iPhone Safari or native
pinch/selection-handle verification. A WebKit binary and physical iPhone are not
available in this environment. These checks describe local pre-publication verification.

Additional `test_resize_grip.cjs http://127.0.0.1:8803/` did not complete:
line11's post-zoom grip check got a null bounding box and failed reading width.
A control run serving an empty text-selection stylesheet failed at the same
point. This dedicated grip regression is unresolved independently of the new
CSS; the general touch-field test above did pass note resizing. Its first launch
used the test's default port8805 and was corrected to the active port8803.
