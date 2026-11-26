// Synthesised sound: no audio files, everything comes from WebAudio.
// Engine drone (two detuned saws through a low-pass), a ring chime,
// a landing thud and a crash crunch. M toggles mute.

export function createAudio() {
  let ctx = null;
  let engineOsc1 = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // Engine: two saws a few Hz apart, low-passed, quiet.
    engineOsc1 = ctx.createOscillator();
    engineOsc2 = ctx.createOscillator();
    engineOsc1.type = 'sawtooth';
    engineOsc2.type = 'sawtooth';
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    engineFilter.Q.value = 1.2;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc1.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc1.start();
    engineOsc2.start();
    started = true;
    return ctx;
  }

  // Call from the first user gesture (or shot mode); safe to call often.
  function unlock() {
    const c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }

  // Continuous engine sound, driven by throttle and speed each frame.
  function setEngine(throttle, speedNorm, running) {
    if (!ctx || muted || !started) return;
    const t = ctx.currentTime;
    const freq = 55 + throttle * 75 + speedNorm * 22;
    engineOsc1.frequency.setTargetAtTime(freq, t, 0.08);
    engineOsc2.frequency.setTargetAtTime(freq * 1.007 + 2, t, 0.08);
    engineFilter.frequency.setTargetAtTime(220 + throttle * 900, t, 0.1);
    const level = running ? 0.045 + throttle * 0.05 : 0;
    engineGain.gain.setTargetAtTime(level, t, 0.12);
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function ringChime() {
    blip(1318, 0.5, 'sine', 0.22);
    blip(1760, 0.6, 'sine', 0.16, 0.07);
    blip(2637, 0.4, 'sine', 0.08, 0.14);
  }

  function thud() {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t0);
    osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.22);
    gain.gain.setValueAtTime(0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.35);
  }

  function crashSound() {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const len = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(t0);
    blip(70, 0.6, 'sawtooth', 0.25);
  }

  function toggleMute() {
    muted = !muted;
    if (ctx && engineGain) engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    return muted;
  }

  return { unlock, setEngine, ringChime, thud, crashSound, toggleMute, isMuted: () => muted };
}
