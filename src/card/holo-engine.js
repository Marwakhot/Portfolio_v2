// Holo card engine, ported from the holo skill (https://design.how/vault/holo) to plain JS.
// The followers, kick, drift and per-frame custom properties are the skill's FIXED steps.
// Only two of its foil materials are kept: Holo, used here, and Brushed, a quieter metal.

const GRAIN = `url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%27120%27%20height%3D%27120%27%3E%3Cfilter%20id%3D%27n%27%3E%3CfeTurbulence%20type%3D%27fractalNoise%27%20baseFrequency%3D%27.85%27%20numOctaves%3D%273%27%20stitchTiles%3D%27stitch%27%2F%3E%3CfeColorMatrix%20type%3D%27saturate%27%20values%3D%270%27%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%27120%27%20height%3D%27120%27%20filter%3D%27url%28%23n%29%27%20opacity%3D%27.4%27%2F%3E%3C%2Fsvg%3E")`;

const SUNPILLARS = [
  'hsl(2, 100%, 73%)',
  'hsl(53, 100%, 69%)',
  'hsl(93, 100%, 69%)',
  'hsl(176, 100%, 76%)',
  'hsl(228, 100%, 74%)',
  'hsl(283, 100%, 73%)',
];

function rainbow(angle, space, hues = SUNPILLARS) {
  const stops = hues
    .map((color, i) => `${color} calc(${space} * ${i + 1})`)
    .concat(`${hues[0]} calc(${space} * ${hues.length + 1})`)
    .join(', ');
  return `repeating-linear-gradient(${angle}, ${stops})`;
}

export const FOILS = {
  holo: {
    layers: [
      { img: rainbow('10deg', '8%'), size: '380% 380%', rate: 1, blend: 'overlay', filter: 'brightness(1.08) contrast(2.3) saturate(1.5)', base: 0.26, gain: 0.6 },
      { img: rainbow('104deg', '13%'), size: '300% 300%', rate: -0.7, blend: 'color-dodge', filter: 'brightness(.82) contrast(2) saturate(1.7)', base: 0.14, gain: 0.34 },
      {
        img: 'repeating-linear-gradient(96deg, rgba(255,255,255,.5) 0px, rgba(255,255,255,0) 2px, rgba(0,0,0,.16) 3px, rgba(255,255,255,0) 5px)',
        size: 'auto', rate: 1.8, blend: 'overlay', filter: 'contrast(1.3)', base: 0.1, gain: 0.26,
      },
    ],
    parallax: 0.26,
    bloom: 0.55,
    glare: 0.55,
  },
  brushed: {
    layers: [
      {
        img: rainbow('94deg', '4%', ['hsl(30,40%,86%)', 'hsl(200,30%,88%)', 'hsl(260,25%,87%)', 'hsl(180,25%,89%)', 'hsl(40,30%,88%)', 'hsl(220,25%,87%)']),
        size: '260% 260%', rate: 0.8, blend: 'soft-light', filter: 'brightness(1.02) contrast(1.7) saturate(.55)', base: 0.34, gain: 0.3,
      },
      { img: GRAIN, size: '34% 34%', rate: 0.3, blend: 'overlay', filter: 'brightness(1) contrast(1.1)', base: 0.14, gain: 0.16 },
    ],
    parallax: 0.13,
    bloom: 0.32,
    glare: 0.34,
  },
};

export const MAX_TILT = 14;
export const LAYER_SLOTS = 3;

const adjust = (v, fromMin, fromMax, toMin, toMax) => toMin + ((toMax - toMin) * (v - fromMin)) / (fromMax - fromMin);
const clamp = (v, min = -1, max = 1) => Math.min(Math.max(v, min), max);

// Chases a target by a fixed share of the gap each frame.
export class Follow {
  constructor(stiffness) {
    this.stiffness = stiffness;
    this.value = { x: 0, y: 0 };
    this.target = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.speed = 0;
  }

  step() {
    const px = this.value.x;
    const py = this.value.y;
    this.value.x += (this.target.x - this.value.x) * this.stiffness;
    this.value.y += (this.target.y - this.value.y) * this.stiffness;
    this.velocity.x = this.value.x - px;
    this.velocity.y = this.value.y - py;
    const raw = Math.min(1, Math.hypot(this.velocity.x, this.velocity.y) * 14);
    this.speed += (raw - this.speed) * (raw > this.speed ? 0.45 : 0.06);
  }

  get settled() {
    return Math.abs(this.target.x - this.value.x) < 0.0006 && Math.abs(this.target.y - this.value.y) < 0.0006 && this.speed < 0.004;
  }
}

// The flick when the pointer leaves: a decaying push along the release velocity.
export class Kick {
  constructor() {
    this.amount = { x: 0, y: 0 };
    this.life = 0;
  }

  fire(v, gain = 2.6) {
    if (Math.hypot(v.x, v.y) < 0.002) return;
    this.amount = { x: v.x * gain, y: v.y * gain };
    this.life = 1;
  }

  step() {
    if (this.life <= 0) return { x: 0, y: 0 };
    this.life = Math.max(0, this.life - 0.035);
    const e = Math.sin(this.life * Math.PI) * this.life;
    return { x: this.amount.x * e, y: this.amount.y * e };
  }

  get active() {
    return this.life > 0;
  }
}

export class Orientation {
  constructor() {
    this.base = null;
    this.range = 22;
  }

  read(e) {
    const { beta, gamma } = e;
    if (beta == null || gamma == null) return null;
    if (!this.base) {
      this.base = { beta, gamma };
      return { x: 0, y: 0 };
    }
    return { x: clamp((gamma - this.base.gamma) / this.range), y: clamp((beta - this.base.beta) / this.range) };
  }
}

export function fromPointer(rect, cx, cy) {
  return { x: clamp(((cx - rect.left) / rect.width) * 2 - 1), y: clamp(((cy - rect.top) / rect.height) * 2 - 1) };
}

// Writes one frame of the card as custom properties; the stylesheet reads them.
export function applyFrame(card, tilt, sheet, foil, motion = {}) {
  const { x, y } = tilt;
  const s = card.style;

  s.setProperty('--rx', `${(-y * MAX_TILT).toFixed(2)}deg`);
  s.setProperty('--ry', `${(x * MAX_TILT).toFixed(2)}deg`);

  for (let i = 0; i < LAYER_SLOTS; i++) {
    const layer = foil.layers[i];
    if (!layer) continue;
    const t = foil.parallax * layer.rate;
    s.setProperty(`--l${i + 1}-x`, `${adjust(sheet.x, -1, 1, 50 - t * 100, 50 + t * 100).toFixed(1)}%`);
    s.setProperty(`--l${i + 1}-y`, `${adjust(sheet.y, -1, 1, 50 - t * 100, 50 + t * 100).toFixed(1)}%`);
  }

  const off = Math.min(1, Math.hypot(x, y));
  s.setProperty('--off', off.toFixed(3));

  const softOff = Math.min(1, Math.hypot(sheet.x, sheet.y));
  const PATTERN_FROM = 0.34;
  const t = Math.max(0, Math.min(1, (softOff - PATTERN_FROM) / (1 - PATTERN_FROM)));
  s.setProperty('--reveal', (t * t * (3 - 2 * t) * 0.9).toFixed(3));

  const angle = Math.atan2(sheet.y, sheet.x) * (180 / Math.PI);
  s.setProperty('--reveal-angle', `${(angle + 90).toFixed(0)}deg`);
  s.setProperty('--reveal-x', `${adjust(sheet.x, -1, 1, 78, 22).toFixed(1)}%`);
  s.setProperty('--reveal-y', `${adjust(sheet.y, -1, 1, 78, 22).toFixed(1)}%`);

  const SPOT = { x: -0.42, y: -0.36 };
  const hit = Math.max(0, 1 - Math.hypot(sheet.x - SPOT.x, sheet.y - SPOT.y) / 0.34);
  const spotBloom = hit * hit * (3 - 2 * hit);
  const time = motion.time ?? 0;
  const breath = 0.5 + 0.5 * Math.sin(time * 0.5) * Math.cos(time * 0.31);

  for (let i = 0; i < LAYER_SLOTS; i++) {
    const layer = foil.layers[i];
    if (!layer) continue;
    let o = Math.max(0, layer.base + off * layer.gain * (foil.bloom / 0.5));
    o *= 1 + spotBloom * 0.85;
    o *= 0.94 + breath * 0.06;
    s.setProperty(`--l${i + 1}-o`, Math.min(1, o).toFixed(3));
  }

  s.setProperty('--spin', `${(sheet.x * 90 + sheet.y * 45).toFixed(1)}deg`);
  s.setProperty('--gx', `${adjust(x, -1, 1, 12, 88).toFixed(1)}%`);
  s.setProperty('--gy', `${adjust(y, -1, 1, 12, 88).toFixed(1)}%`);
  s.setProperty('--tile-x', `${adjust(sheet.x, -1, 1, 58, 42).toFixed(1)}%`);

  const FLIP_FROM = 0.52;
  const flip = Math.max(0, Math.min(1, (softOff - FLIP_FROM) / (1 - FLIP_FROM)));
  s.setProperty('--tile-invert', flip.toFixed(3));
  s.setProperty('--tile-hue', `${(150 + flip * 120).toFixed(0)}deg`);
  s.setProperty('--tile-sweep-angle', `${(angle + 90).toFixed(0)}deg`);

  const speed = motion.speed ?? 0;
  const velocity = motion.velocity ?? { x: 0, y: 0 };
  s.setProperty('--speed', speed.toFixed(3));
  if (Math.hypot(velocity.x, velocity.y) > 0.0001) {
    s.setProperty('--smear-angle', `${(Math.atan2(velocity.y, velocity.x) * (180 / Math.PI)).toFixed(0)}deg`);
  }
  s.setProperty('--smear', (Math.min(1, speed) * 0.8).toFixed(3));
  s.setProperty('--spot', spotBloom.toFixed(3));
  s.setProperty('--emboss-x', `${(-x * 0.9).toFixed(2)}px`);
  s.setProperty('--emboss-y', `${(-y * 0.9).toFixed(2)}px`);
  s.setProperty('--edge-l', Math.max(0, -x).toFixed(3));
  s.setProperty('--edge-r', Math.max(0, x).toFixed(3));
  s.setProperty('--edge-t', Math.max(0, -y).toFixed(3));
  s.setProperty('--edge-b', Math.max(0, y).toFixed(3));
  s.setProperty('--breath', breath.toFixed(3));
}

// Paints the foil slots for a material, and the card's own colours.
export function applyFoil(card, foil, { body, tile, image }) {
  const s = card.style;
  s.setProperty('--tile-src', `url("${image}")`);
  s.setProperty('--body-grad', `linear-gradient(115deg, ${body.join(', ')})`);
  s.setProperty('--tile-dark', tile[0]);
  s.setProperty('--tile-light', tile[1]);
  s.setProperty('--glare-o', `${foil.glare}`);
  for (let i = 0; i < LAYER_SLOTS; i++) {
    const n = `--l${i + 1}`;
    const layer = foil.layers[i];
    if (!layer) {
      s.setProperty(`${n}-img`, 'none');
      s.setProperty(`${n}-o`, '0');
      continue;
    }
    s.setProperty(`${n}-img`, layer.img);
    s.setProperty(`${n}-size`, layer.size);
    s.setProperty(`${n}-bgblend`, layer.bgBlend ?? 'normal');
    s.setProperty(`${n}-blend`, layer.blend);
    s.setProperty(`${n}-filter`, layer.filter);
  }
}

// The loop: the card follows at 0.16 and the foil at 0.09, so the surface arrives late.
// Untouched, the card drifts on two slow rates; the pointer picks it up and hands it back
// with eased blends, and leaving flicks it past rest.
export class HoloTilt {
  constructor(card, foil) {
    this.card = card;
    this.foil = foil;
    this.tilt = new Follow(0.16);
    this.sheet = new Follow(0.09);
    this.kick = new Kick();
    this.orient = new Orientation();
    this.clock = 0; // seconds of animation, kept across pauses
    this.lastTime = 0;
    this.raf = 0;
    this.running = false;
    this.idle = 0;
    this.touched = false;
    this.release = 1;
    this.handoff = { x: 0, y: 0 };
    this.grab = 1;
    this.grabFrom = { x: 0, y: 0 };
    this.aim = { x: 0, y: 0 };
    this.steerAim = { x: 0, y: 0 };
    this.steerWeight = 0; // 0 to 1: how much a scripted angle takes over from the cursor

    this.frame = this.frame.bind(this);
    this.onPointer = this.onPointer.bind(this);
    this.onLeave = this.onLeave.bind(this);
    this.onOrient = this.onOrient.bind(this);
    // The whole window steers the card, so it tilts toward the cursor wherever it is.
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onLeave);
    window.addEventListener('deviceorientation', this.onOrient);
  }

  start() {
    this.running = true;
    this.wake();
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.lastTime = 0;
  }

  // Reduced motion: the card lies flat with its foil at rest.
  renderStill() {
    this.stop();
    applyFrame(this.card, { x: 0, y: 0 }, { x: 0, y: 0 }, this.foil, { speed: 0, velocity: { x: 0, y: 0 }, time: 0 });
  }

  destroy() {
    this.stop();
    window.removeEventListener('pointermove', this.onPointer);
    document.documentElement.removeEventListener('pointerleave', this.onLeave);
    window.removeEventListener('deviceorientation', this.onOrient);
  }

  wake() {
    if (this.running && !this.raf) this.raf = requestAnimationFrame(this.frame);
  }

  frame(now) {
    this.raf = 0;
    if (this.lastTime) this.clock += Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const { tilt, sheet, kick } = this;
    if (!this.touched) {
      this.idle += 0.0042;
      const drift = { x: Math.sin(this.idle) * 0.28, y: Math.cos(this.idle * 0.73) * 0.2 };
      this.release = Math.min(1, this.release + 0.016);
      const k = this.release * this.release;
      tilt.target = { x: this.handoff.x + (drift.x - this.handoff.x) * k, y: this.handoff.y + (drift.y - this.handoff.y) * k };
    } else {
      this.grab = Math.min(1, this.grab + 0.018);
      const k = this.grab * this.grab;
      tilt.target = { x: this.grabFrom.x + (this.aim.x - this.grabFrom.x) * k, y: this.grabFrom.y + (this.aim.y - this.grabFrom.y) * k };
    }
    if (this.steerWeight > 0) {
      const w = this.steerWeight;
      tilt.target = { x: tilt.target.x + (this.steerAim.x - tilt.target.x) * w, y: tilt.target.y + (this.steerAim.y - tilt.target.y) * w };
    }
    const push = kick.step();
    if (push.x || push.y) tilt.target = { x: tilt.target.x + push.x, y: tilt.target.y + push.y };
    tilt.step();
    sheet.target = tilt.value;
    sheet.step();
    applyFrame(this.card, tilt.value, sheet.value, this.foil, { speed: sheet.speed, velocity: sheet.velocity, time: this.clock });
    if (this.running && (!this.touched || this.steerWeight > 0 || this.release < 1 || this.grab < 1 || kick.active || !tilt.settled || !sheet.settled)) {
      this.raf = requestAnimationFrame(this.frame);
    } else {
      this.lastTime = 0;
    }
  }

  // Turns the card toward an angle (x, y from -1 to 1) by a weight, over whatever else steers it.
  steer(aim, weight) {
    this.steerAim = aim;
    const was = this.steerWeight;
    this.steerWeight = Math.min(1, Math.max(0, weight));
    if (this.steerWeight > 0 || was > 0) this.wake();
  }

  onPointer(e) {
    if (e.pointerType === 'touch') return; // a finger scrolling the page shouldn't steer the card
    this.aim = fromPointer({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight }, e.clientX, e.clientY);
    if (!this.touched) {
      this.touched = true;
      this.grabFrom = { ...this.tilt.value };
      this.grab = 0;
    }
    this.release = 0;
    this.wake();
  }

  onLeave() {
    if (!this.touched) return;
    this.touched = false;
    this.handoff = { ...this.tilt.value };
    this.release = 0;
    this.grab = 1;
    this.kick.fire(this.tilt.velocity);
    this.wake();
  }

  onOrient(e) {
    const v = this.orient.read(e);
    if (!v) return;
    this.touched = true;
    this.tilt.target = v;
    this.wake();
  }
}
