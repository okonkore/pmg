# V2 range selection candidate

Base: 5a1bcd4449befa3ce744b573e3b5d75f99f2244b. Local only; no publication.

In V2, open the tool chooser and choose **範囲**. Drag a rectangle from blank space or an unselected note to select intersecting visible notes. Drag a selected note (including its right edge in this mode) to move the entire selection. Starting a new rectangle replaces selection; desktop Shift adds to it. The ordinary selection/pencil/pan tools retain their existing behavior. Range mode disables double-tap deletion. Use the pan tool to scroll; two-finger grid zoom remains available and cancels an unfinished edit/rectangle.

The **N音 / コピー** button opens internal copy/paste controls. Copy uses memory in this page, without OS clipboard access; it survives song and view changes but not reload or switching UI entry pages. Paste places the earliest copied onset at an explicit quarter-note beat offset (0 is the song start), or the current playback cursor. Repeated paste uses the same destination and creates distinct IDs. All relative timing, pitches, durations, velocities and string metadata are retained. Paste does not reassign strings to the currently visible layer; it switches to All if necessary to show pasted notes.

Each paste or completed group move is one Undo step. Moves clamp the whole group at timeline/pitch bounds. Invalid string/fret/tuning assignments reject the whole operation with the existing validation message; no assignment is removed silently. Same-string overlaps retain the existing warning/playback semantics. Copies from another song are validated against the destination tuning. Existing note-count and timeline limits still apply.

Selection is limited to visible notes on the active layer. Same-pitch unisons on different strings remain independent notes. Pointer cancellation, lost capture, second-finger interruption and leaving the editor discard an unfinished drag; canceling a rectangle restores its previous selection. There is no edge auto-scroll during rectangle/group dragging in this milestone: pan/zoom first to frame the desired area. Fractional timing is translated without decimal quantization.

Tests: `scripts/test_range_selection.cjs` (default server port 8803), existing `test_ui_v2.cjs`, `test_editor_gestures.cjs`, model/string-layer tests. Chromium mobile emulation and keyboard shortcuts only; actual iPhone Safari is not verified. Shared storage formats, synthesis and factory scores are unchanged.
