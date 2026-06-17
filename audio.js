// Runeborn audio engine — synthesized sound effects via the Web Audio API.
// No asset files: every cue is generated at runtime, so it works offline and
// loads instantly. A mute preference is persisted in localStorage.
(function () {
  const STORAGE_KEY = "runeborn_muted";
  let ctx = null;
  let master = null;
  let muted = false;
  try {
    muted = localStorage.getItem(STORAGE_KEY) === "1";
  } catch (e) {
    /* localStorage may be unavailable */
  }

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function resume() {
    const c = ensureCtx();
    if (c && c.state === "suspended") c.resume();
  }

  function tone(opts) {
    const c = ensureCtx();
    if (!c) return;
    const { type = "sine", freq = 440, dur = 0.2, gain = 0.2, attack = 0.006, slideTo = null, when = 0 } = opts;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function noise(opts) {
    const c = ensureCtx();
    if (!c) return;
    const { dur = 0.2, gain = 0.2, when = 0, hp = 0 } = opts;
    const t0 = c.currentTime + when;
    const frames = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, frames, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = src;
    if (hp) {
      const f = c.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = hp;
      src.connect(f);
      node = f;
    }
    node.connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  }

  const sfx = {
    buttonClick: () => tone({ type: "triangle", freq: 320, dur: 0.08, gain: 0.12 }),
    cardPlay: () => {
      tone({ type: "triangle", freq: 380, dur: 0.12, gain: 0.16 });
      tone({ type: "sine", freq: 560, dur: 0.16, gain: 0.1, when: 0.04 });
    },
    nodeExert: () => tone({ type: "sine", freq: 440, dur: 0.18, gain: 0.16, slideTo: 900 }),
    spell: () => {
      tone({ type: "sine", freq: 700, dur: 0.3, gain: 0.12, slideTo: 1500 });
      tone({ type: "sine", freq: 1040, dur: 0.28, gain: 0.08, when: 0.05 });
    },
    attack: () => {
      noise({ dur: 0.18, gain: 0.25, hp: 800 });
      tone({ type: "square", freq: 160, dur: 0.14, gain: 0.16, slideTo: 80 });
    },
    damage: () => tone({ type: "sawtooth", freq: 300, dur: 0.22, gain: 0.16, slideTo: 90 }),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone({ type: "triangle", freq: f, dur: 0.4, gain: 0.18, when: i * 0.12 })),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone({ type: "sawtooth", freq: f, dur: 0.45, gain: 0.16, when: i * 0.14 })),
  };

  function play(name) {
    if (muted) return;
    resume();
    const fn = sfx[name];
    if (fn) {
      try {
        fn();
      } catch (e) {
        /* never let audio break gameplay */
      }
    }
  }

  function setMuted(value) {
    muted = !!value;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch (e) {
      /* ignore */
    }
    return muted;
  }

  function toggleMute() {
    return setMuted(!muted);
  }

  function isMuted() {
    return muted;
  }

  // Ambient music stub — intentionally disabled. Wire a looping buffer here to
  // enable background music later.
  function startAmbient() {
    /* disabled for now */
  }

  window.RunebornAudio = { play, setMuted, toggleMute, isMuted, resume, startAmbient };
})();
