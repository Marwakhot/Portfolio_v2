// Draws both faces of the boarding pass. Coordinates are for a 1968 x 960 ticket.
const WIDTH = 1968;
const HEIGHT = 960;
const STUB_X = 1512;
const BLUE = '#3a53ed';
const INK = '#050505';
const PAPER = '#e4e3df';
const MONO = '"Geist Variable", system-ui, sans-serif';
const SANS = '"Geist Variable", system-ui, sans-serif';

function seeded(seed) {
  let state = seed;
  return () => (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296;
}

function text(ctx, value, x, y, { size = 20, font = MONO, color = INK, spacing = 0, weight = 500, align = 'left' } = {}) {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.letterSpacing = `${spacing}px`;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'left';
}

const label = (ctx, value, x, y, options = {}) =>
  text(ctx, value, x, y, { size: 20, font: SANS, color: BLUE, spacing: 1.5, weight: 600, ...options });

// Flowing topographic lines: a band of curves that bunch together and fan apart.
function contours(ctx, { x, y, length, angle, spread, lines, color, seed, alpha = 0.8 }) {
  const random = seeded(seed);
  const phases = Array.from({ length: 4 }, () => random() * 6.28);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.25;
  for (let line = 0; line < lines; line++) {
    const t = line / (lines - 1);
    ctx.beginPath();
    for (let step = 0; step <= 90; step++) {
      const u = step / 90;
      const flow = Math.sin(u * 5.2 + phases[0]) * 58 + Math.sin(u * 11 + phases[1]) * 20;
      const fan = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(u * 6.4 + phases[2] + t * 0.9));
      const ripple = Math.sin(u * 17 + phases[3] + t * 5) * 5 * t;
      const py = flow + (t - 0.5) * spread * fan + ripple;
      if (step) ctx.lineTo(u * length, py);
      else ctx.moveTo(u * length, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function globe(ctx, x, y, width, height, color, lineWidth = 3) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x, y, width, height);
  const cx = x + width / 2;
  const cy = y + height / 2;
  const r = height / 2;
  for (const rx of [r * 1.25, r * 0.55]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, r, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, y + height);
  ctx.moveTo(x, cy);
  ctx.lineTo(x + width, cy);
  for (const offset of [-0.55, 0.55]) {
    ctx.moveTo(x + width * 0.08, cy + r * offset);
    ctx.quadraticCurveTo(cx, cy + r * offset * 1.3, x + width * 0.92, cy + r * offset);
  }
  ctx.stroke();
  ctx.restore();
}

function stamp(ctx, cx, cy, radius, airline, slogan) {
  const color = 'rgba(85,85,92,.55)';
  const r = radius * 0.62;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (const ring of [radius, radius - 8, r]) {
    ctx.beginPath();
    ctx.arc(cx, cy, ring, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.45, r, 0, 0, Math.PI * 2);
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  const arcText = (value, middle, flip) => {
    ctx.font = `500 21px ${SANS}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    const textRadius = radius * 0.8;
    const step = 0.145;
    [...value].forEach((char, i) => {
      const angle = middle + (i - (value.length - 1) / 2) * step * (flip ? -1 : 1);
      ctx.save();
      ctx.translate(cx + Math.cos(angle) * textRadius, cy + Math.sin(angle) * textRadius);
      ctx.rotate(angle + (flip ? -Math.PI / 2 : Math.PI / 2));
      ctx.fillText(char, 0, 7);
      ctx.restore();
    });
  };
  arcText(airline, -Math.PI / 2, false);
  arcText(slogan.slice(0, 19), Math.PI / 2, true);
  ctx.restore();
}

const PLANE = new Path2D(
  'M8 0c.73 0 1.32 1.05 1.32 2.35v2.2l6.13 3.54c.25.14.4.4.4.69v1.1a.44.44 0 0 1-.56.42L9.32 8.5v3.06l1.9 1.33c.15.11.24.28.24.47v.79a.44.44 0 0 1-.56.42L8 13.79l-2.9.78a.44.44 0 0 1-.56-.42v-.79c0-.19.09-.36.24-.47l1.9-1.33V8.5L.71 10.3a.44.44 0 0 1-.56-.42v-1.1c0-.29.15-.55.4-.69l6.13-3.54v-2.2C6.68 1.05 7.27 0 8 0Z',
);

// A plane flying to the right, centred on (x, y).
function plane(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 2);
  ctx.scale(size / 16, size / 16);
  ctx.translate(-8, -7.5);
  ctx.fillStyle = BLUE;
  ctx.fill(PLANE);
  ctx.restore();
}

function barcode(ctx, x, y, width, height) {
  const random = seeded(1887);
  ctx.fillStyle = '#0c0c0c';
  // Guard bars either side of a dense, data-matrix style block.
  let cursor = x;
  for (const bar of [8, 3, 5, 3, 5]) {
    ctx.fillRect(cursor, y, bar, height);
    cursor += bar + 4;
  }
  const end = x + width - 80;
  const cell = 5;
  for (let cx = cursor; cx < end; cx += cell) {
    for (let cy = y; cy < y + height; cy += cell) {
      if (random() > 0.48) ctx.fillRect(cx, cy, cell, cell);
    }
  }
  cursor = end + 6;
  for (const bar of [12, 3, 5, 3, 3, 6, 3]) {
    ctx.fillRect(cursor, y, bar, height);
    cursor += bar + 5;
  }
}

function paper(ctx) {
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const random = seeded(77);
  ctx.strokeStyle = 'rgba(120,118,110,.09)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5200; i++) {
    const x = random() * WIDTH;
    const y = random() * HEIGHT;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + random() * 10 - 5, y + random() * 10 - 5, x + random() * 12 - 6, y + random() * 12 - 6);
    ctx.stroke();
  }
}

function perforation(ctx, x) {
  ctx.fillStyle = 'rgba(95,95,95,.4)';
  for (let y = 20; y < HEIGHT; y += 12) {
    ctx.beginPath();
    ctx.arc(x, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStub(ctx, pass, passenger) {
  perforation(ctx, STUB_X);
  perforation(ctx, 1892);
  globe(ctx, 1564, 62, 50, 36, BLUE, 2);
  text(ctx, pass.airline, 1636, 90, { size: 16, font: SANS, spacing: 4.4 });

  const small = { size: 14.5 };
  const value = { size: 23, spacing: 2, weight: 500 };
  label(ctx, 'PASSENGER', 1556, 196, small);
  text(ctx, passenger.slice(0, 16), 1556, 240, { size: 27, spacing: 2.5, weight: 500 });
  label(ctx, 'FLIGHT', 1556, 348, small);
  text(ctx, pass.flight, 1556, 386, value);
  label(ctx, 'DATE', 1714, 348, small);
  text(ctx, pass.date, 1714, 386, { ...value, spacing: 1.2 });
  label(ctx, 'FROM', 1556, 484, small);
  text(ctx, pass.from.code, 1556, 524, value);
  plane(ctx, 1700, 510, 30);
  label(ctx, 'TO', 1778, 484, small);
  text(ctx, pass.to.code, 1778, 524, value);
  label(ctx, 'SEAT', 1556, 608, small);
  text(ctx, pass.seat, 1556, 648, value);
  label(ctx, 'CLASS', 1778, 608, small);
  text(ctx, pass.travelClass, 1778, 648, value);
  label(ctx, 'SEQ', 1556, 726, small);
  text(ctx, pass.sequence, 1556, 766, value);

  // Wavy security pattern with a small STUB tag.
  ctx.fillStyle = 'rgba(205,207,226,.55)';
  ctx.fillRect(STUB_X + 2, 804, 1892 - STUB_X - 4, HEIGHT - 804);
  ctx.strokeStyle = 'rgba(88,104,235,.4)';
  ctx.lineWidth = 1;
  for (let y = 810; y < HEIGHT; y += 11) {
    ctx.beginPath();
    for (let x = STUB_X + 2; x < 1890; x += 4) {
      const wave = y + Math.sin(x * 0.06) * 3;
      if (x === STUB_X + 2) ctx.moveTo(x, wave);
      else ctx.lineTo(x, wave);
    }
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(228,227,223,.95)';
  ctx.fillRect(1656, 858, 92, 38);
  ctx.strokeStyle = BLUE;
  ctx.strokeRect(1656, 858, 92, 38);
  text(ctx, 'STUB', 1702, 884, { size: 16, align: 'center', color: BLUE, spacing: 3, weight: 500 });

  ctx.save();
  ctx.translate(1934, 640);
  ctx.rotate(-Math.PI / 2);
  text(ctx, 'SWIPE  >  DO NOT FOLD  >', 0, 0, { size: 17, spacing: 4, color: '#333' });
  ctx.restore();
}

export function drawPassFront(pass, name) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const passenger = name.toUpperCase();
  paper(ctx);

  contours(ctx, { x: -120, y: 400, length: 640, angle: 0.5, spread: 300, lines: 30, color: '#7f8cf3', seed: 4 });
  contours(ctx, { x: 1640, y: -60, length: 520, angle: 0.62, spread: 170, lines: 18, color: '#7f8cf3', seed: 9 });

  // Corner stripes
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 40, 20, 170);
  ctx.clip();
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 11;
  for (let y = 10; y < 240; y += 30) {
    ctx.beginPath();
    ctx.moveTo(-6, y);
    ctx.lineTo(26, y + 30);
    ctx.stroke();
  }
  ctx.restore();

  // Header
  globe(ctx, 92, 54, 75, 54, BLUE);
  text(ctx, pass.airline, 202, 92, { size: 25, font: SANS, spacing: 7 });
  ctx.fillStyle = INK;
  ctx.fillRect(485, 70, 2, 24);
  text(ctx, pass.slogan, 522, 90, { size: 17, font: SANS, spacing: 3.6, color: '#333' });

  // Passenger
  label(ctx, 'PASSENGER', 92, 196);
  text(ctx, passenger, 90, 262, { size: 58, spacing: 5, weight: 500 });
  text(ctx, pass.role, 92, 302, { size: 19, spacing: 5.2 });

  // Flight details
  label(ctx, 'FLIGHT', 820, 196);
  text(ctx, pass.flight, 820, 256, { size: 44, spacing: 5, weight: 500 });
  label(ctx, 'DATE', 1104, 196);
  text(ctx, pass.date, 1104, 256, { size: 44, spacing: 4, weight: 500 });
  label(ctx, 'FROM', 820, 348);
  text(ctx, pass.from.code, 820, 420, { size: 58, spacing: 4, weight: 500 });
  text(ctx, pass.from.city, 820, 460, { size: 16, spacing: 4.4 });
  label(ctx, 'TO', 1104, 348);
  text(ctx, pass.to.code, 1104, 420, { size: 58, spacing: 4, weight: 500 });
  text(ctx, pass.to.city, 1104, 460, { size: 16, spacing: 4.4 });

  // Boarding box
  ctx.strokeStyle = 'rgba(100,100,100,.55)';
  ctx.lineWidth = 1.5;
  ctx.fillStyle = 'rgba(228,227,223,.86)';
  ctx.fillRect(81, 509, 970, 182);
  ctx.strokeRect(81, 509, 970, 182);
  const cell = (title, value, sub, x) => {
    label(ctx, title, x, 557, { align: 'center' });
    text(ctx, value, x, 621, { size: 41, align: 'center', spacing: 3.6, weight: 500 });
    if (sub) text(ctx, sub, x, 653, { size: 19, align: 'center', spacing: 1.5, color: '#8b8b88', weight: 500 });
  };
  cell('GATE', pass.gate, '', 172);
  cell('BOARDING', pass.boarding, pass.date, 370);
  cell('SEAT', pass.seat, pass.seatType, 566);
  cell('CLASS', pass.travelClass, pass.classType, 772);
  cell('SEQ', pass.sequence, '', 948);

  stamp(ctx, 1288, 636, 100, pass.airline, pass.slogan);

  // Notice
  ctx.fillStyle = BLUE;
  for (const [dashX, dashWidth] of [[88, 12], [106, 12]]) ctx.fillRect(dashX, 751, dashWidth, 2.5);
  plane(ctx, 138, 752, 40);
  text(ctx, 'BOARDING GATE CLOSES 15 MINUTES BEFORE DEPARTURE', 172, 745, { size: 18.5, weight: 500 });
  text(ctx, 'PLEASE BE AT THE GATE ON TIME', 172, 773, { size: 18.5, color: BLUE, weight: 500 });
  const fine = { size: 13.5, font: SANS, spacing: 1.2, color: '#444' };
  text(ctx, `${pass.airline} INC.`, 92, 829, fine);
  text(ctx, 'SECURE DOCUMENT', 1016, 829, fine);
  text(ctx, 'REV.1.0', 1288, 829, fine);

  barcode(ctx, 62, 864, 1368, 60);
  drawStub(ctx, pass, passenger);
  return canvas;
}

export function drawPassBack(pass) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH / 2;
  canvas.height = HEIGHT / 2;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BLUE;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const lines = { color: '#a8b3fa', alpha: 0.5 };
  contours(ctx, { x: -60, y: 180, length: 620, angle: 0.28, spread: 240, lines: 24, seed: 12, ...lines });
  contours(ctx, { x: 500, y: 330, length: 620, angle: -0.5, spread: 260, lines: 26, seed: 21, ...lines });
  const cx = canvas.width / 2;
  globe(ctx, cx - 37, 172, 74, 54, '#ffffff', 3);
  text(ctx, pass.airline, cx, 272, { size: 22, font: SANS, color: '#ffffff', spacing: 7, align: 'center' });
  return canvas;
}
