// Procedural Persian soundscape. Everything is synthesised with the Web Audio API:
// plucked/hammered strings via Karplus-Strong (santur, setar, tar), a breathy ney,
// tombak, a drone, and ambience layers (fountains, crowd babble, birds, carriage,
// coppersmiths, wind, crickets, naqqareh). Zone weights crossfade the layers and
// route everything through per-space reverbs (courtyard, Shah dome with its famous
// flutter echo, Lotfollah chamber, bazaar vault).

// ---------- tuning: scales in semitones from tonic (x.5 = koron/sori quarter tones) ----------
export const DASTGAH = {
  // Chahargah on C: C, D-koron, E, F, G, A-koron, B
  chahargah: { name: 'Chahārgāh', steps: [0, 1.5, 4, 5, 7, 8.5, 11], shahed: 4 },
  // Bayat-e Esfahan on G: G A Bb C D E-koron F# (ist on E-koron)
  esfahan: { name: 'Bayāt-e Esfahān', steps: [0, 2, 3, 5, 7, 8.5, 11], shahed: 3 },
  // Shur on D: D, E-koron, F, G, A, Bb, C
  shur: { name: 'Shur', steps: [0, 1.5, 3, 5, 7, 8, 10], shahed: 3 },
  // Mahur on C: major
  mahur: { name: 'Māhur', steps: [0, 2, 4, 5, 7, 9, 11], shahed: 4 },
  // Homayun on G: G, A-koron, B, C, D, Eb, F
  homayun: { name: 'Homāyun', steps: [0, 1.5, 4, 5, 7, 8, 10], shahed: 3 },
};

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function degToSemis(scale, deg) {
  const n = scale.steps.length;
  const oct = Math.floor(deg / n);
  const i = ((deg % n) + n) % n;
  return oct * 12 + scale.steps[i];
}

// ---------- phrase generator (free-rhythm avaz-like) ----------
function makePhrase(rand, scale, { center, lo, hi, len = [5, 11], tempo = 1, final = 0 }) {
  const n = Math.floor(len[0] + rand() * (len[1] - len[0]));
  const notes = [];
  let d = center + Math.round((rand() - 0.5) * 2);
  const moves = [
    [-1, 0.32],
    [1, 0.3],
    [0, 0.08],
    [-2, 0.1],
    [2, 0.1],
    [3, 0.05],
    [-3, 0.05],
  ];
  const pick = () => {
    let x = rand(),
      acc = 0;
    for (const [m, p] of moves) {
      acc += p;
      if (x < acc) return m;
    }
    return 0;
  };
  for (let i = 0; i < n; i++) {
    let m = pick();
    // pull toward the centre (shahed)
    if (d > center + 3 && m > 0) m = -m;
    if (d < center - 3 && m < 0) m = -m;
    d = Math.max(lo, Math.min(hi, d + m));
    const r = rand();
    let dur = r < 0.45 ? 0.22 : r < 0.75 ? 0.34 : r < 0.9 ? 0.6 : 1.1 + rand() * 0.8;
    // small melismatic groups
    if (rand() < 0.15) {
      notes.push({ deg: d + 1, dur: 0.11 * tempo, orn: 'grace' });
    }
    notes.push({ deg: d, dur: dur * tempo, orn: dur > 0.9 ? 'long' : null });
  }
  // forud: descend stepwise to the final
  while (d > final + 1) {
    d -= 1;
    notes.push({ deg: d, dur: (0.25 + rand() * 0.15) * tempo });
  }
  if (d < final) d = final;
  notes.push({ deg: final, dur: (1.6 + rand() * 1.2) * tempo, orn: 'long' });
  return notes;
}

// ---------- impulse responses ----------
function makeIR(ctx, dur, decay, { echoes = 0, echoGap = 0.14, echoAmp = 0.55, predelay = 0.015, damp = 0.35 } = {}) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * dur);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    const pd = Math.floor(predelay * sr);
    for (let i = pd; i < len; i++) {
      const t = (i - pd) / (len - pd);
      const white = Math.random() * 2 - 1;
      // progressive darkening of the tail
      const a = damp + (1 - damp) * (1 - t);
      lp = lp + a * (white - lp);
      d[i] = lp * Math.pow(1 - t, decay);
    }
    for (let k = 1; k <= echoes; k++) {
      const at = Math.floor((predelay + k * echoGap * (1 + (ch ? 0.012 : 0))) * sr);
      const amp = Math.pow(echoAmp, k) * 1.6;
      for (let j = 0; j < 500 && at + j < len; j++) {
        d[at + j] += amp * (Math.random() * 2 - 1) * Math.exp(-j / 90);
      }
    }
  }
  return buf;
}

// ---------- Karplus-Strong string renders ----------
function ksRender(ctx, freq, { dur = 2.6, t60 = 3, bright = 0.5, pluckPos = 0.13, detune = 0, course = 1, hammer = false }) {
  // per-period loss giving roughly the requested T60 (the averaging filter adds more damping on high notes)
  const decay = Math.min(0.9995, Math.exp(-6.9 / (t60 * freq)));
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * dur);
  const buf = ctx.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  for (let c = 0; c < course; c++) {
    const f = freq * Math.pow(2, ((c - (course - 1) / 2) * detune) / 1200);
    // loop delay = L + 0.5 (averaging) + allpass fractional part
    let D = sr / f - 0.5;
    let L = Math.floor(D);
    let frac = D - L;
    if (frac < 0.15) {
      L -= 1;
      frac += 1;
    }
    const C = (1 - frac) / (1 + frac);
    const line = new Float32Array(L);
    // excitation: filtered noise burst, comb-filtered for pluck position
    let lp = 0;
    for (let i = 0; i < L; i++) {
      lp += (hammer ? 0.35 : bright) * (Math.random() * 2 - 1 - lp);
      line[i] = lp;
    }
    const pp = Math.max(1, Math.floor(pluckPos * L));
    for (let i = L - 1; i >= pp; i--) line[i] -= line[i - pp] * 0.8;
    let idx = 0,
      apX1 = 0,
      apY1 = 0,
      prevA = 0;
    for (let i = 0; i < len; i++) {
      // a = y[n-L]; averaging with y[n-L-1] gives the half-sample lowpass delay
      const a = line[idx];
      const nxt = idx + 1 === L ? 0 : idx + 1;
      const avg = 0.5 * (a + prevA) * decay;
      prevA = a;
      const y = C * avg + apX1 - C * apY1;
      apX1 = avg;
      apY1 = y;
      line[idx] = y;
      out[i] += a / course;
      idx = nxt;
    }
  }
  // attack click shaping + fade out
  const fade = Math.floor(sr * 0.2);
  for (let i = 0; i < fade; i++) out[len - 1 - i] *= i / fade;
  if (hammer) {
    // santur: brief metallic transient
    for (let i = 0; i < 300; i++) out[i] += (Math.random() * 2 - 1) * 0.15 * (1 - i / 300);
  }
  return buf;
}

// ---------- engine ----------
export class AudioEngine {
  constructor() {
    this.started = false;
    this.w = { square: 1, shahCourt: 0, shahDome: 0, lotf: 0, aliqapu: 0, bazaar: 0, musicRoom: 0 };
    this.env = { fountain: 0, courtFountain: 0, height: 0, night: 0, dusk: 0, speed: 0, surface: 'stone' };
    this.musicVol = 0.8;
    this.ambVol = 0.9;
    this.rand = Math.random;
  }

  async start() {
    if (this.started) return;
    const ctx = (this.ctx = new (window.AudioContext || window.webkitAudioContext)());
    await ctx.resume();
    this.started = true;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(comp).connect(ctx.destination);

    // buses
    this.dry = ctx.createGain();
    this.dry.connect(this.master);
    this.musicBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVol;
    this.ambBus.gain.value = this.ambVol;
    const pre = ctx.createGain();
    this.musicBus.connect(pre);
    this.ambBus.connect(pre);
    this.sfxBus.connect(pre);
    pre.connect(this.dry);

    // reverbs with sends
    this.reverbs = {};
    const mk = (name, ir, level = 1) => {
      const conv = ctx.createConvolver();
      conv.buffer = ir;
      const send = ctx.createGain();
      send.gain.value = 0;
      const ret = ctx.createGain();
      ret.gain.value = level;
      pre.connect(send).connect(conv).connect(ret).connect(this.master);
      this.reverbs[name] = send;
    };
    mk('open', makeIR(ctx, 1.6, 3.5, { damp: 0.25 }), 0.5);
    mk('court', makeIR(ctx, 2.8, 3, { echoes: 2, echoGap: 0.21, echoAmp: 0.4 }), 0.6);
    mk('dome', makeIR(ctx, 7.5, 2.2, { echoes: 7, echoGap: 0.17, echoAmp: 0.72, damp: 0.2 }), 0.9);
    mk('lotf', makeIR(ctx, 4.5, 2.6, { echoes: 2, echoGap: 0.09 }), 0.8);
    mk('vault', makeIR(ctx, 2.2, 3, { damp: 0.3 }), 0.6);
    mk('room', makeIR(ctx, 1.4, 2.5, { damp: 0.5 }), 0.5);

    // noise buffers
    this.noise = this._noiseBuffer('white');
    this.pink = this._noiseBuffer('pink');
    this.brown = this._noiseBuffer('brown');

    this._buildAmbience();
    this._buildInstruments();
    this._last = ctx.currentTime;
    this._timer = setInterval(() => this._tick(), 90);
  }

  _noiseBuffer(type) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 4;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') d[i] = w;
      else if (type === 'pink') {
        b0 = 0.997 * b0 + w * 0.029591;
        b1 = 0.985 * b1 + w * 0.032534;
        b2 = 0.95 * b2 + w * 0.048056;
        d[i] = (b0 + b1 + b2 + w * 0.05) * 2.2;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    return b;
  }

  _loopNoise(buf, dest) {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    s.loopStart = Math.random();
    s.start(0, Math.random() * 3);
    s.connect(dest);
    return s;
  }

  // ---------------- ambience ----------------
  _buildAmbience() {
    const ctx = this.ctx;
    const A = (this.amb = {});
    const gain = (v = 0) => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };

    // fountain (central pool): layered splashing noise
    A.fountain = gain();
    A.fountain.connect(this.ambBus);
    {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 500;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2400;
      bp.Q.value = 0.4;
      const mod = gain(0.6);
      this._loopNoise(this.pink, hp);
      hp.connect(bp).connect(mod).connect(A.fountain);
      A.fountainMod = mod;
      const lo = ctx.createBiquadFilter();
      lo.type = 'lowpass';
      lo.frequency.value = 700;
      const lg = gain(0.5);
      this._loopNoise(this.brown, lo);
      lo.connect(lg).connect(A.fountain);
    }
    // courtyard pool: gentler trickle
    A.court = gain();
    A.court.connect(this.ambBus);
    {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3200;
      bp.Q.value = 1.2;
      this._loopNoise(this.noise, bp);
      const m = gain(0.25);
      bp.connect(m).connect(A.court);
      A.courtMod = m;
    }

    // crowd babble: formant-band noises with random amplitude motion
    A.crowd = gain();
    A.crowd.connect(this.ambBus);
    A.crowdBands = [];
    for (const [f, q, lvl] of [
      [320, 2.5, 0.5],
      [650, 3, 0.45],
      [1150, 3.5, 0.35],
      [2400, 4, 0.18],
      [480, 2, 0.35],
    ]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = f;
      bp.Q.value = q;
      const g = gain(lvl);
      this._loopNoise(this.pink, bp);
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.random() * 1.6 - 0.8;
      bp.connect(g).connect(pan).connect(A.crowd);
      A.crowdBands.push({ g, lvl, bp, f });
    }

    // wind (height, talar, rooftops)
    A.wind = gain();
    A.wind.connect(this.ambBus);
    {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 500;
      bp.Q.value = 0.8;
      this._loopNoise(this.pink, bp);
      bp.connect(A.wind);
      A.windBp = bp;
    }

    // room tone: low hum inside big spaces
    A.room = gain();
    A.room.connect(this.ambBus);
    {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 180;
      this._loopNoise(this.brown, lp);
      lp.connect(A.room);
    }

    // crickets at night
    A.crickets = gain();
    A.crickets.connect(this.ambBus);
    {
      const osc = ctx.createOscillator();
      osc.frequency.value = 4700;
      const am = ctx.createOscillator();
      am.frequency.value = 28;
      am.type = 'square';
      const amg = gain(0.5);
      const pulse = gain(0);
      am.connect(amg).connect(pulse.gain);
      const slow = ctx.createOscillator();
      slow.frequency.value = 1.7;
      slow.type = 'square';
      const sg = gain(0.5);
      const chirp = gain(0.4);
      slow.connect(sg).connect(chirp.gain);
      osc.connect(pulse).connect(chirp).connect(A.crickets);
      osc.start();
      am.start();
      slow.start();
      const osc2 = ctx.createOscillator();
      osc2.frequency.value = 5300;
      const am2 = ctx.createOscillator();
      am2.frequency.value = 33;
      am2.type = 'square';
      const p2 = gain(0);
      const a2 = gain(0.35);
      am2.connect(a2).connect(p2.gain);
      const pan = ctx.createStereoPanner();
      pan.pan.value = 0.6;
      osc2.connect(p2).connect(pan).connect(A.crickets);
      osc2.start();
      am2.start();
    }

    // sporadic event buses
    A.birds = gain(0);
    A.birds.connect(this.ambBus);
    A.pigeons = gain(0);
    A.pigeons.connect(this.ambBus);
    A.smiths = gain(0);
    A.smiths.connect(this.ambBus);
    A.carriage = gain(0);
    A.carriage.connect(this.ambBus);
    A.swifts = gain(0);
    A.swifts.connect(this.ambBus);

    this._nextBird = 0;
    this._nextPigeon = 0;
    this._nextSmith = [0, 0.4, 1.1];
    this._nextCarriage = ctx.currentTime + 8;
    this._nextSwift = 0;
  }

  // ---------------- instruments ----------------
  _buildInstruments() {
    const ctx = this.ctx;
    this.ksCache = new Map();
    const mkPlayer = (name, opts) => {
      const out = ctx.createGain();
      out.gain.value = 0;
      out.connect(this.musicBus);
      return { name, out, next: ctx.currentTime + 1 + Math.random() * 2, queue: [], section: 0, ...opts };
    };
    this.players = {
      santur: mkPlayer('santur', { scale: DASTGAH.chahargah, tonic: 48, inst: 'santur', lo: 3, hi: 16, center: 7 }),
      ney: mkPlayer('ney', { scale: DASTGAH.esfahan, tonic: 55, inst: 'ney', lo: 0, hi: 11, center: 4 }),
      setar: mkPlayer('setar', { scale: DASTGAH.shur, tonic: 50, inst: 'setar', lo: 0, hi: 12, center: 3 }),
      tar: mkPlayer('tar', { scale: DASTGAH.mahur, tonic: 48, inst: 'tar', lo: 0, hi: 13, center: 4 }),
    };
    // ney voice (continuous synth)
    const ney = (this.neyVoice = {});
    ney.out = ctx.createGain();
    ney.out.gain.value = 0;
    ney.out.connect(this.players.ney.out);
    ney.osc = ctx.createOscillator();
    ney.osc.type = 'triangle';
    ney.osc2 = ctx.createOscillator();
    ney.osc2.type = 'sine';
    const o2g = ctx.createGain();
    o2g.gain.value = 0.25;
    ney.lp = ctx.createBiquadFilter();
    ney.lp.type = 'lowpass';
    ney.lp.frequency.value = 1800;
    ney.osc.connect(ney.lp);
    ney.osc2.connect(o2g).connect(ney.lp);
    const toneG = ctx.createGain();
    toneG.gain.value = 0.55;
    ney.lp.connect(toneG).connect(ney.out);
    // breath noise tuned to the note
    ney.breathBp = ctx.createBiquadFilter();
    ney.breathBp.type = 'bandpass';
    ney.breathBp.Q.value = 6;
    const bg = ctx.createGain();
    bg.gain.value = 0.9;
    this._loopNoise(this.noise, ney.breathBp);
    ney.breathBp.connect(bg).connect(ney.out);
    const hiss = ctx.createBiquadFilter();
    hiss.type = 'highpass';
    hiss.frequency.value = 3000;
    const hg = ctx.createGain();
    hg.gain.value = 0.05;
    this._loopNoise(this.noise, hiss);
    hiss.connect(hg).connect(ney.out);
    // vibrato
    ney.vib = ctx.createOscillator();
    ney.vib.frequency.value = 5.2;
    ney.vibG = ctx.createGain();
    ney.vibG.gain.value = 0;
    ney.vib.connect(ney.vibG);
    ney.vibG.connect(ney.osc.frequency);
    ney.osc.start();
    ney.osc2.start();
    ney.vib.start();

    // drone (tanpura-like shimmer of tonic + fifth) for mosques
    this.drone = ctx.createGain();
    this.drone.gain.value = 0;
    this.drone.connect(this.musicBus);
    const dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 900;
    dlp.connect(this.drone);
    for (const [m, g] of [
      [43, 0.3],
      [43.07, 0.3],
      [50, 0.18],
      [55, 0.12],
      [31, 0.25],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midiHz(m);
      const og = ctx.createGain();
      og.gain.value = g * 0.08;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.1;
      const lg = ctx.createGain();
      lg.gain.value = g * 0.05;
      lfo.connect(lg).connect(og.gain);
      o.connect(og).connect(dlp);
      o.start();
      lfo.start();
    }

    // tombak bus for Ali Qapu ensemble
    this.tombak = ctx.createGain();
    this.tombak.gain.value = 0;
    this.tombak.connect(this.musicBus);
    this._tombakNext = ctx.currentTime + 2;
    this._tombakStep = 0;
  }

  _ks(inst, midi) {
    const key = inst + ':' + midi.toFixed(2);
    let b = this.ksCache.get(key);
    if (!b) {
      const f = midiHz(midi);
      const o =
        inst === 'santur'
          ? { dur: 3.2, t60: 3.5, bright: 0.45, pluckPos: 0.11, detune: 4, course: 2, hammer: true }
          : inst === 'setar'
            ? { dur: 3.4, t60: 3.2, bright: 0.6, pluckPos: 0.17, detune: 2, course: 2 }
            : { dur: 2.2, t60: 2.0, bright: 0.8, pluckPos: 0.09, detune: 3, course: 2 };
      b = ksRender(this.ctx, f, o);
      this.ksCache.set(key, b);
    }
    return b;
  }

  _pluck(player, midi, t, vel = 0.6, pan = 0) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this._ks(player.inst, midi);
    const g = ctx.createGain();
    g.gain.value = vel;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    s.connect(g).connect(p).connect(player.out);
    s.start(t);
    s.stop(t + s.buffer.duration);
  }

  _schedulePlayer(pl, horizon) {
    const ctx = this.ctx;
    while (pl.next < horizon) {
      if (!pl.queue.length) {
        // new phrase; slowly wander the centre to evoke moving through gushehs
        pl.section = (pl.section + 1) % 8;
        const lift = [0, 0, 1, 2, 3, 2, 1, 0][pl.section];
        const phrase = makePhrase(this.rand, pl.scale, {
          center: pl.center + lift,
          lo: pl.lo,
          hi: pl.hi,
          tempo: pl.inst === 'ney' ? 1.5 : pl.inst === 'setar' ? 1.25 : 1,
          final: pl.inst === 'santur' ? 7 : 0,
        });
        pl.queue = phrase;
        pl.next += (pl.inst === 'tar' ? 0.8 : 1.6) + this.rand() * 3; // silence between phrases
        if (pl.inst === 'ney') this._neyBreath(pl.next - 0.3);
        continue;
      }
      const n = pl.queue.shift();
      const midi = pl.tonic + degToSemis(pl.scale, n.deg);
      const t = pl.next;
      if (pl.inst === 'ney') {
        this._neyNote(midi, t, n);
        if (!pl.queue.length) this._neyRelease(t + n.dur);
      } else if (pl.inst === 'santur') {
        const pan = ((n.deg - 8) / 10) * 0.6;
        this._pluck(pl, midi, t, 0.55, pan);
        if (this.rand() < 0.25) this._pluck(pl, midi - 12, t, 0.25, -pan); // octave doubling
        if (n.orn === 'long') {
          // riz: santur tremolo on sustained tones
          const k = Math.floor(n.dur / 0.075);
          for (let i = 1; i < k; i++) this._pluck(pl, midi, t + i * 0.075, 0.28 + 0.12 * Math.sin(i * 0.5), pan + (i % 2 ? 0.05 : -0.05));
        }
      } else if (pl.inst === 'setar') {
        this._pluck(pl, midi, t, 0.6, -0.1);
        if (n.orn === 'long' && this.rand() < 0.5) this._pluck(pl, midi + 12, t + 0.02, 0.1, 0.2);
      } else if (pl.inst === 'tar') {
        this._pluck(pl, midi, t, 0.5, 0.15);
        if (n.orn === 'long') {
          const k = Math.floor(n.dur / 0.09);
          for (let i = 1; i < k; i++) this._pluck(pl, midi, t + i * 0.09, 0.25, 0.15);
        }
        if (this.rand() < 0.3) this._pluck(pl, pl.tonic - 12, t, 0.18, -0.2); // drone string
      }
      pl.next += n.dur;
    }
  }

  _neyBreath(t) {
    const v = this.neyVoice;
    v.out.gain.cancelScheduledValues(t);
    v.out.gain.setTargetAtTime(0.0, t, 0.05);
  }
  _neyNote(midi, t, n) {
    const v = this.neyVoice;
    const f = midiHz(midi);
    v.osc.frequency.setTargetAtTime(f, t, 0.025);
    v.osc2.frequency.setTargetAtTime(f * 2, t, 0.025);
    v.breathBp.frequency.setTargetAtTime(f * 2, t, 0.03);
    v.lp.frequency.setTargetAtTime(1200 + f * 1.5, t, 0.1);
    v.out.gain.setTargetAtTime(0.42 + this.rand() * 0.1, t, 0.06);
    v.vibG.gain.setTargetAtTime(0, t, 0.02);
    if (n.orn === 'long') {
      v.vibG.gain.setTargetAtTime(f * 0.012, t + 0.25, 0.2);
      v.out.gain.setTargetAtTime(0.55, t + 0.3, 0.3);
      // tahrir: quick ornamental flips near the end of long tones
      if (this.rand() < 0.5) {
        const up = midiHz(midi + 2);
        const t0 = t + n.dur * 0.55;
        for (let i = 0; i < 4; i++) {
          v.osc.frequency.setTargetAtTime(i % 2 ? f : up, t0 + i * 0.07, 0.012);
        }
        v.osc.frequency.setTargetAtTime(f, t0 + 0.3, 0.02);
      }
    }
  }
  _neyRelease(t) {
    const v = this.neyVoice;
    v.out.gain.setTargetAtTime(0, t, 0.25);
    v.vibG.gain.setTargetAtTime(0, t, 0.1);
  }

  _tombakHit(t, kind, vel = 1) {
    const ctx = this.ctx;
    if (kind === 'tom') {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.7 * vel, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      o.connect(g).connect(this.tombak);
      o.start(t);
      o.stop(t + 0.45);
    } else {
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = kind === 'bak' ? 2200 : 3800;
      bp.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5 * vel, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'bak' ? 0.08 : 0.04));
      s.connect(bp).connect(g).connect(this.tombak);
      s.start(t, Math.random() * 2);
      s.stop(t + 0.12);
      const o = ctx.createOscillator();
      o.frequency.value = 420;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.25 * vel, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      o.connect(og).connect(this.tombak);
      o.start(t);
      o.stop(t + 0.08);
    }
  }

  // ---------------- sporadic sounds ----------------
  _chirp(t, dest, pan) {
    const ctx = this.ctx;
    const n = 2 + Math.floor(Math.random() * 5);
    const base = 3000 + Math.random() * 2500;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(dest);
    for (let i = 0; i < n; i++) {
      const tt = t + i * (0.07 + Math.random() * 0.06);
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(base * (1 + Math.random() * 0.2), tt);
      o.frequency.exponentialRampToValueAtTime(base * (0.7 + Math.random() * 0.5), tt + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.07, tt + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.06);
      o.connect(g).connect(p);
      o.start(tt);
      o.stop(tt + 0.08);
    }
  }
  _coo(t, dest, pan) {
    const ctx = this.ctx;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(dest);
    const f0 = 330 + Math.random() * 60;
    const parts = [
      [0, 0.28, 1],
      [0.36, 0.5, 1.12],
      [0.95, 0.3, 0.95],
    ];
    for (const [dt, len, fm] of parts) {
      const tt = t + dt;
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f0 * fm, tt);
      o.frequency.linearRampToValueAtTime(f0 * fm * 0.92, tt + len);
      const trem = ctx.createOscillator();
      trem.frequency.value = 28;
      const tg = ctx.createGain();
      tg.gain.value = 0.3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.12, tt + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + len);
      trem.connect(tg).connect(g.gain);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 800;
      o.connect(lp).connect(g).connect(p);
      o.start(tt);
      o.stop(tt + len + 0.05);
      trem.start(tt);
      trem.stop(tt + len + 0.05);
    }
  }
  _swift(t, dest) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(6500, t);
    o.frequency.linearRampToValueAtTime(5200 + Math.random() * 1500, t + 0.5);
    const am = ctx.createOscillator();
    am.frequency.value = 45;
    const amg = ctx.createGain();
    amg.gain.value = 0.03;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04, t + 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    am.connect(amg).connect(g.gain);
    const p = ctx.createStereoPanner();
    p.pan.setValueAtTime(-1 + Math.random(), t);
    p.pan.linearRampToValueAtTime(Math.random(), t + 0.6);
    o.connect(g).connect(p).connect(dest);
    o.start(t);
    o.stop(t + 0.7);
    am.start(t);
    am.stop(t + 0.7);
  }
  _copperHit(t, dest, base, pan, vel) {
    const ctx = this.ctx;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(dest);
    for (const [r, a, d] of [
      [1, 0.5, 0.5],
      [1.47, 0.3, 0.35],
      [2.09, 0.25, 0.25],
      [2.56, 0.18, 0.2],
      [3.42, 0.12, 0.15],
      [4.7, 0.08, 0.08],
    ]) {
      const o = ctx.createOscillator();
      o.frequency.value = base * r;
      const g = ctx.createGain();
      g.gain.setValueAtTime(a * vel * 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(p);
      o.start(t);
      o.stop(t + d + 0.02);
    }
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.1 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    s.connect(g).connect(p);
    s.start(t, Math.random() * 3);
    s.stop(t + 0.05);
  }
  _hoof(t, dest, pan, vel) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 900 + Math.random() * 400;
    bp.Q.value = 2.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    s.connect(bp).connect(g).connect(p).connect(dest);
    s.start(t, Math.random() * 3);
    s.stop(t + 0.1);
  }
  _bell(t, dest, pan, vel) {
    const ctx = this.ctx;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(dest);
    for (const r of [1, 2.76, 5.4]) {
      const o = ctx.createOscillator();
      o.frequency.value = 2100 * r * (1 + Math.random() * 0.01);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.03 * vel, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3 / r);
      o.connect(g).connect(p);
      o.start(t);
      o.stop(t + 0.4);
    }
  }

  // a horse carriage passing: hoofbeats + bells with a travelling pan
  _carriagePass(t0) {
    const dur = 14;
    const dir = Math.random() < 0.5 ? -1 : 1;
    let t = t0;
    const pattern = [0, 0.14, 0.33, 0.47];
    while (t < t0 + dur) {
      const k = (t - t0) / dur;
      const vel = Math.sin(k * Math.PI);
      const pan = dir * (k * 2 - 1) * 0.9;
      for (const dt of pattern) this._hoof(t + dt, this.amb.carriage, pan, vel * (0.6 + Math.random() * 0.4));
      if (Math.random() < 0.7) this._bell(t + Math.random() * 0.5, this.amb.carriage, pan, vel);
      t += 0.66;
    }
  }

  // Naqqareh-khaneh: sunset kettle drums + long horns (karna) + shawm (sorna)
  naqqareh() {
    if (!this.started) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + 0.2;
    const out = ctx.createGain();
    out.gain.value = 0.9;
    const pan = ctx.createStereoPanner();
    pan.pan.value = 0;
    out.connect(pan).connect(this.sfxBus);
    this.reverbs.open.gain.setTargetAtTime(0.5, t0, 0.5);
    // drums
    const pattern = [1, 0, 0.6, 0.6, 1, 0, 0.6, 0, 1, 0.5, 0.5, 0.5];
    for (let bar = 0; bar < 10; bar++)
      pattern.forEach((v, i) => {
        if (!v) return;
        const t = t0 + (bar * 12 + i) * 0.16;
        const o = ctx.createOscillator();
        o.frequency.setValueAtTime(i % 4 === 0 ? 75 : 110, t);
        o.frequency.exponentialRampToValueAtTime(i % 4 === 0 ? 50 : 80, t + 0.3);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v * 0.8, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.55);
      });
    // karna long horn blasts
    for (const [dt, len] of [
      [0, 3],
      [5, 3.5],
      [11, 4],
    ]) {
      const t = t0 + dt;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(98, t);
      o.frequency.linearRampToValueAtTime(110, t + len * 0.3);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(300, t);
      lp.frequency.linearRampToValueAtTime(1300, t + len * 0.4);
      lp.frequency.linearRampToValueAtTime(400, t + len);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.4);
      g.gain.setValueAtTime(0.25, t + len - 0.5);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(lp).connect(g).connect(out);
      o.start(t);
      o.stop(t + len + 0.1);
    }
    // sorna melody (nasal shawm) in Chahargah
    const sc = DASTGAH.chahargah;
    const mel = [4, 5, 4, 3, 4, 5, 6, 5, 4, 3, 2, 3, 2, 1, 0, 0];
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.value = 0;
    const vib = ctx.createOscillator();
    vib.frequency.value = 6;
    const vg = ctx.createGain();
    vg.gain.value = 6;
    vib.connect(vg).connect(o.frequency);
    o.connect(bp).connect(g).connect(out);
    const ts = t0 + 3.2;
    mel.forEach((d, i) => {
      const t = ts + i * 0.55;
      o.frequency.setTargetAtTime(midiHz(60 + degToSemis(sc, d)), t, 0.02);
    });
    g.gain.setTargetAtTime(0.12, ts, 0.1);
    g.gain.setTargetAtTime(0, ts + mel.length * 0.55, 0.3);
    o.start(ts);
    vib.start(ts);
    o.stop(ts + mel.length * 0.55 + 2);
    vib.stop(ts + mel.length * 0.55 + 2);
  }

  // clap / stamp: short transient sent heavily into the current space's reverb
  clap() {
    if (!this.started) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.01;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.1, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    s.connect(bp).connect(g).connect(this.sfxBus);
    s.start(t, Math.random() * 3);
    s.stop(t + 0.12);
  }

  footstep(vol = 1) {
    if (!this.started) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    const soft = this.env.surface === 'grass';
    const gravel = this.env.surface === 'gravel';
    f.type = soft ? 'lowpass' : 'bandpass';
    f.frequency.value = soft ? 700 : gravel ? 2200 : 1100 + Math.random() * 300;
    f.Q.value = gravel ? 0.6 : 1.4;
    const g = ctx.createGain();
    const len = gravel ? 0.12 : soft ? 0.09 : 0.05;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime((soft ? 0.12 : 0.22) * vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    s.connect(f).connect(g).connect(this.sfxBus);
    s.start(t, Math.random() * 3);
    s.stop(t + len + 0.02);
  }

  setVolumes(music, amb) {
    this.musicVol = music;
    this.ambVol = amb;
    if (!this.started) return;
    this.musicBus.gain.setTargetAtTime(music, this.ctx.currentTime, 0.1);
    this.ambBus.gain.setTargetAtTime(amb, this.ctx.currentTime, 0.1);
  }

  mute(m) {
    if (!this.started) return;
    this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.1);
  }

  // ---------------- per-frame update ----------------
  _tick() {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const w = this.w,
      e = this.env,
      A = this.amb;
    const T = 0.6; // smoothing time constant
    const set = (param, v, tc = T) => param.setTargetAtTime(v, now, tc);
    const day = 1 - e.night;
    const indoor = Math.min(1, w.shahDome + w.lotf + w.musicRoom * 0.7);

    // --- music players
    const pw = {
      santur: w.square * (0.55 + 0.45 * day) * (1 - indoor) + w.bazaar * 0.1,
      ney: w.shahCourt * 0.9 + w.shahDome * 0.55,
      setar: w.lotf * 0.95,
      tar: w.aliqapu * 0.75 + w.musicRoom * 1.0,
    };
    for (const [k, pl] of Object.entries(this.players)) {
      set(pl.out.gain, pw[k] * (k === 'ney' ? 1.6 : 1));
      if (pw[k] > 0.02) this._schedulePlayer(pl, now + 0.4);
      else pl.next = Math.max(pl.next, now + 0.5);
    }
    set(this.drone.gain, w.shahDome * 0.6 + w.lotf * 0.4 + w.shahCourt * 0.1);
    // tombak with the Ali Qapu ensemble (6/8 pattern)
    const tg = (w.aliqapu * 0.5 + w.musicRoom * 0.7) * day;
    set(this.tombak.gain, tg);
    if (tg > 0.02) {
      const pat = ['tom', null, 'bak', 'pel', 'bak', null, 'tom', 'bak', null, 'tom', 'bak', 'pel'];
      while (this._tombakNext < now + 0.4) {
        const k = pat[this._tombakStep % pat.length];
        if (k) this._tombakHit(this._tombakNext, k, 0.6 + Math.random() * 0.3);
        this._tombakStep++;
        this._tombakNext += 0.19;
      }
    } else this._tombakNext = now + 0.5;

    // --- ambience layers
    set(A.fountain.gain, Math.min(1, e.fountain) * 0.55 * (1 - indoor * 0.9));
    set(A.fountainMod.gain, 0.4 + Math.random() * 0.4, 0.2);
    set(A.court.gain, Math.min(1, e.courtFountain) * 0.4);
    set(A.courtMod.gain, 0.15 + Math.random() * 0.2, 0.15);
    const crowd = (w.square * 0.35 + w.bazaar * 0.9 + w.aliqapu * 0.15 + w.shahCourt * 0.08) * (0.35 + 0.65 * day) * (1 - indoor * 0.85);
    set(A.crowd.gain, crowd);
    for (const b of A.crowdBands) {
      set(b.g.gain, b.lvl * (0.3 + Math.random() * 0.9), 0.08);
      set(b.bp.frequency, b.f * (0.85 + Math.random() * 0.3), 0.15);
    }
    set(A.wind.gain, Math.min(0.35, Math.max(0, e.height - 6) * 0.012 + w.aliqapu * 0.06) * (1 - indoor));
    set(A.windBp.frequency, 350 + Math.random() * 500, 1.5);
    set(A.room.gain, indoor * 0.12);
    set(A.crickets.gain, e.night * (w.square + w.shahCourt * 0.5) * 0.05);
    set(A.birds.gain, day * (w.square * 0.8 + w.shahCourt * 0.5 + w.aliqapu * 0.4) * (1 - indoor));
    set(A.pigeons.gain, day * (w.shahCourt + w.square * 0.35 + w.lotf * 0.05));
    set(A.smiths.gain, w.bazaar * day + w.square * 0.08 * day);
    set(A.carriage.gain, w.square * day * 0.9);
    set(A.swifts.gain, e.dusk * (w.square + w.shahCourt));

    // sporadic events
    if (now > this._nextBird) {
      this._chirp(now + 0.05, A.birds, Math.random() * 2 - 1);
      this._nextBird = now + 0.4 + Math.random() * 2.5;
    }
    if (now > this._nextPigeon) {
      this._coo(now + 0.05, A.pigeons, Math.random() * 1.6 - 0.8);
      this._nextPigeon = now + 2 + Math.random() * 6;
    }
    for (let i = 0; i < this._nextSmith.length; i++) {
      if (now > this._nextSmith[i]) {
        const base = [720, 910, 1180][i];
        const burst = 2 + Math.floor(Math.random() * 6);
        for (let k = 0; k < burst; k++) this._copperHit(now + 0.05 + k * (0.18 + i * 0.03), A.smiths, base * (1 + Math.random() * 0.03), [-0.6, 0.1, 0.7][i], 0.6 + Math.random() * 0.4);
        this._nextSmith[i] = now + burst * 0.22 + 0.5 + Math.random() * 2.5;
      }
    }
    if (now > this._nextCarriage) {
      if (w.square > 0.3 && day > 0.4) this._carriagePass(now + 0.1);
      this._nextCarriage = now + 20 + Math.random() * 25;
    }
    if (now > this._nextSwift) {
      if (e.dusk > 0.1) for (let i = 0; i < 3; i++) this._swift(now + i * 0.2 + Math.random() * 0.3, A.swifts);
      this._nextSwift = now + 1.5 + Math.random() * 4;
    }

    // --- reverb sends
    const R = this.reverbs;
    set(R.open.gain, w.square * 0.25 + w.aliqapu * 0.1);
    set(R.court.gain, w.shahCourt * 0.55);
    set(R.dome.gain, w.shahDome * 1.1);
    set(R.lotf.gain, w.lotf * 0.9);
    set(R.vault.gain, w.bazaar * 0.5);
    set(R.room.gain, w.musicRoom * 0.8 + w.aliqapu * 0.2);
    // dry path duck inside echoing domes to let the reverb bloom
    set(this.dry.gain, 1 - w.shahDome * 0.35 - w.lotf * 0.2);
  }
}
export { ksRender, makePhrase, degToSemis };
