(() => {
  const canvas = document.querySelector("#stage");
  const ctx = canvas.getContext("2d");
  const playButton = document.querySelector("#playButton");
  const undoButton = document.querySelector("#undoButton");
  const clearButton = document.querySelector("#clearButton");
  const muteButton = document.querySelector("#muteButton");
  const settingsButton = document.querySelector("#settingsButton");
  const settingsDialog = document.querySelector("#settingsDialog");
  const settingsCloseButton = document.querySelector("#settingsCloseButton");
  const zoomOutButton = document.querySelector("#zoomOutButton");
  const zoomResetButton = document.querySelector("#zoomResetButton");
  const zoomInButton = document.querySelector("#zoomInButton");
  const songMenuButton = document.querySelector("#songMenuButton");
  const songMenu = document.querySelector("#songMenu");
  const songMenuRoot = document.querySelector("#songMenuRoot");
  const songSaveView = document.querySelector("#songSaveView");
  const songOpenView = document.querySelector("#songOpenView");
  const songExportView = document.querySelector("#songExportView");
  const songImportView = document.querySelector("#songImportView");
  const duplicateDimensionMenuButton = document.querySelector("#duplicateDimensionMenuButton");
  const duplicateDialog = document.querySelector("#duplicateDialog");
  const duplicateCloseButton = document.querySelector("#duplicateCloseButton");
  const duplicateSourceLabel = document.querySelector("#duplicateSourceLabel");
  const duplicateMeasureSelect = document.querySelector("#duplicateMeasureSelect");
  const duplicateDimensionSelect = document.querySelector("#duplicateDimensionSelect");
  const duplicateApplyButton = document.querySelector("#duplicateApplyButton");
  const duplicateDialogStatus = document.querySelector("#duplicateDialogStatus");
  const overwriteSongButton = document.querySelector("#overwriteSongButton");
  const songSaveMenuButton = document.querySelector("#songSaveMenuButton");
  const newSongButton = document.querySelector("#newSongButton");
  const openSongMenuButton = document.querySelector("#openSongMenuButton");
  const exportSongButton = document.querySelector("#exportSongButton");
  const importSongButton = document.querySelector("#importSongButton");
  const songImportInput = document.querySelector("#songImportInput");
  const chooseImportFileButton = document.querySelector("#chooseImportFileButton");
  const importTextButton = document.querySelector("#importTextButton");
  const importJsonInput = document.querySelector("#importJsonInput");
  const exportFileName = document.querySelector("#exportFileName");
  const downloadExportButton = document.querySelector("#downloadExportButton");
  const copyExportButton = document.querySelector("#copyExportButton");
  const exportJsonOutput = document.querySelector("#exportJsonOutput");
  const songMenuBackButtons = songMenu.querySelectorAll("[data-song-menu-back]");
  const songNameInput = document.querySelector("#songNameInput");
  const currentSongNameLabel = document.querySelector("#currentSongName");
  const saveSongButton = document.querySelector("#saveSongButton");
  const songList = document.querySelector("#songList");
  const songMenuStatus = document.querySelector("#songMenuStatus");
  const playMeasureBadge = document.querySelector("#playMeasureBadge");
  const barCount = document.querySelector("#barCount");
  const noteName = document.querySelector("#noteName");
  const gravitySlider = document.querySelector("#gravitySlider");
  const bpmInput = document.querySelector("#bpmInput");
  const metronomeCheckbox = document.querySelector("#metronomeCheckbox");
  const measureCountSelect = document.querySelector("#measureCountSelect");
  const activeMeasureSelect = document.querySelector("#activeMeasureSelect");
  const scaleSelect = document.querySelector("#scaleSelect");
  const dimensionCountSelect = document.querySelector("#dimensionCountSelect");
  const activeDimensionSelect = document.querySelector("#activeDimensionSelect");
  const barOctaveSelect = document.querySelector("#barOctaveSelect");
  const barPitchOutput = document.querySelector("#barPitchOutput");
  const barTimbreSelect = document.querySelector("#barTimbreSelect");
  const barBounceSlider = document.querySelector("#barBounceSlider");
  const barBounceOutput = document.querySelector("#barBounceOutput");
  const barPositionOutput = document.querySelector("#barPositionOutput");
  const dimensionMuteGroup = document.querySelector("#dimensionMuteGroup");
  const quantizeGridSelect = document.querySelector("#quantizeGridSelect");
  const quantizeButton = document.querySelector("#quantizeButton");

  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const SCALES = {
    pentatonic: [0, 2, 4, 7, 9],
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  };
  const FIXED_TIMESTEP = 1 / 120;
  const DIMENSION_HUES = [174, 44, 284, 338];
  const DEFAULT_BAR_BOUNCE = 0.82;
  const MIN_BAR_BOUNCE = 0.35;
  const MAX_BAR_BOUNCE = 2.1;
  const DEFAULT_BAR_OCTAVE_SHIFT = 0;
  const DEFAULT_BAR_TIMBRE = "pluck";
  const BAR_TIMBRES = {
    pluck: {
      label: "Pluck",
      hue: 44,
      accentHue: 174,
      fundamental: "triangle",
      overtone: "sine",
      overtoneRatio: 2.01,
      overtoneGain: 0.22,
      attack: 0.008,
      decay: 0.78,
      filterRatio: 7,
      filterQ: 0.7,
      volume: 1,
    },
    bell: {
      label: "Bell",
      hue: 192,
      accentHue: 226,
      fundamental: "sine",
      overtone: "triangle",
      overtoneRatio: 2.72,
      overtoneGain: 0.36,
      attack: 0.004,
      decay: 1.25,
      filterRatio: 10,
      filterQ: 0.9,
      volume: 0.92,
    },
    wood: {
      label: "Wood",
      hue: 24,
      accentHue: 6,
      fundamental: "square",
      overtone: "triangle",
      overtoneRatio: 1.5,
      overtoneGain: 0.12,
      attack: 0.003,
      decay: 0.34,
      filterRatio: 4.2,
      filterQ: 1.2,
      volume: 0.74,
    },
    pad: {
      label: "Pad",
      hue: 284,
      accentHue: 338,
      fundamental: "sawtooth",
      overtone: "sine",
      overtoneRatio: 2,
      overtoneGain: 0.14,
      attack: 0.035,
      decay: 1.08,
      filterRatio: 3.2,
      filterQ: 0.5,
      volume: 0.68,
    },
  };
  const DEFAULT_MEASURE_COUNT = 4;
  const BEATS_PER_MEASURE = 4;
  const BALL_LEAD_IN_BEATS = 1;
  const SONG_STORAGE_KEY = "bar-drop-songs-v1";
  const SONG_STORAGE_PROBE_KEY = "bar-drop-storage-probe";
  const SONG_DB_NAME = "bar-drop-songs-db";
  const SONG_DB_VERSION = 1;
  const SONG_STORE_NAME = "song-library";
  const SONG_LIBRARY_ID = "songs";
  const UNTITLED_SONG_NAME = "名称未設定";
  let songStorageMode = null;

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    bars: [],
    balls: [],
    particles: [],
    camera: {
      x: 0,
      y: 0,
      zoom: 1,
    },
    hole: {
      x: 0,
      y: 0,
      radius: 31,
      ready: false,
      pulse: 0,
      dragging: false,
    },
    pointer: null,
    selectedBarId: null,
    hover: null,
    spaceDown: false,
    measureCount: DEFAULT_MEASURE_COUNT,
    activeMeasure: 0,
    dimensionCount: 1,
    activeDimension: 0,
    mutedDimensions: [false, false, false, false],
    lastTime: performance.now(),
    physicsAccumulator: 0,
    physicsTime: 0,
    nextBarId: 1,
    nextBallId: 1,
    playing: false,
    auditioning: false,
    playingMeasure: 0,
    nextPreparedMeasure: null,
    playbackElapsed: 0,
    nextMetronomeBeat: 0,
    playHiddenBarIds: new Set(),
    muted: false,
    audio: null,
    songId: null,
    songName: "",
    defaultBarTimbre: DEFAULT_BAR_TIMBRE,
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function dimensionHue(dimension) {
    return DIMENSION_HUES[dimension % DIMENSION_HUES.length];
  }

  function normalizeMeasure(value) {
    return clamp(Number(value) || 0, 0, state.measureCount - 1);
  }

  function normalizeDimension(value) {
    return clamp(Number(value) || 0, 0, state.dimensionCount - 1);
  }

  function currentMeasureIndex() {
    return state.playing ? state.playingMeasure : state.activeMeasure;
  }

  function barMeasure(bar) {
    return Math.max(0, Math.round(Number(bar.measure) || 0));
  }

  function isBarInCurrentMeasure(bar) {
    return barMeasure(bar) === currentMeasureIndex();
  }

  function isBarInVisibleMeasure(bar) {
    const measure = barMeasure(bar);
    return (
      measure === currentMeasureIndex() ||
      (state.playing && state.nextPreparedMeasure !== null && measure === state.nextPreparedMeasure)
    );
  }

  function isDimensionMuted(dimension) {
    return state.mutedDimensions[dimension] === true;
  }

  function isBarHiddenByPlayback(bar) {
    return (state.playing || state.auditioning) && state.playHiddenBarIds.has(bar.id);
  }

  function currentMeasureDuration() {
    return (60 / currentBpm()) * BEATS_PER_MEASURE;
  }

  function beatDuration() {
    return 60 / currentBpm();
  }

  function ballLeadInDuration() {
    return beatDuration() * BALL_LEAD_IN_BEATS;
  }

  function currentPlaybackMeasureDuration() {
    return ballLeadInDuration() + currentMeasureDuration();
  }

  function distance(a, b, c, d) {
    return Math.hypot(c - a, d - b);
  }

  function midiToFrequency(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function normalizeOctaveShift(value) {
    return clamp(Math.round(Number(value) || 0), -2, 2);
  }

  function normalizeBarBounce(value) {
    return clamp(Number(value) || DEFAULT_BAR_BOUNCE, MIN_BAR_BOUNCE, MAX_BAR_BOUNCE);
  }

  function normalizeBarTimbre(value) {
    return BAR_TIMBRES[value] ? value : DEFAULT_BAR_TIMBRE;
  }

  function barTimbreSettings(value) {
    return BAR_TIMBRES[normalizeBarTimbre(value)];
  }

  function barVisualHue(bar) {
    return barTimbreSettings(bar?.timbre).hue;
  }

  function barVisualAccentHue(bar) {
    return barTimbreSettings(bar?.timbre).accentHue;
  }

  function barStrokeWidth(bar, isHovered) {
    const octaveShift = normalizeOctaveShift(bar?.octaveShift);
    const baseWidth = 8 - octaveShift * 1.2;
    const hoverBoost = isHovered ? 2 : 0;
    const flashBoost = (bar.flash || 0) * 6;

    return clamp(baseWidth + hoverBoost + flashBoost, 4.8, 13.5);
  }

  function updateBarBounceOutput(value = barBounceSlider.value) {
    barBounceOutput.textContent = normalizeBarBounce(value).toFixed(2);
  }

  function latestBarDefaults() {
    return {
      octaveShift: normalizeOctaveShift(
        state.bars[state.bars.length - 1]?.octaveShift ?? DEFAULT_BAR_OCTAVE_SHIFT,
      ),
      bounce: normalizeBarBounce(state.bars[state.bars.length - 1]?.bounce ?? DEFAULT_BAR_BOUNCE),
      timbre: normalizeBarTimbre(state.defaultBarTimbre),
    };
  }

  function buildScaleMidi() {
    const degrees = SCALES[scaleSelect.value] || SCALES.pentatonic;
    const notes = [];

    for (let octave = 2; octave <= 6; octave += 1) {
      for (const degree of degrees) {
        notes.push(36 + octave * 12 + degree);
      }
    }

    return notes.filter((midi) => midi >= 45 && midi <= 88);
  }

  function lengthRange() {
    return {
      longest: Math.max(150, Math.min(state.width, state.height) * 0.72),
      shortest: 28,
    };
  }

  function lengthToScaleStep(length) {
    const { longest, shortest } = lengthRange();
    const normalized = clamp((length - shortest) / (longest - shortest), 0, 1);
    const scale = buildScaleMidi();
    const index = Math.round((1 - normalized) * (scale.length - 1));

    return {
      index,
      normalized,
      scale,
      longest,
      shortest,
    };
  }

  function snappedLength(length) {
    const { index, scale, longest, shortest } = lengthToScaleStep(length);
    if (scale.length <= 1) return clamp(length, shortest, longest);

    const normalized = 1 - index / (scale.length - 1);
    return shortest + normalized * (longest - shortest);
  }

  function snappedEndpoint(anchorX, anchorY, targetX, targetY) {
    const rawLength = distance(anchorX, anchorY, targetX, targetY);
    if (rawLength <= 0.001) {
      return { x: targetX, y: targetY, length: 0 };
    }

    const length = snappedLength(rawLength);
    const angle = Math.atan2(targetY - anchorY, targetX - anchorX);

    return {
      x: anchorX + Math.cos(angle) * length,
      y: anchorY + Math.sin(angle) * length,
      length,
    };
  }

  function snapBarEnd(bar, end, targetX, targetY) {
    if (end === "start") {
      const point = snappedEndpoint(bar.x2, bar.y2, targetX, targetY);
      bar.x1 = point.x;
      bar.y1 = point.y;
    } else {
      const point = snappedEndpoint(bar.x1, bar.y1, targetX, targetY);
      bar.x2 = point.x;
      bar.y2 = point.y;
    }

    updateBarTone(bar);
  }

  function resnapBarLength(bar) {
    const point = snappedEndpoint(bar.x1, bar.y1, bar.x2, bar.y2);
    bar.x2 = point.x;
    bar.y2 = point.y;
    updateBarTone(bar);
  }

  function lengthToNote(length, octaveShift = 0) {
    const { index, normalized, scale } = lengthToScaleStep(length);
    const midi = clamp(scale[index] + normalizeOctaveShift(octaveShift) * 12, 24, 108);
    const octave = Math.floor(midi / 12) - 1;
    const name = `${NOTE_NAMES[midi % 12]}${octave}`;

    return {
      midi,
      frequency: midiToFrequency(midi),
      name,
      normalized,
      hue: lerp(174, 44, normalized),
    };
  }

  function pointerPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function screenToWorld(x, y) {
    return {
      x: (x - state.camera.x) / state.camera.zoom,
      y: (y - state.camera.y) / state.camera.zoom,
    };
  }

  function worldToScreen(x, y) {
    return {
      x: x * state.camera.zoom + state.camera.x,
      y: y * state.camera.zoom + state.camera.y,
    };
  }

  function zoomAt(screenX, screenY, factor) {
    const before = screenToWorld(screenX, screenY);
    const nextZoom = clamp(state.camera.zoom * factor, 0.35, 2.8);

    state.camera.zoom = nextZoom;
    state.camera.x = screenX - before.x * nextZoom;
    state.camera.y = screenY - before.y * nextZoom;
  }

  function resetCamera() {
    state.camera.x = 0;
    state.camera.y = 0;
    state.camera.zoom = 1;
  }

  function applyWorldTransform() {
    ctx.translate(state.camera.x, state.camera.y);
    ctx.scale(state.camera.zoom, state.camera.zoom);
  }

  function screenUnits(value) {
    return value / state.camera.zoom;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    state.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    if (!state.hole.ready) {
      const start = screenToWorld(state.width * 0.5, Math.max(176, state.height * 0.22));
      state.hole.x = start.x;
      state.hole.y = start.y;
      state.hole.ready = true;
    }
  }

  function resetHolePosition() {
    const start = screenToWorld(state.width * 0.5, Math.max(176, state.height * 0.22));
    state.hole.x = start.x;
    state.hole.y = start.y;
    state.hole.radius = 31;
    state.hole.ready = true;
    state.hole.pulse = 0;
    state.hole.dragging = false;
  }

  function keepHoleInBounds() {
    return state.hole;
  }

  function getSelectedBar() {
    if (state.playing) return null;

    return state.bars.find(
      (bar) =>
        bar.id === state.selectedBarId &&
        barMeasure(bar) === state.activeMeasure &&
        bar.dimension < state.dimensionCount &&
        !isBarHiddenByPlayback(bar),
    ) || null;
  }

  function normalizeSongLibrary(library) {
    if (!library || !Array.isArray(library.songs)) return { songs: [] };

    return {
      songs: library.songs.filter(
        (song) => song && typeof song.id === "string" && song.data,
      ),
    };
  }

  function canUseLocalStorage() {
    try {
      localStorage.setItem(SONG_STORAGE_PROBE_KEY, "1");
      localStorage.removeItem(SONG_STORAGE_PROBE_KEY);
      return true;
    } catch {
      return false;
    }
  }

  function selectedSongStorageMode() {
    if (songStorageMode) return songStorageMode;

    songStorageMode = canUseLocalStorage() ? "localStorage" : "indexedDB";
    return songStorageMode;
  }

  function mergeSongLibraries(...libraries) {
    const songsById = new Map();

    for (const library of libraries) {
      for (const song of normalizeSongLibrary(library).songs) {
        const previous = songsById.get(song.id);
        const previousTime = new Date(previous?.updatedAt || 0).getTime();
        const nextTime = new Date(song.updatedAt || 0).getTime();

        if (!previous || nextTime >= previousTime) {
          songsById.set(song.id, song);
        }
      }
    }

    return { songs: [...songsById.values()] };
  }

  function readLocalSongLibrary() {
    const raw = localStorage.getItem(SONG_STORAGE_KEY);
    if (!raw) return { songs: [] };

    return normalizeSongLibrary(JSON.parse(raw));
  }

  function writeLocalSongLibrary(library) {
    localStorage.setItem(SONG_STORAGE_KEY, JSON.stringify(normalizeSongLibrary(library)));
  }

  function openSongDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB is unavailable"));
        return;
      }

      const request = indexedDB.open(SONG_DB_NAME, SONG_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(SONG_STORE_NAME)) {
          db.createObjectStore(SONG_STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("IndexedDB open failed"));
      request.onblocked = () => reject(new Error("IndexedDB open blocked"));
    });
  }

  async function readIndexedDbSongLibrary() {
    const db = await openSongDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SONG_STORE_NAME, "readonly");
      const store = transaction.objectStore(SONG_STORE_NAME);
      const request = store.get(SONG_LIBRARY_ID);

      request.onsuccess = () => resolve(normalizeSongLibrary(request.result));
      request.onerror = () => reject(request.error || new Error("IndexedDB read failed"));
      transaction.oncomplete = () => db.close();
      transaction.onabort = () => {
        db.close();
        reject(transaction.error || new Error("IndexedDB read aborted"));
      };
    });
  }

  async function writeIndexedDbSongLibrary(library) {
    const db = await openSongDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(SONG_STORE_NAME, "readwrite");
      const store = transaction.objectStore(SONG_STORE_NAME);
      const request = store.put(normalizeSongLibrary(library), SONG_LIBRARY_ID);

      request.onerror = () => reject(request.error || new Error("IndexedDB write failed"));
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onabort = () => {
        db.close();
        reject(transaction.error || new Error("IndexedDB write aborted"));
      };
    });
  }

  async function readSongLibrary() {
    const libraries = [];

    if (canUseLocalStorage()) {
      songStorageMode = songStorageMode || "localStorage";
      try {
        libraries.push(readLocalSongLibrary());
      } catch {
        songStorageMode = "indexedDB";
      }
    }

    try {
      libraries.push(await readIndexedDbSongLibrary());
      songStorageMode = songStorageMode || "indexedDB";
    } catch {
      // localStorage alone is enough when available.
    }

    return mergeSongLibraries(...libraries);
  }

  async function writeSongLibrary(library) {
    let saved = false;
    let lastError = null;

    if (selectedSongStorageMode() === "localStorage" || canUseLocalStorage()) {
      try {
        writeLocalSongLibrary(library);
        songStorageMode = "localStorage";
        saved = true;
      } catch (error) {
        songStorageMode = "indexedDB";
        lastError = error;
      }
    }

    try {
      await writeIndexedDbSongLibrary(library);
      if (!saved) {
        songStorageMode = "indexedDB";
      }
      saved = true;
    } catch (error) {
      lastError = error;
    }

    if (!saved) {
      throw lastError || new Error("Song storage unavailable");
    }
  }

  function createSongId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `song-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  async function defaultSongName() {
    const library = await readSongLibrary();
    let index = library.songs.length + 1;

    while (library.songs.some((song) => song.name === `曲 ${index}`)) {
      index += 1;
    }

    return `曲 ${index}`;
  }

  function setSongMenuStatus(message) {
    songMenuStatus.textContent = message;
  }

  function setDuplicateDialogStatus(message) {
    duplicateDialogStatus.textContent = message;
  }

  function currentSongName() {
    return state.songName.trim();
  }

  function updateCurrentSongName() {
    const name = currentSongName();
    currentSongNameLabel.textContent = name || UNTITLED_SONG_NAME;
    currentSongNameLabel.title = name ? `現在の曲: ${name}` : `現在の曲: ${UNTITLED_SONG_NAME}`;
  }

  function updateSaveMenuState() {
    const canOverwrite = Boolean(state.songId);
    overwriteSongButton.disabled = !canOverwrite;
    overwriteSongButton.title = canOverwrite
      ? `上書き保存: ${currentSongName()}`
      : "新規作成中は上書き保存できません";
  }

  function setCurrentSongName(name, songId = null) {
    state.songId = songId;
    state.songName = String(name || "").trim();
    songNameInput.value = state.songName;
    updateCurrentSongName();
    updateSaveMenuState();
  }

  function formatSongDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function safeFileName(value) {
    return (
      String(value || "bar-drop")
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "bar-drop"
    );
  }

  function createSongSnapshot() {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      controls: {
        gravity: Number(gravitySlider.value),
        bpm: currentBpm(),
        metronome: metronomeCheckbox.checked,
        scale: scaleSelect.value,
        quantize: quantizeGridSelect.value,
      },
      camera: {
        x: state.camera.x,
        y: state.camera.y,
        zoom: state.camera.zoom,
      },
      hole: {
        x: state.hole.x,
        y: state.hole.y,
        radius: state.hole.radius,
      },
      dimensionCount: state.dimensionCount,
      activeDimension: state.activeDimension,
      measureCount: state.measureCount,
      activeMeasure: state.activeMeasure,
      mutedDimensions: state.mutedDimensions.slice(0, 4),
      bars: state.bars
        .filter((bar) => barMeasure(bar) < state.measureCount)
        .map((bar) => ({
          id: bar.id,
          x1: bar.x1,
          y1: bar.y1,
          x2: bar.x2,
          y2: bar.y2,
          measure: barMeasure(bar),
          dimension: bar.dimension,
          octaveShift: normalizeOctaveShift(bar.octaveShift),
          bounce: normalizeBarBounce(bar.bounce),
          timbre: normalizeBarTimbre(bar.timbre),
        })),
    };
  }

  function applyControlSnapshot(controls = {}) {
    if (!controls || typeof controls !== "object") {
      controls = {};
    }

    gravitySlider.value = String(clamp(Number(controls.gravity) || 0.82, 0.2, 1.8));
    bpmInput.value = String(Math.round(clamp(Number(controls.bpm) || 120, 40, 240)));
    metronomeCheckbox.checked = controls.metronome === true;

    if (SCALES[controls.scale]) {
      scaleSelect.value = controls.scale;
    }

    if (["4", "8", "16"].includes(String(controls.quantize))) {
      quantizeGridSelect.value = String(controls.quantize);
    }
  }

  function applySongSnapshot(data) {
    if (!data || typeof data !== "object") return false;

    applyControlSnapshot(data.controls);

    state.measureCount = clamp(Math.round(Number(data.measureCount) || 1), 1, 8);
    state.activeMeasure = clamp(
      Math.round(Number(data.activeMeasure) || 0),
      0,
      state.measureCount - 1,
    );
    state.dimensionCount = clamp(Math.round(Number(data.dimensionCount) || 1), 1, 4);
    state.activeDimension = clamp(
      Math.round(Number(data.activeDimension) || 0),
      0,
      state.dimensionCount - 1,
    );
    state.mutedDimensions = [false, false, false, false];

    if (Array.isArray(data.mutedDimensions)) {
      for (let i = 0; i < state.mutedDimensions.length; i += 1) {
        state.mutedDimensions[i] = data.mutedDimensions[i] === true;
      }
    }

    if (data.camera && typeof data.camera === "object") {
      state.camera.x = Number.isFinite(Number(data.camera.x)) ? Number(data.camera.x) : 0;
      state.camera.y = Number.isFinite(Number(data.camera.y)) ? Number(data.camera.y) : 0;
      state.camera.zoom = clamp(Number(data.camera.zoom) || 1, 0.35, 2.8);
    } else {
      resetCamera();
    }

    if (data.hole && typeof data.hole === "object") {
      state.hole.x = Number.isFinite(Number(data.hole.x)) ? Number(data.hole.x) : 0;
      state.hole.y = Number.isFinite(Number(data.hole.y)) ? Number(data.hole.y) : 0;
      state.hole.radius = clamp(Number(data.hole.radius) || 31, 16, 80);
      state.hole.ready = true;
    }

    const nextBars = [];
    const sourceBars = Array.isArray(data.bars) ? data.bars : [];

    sourceBars.forEach((source, index) => {
      const x1 = Number(source.x1);
      const y1 = Number(source.y1);
      const x2 = Number(source.x2);
      const y2 = Number(source.y2);

      if (![x1, y1, x2, y2].every(Number.isFinite)) return;

      const length = distance(x1, y1, x2, y2);
      if (length < 18) return;

      const measure = Math.max(0, Math.round(Number(source.measure) || 0));
      if (measure >= state.measureCount) return;

      const octaveShift = normalizeOctaveShift(source.octaveShift);
      const timbre = normalizeBarTimbre(source.timbre);
      const note = lengthToNote(length, octaveShift);
      const id = Math.max(1, Math.round(Number(source.id) || index + 1));

      nextBars.push({
        id,
        x1,
        y1,
        x2,
        y2,
        length,
        noteName: note.name,
        hue: note.hue,
        measure,
        dimension: clamp(Math.round(Number(source.dimension) || 0), 0, 3),
        octaveShift,
        bounce: normalizeBarBounce(source.bounce),
        timbre,
        flash: 0,
      });
    });

    state.bars = nextBars;
    state.defaultBarTimbre = normalizeBarTimbre(nextBars[nextBars.length - 1]?.timbre);
    state.balls = [];
    state.particles = [];
    state.selectedBarId = null;
    state.hover = null;
    state.pointer = null;
    state.playing = false;
    state.auditioning = false;
    state.playingMeasure = 0;
    state.nextPreparedMeasure = null;
    state.playbackElapsed = 0;
    state.nextMetronomeBeat = 0;
    state.playHiddenBarIds.clear();
    state.nextBarId = Math.max(0, ...state.bars.map((bar) => bar.id)) + 1;
    state.nextBallId = 1;
    noteName.textContent = "--";
    updateMeasureOptions();
    updateDimensionOptions();
    updateButtons();
    return true;
  }

  async function renderSongList() {
    const library = await readSongLibrary();
    const songs = [...library.songs].sort((a, b) => {
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });

    songList.replaceChildren();

    if (songs.length === 0) {
      const empty = document.createElement("div");
      empty.className = "song-empty";
      empty.textContent = "保存なし";
      songList.appendChild(empty);
      return;
    }

    for (const song of songs) {
      const row = document.createElement("div");
      row.className = "song-row";

      const main = document.createElement("div");
      main.className = "song-row-main";

      const name = document.createElement("div");
      name.className = "song-row-name";
      name.textContent = song.name || "Untitled";

      const date = document.createElement("div");
      date.className = "song-row-date";
      date.textContent = formatSongDate(song.updatedAt);

      const actions = document.createElement("div");
      actions.className = "song-row-actions";

      const loadButton = document.createElement("button");
      loadButton.type = "button";
      loadButton.className = "song-row-button";
      loadButton.dataset.loadSong = song.id;
      loadButton.textContent = "読込";

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "song-row-button delete";
      deleteButton.dataset.deleteSong = song.id;
      deleteButton.textContent = "削除";

      main.append(name, date);
      actions.append(loadButton, deleteButton);
      row.append(main, actions);
      songList.appendChild(row);
    }
  }

  async function showSongMenuView(view) {
    songMenuRoot.hidden = view !== "root";
    songSaveView.hidden = view !== "save";
    songOpenView.hidden = view !== "open";
    songExportView.hidden = view !== "export";
    songImportView.hidden = view !== "import";
    setSongMenuStatus("");

    if (view === "root") {
      updateSaveMenuState();
    } else if (view === "save") {
      songNameInput.value = currentSongName() || await defaultSongName();
      songNameInput.focus();
      songNameInput.select();
    } else if (view === "open") {
      await renderSongList();
    } else if (view === "export") {
      updateExportView();
    } else if (view === "import") {
      songImportInput.value = "";
      importJsonInput.value = "";
    }
  }

  async function setSongMenuOpen(open) {
    songMenu.hidden = !open;
    songMenuButton.classList.toggle("is-open", open);
    songMenuButton.setAttribute("aria-expanded", String(open));

    if (open) {
      setSettingsDialogOpen(false);
      setDuplicateDialogOpen(false);
      await showSongMenuView("root");
    }
  }

  function setSettingsDialogOpen(open) {
    settingsDialog.hidden = !open;
    settingsButton.classList.toggle("is-open", open);
    settingsButton.setAttribute("aria-expanded", String(open));

    if (open) {
      setDuplicateDialogOpen(false);
      void setSongMenuOpen(false);
      settingsCloseButton.focus({ preventScroll: true });
    }
  }

  function duplicateSource() {
    return {
      measure: currentMeasureIndex(),
      dimension: state.activeDimension,
    };
  }

  function barsInMeasureDimension(measure, dimension) {
    return state.bars.filter((bar) => barMeasure(bar) === measure && bar.dimension === dimension);
  }

  function populateDuplicateDialog() {
    const source = duplicateSource();
    const sourceBars = barsInMeasureDimension(source.measure, source.dimension);

    duplicateSourceLabel.textContent =
      `コピー元: 小節 ${source.measure + 1} / 次元 ${source.dimension + 1} / ${sourceBars.length}本`;
    duplicateMeasureSelect.innerHTML = "";
    duplicateDimensionSelect.innerHTML = "";

    for (let measure = 0; measure < state.measureCount; measure += 1) {
      const option = document.createElement("option");
      option.value = String(measure);
      option.textContent = `小節 ${measure + 1}`;
      duplicateMeasureSelect.appendChild(option);
    }

    for (let dimension = 0; dimension < state.dimensionCount; dimension += 1) {
      const option = document.createElement("option");
      option.value = String(dimension);
      option.textContent = `次元 ${dimension + 1}`;
      duplicateDimensionSelect.appendChild(option);
    }

    const defaultMeasure =
      state.measureCount > 1 ? (source.measure + 1) % state.measureCount : source.measure;
    const defaultDimension =
      state.measureCount > 1 || state.dimensionCount <= 1
        ? source.dimension
        : (source.dimension + 1) % state.dimensionCount;

    duplicateMeasureSelect.value = String(defaultMeasure);
    duplicateDimensionSelect.value = String(defaultDimension);
    duplicateApplyButton.disabled = sourceBars.length === 0;
    setDuplicateDialogStatus(sourceBars.length === 0 ? "コピー元にバーがありません" : "");
  }

  function setDuplicateDialogOpen(open) {
    duplicateDialog.hidden = !open;

    if (open) {
      setSettingsDialogOpen(false);
      void setSongMenuOpen(false);
      populateDuplicateDialog();
      duplicateCloseButton.focus({ preventScroll: true });
    }
  }

  function cloneBarToTarget(bar, measure, dimension) {
    const length = distance(bar.x1, bar.y1, bar.x2, bar.y2);
    const octaveShift = normalizeOctaveShift(bar.octaveShift);
    const note = lengthToNote(length, octaveShift);

    return {
      id: state.nextBarId++,
      x1: bar.x1,
      y1: bar.y1,
      x2: bar.x2,
      y2: bar.y2,
      length,
      noteName: note.name,
      hue: note.hue,
      measure,
      dimension,
      octaveShift,
      bounce: normalizeBarBounce(bar.bounce),
      timbre: normalizeBarTimbre(bar.timbre),
      flash: 0,
    };
  }

  function duplicateCurrentMeasureDimension() {
    const source = duplicateSource();
    const targetMeasure = normalizeMeasure(duplicateMeasureSelect.value);
    const targetDimension = normalizeDimension(duplicateDimensionSelect.value);
    const sourceBars = barsInMeasureDimension(source.measure, source.dimension);

    if (sourceBars.length === 0) {
      setDuplicateDialogStatus("コピー元にバーがありません");
      return;
    }

    if (source.measure === targetMeasure && source.dimension === targetDimension) {
      setDuplicateDialogStatus("同じ小節・次元には複製できません");
      return;
    }

    const targetBars = barsInMeasureDimension(targetMeasure, targetDimension);

    if (
      targetBars.length > 0 &&
      !window.confirm(
        `小節 ${targetMeasure + 1} / 次元 ${targetDimension + 1} にはバーが ${targetBars.length}本あります。置き換えますか？`,
      )
    ) {
      return;
    }

    if (state.playing) stopPlayback();
    if (state.auditioning) {
      state.auditioning = false;
      state.balls = [];
      state.particles = [];
    }

    state.playHiddenBarIds.clear();
    state.bars = state.bars.filter(
      (bar) => !(barMeasure(bar) === targetMeasure && bar.dimension === targetDimension),
    );

    const clones = sourceBars.map((bar) => cloneBarToTarget(bar, targetMeasure, targetDimension));
    state.bars.push(...clones);
    state.activeMeasure = targetMeasure;
    state.activeDimension = targetDimension;
    state.selectedBarId = clones[0]?.id ?? null;
    state.hover = null;
    noteName.textContent = clones[0]?.noteName || "--";
    updateMeasureOptions();
    updateDimensionOptions();
    updateButtons();
    setDuplicateDialogOpen(false);
  }

  async function createNewSong() {
    const hasContent = state.bars.length > 0 || state.balls.length > 0 || state.particles.length > 0;
    if (hasContent && !window.confirm("現在の曲を閉じて新規作成しますか？")) return;

    state.bars = [];
    state.balls = [];
    state.particles = [];
    state.selectedBarId = null;
    state.hover = null;
    state.pointer = null;
    state.measureCount = DEFAULT_MEASURE_COUNT;
    state.activeMeasure = 0;
    state.dimensionCount = 1;
    state.activeDimension = 0;
    state.mutedDimensions = [false, false, false, false];
    state.playing = false;
    state.auditioning = false;
    state.playHiddenBarIds.clear();
    state.nextBarId = 1;
    state.nextBallId = 1;
    state.defaultBarTimbre = DEFAULT_BAR_TIMBRE;
    state.muted = false;
    state.playingMeasure = 0;
    state.nextPreparedMeasure = null;
    state.playbackElapsed = 0;
    state.nextMetronomeBeat = 0;
    state.physicsAccumulator = 0;
    state.physicsTime = 0;
    state.lastTime = performance.now();
    gravitySlider.value = "0.82";
    bpmInput.value = "120";
    metronomeCheckbox.checked = false;
    scaleSelect.value = "chromatic";
    quantizeGridSelect.value = "16";
    resetCamera();
    resetHolePosition();
    noteName.textContent = "--";
    setCurrentSongName("");
    updateMeasureOptions();
    updateDimensionOptions();
    updateButtons();
    await setSongMenuOpen(false);
  }

  async function overwriteCurrentSong() {
    if (!state.songId) {
      setSongMenuStatus("新規作成中は上書き保存できません");
      updateSaveMenuState();
      return;
    }

    const library = await readSongLibrary();
    const existingIndex = library.songs.findIndex((song) => song.id === state.songId);

    if (existingIndex < 0) {
      state.songId = null;
      updateSaveMenuState();
      setSongMenuStatus("上書き保存先が見つかりません");
      return;
    }

    const existingSong = library.songs[existingIndex];
    const now = new Date().toISOString();
    const entry = {
      id: existingSong.id,
      name: existingSong.name || currentSongName() || await defaultSongName(),
      updatedAt: now,
      data: createSongSnapshot(),
    };

    library.songs[existingIndex] = entry;

    try {
      await writeSongLibrary(library);
      setCurrentSongName(entry.name, entry.id);
      await renderSongList();
      setSongMenuStatus("上書き保存しました");
    } catch {
      setSongMenuStatus("保存できませんでした");
    }
  }

  async function saveSongAs() {
    const name = songNameInput.value.trim() || await defaultSongName();
    const library = await readSongLibrary();
    const existingSong = library.songs.find((song) => song.name === name);

    if (existingSong) {
      songNameInput.focus();
      songNameInput.select();
      setSongMenuStatus("同じ名前の曲があります");
      return;
    }

    const now = new Date().toISOString();
    const entry = {
      id: createSongId(),
      name,
      updatedAt: now,
      data: createSongSnapshot(),
    };

    library.songs.unshift(entry);

    try {
      await writeSongLibrary(library);
      setCurrentSongName(name, entry.id);
      await renderSongList();
      setSongMenuStatus("保存しました");
    } catch {
      setSongMenuStatus("保存できませんでした");
    }
  }

  function createExportPayload(name) {
    return {
      app: "bar-drop",
      version: 1,
      exportedAt: new Date().toISOString(),
      name,
      data: createSongSnapshot(),
    };
  }

  function downloadJsonFile(fileName, json) {
    const url = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function copyJsonToClipboard(json) {
    if (!navigator.clipboard?.writeText) return false;

    await navigator.clipboard.writeText(json);
    return true;
  }

  function parseImportJson(text) {
    const trimmed = String(text || "").replace(/^\uFEFF/, "").trim();

    if (!trimmed) {
      throw new Error("empty");
    }

    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    const source = fenced ? fenced[1] : trimmed;

    try {
      return JSON.parse(source);
    } catch (error) {
      const start = source.indexOf("{");
      const end = source.lastIndexOf("}");

      if (start >= 0 && end > start) {
        return JSON.parse(source.slice(start, end + 1));
      }

      throw error;
    }
  }

  function parseNestedJson(value) {
    if (typeof value !== "string") return value;

    try {
      return parseImportJson(value);
    } catch {
      return value;
    }
  }

  function looksLikeSongSnapshot(value) {
    return (
      value &&
      typeof value === "object" &&
      (Array.isArray(value.bars) ||
        value.controls ||
        value.hole ||
        value.measureCount !== undefined ||
        value.dimensionCount !== undefined)
    );
  }

  function importedSongData(payload) {
    payload = parseNestedJson(payload);
    if (!payload || typeof payload !== "object") return null;

    if (looksLikeSongSnapshot(payload)) {
      return {
        name: typeof payload.name === "string" ? payload.name : "",
        data: payload,
      };
    }

    const candidates = [
      payload.data,
      payload.song,
      payload.song?.data,
      payload.snapshot,
      payload.project,
      payload.project?.data,
    ].map(parseNestedJson);

    for (const candidate of candidates) {
      if (looksLikeSongSnapshot(candidate)) {
        return {
          name: typeof payload.name === "string" ? payload.name : "",
          data: candidate,
        };
      }
    }

    if (Array.isArray(payload.songs) && payload.songs.length > 0) {
      const firstSong = payload.songs[0];
      const data = parseNestedJson(firstSong?.data);
      if (looksLikeSongSnapshot(data)) {
        return {
          name: typeof firstSong.name === "string" ? firstSong.name : "",
          data,
        };
      }
    }

    return null;
  }

  function importNameFromFile(file) {
    return file.name.replace(/\.json$/i, "").trim();
  }

  function hasCurrentSongContent() {
    return state.bars.length > 0 || state.balls.length > 0 || state.particles.length > 0;
  }

  function createExportDetails() {
    const name = currentSongName() || "bar-drop";
    const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
    const fileName = `${safeFileName(name)}-${stamp}.json`;
    const json = JSON.stringify(createExportPayload(name), null, 2);

    return { fileName, json };
  }

  function updateExportView() {
    const { fileName, json } = createExportDetails();

    exportFileName.textContent = fileName;
    exportJsonOutput.value = json;
    exportJsonOutput.dataset.fileName = fileName;
  }

  async function saveExportJson() {
    const details = exportJsonOutput.value ? {
      fileName: exportJsonOutput.dataset.fileName || "bar-drop.json",
      json: exportJsonOutput.value,
    } : createExportDetails();

    try {
      downloadJsonFile(details.fileName, details.json);
      setSongMenuStatus("ダウンロードを開始しました");
    } catch {
      try {
        if (await copyJsonToClipboard(details.json)) {
          setSongMenuStatus("ファイル保存できなかったのでJSONをコピーしました");
          return;
        }
      } catch {
        // Fall through to the generic failure message.
      }

      exportJsonOutput.focus();
      exportJsonOutput.select();
      setSongMenuStatus("保存できませんでした。JSONを選択しました");
    }
  }

  async function copyExportJson() {
    const json = exportJsonOutput.value || createExportDetails().json;

    try {
      if (await copyJsonToClipboard(json)) {
        setSongMenuStatus("JSONをコピーしました");
        return;
      }
    } catch {
      // Fall through to selecting the text.
    }

    exportJsonOutput.focus();
    exportJsonOutput.select();
    setSongMenuStatus("コピーできませんでした。JSONを選択しました");
  }

  async function importSongText(text, sourceName = "") {
    if (hasCurrentSongContent() && !window.confirm("現在の曲を閉じてインポートしますか？")) {
      return;
    }

    try {
      const payload = parseImportJson(text);
      const imported = importedSongData(payload);

      if (!imported) {
        throw new Error("missing-song-data");
      }

      if (!applySongSnapshot(imported.data)) {
        throw new Error("invalid-song-data");
      }

      setCurrentSongName(imported.name || sourceName || "");
      setSongMenuStatus("インポートしました");
      await setSongMenuOpen(false);
    } catch (error) {
      if (error instanceof SyntaxError) {
        setSongMenuStatus("JSONとして読めませんでした");
      } else if (error?.message === "empty") {
        importJsonInput.focus();
        setSongMenuStatus("JSONが空です。貼り付け欄も使えます");
      } else if (error?.message === "missing-song-data") {
        setSongMenuStatus("曲データが見つかりませんでした");
      } else {
        setSongMenuStatus("曲データを読み込めませんでした");
      }
    }
  }

  async function importSongFile(file) {
    if (!file) return;

    await importSongText(await file.text(), importNameFromFile(file));
  }

  async function loadSong(songId) {
    const library = await readSongLibrary();
    const song = library.songs.find((item) => item.id === songId);
    if (!song) return;

    if (applySongSnapshot(song.data)) {
      setCurrentSongName(song.name || "", song.id);
      await setSongMenuOpen(false);
    } else {
      setSongMenuStatus("読み込めませんでした");
    }
  }

  async function deleteSong(songId) {
    const library = await readSongLibrary();
    const song = library.songs.find((item) => item.id === songId);
    if (!song) return;
    if (!window.confirm(`「${song.name || "Untitled"}」を削除しますか？`)) return;

    library.songs = library.songs.filter((item) => item.id !== songId);
    try {
      await writeSongLibrary(library);
      if (state.songId === songId) {
        state.songId = null;
        updateSaveMenuState();
      }
      await renderSongList();
      setSongMenuStatus("削除しました");
    } catch {
      setSongMenuStatus("削除できませんでした");
    }
  }

  function updateBarAttributeControls() {
    const bar = getSelectedBar();
    const disabled = bar === null;

    barOctaveSelect.disabled = disabled;
    barTimbreSelect.disabled = false;
    barBounceSlider.disabled = disabled;

    if (bar) {
      barOctaveSelect.value = String(bar.octaveShift ?? DEFAULT_BAR_OCTAVE_SHIFT);
      barTimbreSelect.value = normalizeBarTimbre(bar.timbre);
      barBounceSlider.value = String(bar.bounce ?? DEFAULT_BAR_BOUNCE);
    } else {
      barOctaveSelect.value = String(DEFAULT_BAR_OCTAVE_SHIFT);
      barTimbreSelect.value = normalizeBarTimbre(state.defaultBarTimbre);
      barBounceSlider.value = String(DEFAULT_BAR_BOUNCE);
    }

    updateBarBounceOutput();
    updateBarPitchReadout();
    updateBarPositionReadout();
  }

  function updateBarPitchReadout() {
    const bar = getSelectedBar();

    if (!bar) {
      barPitchOutput.textContent = "--";
      barPitchOutput.title = "バー未選択";
      return;
    }

    const pitchName = bar.noteName || lengthToNote(bar.length, bar.octaveShift).name;
    barPitchOutput.textContent = pitchName;
    barPitchOutput.title = `音程: ${pitchName}`;
  }

  function currentBpm() {
    return clamp(Number(bpmInput.value) || 120, 40, 240);
  }

  function quantizeStepDuration() {
    const noteValue = Number(quantizeGridSelect.value) || 16;
    return (60 / currentBpm()) * (4 / noteValue);
  }

  function formatBarPosition(hitTime) {
    const currentBeatDuration = beatDuration();
    const noteValue = Number(quantizeGridSelect.value) || 16;
    const divisionsPerBeat = Math.max(1, Math.round(noteValue / 4));
    const gridDuration = currentBeatDuration / divisionsPerBeat;
    const totalGridSteps = BEATS_PER_MEASURE * divisionsPerBeat;
    const musicalHitTime = hitTime - ballLeadInDuration();
    const nearestGridStep = Math.round(musicalHitTime / gridDuration);
    const boundedGridStep = clamp(nearestGridStep, 0, totalGridSteps);
    const isMeasureEnd = boundedGridStep >= totalGridSteps;
    const displayGridStep = isMeasureEnd ? totalGridSteps - 1 : boundedGridStep;
    const beat = Math.floor(displayGridStep / divisionsPerBeat) + 1;
    const division = (displayGridStep % divisionsPerBeat) + 1;
    const offsetMs = Math.round((musicalHitTime - boundedGridStep * gridDuration) * 1000);
    const gridLabel = isMeasureEnd
      ? "小節末"
      : divisionsPerBeat === 1
        ? `${beat}拍`
        : `${beat}.${division}`;
    const offsetLabel = Math.abs(offsetMs) < 5 ? "±0ms" : `${offsetMs > 0 ? "+" : ""}${offsetMs}ms`;

    return {
      text: `${gridLabel} ${offsetLabel}`,
      title: `落下開始から${hitTime.toFixed(3)}秒 / 小節内 ${gridLabel} ${offsetLabel}`,
    };
  }

  function selectedBarHitTime(bar) {
    const result = simulateGhost(currentPlaybackMeasureDuration(), bar.dimension, { stopOnBarId: bar.id });
    return result.hitTime;
  }

  function updateBarPositionReadout() {
    const bar = getSelectedBar();

    if (!bar) {
      barPositionOutput.textContent = "--";
      barPositionOutput.title = "バー未選択";
      return;
    }

    const hitTime = selectedBarHitTime(bar);
    if (hitTime === null) {
      barPositionOutput.textContent = "小節外";
      barPositionOutput.title = "この小節内ではボールが当たりません";
      return;
    }

    const formatted = formatBarPosition(hitTime);
    barPositionOutput.textContent = formatted.text;
    barPositionOutput.title = formatted.title;
  }

  function updateMeasureOptions() {
    measureCountSelect.value = String(state.measureCount);
    activeMeasureSelect.innerHTML = "";

    for (let measure = 0; measure < state.measureCount; measure += 1) {
      const option = document.createElement("option");
      option.value = String(measure);
      option.textContent = `小節 ${measure + 1}`;
      activeMeasureSelect.appendChild(option);
    }

    state.activeMeasure = normalizeMeasure(state.activeMeasure);
    activeMeasureSelect.value = String(state.activeMeasure);
  }

  function updateDimensionOptions() {
    dimensionCountSelect.value = String(state.dimensionCount);
    activeDimensionSelect.innerHTML = "";
    dimensionMuteGroup.innerHTML = "";

    for (let dimension = 0; dimension < state.dimensionCount; dimension += 1) {
      const option = document.createElement("option");
      option.value = String(dimension);
      option.textContent = `次元 ${dimension + 1}`;
      activeDimensionSelect.appendChild(option);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "dimension-mute";
      button.dataset.dimension = String(dimension);
      button.textContent = `D${dimension + 1}`;
      button.style.setProperty("--dimension-hue", dimensionHue(dimension));
      button.setAttribute("aria-pressed", String(isDimensionMuted(dimension)));
      button.setAttribute("aria-label", `次元 ${dimension + 1} をミュート`);
      button.classList.toggle("is-muted", isDimensionMuted(dimension));
      dimensionMuteGroup.appendChild(button);
    }

    state.activeDimension = normalizeDimension(state.activeDimension);
    activeDimensionSelect.value = String(state.activeDimension);
  }

  function updateButtons() {
    const viewMeasure = currentMeasureIndex();
    const measureBars = state.bars.filter(
      (bar) => barMeasure(bar) === viewMeasure && bar.dimension < state.dimensionCount,
    );
    const visibleBars = measureBars.filter((bar) => !isBarHiddenByPlayback(bar)).length;
    const activeBars = measureBars.filter(
      (bar) => bar.dimension === state.activeDimension && !isBarHiddenByPlayback(bar),
    ).length;
    const selectedBar = getSelectedBar();
    const canQuantize = selectedBar !== null;
    playButton.classList.toggle("is-playing", state.playing);
    playButton.setAttribute("aria-label", state.playing ? "停止" : "再生");
    playButton.title = state.playing ? "停止" : "再生";
    playMeasureBadge.textContent = `M${viewMeasure + 1}/${state.measureCount}`;
    playMeasureBadge.classList.toggle("is-playing", state.playing);
    undoButton.disabled = state.playing || activeBars === 0;
    clearButton.disabled = selectedBar === null;
    clearButton.setAttribute("aria-label", selectedBar ? "選択バーを削除" : "削除するバーがありません");
    quantizeButton.disabled = !canQuantize;
    updateBarAttributeControls();
    muteButton.classList.toggle("is-muted", state.muted);
    muteButton.setAttribute("aria-label", state.muted ? "ミュート解除" : "ミュート");
    barCount.textContent = `バー ${activeBars}/${visibleBars} 本`;
  }

  function initAudio() {
    if (state.audio) return state.audio;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;

    const audioContext = new AudioContext();
    const master = audioContext.createGain();
    const compressor = audioContext.createDynamicsCompressor();
    master.gain.value = 0.72;
    compressor.threshold.value = -22;
    compressor.knee.value = 24;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;
    master.connect(compressor);
    compressor.connect(audioContext.destination);

    state.audio = {
      context: audioContext,
      master,
    };

    return state.audio;
  }

  function ensureAudioRunning() {
    const audio = initAudio();
    if (audio && audio.context.state === "suspended") {
      audio.context.resume();
    }
  }

  function playMetronomeClick(beatIndex) {
    if (!metronomeCheckbox.checked || state.muted) return;

    const audio = initAudio();
    if (!audio) return;

    const { context, master } = audio;
    const now = context.currentTime;
    const output = context.createGain();
    const oscillator = context.createOscillator();
    const isDownbeat = beatIndex === 0;

    oscillator.type = "square";
    oscillator.frequency.setValueAtTime(isDownbeat ? 1480 : 1080, now);
    output.gain.setValueAtTime(isDownbeat ? 0.16 : 0.11, now);
    output.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    oscillator.connect(output);
    output.connect(master);
    oscillator.start(now);
    oscillator.stop(now + 0.05);
  }

  function resetMetronomeMeasure() {
    state.nextMetronomeBeat = 0;
  }

  function updateMetronome() {
    if (!metronomeCheckbox.checked) return;

    const currentBeatDuration = beatDuration();
    const musicalElapsed = state.playbackElapsed - ballLeadInDuration();

    if (musicalElapsed < 0) return;

    while (
      state.nextMetronomeBeat < BEATS_PER_MEASURE &&
      musicalElapsed >= currentBeatDuration * state.nextMetronomeBeat
    ) {
      playMetronomeClick(state.nextMetronomeBeat);
      state.nextMetronomeBeat += 1;
    }
  }

  function playNote(bar, intensity, x) {
    if (state.muted) return;
    if (isDimensionMuted(bar.dimension)) return;

    const audio = initAudio();
    if (!audio) return;

    const { context, master } = audio;
    const now = context.currentTime;
    const note = lengthToNote(bar.length, bar.octaveShift);
    const timbre = barTimbreSettings(bar.timbre);
    const volume = clamp(0.08 + intensity * 0.14, 0.08, 0.24) * timbre.volume;
    const screenX = worldToScreen(x, 0).x;
    const panValue = clamp((screenX / Math.max(1, state.width)) * 2 - 1, -0.75, 0.75);
    const output = context.createGain();
    const filter = context.createBiquadFilter();
    const panner = context.createStereoPanner ? context.createStereoPanner() : null;

    output.gain.setValueAtTime(0.0001, now);
    output.gain.exponentialRampToValueAtTime(volume, now + timbre.attack);
    output.gain.exponentialRampToValueAtTime(0.0001, now + timbre.decay);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(clamp(note.frequency * timbre.filterRatio, 260, 12000), now);
    filter.Q.value = timbre.filterQ;

    const fundamental = context.createOscillator();
    const overtone = context.createOscillator();
    fundamental.type = timbre.fundamental;
    overtone.type = timbre.overtone;
    fundamental.frequency.setValueAtTime(note.frequency, now);
    overtone.frequency.setValueAtTime(note.frequency * timbre.overtoneRatio, now);

    const overtoneGain = context.createGain();
    overtoneGain.gain.value = timbre.overtoneGain;

    fundamental.connect(filter);
    overtone.connect(overtoneGain);
    overtoneGain.connect(filter);
    filter.connect(output);

    if (panner) {
      panner.pan.setValueAtTime(panValue, now);
      output.connect(panner);
      panner.connect(master);
    } else {
      output.connect(master);
    }

    fundamental.start(now);
    overtone.start(now);
    fundamental.stop(now + timbre.decay + 0.04);
    overtone.stop(now + timbre.decay + 0.04);

    noteName.textContent = note.name;
  }

  function addBar(x1, y1, x2, y2) {
    const snapped = snappedEndpoint(x1, y1, x2, y2);
    x2 = snapped.x;
    y2 = snapped.y;

    const length = snapped.length;
    if (length < 18) return;

    const { octaveShift, bounce, timbre } = latestBarDefaults();
    const note = lengthToNote(length, octaveShift);
    const bar = {
      id: state.nextBarId,
      x1,
      y1,
      x2,
      y2,
      length,
      noteName: note.name,
      hue: note.hue,
      measure: state.activeMeasure,
      dimension: state.activeDimension,
      octaveShift,
      bounce,
      timbre,
      flash: 0,
    };
    state.bars.push(bar);
    state.selectedBarId = bar.id;
    state.nextBarId += 1;
    state.defaultBarTimbre = timbre;
    noteName.textContent = note.name;
    updateButtons();
  }

  function updateBarTone(bar) {
    bar.length = distance(bar.x1, bar.y1, bar.x2, bar.y2);
    const note = lengthToNote(bar.length, bar.octaveShift);
    bar.noteName = note.name;
    bar.hue = note.hue;
    noteName.textContent = note.name;
  }

  function startPlayback() {
    ensureAudioRunning();
    state.playing = true;
    state.auditioning = false;
    state.playingMeasure = 0;
    state.nextPreparedMeasure = null;
    state.playbackElapsed = 0;
    state.playHiddenBarIds.clear();
    state.balls = [];
    state.particles = [];
    state.nextBallId = 1;
    state.physicsAccumulator = 0;
    state.physicsTime = 0;
    state.lastTime = performance.now();
    activeMeasureSelect.value = String(state.activeMeasure);
    noteName.textContent = "--";
    spawnBallFromHole(state.playingMeasure);
    resetMetronomeMeasure();
    updateButtons();
  }

  function stopPlayback() {
    state.playing = false;
    state.auditioning = false;
    state.playingMeasure = 0;
    state.nextPreparedMeasure = null;
    state.playbackElapsed = 0;
    state.nextMetronomeBeat = 0;
    state.playHiddenBarIds.clear();
    state.balls = [];
    state.particles = [];
    state.hole.pulse = 0;
    updateButtons();
  }

  function advancePlaybackMeasure() {
    if (!state.playing) return;

    if (state.playingMeasure + 1 >= state.measureCount) {
      stopPlayback();
      return;
    }

    state.playingMeasure += 1;
    state.nextPreparedMeasure = null;
    state.playbackElapsed = ballLeadInDuration();
    state.nextMetronomeBeat = 0;
    state.balls = state.balls.filter((ball) => ball.measure >= state.playingMeasure);
    if (!state.balls.some((ball) => ball.measure === state.playingMeasure)) {
      spawnBallFromHole(state.playingMeasure);
    }
    noteName.textContent = "--";
    resetMetronomeMeasure();
    updateMetronome();
    updateButtons();
  }

  function prepareUpcomingMeasure() {
    if (!state.playing) return;

    const nextMeasure = state.playingMeasure + 1;
    if (nextMeasure >= state.measureCount) return;
    if (state.nextPreparedMeasure === nextMeasure) return;
    if (state.playbackElapsed < currentMeasureDuration()) return;

    spawnBallFromHole(nextMeasure);
    state.nextPreparedMeasure = nextMeasure;
  }

  function togglePlayback() {
    if (state.playing) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }

  function startAuditionFromHole() {
    if (state.playing) return;

    state.auditioning = true;
    state.playHiddenBarIds.clear();
    state.balls = [];
    state.particles = [];
    state.nextBallId = 1;
    state.physicsAccumulator = 0;
    state.lastTime = performance.now();
    noteName.textContent = "--";
    spawnBallFromHole(state.activeMeasure);
    updateButtons();
  }

  function finishAuditionIfDone() {
    if (!state.auditioning || state.playing || state.balls.length > 0) return;

    state.auditioning = false;
    state.playHiddenBarIds.clear();
    updateButtons();
  }

  function hideBarForPlayback(bar) {
    if ((!state.playing && !state.auditioning) || state.playHiddenBarIds.has(bar.id)) return;

    state.playHiddenBarIds.add(bar.id);
    if (state.selectedBarId === bar.id) {
      state.selectedBarId = null;
    }
    updateButtons();
  }

  function spawnBall(x, y, dimension = state.activeDimension, options = {}) {
    const hue = dimensionHue(dimension);

    state.balls.push({
      id: state.nextBallId,
      measure: options.measure ?? currentMeasureIndex(),
      dimension,
      x,
      y,
      vx: options.vx ?? (Math.random() - 0.5) * 80,
      vy: options.vy ?? 0,
      radius: 10,
      hue,
      life: 0,
      hits: new Map(),
    });
    state.nextBallId += 1;
    updateButtons();
  }

  function spawnBallFromHole(measure = currentMeasureIndex()) {
    const hole = state.hole;
    const x = hole.x;
    const y = hole.y + hole.radius * 0.5;

    for (let dimension = 0; dimension < state.dimensionCount; dimension += 1) {
      spawnBall(x, y, dimension, { vx: 0, vy: 94, measure });
    }

    hole.pulse = 1;
    for (let dimension = 0; dimension < state.dimensionCount; dimension += 1) {
      addParticles(hole.x, hole.y + hole.radius * 0.2, dimensionHue(dimension), 5);
    }
  }

  function addParticles(x, y, hue, amount) {
    for (let i = 0; i < amount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 2.5,
        hue,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7,
      });
    }
  }

  function closestPointOnSegment(px, py, bar) {
    const abx = bar.x2 - bar.x1;
    const aby = bar.y2 - bar.y1;
    const lengthSq = abx * abx + aby * aby || 1;
    const t = clamp(((px - bar.x1) * abx + (py - bar.y1) * aby) / lengthSq, 0, 1);

    return {
      x: bar.x1 + abx * t,
      y: bar.y1 + aby * t,
      t,
    };
  }

  function collideBallWithBar(ball, bar, now, silent = false) {
    const thickness = 8;
    const closest = closestPointOnSegment(ball.x, ball.y, bar);
    const dx = ball.x - closest.x;
    const dy = ball.y - closest.y;
    const dist = Math.hypot(dx, dy);
    const minDist = ball.radius + thickness * 0.5;

    if (dist > minDist) return false;

    const barDx = bar.x2 - bar.x1;
    const barDy = bar.y2 - bar.y1;
    const barLength = Math.hypot(barDx, barDy) || 1;
    let nx = dist > 0.001 ? dx / dist : -barDy / barLength;
    let ny = dist > 0.001 ? dy / dist : barDx / barLength;
    const velocityIntoNormal = ball.vx * nx + ball.vy * ny;

    if (velocityIntoNormal >= 0) return false;

    const bounce = normalizeBarBounce(bar.bounce);
    ball.x = closest.x + nx * (minDist + 0.6);
    ball.y = closest.y + ny * (minDist + 0.6);
    ball.vx -= (1 + bounce) * velocityIntoNormal * nx;
    ball.vy -= (1 + bounce) * velocityIntoNormal * ny;

    const tangentX = barDx / barLength;
    const tangentY = barDy / barLength;
    const tangential = ball.vx * tangentX + ball.vy * tangentY;
    ball.vx += tangentX * tangential * 0.015;
    ball.vy += tangentY * tangential * 0.015;

    const lastHit = ball.hits.get(bar.id) || 0;
    if (!silent && now - lastHit > 90) {
      const speed = Math.hypot(ball.vx, ball.vy);
      const intensity = clamp(speed / 850, 0, 1);
      playNote(bar, intensity, closest.x);
      addParticles(closest.x, closest.y, barVisualHue(bar), 8);
      bar.flash = 1;
      ball.hits.set(bar.id, now);
      hideBarForPlayback(bar);
    }

    return true;
  }

  function createGhostBall(dimension) {
    return {
      id: -1,
      measure: state.activeMeasure,
      dimension,
      x: state.hole.x,
      y: state.hole.y + state.hole.radius * 0.5,
      vx: 0,
      vy: 94,
      radius: 10,
      hue: dimensionHue(dimension),
      life: 0,
      hits: new Map(),
    };
  }

  function ghostBars(dimension, excludeBarId = null) {
    return state.bars
      .filter(
        (bar) =>
          barMeasure(bar) === state.activeMeasure &&
          bar.dimension === dimension &&
          bar.id !== excludeBarId,
      )
      .map((bar) => ({ ...bar, flash: 0 }));
  }

  function simulateGhost(targetTime, dimension, options = {}) {
    const ball = createGhostBall(dimension);
    const bars = ghostBars(dimension, options.excludeBarId);
    const hiddenBarIds = new Set();
    const gravity = 980 * Number(gravitySlider.value);
    let time = 0;

    while (time < targetTime) {
      const dt = Math.min(FIXED_TIMESTEP, targetTime - time);
      ball.life += dt;
      ball.vy += gravity * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      time += dt;

      for (const bar of bars) {
        if (hiddenBarIds.has(bar.id)) continue;

        const hit = collideBallWithBar(ball, bar, time * 1000, true);
        if (hit && bar.id === options.stopOnBarId) {
          return { ball, hitBar: bar, hitTime: time };
        }
        if (hit) {
          hiddenBarIds.add(bar.id);
        }
      }
    }

    return { ball, hitBar: null, hitTime: null };
  }

  function estimateUnhitBarTime(bar) {
    const gravity = 980 * Number(gravitySlider.value);
    const y = (bar.y1 + bar.y2) * 0.5;
    const startY = state.hole.y + state.hole.radius * 0.5;
    const dy = y - startY;

    if (dy <= 0 || gravity <= 0) return quantizeStepDuration();

    return Math.max(quantizeStepDuration(), (-94 + Math.sqrt(94 * 94 + 2 * gravity * dy)) / gravity);
  }

  function quantizeSelectedBar() {
    const bar = getSelectedBar();
    if (!bar) return;

    const grid = quantizeStepDuration();
    const maxTime = Math.max(8, grid * 64);
    const currentHit = simulateGhost(maxTime, bar.dimension, { stopOnBarId: bar.id });
    const sourceTime = currentHit.hitTime ?? estimateUnhitBarTime(bar);
    const sourceMusicalTime = sourceTime - ballLeadInDuration();
    const targetMusicalTime = clamp(
      Math.round(sourceMusicalTime / grid) * grid,
      0,
      currentMeasureDuration(),
    );
    const targetTime = ballLeadInDuration() + targetMusicalTime;
    const target = simulateGhost(targetTime, bar.dimension, { excludeBarId: bar.id });
    const barDx = bar.x2 - bar.x1;
    const barDy = bar.y2 - bar.y1;
    const length = Math.hypot(barDx, barDy);

    if (length < 0.001) return;

    const tangentX = barDx / length;
    const tangentY = barDy / length;
    let normalX = -tangentY;
    let normalY = tangentX;

    if (target.ball.vx * normalX + target.ball.vy * normalY >= 0) {
      normalX *= -1;
      normalY *= -1;
    }

    const contactOffset = target.ball.radius + 8 * 0.5 + 0.6;
    const contactX = target.ball.x - normalX * contactOffset;
    const contactY = target.ball.y - normalY * contactOffset;
    const nearest = closestPointOnSegment(contactX, contactY, bar);
    const contactT = clamp(nearest.t, 0, 1);

    bar.x1 = contactX - tangentX * length * contactT;
    bar.y1 = contactY - tangentY * length * contactT;
    bar.x2 = contactX + tangentX * length * (1 - contactT);
    bar.y2 = contactY + tangentY * length * (1 - contactT);
    bar.flash = 1;
    updateBarTone(bar);
    updateButtons();
  }

  function updatePhysics(dt, now) {
    const gravity = 980 * Number(gravitySlider.value);
    const ballLifeLimit = state.playing || state.auditioning ? currentPlaybackMeasureDuration() : 90;

    for (const ball of state.balls) {
      ball.life += dt;
      ball.vy += gravity * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      for (const bar of state.bars) {
        if (barMeasure(bar) !== ball.measure) continue;
        if (bar.dimension !== ball.dimension) continue;
        if (isBarHiddenByPlayback(bar)) continue;
        collideBallWithBar(ball, bar, now);
      }
    }

    state.balls = state.balls.filter(
      (ball) =>
        ball.measure < state.measureCount &&
        ball.dimension < state.dimensionCount &&
        ball.life < ballLifeLimit,
    );

    for (const bar of state.bars) {
      bar.flash = Math.max(0, bar.flash - dt * 4.6);
    }

    state.hole.pulse = Math.max(0, state.hole.pulse - dt * 4.2);

    for (const particle of state.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += gravity * 0.18 * dt;
      particle.vx *= 0.985;
      particle.vy *= 0.985;
    }

    state.particles = state.particles.filter((particle) => particle.life > 0);
    finishAuditionIfDone();

    if (state.playing) {
      state.playbackElapsed += dt;
      prepareUpcomingMeasure();
      updateMetronome();
      if (state.playbackElapsed >= currentPlaybackMeasureDuration()) {
        advancePlaybackMeasure();
      }
    }
  }

  function drawBackground() {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "rgba(247, 243, 232, 0.09)";
    ctx.lineWidth = 1;

    let gap = 34;
    while (gap * state.camera.zoom < 22) gap *= 2;
    while (gap * state.camera.zoom > 82 && gap > 8.5) gap /= 2;

    const topLeft = screenToWorld(0, 0);
    const bottomRight = screenToWorld(state.width, state.height);
    const startY = Math.floor(topLeft.y / gap) * gap;
    const endY = Math.ceil(bottomRight.y / gap) * gap;
    const startX = Math.floor(topLeft.x / gap) * gap;
    const endX = Math.ceil(bottomRight.x / gap) * gap;

    for (let y = startY; y <= endY; y += gap) {
      const screenY = worldToScreen(0, y).y;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(screenY) + 0.5);
      ctx.lineTo(state.width, Math.round(screenY) + 0.5);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.2;
    for (let x = startX; x <= endX; x += gap) {
      const screenX = worldToScreen(x, 0).x;
      ctx.beginPath();
      ctx.moveTo(Math.round(screenX) + 0.5, 0);
      ctx.lineTo(Math.round(screenX) + 0.5, state.height);
      ctx.stroke();
    }

    ctx.restore();
  }

  function strokeBar(bar, alpha = 1, dashed = false) {
    const isSelected = state.selectedBarId === bar.id;
    const isHovered = state.hover?.barId === bar.id;
    const isMuted = isDimensionMuted(bar.dimension);
    alpha *= isMuted ? 0.42 : 1;
    const hue = barVisualHue(bar);
    const accentHue = barVisualAccentHue(bar);
    const gradient = ctx.createLinearGradient(bar.x1, bar.y1, bar.x2, bar.y2);
    gradient.addColorStop(0, `hsla(${hue}, 78%, 62%, ${alpha})`);
    gradient.addColorStop(1, `hsla(${accentHue}, 82%, 66%, ${alpha})`);

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = screenUnits(barStrokeWidth(bar, isHovered));
    ctx.strokeStyle = gradient;
    ctx.shadowColor = `hsla(${hue}, 90%, 62%, ${0.24 + (bar.flash || 0) * 0.46})`;
    ctx.shadowBlur = screenUnits(12 + (bar.flash || 0) * 24);
    if (dashed) ctx.setLineDash([screenUnits(14), screenUnits(12)]);
    ctx.beginPath();
    ctx.moveTo(bar.x1, bar.y1);
    ctx.lineTo(bar.x2, bar.y2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    const handleRadius = screenUnits(isSelected || isHovered ? 8 : 6);
    const ringRadius = handleRadius + screenUnits(3);
    ctx.lineWidth = screenUnits(2);
    ctx.shadowColor = `hsla(${hue}, 80%, 62%, ${isSelected ? 0.44 : 0.22})`;
    ctx.shadowBlur = screenUnits(isSelected ? 18 : 10);

    for (const [x, y] of [
      [bar.x1, bar.y1],
      [bar.x2, bar.y2],
    ]) {
      ctx.fillStyle = `hsla(${accentHue}, 82%, 70%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, handleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(247, 243, 232, ${isSelected || isHovered ? 0.72 : 0.38})`;
      ctx.beginPath();
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (isSelected) {
      const midX = (bar.x1 + bar.x2) * 0.5;
      const midY = (bar.y1 + bar.y2) * 0.5;
      const label = `${bar.noteName}  B${normalizeBarBounce(bar.bounce).toFixed(2)}`;
      ctx.font = `${screenUnits(11)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(247, 243, 232, 0.82)";
      ctx.fillText(label, midX, midY - screenUnits(18));
    }
    ctx.restore();
  }

  function drawBars() {
    const visibleBars = state.bars.filter(
      (bar) =>
        isBarInVisibleMeasure(bar) &&
        bar.dimension < state.dimensionCount &&
        !isBarHiddenByPlayback(bar),
    );

    for (const bar of visibleBars) {
      if (bar.dimension !== state.activeDimension) {
        strokeBar(bar, 0.28);
      }
    }

    for (const bar of visibleBars) {
      if (bar.dimension === state.activeDimension) {
        strokeBar(bar);
      }
    }

    if (state.pointer?.mode === "bar-new" && state.pointer.drawing) {
      const defaults = latestBarDefaults();
      const preview = {
        x1: state.pointer.x1,
        y1: state.pointer.y1,
        x2: state.pointer.x2,
        y2: state.pointer.y2,
        length: distance(state.pointer.x1, state.pointer.y1, state.pointer.x2, state.pointer.y2),
        measure: state.activeMeasure,
        dimension: state.activeDimension,
        octaveShift: defaults.octaveShift,
        bounce: defaults.bounce,
        timbre: defaults.timbre,
        flash: 0,
      };
      strokeBar(preview, 0.86, true);
      const note = lengthToNote(preview.length, preview.octaveShift);
      noteName.textContent = note.name;
    }
  }

  function drawHole() {
    const { x, y, radius, pulse, dragging } = state.hole;
    const stretch = 0.55;
    const glow = dragging ? 0.46 : 0.28 + pulse * 0.4;

    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = `rgba(94, 209, 191, ${glow})`;
    ctx.shadowBlur = screenUnits(24 + pulse * 18);

    const outer = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 1.15);
    outer.addColorStop(0, "rgba(10, 14, 14, 0.98)");
    outer.addColorStop(0.54, "rgba(5, 8, 9, 0.98)");
    outer.addColorStop(0.7, "rgba(94, 209, 191, 0.76)");
    outer.addColorStop(1, "rgba(244, 201, 93, 0.18)");

    ctx.scale(1, stretch);
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(0, 0, radius + pulse * 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = screenUnits(dragging ? 4 : 3);
    ctx.strokeStyle = `rgba(247, 243, 232, ${dragging ? 0.72 : 0.48})`;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 1 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.42 + pulse * 0.28;
    ctx.strokeStyle = "rgba(244, 201, 93, 0.9)";
    ctx.lineWidth = screenUnits(2);
    ctx.setLineDash([screenUnits(6), screenUnits(10)]);
    ctx.rotate((performance.now() / 1500) % (Math.PI * 2));
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function drawBalls() {
    for (const ball of state.balls) {
      const isCurrentBall = ball.measure === currentMeasureIndex();
      const isPreparedBall = state.playing && ball.measure === state.nextPreparedMeasure;
      if (!isCurrentBall && !isPreparedBall) continue;
      if (ball.dimension >= state.dimensionCount) continue;
      const mutedAlpha = isDimensionMuted(ball.dimension) ? 0.36 : 1;
      const gradient = ctx.createRadialGradient(
        ball.x - ball.radius * 0.35,
        ball.y - ball.radius * 0.45,
        2,
        ball.x,
        ball.y,
        ball.radius * 1.4,
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${0.95 * mutedAlpha})`);
      gradient.addColorStop(0.35, `hsla(${ball.hue}, 86%, 66%, ${0.96 * mutedAlpha})`);
      gradient.addColorStop(1, `hsla(${ball.hue + 24}, 80%, 42%, ${0.94 * mutedAlpha})`);

      ctx.save();
      ctx.shadowColor = `hsla(${ball.hue}, 80%, 60%, 0.35)`;
      ctx.shadowBlur = 18;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = screenUnits(2);
      ctx.strokeStyle = `hsla(${dimensionHue(ball.dimension)}, 90%, 72%, ${0.9 * mutedAlpha})`;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + screenUnits(3 + ball.dimension * 2), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawParticles() {
    ctx.save();
    for (const particle of state.particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${particle.hue}, 88%, 66%)`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function isPointInHole(x, y) {
    const dx = x - state.hole.x;
    const dy = (y - state.hole.y) / 0.72;
    return Math.hypot(dx, dy) <= state.hole.radius + screenUnits(12);
  }

  function hitTestBar(point) {
    if (state.playing) return null;

    const endpointRadius = screenUnits(15);
    const bodyRadius = screenUnits(12);

    for (let i = state.bars.length - 1; i >= 0; i -= 1) {
      const bar = state.bars[i];
      if (barMeasure(bar) !== state.activeMeasure) continue;
      if (bar.dimension !== state.activeDimension || bar.dimension >= state.dimensionCount) continue;
      if (isBarHiddenByPlayback(bar)) continue;

      if (distance(point.x, point.y, bar.x1, bar.y1) <= endpointRadius) {
        return { type: "bar-end", bar, end: "start", barId: bar.id };
      }

      if (distance(point.x, point.y, bar.x2, bar.y2) <= endpointRadius) {
        return { type: "bar-end", bar, end: "end", barId: bar.id };
      }

      const closest = closestPointOnSegment(point.x, point.y, bar);
      const dist = distance(point.x, point.y, closest.x, closest.y);
      if (dist <= bodyRadius) {
        return { type: "bar-move", bar, barId: bar.id };
      }
    }

    return null;
  }

  function updateHover(screenPoint) {
    const worldPoint = screenToWorld(screenPoint.x, screenPoint.y);

    if (isPointInHole(worldPoint.x, worldPoint.y)) {
      state.hover = { type: "hole" };
      canvas.style.cursor = "grab";
      return;
    }

    const barHit = hitTestBar(worldPoint);
    if (barHit) {
      state.hover = barHit;
      canvas.style.cursor = "grab";
      return;
    }

    state.hover = null;
    canvas.style.cursor = state.spaceDown ? "grab" : "crosshair";
  }

  function render() {
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    drawBackground();
    ctx.save();
    applyWorldTransform();
    drawBars();
    drawHole();
    drawParticles();
    drawBalls();
    ctx.restore();
  }

  function frame(time) {
    const dt = clamp((time - state.lastTime) / 1000, 0, 0.2);
    state.lastTime = time;
    state.physicsAccumulator = Math.min(state.physicsAccumulator + dt, 0.25);

    while (state.physicsAccumulator >= FIXED_TIMESTEP) {
      state.physicsTime += FIXED_TIMESTEP;
      updatePhysics(FIXED_TIMESTEP, state.physicsTime * 1000);
      state.physicsAccumulator -= FIXED_TIMESTEP;
    }

    render();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointerdown", (event) => {
    ensureAudioRunning();
    canvas.setPointerCapture(event.pointerId);
    const screenPoint = pointerPoint(event);
    const worldPoint = screenToWorld(screenPoint.x, screenPoint.y);

    if (event.button === 1 || event.button === 2 || event.shiftKey || state.spaceDown) {
      canvas.style.cursor = "grabbing";
      state.pointer = {
        id: event.pointerId,
        mode: "pan",
        screenX1: screenPoint.x,
        screenY1: screenPoint.y,
        cameraX: state.camera.x,
        cameraY: state.camera.y,
        moved: false,
      };
      return;
    }

    if (state.playing) {
      state.pointer = null;
      return;
    }

    if (isPointInHole(worldPoint.x, worldPoint.y)) {
      state.hole.dragging = true;
      state.selectedBarId = null;
      updateButtons();
      canvas.style.cursor = "grabbing";
      state.pointer = {
        id: event.pointerId,
        mode: "hole",
        screenX1: screenPoint.x,
        screenY1: screenPoint.y,
        screenX2: screenPoint.x,
        screenY2: screenPoint.y,
        offsetX: worldPoint.x - state.hole.x,
        offsetY: worldPoint.y - state.hole.y,
        moved: false,
      };
      return;
    }

    const barHit = hitTestBar(worldPoint);
    if (barHit?.type === "bar-end") {
      state.selectedBarId = barHit.bar.id;
      updateButtons();
      canvas.style.cursor = "grabbing";
      state.pointer = {
        id: event.pointerId,
        mode: "bar-end",
        bar: barHit.bar,
        end: barHit.end,
        screenX1: screenPoint.x,
        screenY1: screenPoint.y,
        moved: false,
      };
      return;
    }

    if (barHit?.type === "bar-move") {
      state.selectedBarId = barHit.bar.id;
      updateButtons();
      canvas.style.cursor = "grabbing";
      state.pointer = {
        id: event.pointerId,
        mode: "bar-move",
        bar: barHit.bar,
        screenX1: screenPoint.x,
        screenY1: screenPoint.y,
        startWorldX: worldPoint.x,
        startWorldY: worldPoint.y,
        original: {
          x1: barHit.bar.x1,
          y1: barHit.bar.y1,
          x2: barHit.bar.x2,
          y2: barHit.bar.y2,
        },
        moved: false,
      };
      return;
    }

    state.selectedBarId = null;
    updateButtons();

    state.pointer = {
      id: event.pointerId,
      mode: "bar-new",
      x1: worldPoint.x,
      y1: worldPoint.y,
      x2: worldPoint.x,
      y2: worldPoint.y,
      screenX1: screenPoint.x,
      screenY1: screenPoint.y,
      screenX2: screenPoint.x,
      screenY2: screenPoint.y,
      drawing: false,
    };
  });

  canvas.addEventListener("pointermove", (event) => {
    const screenPoint = pointerPoint(event);
    const worldPoint = screenToWorld(screenPoint.x, screenPoint.y);

    if (!state.pointer) {
      updateHover(screenPoint);
      return;
    }

    if (state.pointer.id !== event.pointerId) return;

    state.pointer.screenX2 = screenPoint.x;
    state.pointer.screenY2 = screenPoint.y;

    if (state.pointer.mode === "pan") {
      const dx = screenPoint.x - state.pointer.screenX1;
      const dy = screenPoint.y - state.pointer.screenY1;
      state.pointer.moved = Math.hypot(dx, dy) > 4;
      state.camera.x = state.pointer.cameraX + dx;
      state.camera.y = state.pointer.cameraY + dy;
      return;
    }

    if (state.pointer.mode === "hole") {
      state.pointer.moved = distance(
        state.pointer.screenX1,
        state.pointer.screenY1,
        screenPoint.x,
        screenPoint.y,
      ) > 6;
      if (state.pointer.moved) {
        state.hole.x = worldPoint.x - state.pointer.offsetX;
        state.hole.y = worldPoint.y - state.pointer.offsetY;
        keepHoleInBounds();
      }
      return;
    }

    if (state.pointer.mode === "bar-end") {
      const bar = state.pointer.bar;
      snapBarEnd(bar, state.pointer.end, worldPoint.x, worldPoint.y);
      updateBarPositionReadout();
      return;
    }

    if (state.pointer.mode === "bar-move") {
      const dx = worldPoint.x - state.pointer.startWorldX;
      const dy = worldPoint.y - state.pointer.startWorldY;
      const { bar, original } = state.pointer;
      bar.x1 = original.x1 + dx;
      bar.y1 = original.y1 + dy;
      bar.x2 = original.x2 + dx;
      bar.y2 = original.y2 + dy;
      updateBarPositionReadout();
      return;
    }

    if (state.pointer.mode === "bar-new") {
      const point = snappedEndpoint(state.pointer.x1, state.pointer.y1, worldPoint.x, worldPoint.y);
      state.pointer.x2 = point.x;
      state.pointer.y2 = point.y;
      state.pointer.drawing = distance(
        state.pointer.screenX1,
        state.pointer.screenY1,
        screenPoint.x,
        screenPoint.y,
      ) > 12;
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    if (!state.pointer || state.pointer.id !== event.pointerId) return;

    const pointer = state.pointer;
    const screenPoint = pointerPoint(event);
    const worldPoint = screenToWorld(screenPoint.x, screenPoint.y);

    if (pointer.mode === "pan") {
      state.pointer = null;
      updateHover(screenPoint);
      return;
    }

    if (pointer.mode === "hole") {
      state.hole.dragging = false;
      if (!pointer.moved) {
        startAuditionFromHole();
      }
      state.pointer = null;
      updateHover(screenPoint);
      return;
    }

    if (pointer.mode === "bar-end" || pointer.mode === "bar-move") {
      state.pointer = null;
      updateHover(screenPoint);
      updateButtons();
      return;
    }

    if (pointer.mode === "bar-new") {
      const point = snappedEndpoint(pointer.x1, pointer.y1, worldPoint.x, worldPoint.y);
      pointer.x2 = point.x;
      pointer.y2 = point.y;
    }

    const length = distance(pointer.x1, pointer.y1, pointer.x2, pointer.y2);
    if (pointer.mode === "bar-new" && pointer.drawing && length >= 18) {
      addBar(pointer.x1, pointer.y1, pointer.x2, pointer.y2);
    }

    state.pointer = null;
    updateHover(screenPoint);
  });

  canvas.addEventListener("pointercancel", () => {
    state.hole.dragging = false;
    state.pointer = null;
    state.hover = null;
    canvas.style.cursor = "crosshair";
  });

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const screenPoint = pointerPoint(event);

      if (event.ctrlKey || event.metaKey) {
        zoomAt(screenPoint.x, screenPoint.y, Math.exp(-event.deltaY * 0.002));
      } else {
        state.camera.x -= event.deltaX;
        state.camera.y -= event.deltaY;
      }

      updateHover(screenPoint);
    },
    { passive: false },
  );

  songMenuButton.addEventListener("click", () => {
    void setSongMenuOpen(songMenu.hidden);
  });

  songMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  settingsButton.addEventListener("click", () => {
    setSettingsDialogOpen(settingsDialog.hidden);
  });

  settingsCloseButton.addEventListener("click", () => {
    setSettingsDialogOpen(false);
  });

  settingsDialog.addEventListener("click", (event) => {
    if (event.target === settingsDialog) {
      setSettingsDialogOpen(false);
    }
  });

  duplicateDimensionMenuButton.addEventListener("click", () => {
    setDuplicateDialogOpen(true);
  });

  duplicateCloseButton.addEventListener("click", () => {
    setDuplicateDialogOpen(false);
  });

  duplicateDialog.addEventListener("click", (event) => {
    if (event.target === duplicateDialog) {
      setDuplicateDialogOpen(false);
    }
  });

  duplicateApplyButton.addEventListener("click", () => {
    duplicateCurrentMeasureDimension();
  });

  overwriteSongButton.addEventListener("click", () => {
    void overwriteCurrentSong();
  });

  songSaveMenuButton.addEventListener("click", () => {
    void showSongMenuView("save");
  });

  newSongButton.addEventListener("click", () => {
    void createNewSong();
  });

  openSongMenuButton.addEventListener("click", () => {
    void showSongMenuView("open");
  });

  exportSongButton.addEventListener("click", () => {
    void showSongMenuView("export");
  });

  importSongButton.addEventListener("click", () => {
    void showSongMenuView("import");
  });

  chooseImportFileButton.addEventListener("click", () => {
    songImportInput.value = "";
    songImportInput.click();
  });

  importTextButton.addEventListener("click", () => {
    void importSongText(importJsonInput.value, "貼り付け");
  });

  downloadExportButton.addEventListener("click", () => {
    void saveExportJson();
  });

  copyExportButton.addEventListener("click", () => {
    void copyExportJson();
  });

  songImportInput.addEventListener("change", () => {
    void importSongFile(songImportInput.files?.[0]);
  });

  songMenuBackButtons.forEach((button) => {
    button.addEventListener("click", () => {
      void showSongMenuView("root");
    });
  });

  saveSongButton.addEventListener("click", () => {
    void saveSongAs();
  });

  songNameInput.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      void saveSongAs();
    } else if (event.key === "Escape") {
      event.preventDefault();
      void setSongMenuOpen(false);
    }
  });

  songList.addEventListener("click", (event) => {
    const loadButton = event.target.closest("[data-load-song]");
    const deleteButton = event.target.closest("[data-delete-song]");

    if (loadButton) {
      void loadSong(loadButton.dataset.loadSong);
    } else if (deleteButton) {
      void deleteSong(deleteButton.dataset.deleteSong);
    }
  });

  document.addEventListener("click", (event) => {
    if (songMenu.hidden) return;
    if (songMenu.contains(event.target) || songMenuButton.contains(event.target)) return;
    void setSongMenuOpen(false);
  });

  playButton.addEventListener("click", () => {
    togglePlayback();
  });

  undoButton.addEventListener("click", () => {
    if (state.playing) stopPlayback();
    if (state.auditioning) {
      state.auditioning = false;
      state.playHiddenBarIds.clear();
      state.balls = [];
      state.particles = [];
    }
    const index = state.bars.findLastIndex(
      (bar) => barMeasure(bar) === state.activeMeasure && bar.dimension === state.activeDimension,
    );
    const [removed] = index >= 0 ? state.bars.splice(index, 1) : [];
    if (removed) {
      state.playHiddenBarIds.delete(removed.id);
    }
    if (removed?.id === state.selectedBarId) {
      state.selectedBarId = null;
    }
    updateButtons();
  });

  quantizeButton.addEventListener("click", () => {
    quantizeSelectedBar();
  });

  clearButton.addEventListener("click", () => {
    const bar = getSelectedBar();
    if (!bar) return;

    if (state.auditioning) {
      state.auditioning = false;
      state.playHiddenBarIds.clear();
      state.balls = [];
      state.particles = [];
    }

    const index = state.bars.findIndex((item) => item.id === bar.id);
    if (index >= 0) {
      state.bars.splice(index, 1);
    }
    state.selectedBarId = null;
    state.hover = null;
    state.playHiddenBarIds.delete(bar.id);
    noteName.textContent = "--";
    updateButtons();
  });

  muteButton.addEventListener("click", () => {
    state.muted = !state.muted;
    updateButtons();
  });

  bpmInput.addEventListener("change", () => {
    bpmInput.value = String(Math.round(currentBpm()));
    updateBarPositionReadout();
  });

  gravitySlider.addEventListener("input", () => {
    updateBarPositionReadout();
  });

  quantizeGridSelect.addEventListener("change", () => {
    updateBarPositionReadout();
  });

  metronomeCheckbox.addEventListener("change", () => {
    if (!state.playing) return;

    const currentBeatDuration = beatDuration();
    const musicalElapsed = state.playbackElapsed - ballLeadInDuration();
    state.nextMetronomeBeat =
      musicalElapsed < 0
        ? 0
        : clamp(Math.floor(musicalElapsed / currentBeatDuration) + 1, 1, BEATS_PER_MEASURE);
  });

  barOctaveSelect.addEventListener("change", () => {
    const bar = getSelectedBar();
    if (!bar) return;

    bar.octaveShift = normalizeOctaveShift(barOctaveSelect.value);
    updateBarTone(bar);
    updateButtons();
  });

  barTimbreSelect.addEventListener("change", () => {
    const timbre = normalizeBarTimbre(barTimbreSelect.value);
    const bar = getSelectedBar();
    state.defaultBarTimbre = timbre;
    if (!bar) return;

    bar.timbre = timbre;
    updateButtons();
  });

  barBounceSlider.addEventListener("input", () => {
    const bar = getSelectedBar();
    updateBarBounceOutput();
    if (!bar) return;

    bar.bounce = normalizeBarBounce(barBounceSlider.value);
  });

  zoomOutButton.addEventListener("click", () => {
    zoomAt(state.width * 0.5, state.height * 0.5, 0.82);
  });

  zoomResetButton.addEventListener("click", () => {
    resetCamera();
  });

  zoomInButton.addEventListener("click", () => {
    zoomAt(state.width * 0.5, state.height * 0.5, 1.22);
  });

  measureCountSelect.addEventListener("change", () => {
    if (state.playing) stopPlayback();
    state.auditioning = false;
    state.playHiddenBarIds.clear();
    state.measureCount = clamp(Number(measureCountSelect.value) || DEFAULT_MEASURE_COUNT, 1, 8);
    state.activeMeasure = normalizeMeasure(state.activeMeasure);
    state.selectedBarId = null;
    state.hover = null;
    state.balls = [];
    state.particles = [];
    updateMeasureOptions();
    updateButtons();
  });

  activeMeasureSelect.addEventListener("change", () => {
    if (state.playing) stopPlayback();
    state.auditioning = false;
    state.playHiddenBarIds.clear();
    state.activeMeasure = normalizeMeasure(activeMeasureSelect.value);
    state.selectedBarId = null;
    state.hover = null;
    state.balls = [];
    state.particles = [];
    updateMeasureOptions();
    updateButtons();
  });

  dimensionCountSelect.addEventListener("change", () => {
    if (state.playing) stopPlayback();
    state.auditioning = false;
    state.playHiddenBarIds.clear();
    state.dimensionCount = clamp(Number(dimensionCountSelect.value) || 1, 1, 4);
    state.activeDimension = normalizeDimension(state.activeDimension);
    state.selectedBarId = null;
    state.hover = null;
    updateDimensionOptions();
    updateButtons();
  });

  dimensionMuteGroup.addEventListener("click", (event) => {
    const button = event.target.closest(".dimension-mute");
    if (!button) return;

    const dimension = Number(button.dataset.dimension);
    if (!Number.isInteger(dimension)) return;

    state.mutedDimensions[dimension] = !isDimensionMuted(dimension);
    updateDimensionOptions();
  });

  activeDimensionSelect.addEventListener("change", () => {
    if (state.playing) stopPlayback();
    state.auditioning = false;
    state.playHiddenBarIds.clear();
    state.activeDimension = normalizeDimension(activeDimensionSelect.value);
    state.selectedBarId = null;
    state.hover = null;
    updateDimensionOptions();
    updateButtons();
  });

  scaleSelect.addEventListener("change", () => {
    if (state.playing) stopPlayback();
    if (state.auditioning) {
      state.auditioning = false;
      state.playHiddenBarIds.clear();
      state.balls = [];
      state.particles = [];
    }

    for (const bar of state.bars) {
      resnapBarLength(bar);
    }
    updateButtons();
  });

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !duplicateDialog.hidden) {
      setDuplicateDialogOpen(false);
      return;
    }

    if (event.key === "Escape" && !settingsDialog.hidden) {
      setSettingsDialogOpen(false);
      return;
    }

    if (event.key === "Escape" && !songMenu.hidden) {
      void setSongMenuOpen(false);
      return;
    }

    if (event.code === "Space" && !event.repeat) {
      state.spaceDown = true;
      canvas.style.cursor = "grab";
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
      state.spaceDown = false;
      canvas.style.cursor = "crosshair";
    }
  });
  resize();
  updateCurrentSongName();
  updateMeasureOptions();
  updateDimensionOptions();
  updateButtons();
  requestAnimationFrame(frame);
})();
