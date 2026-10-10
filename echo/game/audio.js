import { DEFAULT_SETTINGS } from '../contracts.js';

// Synthesized sound for ECHO (vision §11.1 P0, §5.2 #3, §9.3). No audio files: every sound is
// built from oscillators, a generated noise buffer and filters, so there are no licences to track
// and nothing counts against Qollab's 100-file cap.
//
// Autoplay rule (§11.1): createAudio() creates NO AudioContext. Until unlock() is called from a user
// gesture, play/setZone/setVolume only validate and remember; nothing sounds and nothing throws (except
// on a misspelt id, which always throws so the bug surfaces at the call site).
//
// Captions are story-ui's (§11.1 "always captioned"): pass onCue to hear about every cue, played or
// not, so a muted or locked player still gets the caption.

export const AUDIO_ZONES = Object.freeze(['alley', 'substation', 'relay', 'rooftop']);

// One-shot cues, plus two §9.3 world changes that are also cues and latch until reset():
// reactor_audio_begins (starts the reactor bed in the relay) and music_swell (the ending).
export const CUE_IDS = Object.freeze([
  'terminal_wake', 'terminal_input', 'terminal_close', 'radio_static_burst',
  'ui_success', 'ui_failure', 'door_open', 'reactor_audio_begins', 'music_swell',
]);
const LATCHED = new Set(['reactor_audio_begins', 'music_swell']);

const ZONE_MIX = {
  //            rain  muffled hum   drone wind  rumble reactor×
  alley:      [0.50, 0.00,   0.10, 0.00, 0.00, 0.25,  0.00],
  substation: [0.06, 0.40,   0.35, 0.10, 0.00, 0.10,  0.35],
  relay:      [0.00, 0.15,   0.25, 0.30, 0.00, 0.05,  1.00],
  rooftop:    [0.45, 0.00,   0.05, 0.00, 0.35, 0.35,  0.08],
};
const BED_GAIN = 0.35;      // ambience sits well under the cues: "low-volume" (§11.1)
const CUE_GAIN = 0.6;
const CROSSFADE = 0.8;      // setTargetAtTime constant: ~95% of a zone change lands in 2.4 s

function checkZone(zone) {
  if (!AUDIO_ZONES.includes(zone)) throw new RangeError(`audio zone must be one of ${AUDIO_ZONES.join('|')}, got ${zone}`);
}
function checkCue(id) {
  if (!CUE_IDS.includes(id)) throw new RangeError(`audio cue must be one of ${CUE_IDS.join('|')}, got ${id}`);
}
function checkVolume(v) {
  // Same rule as contracts.js validateSettings: an integer in [0, 100].
  if (!(Number.isInteger(v) && v >= 0 && v <= 100)) throw new RangeError(`volume must be an integer in [0, 100], got ${v}`);
}
// Perceptual taper: 50 sounds about half as loud as 100.
const volumeGain = (v) => (v / 100) ** 2;

// Seeded PRNG, so a cue's crackle is the same every time (reproducible captures, no harsh outliers).
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// 4 s of pink noise (Kellet filter), looped by every noise source.
function noiseBuffer(ctx) {
  const n = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  const r = rng(9);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < n; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return buf;
}

const buffers = new WeakMap();
function noise(ctx) {
  if (!buffers.has(ctx)) buffers.set(ctx, noiseBuffer(ctx));
  return buffers.get(ctx);
}

// ------------------------------------------------------------------ ambient beds

// Builds the always-running ambient sources into `out` and returns controls. Every source runs from
// the start; zones only move gains, so a crossfade never clicks and never restarts a loop.
export function buildAmbience(ctx, out, { zone = 'alley', at = ctx.currentTime } = {}) {
  checkZone(zone);
  const nodes = [];
  const keep = (n) => { nodes.push(n); return n; };
  const gain = (v, dest) => { const g = keep(ctx.createGain()); g.gain.value = v; g.connect(dest); return g; };
  const filter = (type, freq, q, dest) => {
    const f = keep(ctx.createBiquadFilter());
    f.type = type; f.frequency.value = freq; f.Q.value = q; f.connect(dest);
    return f;
  };
  const noiseSrc = (dest, offset) => {
    const s = keep(ctx.createBufferSource());
    s.buffer = noise(ctx); s.loop = true; s.connect(dest); s.start(at, offset);
    return s;
  };
  const osc = (type, freq, dest, detune = 0) => {
    const o = keep(ctx.createOscillator());
    o.type = type; o.frequency.value = freq; o.detune.value = detune; o.connect(dest); o.start(at);
    return o;
  };
  const lfo = (freq, depth, param) => {
    const g = keep(ctx.createGain()); g.gain.value = depth; g.connect(param);
    osc('sine', freq, g);
  };

  const bus = gain(BED_GAIN, out);
  const ch = ZONE_MIX[zone].slice(0, 6).map((v) => gain(v, bus));
  const [rainG, muffledG, humG, droneG, windG, rumbleG] = ch;

  // Rain: a bright hiss plus a band of patter whose level wanders, so it never sounds like a loop.
  noiseSrc(filter('highpass', 900, 0.5, filter('lowpass', 7000, 0.5, rainG)), 0);
  const patter = gain(0.5, rainG);
  lfo(0.23, 0.18, patter.gain); lfo(0.61, 0.12, patter.gain);
  noiseSrc(filter('bandpass', 3200, 0.7, patter), 1.3);
  // The same rain heard through concrete.
  noiseSrc(filter('lowpass', 420, 0.7, muffledG), 2.1);
  // Transformer hum: 60 Hz and harmonics, slowly beating.
  const hum = gain(1, filter('lowpass', 420, 0.7, humG));
  osc('sine', 60, gain(0.6, hum)); osc('sine', 120, gain(0.35, hum)); osc('triangle', 180, gain(0.08, hum));
  lfo(0.3, 0.15, hum.gain);
  // Relay drone: a low open fifth.
  osc('sine', 55, gain(0.5, droneG)); osc('sine', 82.4, gain(0.25, droneG), 4);
  // Rooftop wind: a band of noise that slowly sweeps.
  const windF = filter('bandpass', 420, 0.9, windG);
  lfo(0.07, 260, windF.frequency);
  noiseSrc(windF, 0.7);
  // City rumble: traffic and turbines far below.
  noiseSrc(filter('lowpass', 150, 0.7, rumbleG), 3.3);

  // Reactor bed (relay energized): two beating saws through a breathing filter, pulsing at 2 Hz.
  const reactorG = gain(0, bus);
  const reactorF = filter('lowpass', 520, 2, reactorG);
  lfo(0.5, 220, reactorF.frequency);
  const pulse = gain(0.7, reactorF);
  lfo(2, 0.25, pulse.gain);
  osc('sawtooth', 110, gain(0.12, pulse)); osc('sawtooth', 110, gain(0.12, pulse), 11);
  osc('sine', 55, gain(0.35, reactorG));

  let current = zone, reactorOn = false;
  const reactorTarget = () => (reactorOn ? ZONE_MIX[current][6] * 0.8 : 0);
  return {
    setZone(z, t = ctx.currentTime) {
      checkZone(z);
      current = z;
      ZONE_MIX[z].slice(0, 6).forEach((v, i) => ch[i].gain.setTargetAtTime(v, t, CROSSFADE));
      reactorG.gain.setTargetAtTime(reactorTarget(), t, CROSSFADE);
    },
    setReactor(on, t = ctx.currentTime) {
      reactorOn = !!on;
      reactorG.gain.setTargetAtTime(reactorTarget(), t, 1.2);
    },
    stop() {
      for (const n of nodes) { try { n.stop?.(); } catch { /* never started */ } n.disconnect(); }
    },
  };
}

// ------------------------------------------------------------------ one-shot cues

// Schedules cue `id` into `out` at time t0 on any BaseAudioContext (live or offline). Returns the time
// the cue's tail ends. Every voice stops itself; nothing is left running.
export function synthCue(ctx, out, id, t0 = ctx.currentTime) {
  checkCue(id);
  const env = (peak, a, hold, rel, start = t0) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peak, start + a);
    g.gain.setValueAtTime(peak, start + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, start + a + hold + rel);
    g.connect(out);
    return g;
  };
  const tone = (type, freq, dest, start, end, detune = 0) => {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, start); o.detune.value = detune;
    o.connect(dest); o.start(start); o.stop(end);
    return o;
  };
  const noiseVoice = (dest, start, end) => {
    const s = ctx.createBufferSource();
    s.buffer = noise(ctx); s.loop = true; s.connect(dest); s.start(start, (start * 0.37) % 3); s.stop(end);
    return s;
  };
  const biquad = (type, freq, q, dest) => {
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q; f.connect(dest);
    return f;
  };
  // A soft bell: sine fundamental + a quiet inharmonic partial.
  const bell = (freq, start, peak, rel) => {
    const g = env(peak, 0.006, 0, rel, start);
    tone('sine', freq, g, start, start + rel + 0.05);
    tone('sine', freq * 2.76, env(peak * 0.18, 0.004, 0, rel * 0.4, start), start, start + rel * 0.4 + 0.05);
    return start + rel;
  };

  switch (id) {
    case 'terminal_wake': {
      // Layers of fine light (§5.3): three rising glints and a breath of high air.
      let end = t0;
      [659.3, 987.8, 1318.5].forEach((f, i) => { end = bell(f, t0 + i * 0.07, 0.09, 0.45); });
      noiseVoice(biquad('highpass', 6000, 0.7, env(0.05, 0.08, 0.05, 0.25)), t0, t0 + 0.45);
      return end;
    }
    case 'terminal_input': {
      tone('sine', 1760, env(0.06, 0.002, 0, 0.05), t0, t0 + 0.07);
      tone('triangle', 880, env(0.04, 0.002, 0, 0.08), t0, t0 + 0.1);
      return t0 + 0.1;
    }
    case 'terminal_close': {
      bell(987.8, t0, 0.07, 0.3);
      return bell(659.3, t0 + 0.09, 0.07, 0.4);
    }
    case 'radio_static_burst': {
      // Mica's line keying up through a failing relay: squelch, crackling band-limited noise, squelch.
      const dur = 1.4, r = rng(42);
      const crackle = ctx.createGain();
      crackle.connect(biquad('bandpass', 1800, 1.1, env(0.2, 0.02, dur - 0.25, 0.2)));
      crackle.gain.setValueAtTime(0.4, t0);
      for (let t = t0; t < t0 + dur; t += 0.018 + r() * 0.03) crackle.gain.setValueAtTime(0.25 + r() * (r() > 0.85 ? 1.1 : 0.5), t);
      noiseVoice(crackle, t0, t0 + dur + 0.05);
      tone('sine', 1200, env(0.05, 0.003, 0.05, 0.04), t0, t0 + 0.12);
      tone('sine', 900, env(0.05, 0.003, 0.05, 0.05, t0 + dur - 0.1), t0 + dur - 0.1, t0 + dur + 0.05);
      return t0 + dur + 0.05;
    }
    case 'ui_success': {
      bell(523.3, t0, 0.08, 0.9); bell(659.3, t0 + 0.09, 0.08, 0.9);
      return bell(783.99, t0 + 0.18, 0.09, 1.1);
    }
    case 'ui_failure': {
      // Gentle, not a buzzer: two low tones that sag, through a soft filter.
      const f = biquad('lowpass', 900, 0.7, env(0.13, 0.01, 0.12, 0.45));
      const a = tone('triangle', 233.1, f, t0, t0 + 0.65);
      a.frequency.exponentialRampToValueAtTime(207.7, t0 + 0.5);
      const b = tone('triangle', 174.6, f, t0 + 0.02, t0 + 0.65);
      b.frequency.exponentialRampToValueAtTime(155.6, t0 + 0.5);
      return t0 + 0.65;
    }
    case 'door_open': {
      const f = biquad('lowpass', 2200, 0.8, env(0.14, 0.03, 0.4, 0.5));
      f.frequency.exponentialRampToValueAtTime(280, t0 + 0.9);
      noiseVoice(f, t0, t0 + 1.0);
      tone('sine', 70, env(0.18, 0.005, 0.02, 0.3), t0, t0 + 0.35);
      tone('sine', 55, env(0.12, 0.005, 0.02, 0.35, t0 + 0.85), t0 + 0.85, t0 + 1.25);
      return t0 + 1.25;
    }
    case 'reactor_audio_begins': {
      // Spin-up: a saw that climbs into the reactor bed's pitch as the filter opens.
      const f = biquad('lowpass', 200, 3, env(0.12, 1.4, 0.6, 1.0));
      f.frequency.exponentialRampToValueAtTime(1400, t0 + 2.0);
      const o = tone('sawtooth', 36, f, t0, t0 + 3.1);
      o.frequency.exponentialRampToValueAtTime(110, t0 + 2.2);
      tone('sine', 55, env(0.12, 1.6, 0.4, 1.0), t0, t0 + 3.1);
      return t0 + 3.1;
    }
    case 'music_swell': {
      // The ending (§4.4, §11.2): a plagal IV → I in D, rising out of the dark over ~4 s and
      // resolving, with a high shimmer when the city lights. Detuned saws through an opening filter.
      const pad = (freqs, start, a, hold, rel, peak) => {
        const f = biquad('lowpass', 260, 0.8, env(peak, a, hold, rel, start));
        f.frequency.setValueAtTime(260, start);
        f.frequency.exponentialRampToValueAtTime(2400, start + a + hold * 0.5);
        f.frequency.exponentialRampToValueAtTime(700, start + a + hold + rel);
        const end = start + a + hold + rel + 0.05;
        for (const fr of freqs) for (const dt of [-7, 7]) tone('sawtooth', fr, f, start, end, dt);
        return end;
      };
      pad([98.0, 146.8, 246.9, 370.0], t0, 3.2, 1.6, 2.2, 0.05);                          // Gmaj7
      const end = pad([73.4, 110.0, 185.0, 329.6, 440.0], t0 + 4.6, 1.8, 3.4, 4.5, 0.055); // Dadd9
      const shimmer = env(0.03, 2.0, 2.4, 3.5, t0 + 5.2);
      tone('sine', 1174.7, shimmer, t0 + 5.2, end);
      tone('sine', 880.0, shimmer, t0 + 5.2, end, 4);
      tone('sine', 36.7, env(0.16, 2.5, 2.5, 4.0, t0 + 4.6), t0 + 4.6, end);
      return end;
    }
  }
  throw new RangeError(`unhandled cue ${id}`);
}

// ------------------------------------------------------------------ the game's audio

// The output chain: cues → cue bus → master (volume) → gentle limiter → dest; ambience joins at master.
// Exported so an offline capture renders through exactly what the player hears.
export function buildMix(ctx, dest = ctx.destination, volume = DEFAULT_SETTINGS.volume) {
  checkVolume(volume);
  // The limiter keeps stacked cues and the swell from ever clipping or getting shrill.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.3;
  comp.connect(dest);
  const master = ctx.createGain();
  master.gain.value = volumeGain(volume);
  master.connect(comp);
  const cueBus = ctx.createGain();
  cueBus.gain.value = CUE_GAIN;
  cueBus.connect(master);
  return {
    master, cueBus,
    setVolume(v) { checkVolume(v); master.gain.setTargetAtTime(volumeGain(v), ctx.currentTime, 0.05); },
  };
}

export function createAudio({ onCue = null, zone = 'alley' } = {}) {
  checkZone(zone);
  let volume = DEFAULT_SETTINGS.volume;
  let ctx = null, mix = null, bed = null, disposed = false, unavailable = false;
  const latched = new Set();

  function build() {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) { unavailable = true; return; }  // no WebAudio: the game runs silent, captions still fire
    ctx = new AC();
    mix = buildMix(ctx, ctx.destination, volume);
    bed = buildAmbience(ctx, mix.master, { zone });
    if (latched.has('reactor_audio_begins')) bed.setReactor(true);
  }

  return {
    // Call from a user gesture (click / key). Safe to call repeatedly.
    unlock() {
      if (disposed || unavailable) return Promise.resolve();
      if (!ctx) build();
      return ctx ? ctx.resume() : Promise.resolve();
    },
    get unlocked() { return !!ctx && ctx.state === 'running'; },
    setVolume(v) {
      checkVolume(v);
      volume = v;
      if (ctx) mix.setVolume(v);
    },
    setZone(z) {
      checkZone(z);
      zone = z;
      if (ctx) bed.setZone(z);
    },
    play(id) {
      checkCue(id);
      if (LATCHED.has(id)) {
        if (latched.has(id)) return;   // §9.3: a world change applied twice changes nothing
        latched.add(id);
      }
      onCue?.(id);
      if (!ctx || disposed) return;
      synthCue(ctx, mix.cueBus, id, ctx.currentTime + 0.01);
      if (id === 'reactor_audio_begins') bed.setReactor(true);
    },
    // RESTART (§9.5): unlatch the world-change cues and silence the reactor bed.
    reset() {
      latched.clear();
      if (ctx) bed.setReactor(false);
    },
    dispose() {
      disposed = true;
      if (ctx) { bed.stop(); ctx.close(); }
      ctx = mix = bed = null;
    },
  };
}
