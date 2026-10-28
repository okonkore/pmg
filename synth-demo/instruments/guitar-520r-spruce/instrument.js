/** Fixed photo-derived 520R strings; independent whole-shell renders per note. */
export async function loadGuitar(context, { destination = context.destination, onProgress = () => {} } = {}) {
  const response = await fetch(new URL('./manifest.json?v=low-tension-1', import.meta.url));
  if (!response.ok) throw new Error(`520R manifest: HTTP ${response.status}`);
  const manifest = await response.json();
  if (!Array.isArray(manifest.notes) || !manifest.notes.length) throw new Error('520R音源の一覧を読み込めませんでした');
  const buffers = new Map();
  let next = 0, completed = 0, failed = false;
  // Bound simultaneous requests/decodes for mobile browsers.
  const loads = await Promise.allSettled(Array.from({ length: Math.min(4, manifest.notes.length) }, async () => {
    while (!failed && next < manifest.notes.length) {
      try {
      const note = manifest.notes[next++];
      const audio = await fetch(new URL(note.file, import.meta.url));
      if (!audio.ok) throw new Error(`520R sample ${note.midi}: HTTP ${audio.status}`);
      buffers.set(note.midi, await context.decodeAudioData(await audio.arrayBuffer()));
      onProgress(++completed, manifest.notes.length);
      } catch (error) { failed = true; throw error; }
    }
  }));
  const failure = loads.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
  const midis = [...buffers.keys()].sort((a, b) => a - b);
  return {
    manifest,
    play({ midi = 64, gain = 1, when = context.currentTime } = {}) {
      if (!Number.isFinite(midi) || !Number.isFinite(gain) || gain < 0 || !Number.isFinite(when)) throw new TypeError('Invalid guitar note parameters');
      const reference = buffers.has(midi) ? midi : midis.reduce((best, value) => Math.abs(value - midi) < Math.abs(best - midi) ? value : best);
      const source = context.createBufferSource(), volume = context.createGain();
      source.buffer = buffers.get(reference);
      source.playbackRate.value = 2 ** ((midi - reference) / 12);
      volume.gain.value = gain;
      source.connect(volume).connect(destination);
      let ended = false, releaseAt = Infinity;
      source.onended = () => { ended = true; source.disconnect(); volume.disconnect(); };
      // Note-off follows the transport clock; a short fade prevents clicks.
      source.release = (at = context.currentTime) => {
        if (!Number.isFinite(at)) throw new TypeError('Invalid guitar release time');
        at = Math.max(at, context.currentTime);
        if (ended || at >= releaseAt) return;
        releaseAt = at;
        volume.gain.cancelScheduledValues(at);
        volume.gain.setValueAtTime(gain, at);
        volume.gain.linearRampToValueAtTime(0, at + 0.012);
        source.stop(at + 0.012);
      };
      source.start(Math.max(when, context.currentTime));
      return source;
    },
  };
}
