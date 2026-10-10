// DEV-ONLY. window.__proof.before() runs every API call with no user gesture and reports what the page
// did; the driver then clicks #gesture (a real input event) and calls window.__proof.after().
// window.__render(kind, id, seconds) renders a cue or zone bed offline through the game's own mix.
import { createAudio, buildAmbience, buildMix, synthCue, CUE_IDS, AUDIO_ZONES } from '../../echo/game/audio.js';

// Spies: count AudioContexts constructed and oscillators created, through the page's real classes.
const spy = { contexts: 0, oscillators: 0, errors: [] };
addEventListener('error', (e) => spy.errors.push(String(e.message)));
addEventListener('unhandledrejection', (e) => spy.errors.push(String(e.reason)));
const RealAC = window.AudioContext;
window.AudioContext = class extends RealAC { constructor(...a) { spy.contexts++; super(...a); } };
const realOsc = BaseAudioContext.prototype.createOscillator;
BaseAudioContext.prototype.createOscillator = function (...a) { spy.oscillators++; return realOsc.apply(this, a); };

const captions = [];
const audio = createAudio({ onCue: (id) => captions.push(id) });
const throws = (fn) => { try { fn(); return null; } catch (e) { return `${e.name}: ${e.message}`; } };

window.__proof = {
  before() {
    const callErrors = [];
    for (const id of CUE_IDS) { const e = throws(() => audio.play(id)); if (e) callErrors.push(e); }
    for (const z of AUDIO_ZONES) { const e = throws(() => audio.setZone(z)); if (e) callErrors.push(e); }
    const v = throws(() => audio.setVolume(35)); if (v) callErrors.push(v);
    return {
      contextsBeforeUnlock: spy.contexts, oscillatorsBeforeUnlock: spy.oscillators,
      callErrors, pageErrors: [...spy.errors], captionsBeforeUnlock: [...captions], unlocked: audio.unlocked,
      unknownCue: throws(() => audio.play('explosion')),
      unknownZone: throws(() => audio.setZone('moon')),
      volume101: throws(() => audio.setVolume(101)),
      volumeFraction: throws(() => audio.setVolume(50.5)),
    };
  },
  async after() {
    audio.reset();                                // before() latched the world-change cues while locked
    const o0 = spy.oscillators;
    audio.setVolume(80);
    audio.play('ui_success');
    const o1 = spy.oscillators;
    audio.play('music_swell');
    const o2 = spy.oscillators;
    audio.play('music_swell');                    // latched: must add nothing
    const o3 = spy.oscillators;
    audio.reset();
    audio.play('music_swell');                    // unlatched by reset: plays again
    const o4 = spy.oscillators;
    await new Promise((r) => setTimeout(r, 300));
    return {
      contextsAfterUnlock: spy.contexts, unlocked: audio.unlocked,
      bedOscillatorsAtUnlock: o0, successAdded: o1 - o0, swellAdded: o2 - o1, swellRepeatAdded: o3 - o2, swellAfterResetAdded: o4 - o3,
      pageErrors: [...spy.errors],
    };
  },
};
document.getElementById('gesture').onclick = async () => { await audio.unlock(); window.__unlockedByClick = audio.unlocked; };

function wav(buf) {
  const ch = buf.getChannelData(0), n = ch.length, sr = buf.sampleRate;
  const dv = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); str(36, 'data'); dv.setUint32(40, n * 2, true);
  let peak = 0, sum = 0;
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, ch[i]));
    peak = Math.max(peak, Math.abs(s)); sum += s * s;
    dv.setInt16(44 + i * 2, s * 32767, true);
  }
  let bin = '';
  const u8 = new Uint8Array(dv.buffer);
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return { b64: btoa(bin), peak, rms: Math.sqrt(sum / n) };
}

window.__render = async (kind, id, seconds) => {
  const ctx = new OfflineAudioContext(1, Math.ceil(44100 * seconds), 44100);
  const mix = buildMix(ctx, ctx.destination);   // default volume from contracts DEFAULT_SETTINGS
  if (kind === 'zone') buildAmbience(ctx, mix.master, { zone: id, at: 0 });
  else if (kind === 'reactor') { const bed = buildAmbience(ctx, mix.master, { zone: 'relay', at: 0 }); bed.setReactor(true, 0.5); synthCue(ctx, mix.cueBus, 'reactor_audio_begins', 0.5); }
  else synthCue(ctx, mix.cueBus, id, 0.05);
  return wav(await ctx.startRendering());
};
