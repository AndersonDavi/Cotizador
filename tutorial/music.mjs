// Pista original para el video promo, sintetizada desde cero (sin samples ni
// derechos de terceros). 120 BPM, La menor: Am – F – C – G.
// renderMusic(segundos) → Buffer WAV estéreo 16 bit 44,1 kHz.

const SR = 44100;
const BPM = 120;
const BEAT = 60 / BPM;      // 0,5 s
const BAR = BEAT * 4;       // 2 s

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
// Acordes (notas MIDI) y bajo por compás
const PROG = [
  { chord: [57, 60, 64], bass: 45 }, // Am
  { chord: [53, 57, 60], bass: 41 }, // F
  { chord: [48, 52, 55], bass: 48 }, // C
  { chord: [55, 59, 62], bass: 43 }, // G
];

// Ruido determinista (misma pista en cada render)
let seed = 1234567;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) * 2 - 1;

export function renderMusic(seconds) {
  const N = Math.ceil(seconds * SR);
  const L = new Float32Array(N), R = new Float32Array(N);
  const duck = new Float32Array(N).fill(1); // "pump" de sidechain con el kick
  const add = (buf, i, v) => { if (i >= 0 && i < N) buf[i] += v; };
  const both = (i, v, pan = 0) => { add(L, i, v * (1 - pan) ); add(R, i, v * (1 + pan)); };

  const bars = Math.ceil(seconds / BAR);
  const DROP = 1;            // compás donde entra la batería completa
  const OUTRO = bars - 1;    // último compás: solo pad e impacto

  // ── Kick ──
  const kick = (t, gain = 1) => {
    const s = Math.floor(t * SR);
    let ph = 0;
    for (let i = 0; i < 0.45 * SR; i++) {
      const tt = i / SR;
      const f = 45 + 95 * Math.exp(-tt * 28);
      ph += (2 * Math.PI * f) / SR;
      const env = Math.exp(-tt * 7.5);
      const click = i < 60 ? (1 - i / 60) * 0.4 : 0;
      both(s + i, (Math.sin(ph) * env + click) * 0.9 * gain);
    }
    for (let i = 0; i < 0.3 * SR; i++) {
      const d = 1 - 0.55 * Math.exp(-(i / SR) * 9);
      if (s + i < N) duck[s + i] = Math.min(duck[s + i], d);
    }
  };
  // ── Clap (ráfagas de ruido filtrado) ──
  const clap = (t) => {
    const s = Math.floor(t * SR);
    let lp = 0, prev = 0;
    for (let i = 0; i < 0.25 * SR; i++) {
      const tt = i / SR;
      const bursts = tt < 0.03 ? (Math.floor(tt / 0.01) % 2 === 0 ? 1 : 0.4) : 1;
      const n = rnd();
      lp += 0.35 * (n - lp);
      const bp = lp - prev; prev = lp;
      const env = Math.exp(-tt * 18) * bursts;
      both(s + i, bp * env * 0.9, (i % 2 ? 0.15 : -0.15));
    }
  };
  // ── Hi-hat (ruido agudo) ──
  const hat = (t, open = false, gain = 1) => {
    const s = Math.floor(t * SR);
    let lp = 0;
    const len = open ? 0.18 : 0.05;
    for (let i = 0; i < len * SR; i++) {
      const n = rnd();
      lp += 0.6 * (n - lp);
      const hp = n - lp;
      const env = Math.exp(-(i / SR) * (open ? 18 : 70));
      both(s + i, hp * env * 0.15 * gain, 0.25);
    }
  };
  // ── Bajo: diente de sierra filtrado, corcheas a contratiempo ──
  const bass = (t, note, dur) => {
    const s = Math.floor(t * SR);
    const f = midi(note);
    let lp = 0, ph = 0;
    for (let i = 0; i < dur * SR; i++) {
      const tt = i / SR;
      ph = (ph + f / SR) % 1;
      const saw = 2 * ph - 1;
      const cut = 0.04 + 0.12 * Math.exp(-tt * 10);
      lp += cut * (saw - lp);
      const env = Math.min(1, tt * 200) * Math.exp(-tt * 3) * (tt > dur - 0.02 ? (dur - tt) / 0.02 : 1);
      both(s + i, lp * env * 0.55);
    }
  };
  // ── Pad: sierras desafinadas, ataque lento ──
  const pad = (t, notes, dur, gain = 1) => {
    const s = Math.floor(t * SR);
    const voices = notes.flatMap((n) => [midi(n + 12) * 0.997, midi(n + 12) * 1.003]);
    const phs = voices.map(() => Math.random());
    let lpL = 0, lpR = 0;
    for (let i = 0; i < dur * SR; i++) {
      const tt = i / SR;
      let vL = 0, vR = 0;
      voices.forEach((f, k) => {
        phs[k] = (phs[k] + f / SR) % 1;
        const v = 2 * phs[k] - 1;
        if (k % 2) vR += v; else vL += v;
      });
      lpL += 0.035 * (vL - lpL);
      lpR += 0.035 * (vR - lpR);
      const env = Math.min(1, tt / 0.35) * Math.min(1, (dur - tt) / 0.4);
      add(L, s + i, lpL * env * 0.06 * gain);
      add(R, s + i, lpR * env * 0.06 * gain);
    }
  };
  // ── Arpegio pluck ──
  const pluck = (t, note, gain = 1) => {
    const s = Math.floor(t * SR);
    const f = midi(note + 24);
    let ph = 0, lp = 0;
    for (let i = 0; i < 0.22 * SR; i++) {
      const tt = i / SR;
      ph = (ph + f / SR) % 1;
      const sq = ph < 0.5 ? 1 : -1;
      lp += (0.08 + 0.4 * Math.exp(-tt * 30)) * (sq - lp);
      const env = Math.exp(-tt * 16);
      both(s + i, lp * env * 0.11 * gain, Math.sin(t * 3) * 0.4);
    }
  };
  // ── Riser e impacto ──
  const riser = (t0, dur) => {
    const s = Math.floor(t0 * SR);
    let lp = 0;
    for (let i = 0; i < dur * SR; i++) {
      const p = i / (dur * SR);
      lp += (0.02 + 0.5 * p * p) * (rnd() - lp);
      both(s + i, lp * p * p * 0.35);
    }
  };
  const impact = (t) => {
    kick(t, 1.2);
    const s = Math.floor(t * SR);
    for (let i = 0; i < 1.6 * SR; i++) {
      const tt = i / SR;
      both(s + i, rnd() * Math.exp(-tt * 3.5) * 0.12 + Math.sin(2 * Math.PI * 55 * tt) * Math.exp(-tt * 2) * 0.35);
    }
  };

  for (let b = 0; b < bars; b++) {
    const t0 = b * BAR;
    const { chord, bass: root } = PROG[b % 4];
    pad(t0, chord, BAR + 0.3, b === 0 ? 0.8 : 1);
    if (b === 0) {
      for (let k = 0; k < 8; k++) hat(t0 + k * BEAT / 2, false, 0.4 + k * 0.08);
      riser(t0 + BAR * 0.25, BAR * 0.75);
      continue;
    }
    if (b === OUTRO) { impact(t0); continue; }
    for (let k = 0; k < 4; k++) {
      kick(t0 + k * BEAT);
      hat(t0 + k * BEAT + BEAT / 2, k === 3);
      hat(t0 + k * BEAT + BEAT * 0.25, false, 0.35);
      hat(t0 + k * BEAT + BEAT * 0.75, false, 0.35);
      bass(t0 + k * BEAT + BEAT / 2, root, BEAT / 2 - 0.02);
    }
    clap(t0 + BEAT);
    clap(t0 + BEAT * 3);
    if (b >= DROP + 1) {
      const arp = [...chord, chord[1], chord[2] + 12, chord[1], chord[0] + 12, chord[2]];
      for (let k = 0; k < 16; k++) pluck(t0 + k * BEAT / 4, arp[k % arp.length], k % 4 === 0 ? 1 : 0.7);
    }
    if (b === OUTRO - 1) riser(t0 + BAR * 0.5, BAR * 0.5);
  }

  // Sidechain, saturación suave y normalización
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const fadeOut = i > N - SR * 0.6 ? (N - i) / (SR * 0.6) : 1;
    L[i] = Math.tanh(L[i] * (0.6 + 0.4 * duck[i]) * 1.1) * fadeOut;
    R[i] = Math.tanh(R[i] * (0.6 + 0.4 * duck[i]) * 1.1) * fadeOut;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const g = 0.89 / (peak || 1);
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8);
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22);
  head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 4, 28); head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

export { BEAT, BAR };
