// Lightweight Web Audio synth SFX. No assets, no network.
// Respects a persisted mute toggle and the user's reduced-motion preference.

const KEY = "mathly.sfx.v1";

let ctx: AudioContext | null = null;
let muted = false;
let lastPlay = 0;

if (typeof window !== "undefined") {
  try {
    muted = window.localStorage.getItem(KEY) === "off";
  } catch {
    /* ignore */
  }
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

// Unlock on first user gesture (browsers require it).
if (typeof window !== "undefined") {
  const unlock = () => {
    const c = getCtx();
    if (c && c.state === "suspended") c.resume();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: false });
  window.addEventListener("keydown", unlock, { once: false });
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(v: boolean) {
  muted = v;
  try {
    window.localStorage.setItem(KEY, v ? "off" : "on");
  } catch {
    /* ignore */
  }
}

interface ToneOpts {
  freq: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  slideTo?: number;
  delay?: number;
  attack?: number;
}

function tone(o: ToneOpts) {
  const c = getCtx();
  if (!c || muted) return;
  const t0 = c.currentTime + (o.delay ?? 0);
  const dur = o.duration ?? 0.12;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t0 + dur);
  const vol = (o.volume ?? 0.12);
  const atk = o.attack ?? 0.005;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + atk);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(duration = 0.18, volume = 0.08) {
  const c = getCtx();
  if (!c || muted) return;
  const t0 = c.currentTime;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const gain = c.createGain();
  gain.gain.value = volume;
  const filter = c.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 800;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

// Rate-limit to avoid audio spam
function throttled(fn: () => void, ms = 40) {
  const now = Date.now();
  if (now - lastPlay < ms) return;
  lastPlay = now;
  fn();
}

export const sfx = {
  click: () =>
    throttled(() =>
      tone({ freq: 620, duration: 0.05, type: "triangle", volume: 0.06, slideTo: 780 }),
    ),
  tap: () => throttled(() => tone({ freq: 440, duration: 0.04, type: "sine", volume: 0.05 })),
  hover: () => throttled(() => tone({ freq: 900, duration: 0.03, type: "sine", volume: 0.025 }), 80),
  toggle: () => {
    tone({ freq: 520, duration: 0.06, type: "square", volume: 0.05 });
    tone({ freq: 760, duration: 0.06, type: "square", volume: 0.05, delay: 0.05 });
  },
  open: () => {
    tone({ freq: 500, duration: 0.08, type: "sine", volume: 0.06, slideTo: 820 });
  },
  close: () => {
    tone({ freq: 700, duration: 0.08, type: "sine", volume: 0.05, slideTo: 380 });
  },
  success: () => {
    tone({ freq: 660, duration: 0.11, type: "triangle", volume: 0.09 });
    tone({ freq: 880, duration: 0.11, type: "triangle", volume: 0.09, delay: 0.09 });
    tone({ freq: 1175, duration: 0.16, type: "triangle", volume: 0.09, delay: 0.18 });
  },
  error: () => {
    tone({ freq: 320, duration: 0.14, type: "sawtooth", volume: 0.08, slideTo: 180 });
    tone({ freq: 220, duration: 0.18, type: "sawtooth", volume: 0.06, delay: 0.1, slideTo: 130 });
  },
  correct: () => {
    tone({ freq: 784, duration: 0.09, type: "triangle", volume: 0.1 });
    tone({ freq: 1046, duration: 0.14, type: "triangle", volume: 0.1, delay: 0.08 });
  },
  wrong: () => {
    tone({ freq: 280, duration: 0.16, type: "square", volume: 0.07, slideTo: 180 });
  },
  submit: () => {
    tone({ freq: 540, duration: 0.08, type: "sine", volume: 0.08, slideTo: 720 });
    tone({ freq: 720, duration: 0.1, type: "sine", volume: 0.07, delay: 0.07, slideTo: 960 });
  },
  complete: () => {
    // little victory arpeggio
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) =>
      tone({ freq: f, duration: 0.16, type: "triangle", volume: 0.1, delay: i * 0.09 }),
    );
    noiseBurst(0.12, 0.04);
  },
  levelUp: () => {
    tone({ freq: 660, duration: 0.1, type: "square", volume: 0.09 });
    tone({ freq: 880, duration: 0.1, type: "square", volume: 0.09, delay: 0.08 });
    tone({ freq: 1320, duration: 0.18, type: "square", volume: 0.09, delay: 0.16 });
  },
  boom: () => {
    noiseBurst(0.35, 0.15);
    tone({ freq: 90, duration: 0.3, type: "sawtooth", volume: 0.12, slideTo: 40 });
  },
  pop: () => tone({ freq: 1100, duration: 0.05, type: "triangle", volume: 0.07, slideTo: 1500 }),
  swipe: () =>
    tone({ freq: 300, duration: 0.09, type: "sine", volume: 0.05, slideTo: 900 }),
  publish: () => {
    tone({ freq: 523, duration: 0.1, type: "triangle", volume: 0.09 });
    tone({ freq: 784, duration: 0.1, type: "triangle", volume: 0.09, delay: 0.08 });
    tone({ freq: 1046, duration: 0.2, type: "triangle", volume: 0.1, delay: 0.16 });
  },
};

// Attach a global click listener so every button on the platform feels tactile.
export function installGlobalClickSfx() {
  if (typeof window === "undefined") return;
  const handler = (e: MouseEvent) => {
    if (muted) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const el = target.closest(
      'button, [role="button"], a, [data-sfx="click"], input[type="checkbox"], input[type="radio"], [role="switch"], [role="tab"], [role="menuitem"]',
    ) as HTMLElement | null;
    if (!el) return;
    if (el.hasAttribute("disabled") || el.getAttribute("aria-disabled") === "true") return;
    if (el.dataset.sfx === "off") return;
    const kind = el.dataset.sfx;
    if (kind === "success") sfx.success();
    else if (kind === "submit") sfx.submit();
    else if (kind === "toggle" || el.getAttribute("role") === "switch") sfx.toggle();
    else sfx.click();
  };
  window.addEventListener("click", handler, true);
}
