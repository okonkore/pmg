/** Frozen whole-shell listening B. Sample playback, not a real-time physics solver. */
export async function loadGuitar(context, { destination = context.destination } = {}) {
  const response = await fetch(new URL('./e4.wav', import.meta.url));
  if (!response.ok) throw new Error(`Guitar sample: HTTP ${response.status}`);
  const buffer = await context.decodeAudioData(await response.arrayBuffer());
  return {
    /** Call context.resume() in the user gesture before playing (including iPhone). */
    play({ midi = 64, gain = 1, when = context.currentTime } = {}) {
      if (!Number.isFinite(midi) || !Number.isFinite(gain) || gain < 0 || !Number.isFinite(when)) {
        throw new TypeError('Invalid guitar note parameters');
      }
      const source = context.createBufferSource();
      const volume = context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = 2 ** ((midi - 64) / 12);
      volume.gain.value = gain;
      source.connect(volume).connect(destination);
      source.onended = () => { source.disconnect(); volume.disconnect(); };
      source.start(Math.max(when, context.currentTime));
      return source;
    },
    buffer,
    referenceMidi: 64,
  };
}
