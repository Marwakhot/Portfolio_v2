// Paper physics. Runs in a worker: crushing one sheet takes a few seconds of maths.
//
// The sheet is a triangle mesh of unstretchable edges. It gets squeezed inside a
// shrinking, lumpy sphere; quads that bend too far "crack" into permanent creases.
// It's then pulled flat again, with the creases still remembered, and a few moments
// of that unfolding are saved as the poses shown on screen.

export const ASPECT = 1.18; // height of the card, as a multiple of its width
export const POSE_OPENNESS = [0, 0.1, 0.45, 0.68, 0.86, 0.96];

const SPACING = 0.026;
const COLLISION_CELL = 0.020956;
const MIN_GAP = 0.01612;
const CREASE_ANGLE_COS = Math.cos((12 * Math.PI) / 180);
const OCCLUSION_RADIUS = 0.16;

const SETTINGS = {
  squeezeSteps: 300,
  settleSteps: 30,
  openSteps: 240,
  iterations: 7,
  stiffness: 0.25,
  crackAt: 0.004,
  creaseGive: 0.3,
  openStiffness: 0.35,
  hingeStiffness: 0.15,
  forget: [0, 0.5],
  keepCreases: 0.2,
  pull: [0.015, 0.1],
  depthPull: 0.15,
  unevenOpening: 0.55,
  ballRadius: 0.2,
  lumpiness: 0.28,
  damping: 0.94,
  openDamping: 0.6,
  saveEvery: 4,
};

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    let t = (state = (state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

const smoothstep = (from, to, value) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

// Evenly scattered points (Poisson disc), with the sheet's outline placed first.
function scatterPoints(spacing, random) {
  const xs = [];
  const ys = [];
  const across = Math.round(1 / SPACING);
  const down = Math.round(ASPECT / SPACING);
  for (let i = 0; i < across; i++) {
    xs.push(-0.5 + i / across, 0.5 - i / across);
    ys.push(-ASPECT / 2, ASPECT / 2);
  }
  for (let i = 0; i < down; i++) {
    xs.push(0.5, -0.5);
    ys.push(-ASPECT / 2 + (i * ASPECT) / down, ASPECT / 2 - (i * ASPECT) / down);
  }
  const edgeCount = xs.length;

  const columns = Math.ceil(1 / spacing) + 2;
  const rows = Math.ceil(ASPECT / spacing) + 2;
  const grid = Array.from({ length: columns * rows }, () => []);
  const cellOf = (x, y) =>
    Math.min(rows - 1, Math.max(0, Math.floor((y + ASPECT / 2) / spacing) + 1)) * columns +
    Math.min(columns - 1, Math.max(0, Math.floor((x + 0.5) / spacing) + 1));
  for (let i = 0; i < edgeCount; i++) grid[cellOf(xs[i], ys[i])].push(i);

  const isFree = (x, y) => {
    const column = Math.floor((x + 0.5) / spacing) + 1;
    const row = Math.floor((y + ASPECT / 2) / spacing) + 1;
    for (let r = row - 1; r <= row + 1; r++) {
      for (let c = column - 1; c <= column + 1; c++) {
        if (c < 0 || r < 0 || c >= columns || r >= rows) continue;
        for (const other of grid[r * columns + c]) {
          if ((xs[other] - x) ** 2 + (ys[other] - y) ** 2 < spacing * spacing) return false;
        }
      }
    }
    return true;
  };

  const active = [];
  for (let i = 0; i < edgeCount; i++) active.push(i);
  const margin = 0.3 * spacing;
  while (active.length) {
    const pick = Math.floor(random() * active.length);
    const from = active[pick];
    let placed = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const angle = random() * Math.PI * 2;
      const distance = spacing * (1 + random());
      const x = xs[from] + Math.cos(angle) * distance;
      const y = ys[from] + Math.sin(angle) * distance;
      if (Math.abs(x) > 0.5 - margin || Math.abs(y) > ASPECT / 2 - margin || !isFree(x, y)) continue;
      xs.push(x);
      ys.push(y);
      grid[cellOf(x, y)].push(xs.length - 1);
      active.push(xs.length - 1);
      placed = true;
      break;
    }
    if (!placed) active.splice(pick, 1);
  }
  return { xs, ys, edgeCount };
}

// Delaunay triangulation (Bowyer-Watson).
function triangulate(xs, ys, edgeCount) {
  const count = xs.length;
  const px = new Float64Array(count + 3);
  const py = new Float64Array(count + 3);
  for (let i = 0; i < count; i++) {
    px[i] = xs[i];
    py[i] = ys[i];
    if (i < edgeCount) {
      // Bow the outline out slightly, so collinear edge points still form triangles.
      const nx = 2 * xs[i];
      const ny = (2 * ys[i]) / ASPECT;
      if (Math.abs(Math.abs(nx) - 1) < 1e-9) px[i] += 1e-5 * Math.sign(nx) * (1 - ny * ny);
      if (Math.abs(Math.abs(ny) - 1) < 1e-9) py[i] += 1e-5 * Math.sign(ny) * (1 - nx * nx);
    }
  }
  px[count] = -10;
  py[count] = -10;
  px[count + 1] = 10;
  py[count + 1] = -10;
  px[count + 2] = 0;
  py[count + 2] = 12;

  const makeTriangle = (a, inB, inC) => {
    let b = inB;
    let c = inC;
    if ((px[b] - px[a]) * (py[c] - py[a]) - (py[b] - py[a]) * (px[c] - px[a]) < 0) [b, c] = [c, b];
    const bx = px[b] - px[a];
    const by = py[b] - py[a];
    const cx = px[c] - px[a];
    const cy = py[c] - py[a];
    const d = 2 * (bx * cy - by * cx);
    const ux = (cy * (bx * bx + by * by) - by * (cx * cx + cy * cy)) / d;
    const uy = (bx * (cx * cx + cy * cy) - cx * (bx * bx + by * by)) / d;
    return { a, b, c, x: px[a] + ux, y: py[a] + uy, r2: ux * ux + uy * uy };
  };

  let triangles = [makeTriangle(count, count + 1, count + 2)];
  const order = Array.from({ length: count }, (_, i) => i).sort((a, b) => py[a] - py[b] || px[a] - px[b]);
  for (const point of order) {
    const x = px[point];
    const y = py[point];
    const kept = [];
    const boundary = new Map();
    for (const triangle of triangles) {
      if ((x - triangle.x) ** 2 + (y - triangle.y) ** 2 < triangle.r2) {
        for (const [u, v] of [[triangle.a, triangle.b], [triangle.b, triangle.c], [triangle.c, triangle.a]]) {
          const key = u < v ? u * (count + 3) + v : v * (count + 3) + u;
          if (boundary.has(key)) boundary.delete(key);
          else boundary.set(key, [u, v]);
        }
      } else {
        kept.push(triangle);
      }
    }
    for (const [u, v] of boundary.values()) kept.push(makeTriangle(u, v, point));
    triangles = kept;
  }

  const indices = [];
  for (const { a, b, c } of triangles) {
    if (a >= count || b >= count || c >= count) continue;
    if ((xs[b] - xs[a]) * (ys[c] - ys[a]) - (ys[b] - ys[a]) * (xs[c] - xs[a]) > 1e-7) indices.push(a, b, c);
  }
  return Uint32Array.from(indices);
}

export function buildMesh() {
  const { xs, ys, edgeCount } = scatterPoints(SPACING, seededRandom(7));
  const tris = triangulate(xs, ys, edgeCount);
  const n = xs.length;
  const rest = new Float32Array(3 * n);
  const uv = new Float32Array(2 * n);
  for (let i = 0; i < n; i++) {
    rest[3 * i] = xs[i];
    rest[3 * i + 1] = ys[i];
    uv[2 * i] = xs[i] + 0.5;
    uv[2 * i + 1] = ys[i] / ASPECT + 0.5;
  }

  // Edges, plus "quads": two triangles sharing an edge, used for bending.
  const seen = new Map();
  const edges = [];
  const quads = [];
  for (let t = 0; t < tris.length; t += 3) {
    for (let side = 0; side < 3; side++) {
      const a = tris[t + side];
      const b = tris[t + (side + 1) % 3];
      const opposite = tris[t + (side + 2) % 3];
      const key = a < b ? a * n + b : b * n + a;
      const other = seen.get(key);
      if (other === undefined) {
        seen.set(key, opposite);
        edges.push(a, b);
      } else {
        quads.push(a, b, other, opposite);
      }
    }
  }
  return { n, rest, uv, tris, edges: Uint32Array.from(edges), quads: Uint32Array.from(quads) };
}

function createHash(count) {
  let size = 1;
  while (size < 2 * count) size <<= 1;
  return {
    size,
    start: new Int32Array(size + 1),
    items: new Int32Array(count),
    cells: new Int32Array(count),
    pairs: new Int32Array(32 * count),
    count: 0,
  };
}

const hashCell = (x, y, z, mask) =>
  (Math.imul(x, 0x58894f7) ^ Math.imul(y, 0x2915b14b) ^ Math.imul(z, 0x10ec5419)) & mask;

function fillHash(hash, positions, count, cell) {
  const { size, start, items, cells } = hash;
  const mask = size - 1;
  start.fill(0);
  for (let i = 0; i < count; i++) {
    const h = hashCell(
      Math.floor(positions[3 * i] / cell),
      Math.floor(positions[3 * i + 1] / cell),
      Math.floor(positions[3 * i + 2] / cell),
      mask,
    );
    cells[i] = h;
    start[h]++;
  }
  for (let i = 1; i <= size; i++) start[i] += start[i - 1];
  for (let i = 0; i < count; i++) items[--start[cells[i]]] = i;
}

function findClosePairs(positions, count, hash, cell) {
  fillHash(hash, positions, count, cell);
  const { start, items, pairs, size } = hash;
  const mask = size - 1;
  const limit = cell * cell;
  let found = 0;
  for (let a = 0; a < count; a++) {
    const x = positions[3 * a];
    const y = positions[3 * a + 1];
    const z = positions[3 * a + 2];
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const cz = Math.floor(z / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const h = hashCell(cx + dx, cy + dy, cz + dz, mask);
          for (let k = start[h], end = start[h + 1]; k < end; k++) {
            const b = items[k];
            if (b <= a) continue;
            const ox = positions[3 * b] - x;
            const oy = positions[3 * b + 1] - y;
            const oz = positions[3 * b + 2] - z;
            if (ox * ox + oy * oy + oz * oz < limit && found < pairs.length) {
              pairs[found++] = a;
              pairs[found++] = b;
            }
          }
        }
      }
    }
  }
  return found;
}

function edgeLengths(positions, edges) {
  const lengths = new Float32Array(edges.length / 2);
  for (let i = 0; i < lengths.length; i++) {
    const a = 3 * edges[2 * i];
    const b = 3 * edges[2 * i + 1];
    lengths[i] = Math.hypot(positions[b] - positions[a], positions[b + 1] - positions[a + 1], positions[b + 2] - positions[a + 2]);
  }
  return lengths;
}

// Distance between the two tips of each quad: how far that crease is folded.
function hingeLengths(positions, quads) {
  const lengths = new Float32Array(quads.length / 4);
  for (let i = 0; i < lengths.length; i++) {
    const a = 3 * quads[4 * i + 2];
    const b = 3 * quads[4 * i + 3];
    lengths[i] = Math.hypot(positions[b] - positions[a], positions[b + 1] - positions[a + 1], positions[b + 2] - positions[a + 2]);
  }
  return lengths;
}

const determinant = (a, b, c, d, e, f, g, h, i) => a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);

// For each quad, the weights that measure flatness: zero when the quad is flat.
function bendWeights(positions, quads) {
  const count = quads.length / 4;
  const weights = new Float32Array(4 * count);
  for (let q = 0; q < count; q++) {
    const [ax, bx, cx, dx] = [0, 1, 2, 3].map((k) => positions[3 * quads[4 * q + k]]);
    const [ay, by, cy, dy] = [0, 1, 2, 3].map((k) => positions[3 * quads[4 * q + k] + 1]);
    const base = determinant(1, 1, 1, ax, bx, dx, ay, by, dy);
    const u = determinant(-1, 1, 1, -cx, bx, dx, -cy, by, dy) / base;
    const v = determinant(1, -1, 1, ax, -cx, dx, ay, -cy, dy) / base;
    const w = determinant(1, 1, -1, ax, bx, -cx, ay, by, -cy) / base;
    const scale = Math.sqrt(u * u + v * v + 1 + w * w);
    weights[4 * q] = u / scale;
    weights[4 * q + 1] = v / scale;
    weights[4 * q + 2] = 1 / scale;
    weights[4 * q + 3] = w / scale;
  }
  return weights;
}

function solveEdges(p, edges, lengths) {
  for (let i = 0, count = lengths.length; i < count; i++) {
    const a = 3 * edges[2 * i];
    const b = 3 * edges[2 * i + 1];
    const x = p[b] - p[a];
    const y = p[b + 1] - p[a + 1];
    const z = p[b + 2] - p[a + 2];
    const length = Math.sqrt(x * x + y * y + z * z);
    if (length < 1e-9) continue;
    const k = ((length - lengths[i]) / length) * 0.5;
    p[a] += x * k;
    p[a + 1] += y * k;
    p[a + 2] += z * k;
    p[b] -= x * k;
    p[b + 1] -= y * k;
    p[b + 2] -= z * k;
  }
}

function solveFlatness(p, quads, weights, cracked, stiffness) {
  for (let q = 0, count = cracked.length; q < count; q++) {
    if (cracked[q]) continue;
    const a = 3 * quads[4 * q];
    const b = 3 * quads[4 * q + 1];
    const c = 3 * quads[4 * q + 2];
    const d = 3 * quads[4 * q + 3];
    const wa = weights[4 * q];
    const wb = weights[4 * q + 1];
    const wc = weights[4 * q + 2];
    const wd = weights[4 * q + 3];
    for (let axis = 0; axis < 3; axis++) {
      const error = (wa * p[a + axis] + wb * p[b + axis] + wc * p[c + axis] + wd * p[d + axis]) * stiffness;
      p[a + axis] -= wa * error;
      p[b + axis] -= wb * error;
      p[c + axis] -= wc * error;
      p[d + axis] -= wd * error;
    }
  }
}

function solveCreases(p, quads, hinges, cracked, stiffness) {
  for (let q = 0, count = cracked.length; q < count; q++) {
    if (!cracked[q]) continue;
    const a = 3 * quads[4 * q + 2];
    const b = 3 * quads[4 * q + 3];
    const x = p[b] - p[a];
    const y = p[b + 1] - p[a + 1];
    const z = p[b + 2] - p[a + 2];
    const length = Math.sqrt(x * x + y * y + z * z);
    if (length < 1e-9) continue;
    const k = ((length - hinges[q]) / length) * 0.5 * stiffness;
    p[a] += x * k;
    p[a + 1] += y * k;
    p[a + 2] += z * k;
    p[b] -= x * k;
    p[b + 1] -= y * k;
    p[b + 2] -= z * k;
  }
}

function solveCollisions(p, pairs, count, gap) {
  const limit = gap * gap;
  for (let i = 0; i < count; i += 2) {
    const a = 3 * pairs[i];
    const b = 3 * pairs[i + 1];
    const x = p[b] - p[a];
    const y = p[b + 1] - p[a + 1];
    const z = p[b + 2] - p[a + 2];
    const squared = x * x + y * y + z * z;
    if (squared >= limit || squared < 1e-14) continue;
    const length = Math.sqrt(squared);
    const k = ((gap - length) / length) * 0.5;
    p[a] -= x * k;
    p[a + 1] -= y * k;
    p[a + 2] -= z * k;
    p[b] += x * k;
    p[b + 1] += y * k;
    p[b + 2] += z * k;
  }
}

// A sphere with bumps, so the ball comes out irregular.
function lumpField(random, lumpiness) {
  const waves = [];
  for (let i = 0; i < 5; i++) {
    const z = 2 * random() - 1;
    const angle = random() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    waves.push([r * Math.cos(angle), r * Math.sin(angle), z, 1.5 + 2.5 * random(), random() * Math.PI * 2, 0.4 + 0.6 * random()]);
  }
  const total = waves.reduce((sum, wave) => sum + wave[5], 0);
  return (x, y, z) => {
    let value = 0;
    for (const [dx, dy, dz, frequency, phase, amplitude] of waves) {
      value += amplitude * Math.cos((x * dx + y * dy + z * dz) * frequency + phase);
    }
    return 1 + (lumpiness * value) / total;
  };
}

export function simulateCrumple(mesh, seed) {
  const s = SETTINGS;
  const random = seededRandom(7919 * seed + 13);
  const { n, rest, edges, quads } = mesh;
  const quadCount = quads.length / 4;
  const size = 3 * n;

  const current = new Float32Array(rest);
  const next = new Float32Array(size);
  const velocity = new Float32Array(size);
  const ripple = [6 * random(), 6 * random(), 6 * random()];
  for (let i = 0; i < n; i++) {
    const x = current[3 * i];
    const y = current[3 * i + 1];
    current[3 * i + 2] =
      0.006 * (Math.sin(5.1 * x + ripple[0]) * Math.cos(4.3 * y + ripple[1]) + Math.sin((x + y) * 7.7 + ripple[2])) +
      0.001 * (random() - 0.5);
  }

  const lengths = edgeLengths(rest, edges);
  const weights = bendWeights(rest, quads);
  const flatHinges = hingeLengths(rest, quads);
  const hinges = new Float32Array(flatHinges);
  const cracked = new Uint8Array(quadCount);
  const bendAmount = new Float32Array(quadCount);
  const hash = createHash(n);
  const lump = lumpField(random, s.lumpiness);
  const radii = new Float32Array(n);
  const spin = [(random() - 0.5) * 0.6, (random() - 0.5) * 0.6];
  const startRadius = Math.hypot(1, ASPECT) / 2 + 0.02;

  let frame = 0;
  const stepOnce = (damping, before, after, stiffness, hingeStiffness, collide) => {
    for (let i = 0; i < size; i++) {
      velocity[i] *= damping;
      next[i] = current[i] + velocity[i];
    }
    before(next);
    if (collide) {
      if (frame++ % 2 === 0 || !hash.count) hash.count = findClosePairs(next, n, hash, COLLISION_CELL);
    } else {
      hash.count = 0;
    }
    for (let i = 0; i < s.iterations; i++) {
      solveEdges(next, edges, lengths);
      solveFlatness(next, quads, weights, cracked, stiffness);
      solveCreases(next, quads, hinges, cracked, hingeStiffness);
      solveCollisions(next, hash.pairs, hash.count, MIN_GAP);
      after(next);
    }
    for (let i = 0; i < size; i++) {
      velocity[i] = next[i] - current[i];
      current[i] = next[i];
    }
  };

  // Squeeze
  let radius = startRadius;
  let cosX = 1;
  let sinX = 0;
  let cosY = 1;
  let sinY = 0;
  const measureRadii = (p) => {
    for (let i = 0; i < n; i++) {
      const x = p[3 * i];
      const y = p[3 * i + 1];
      const z = p[3 * i + 2];
      const length = Math.sqrt(x * x + y * y + z * z) || 1;
      const ry = y * cosX - z * sinX;
      const rz = y * sinX + z * cosX;
      radii[i] = radius * lump((x * cosY + rz * sinY) / length, ry / length, (-x * sinY + rz * cosY) / length);
    }
  };
  const keepInside = (p) => {
    for (let i = 0; i < n; i++) {
      const x = p[3 * i];
      const y = p[3 * i + 1];
      const z = p[3 * i + 2];
      const squared = x * x + y * y + z * z;
      if (squared > radii[i] * radii[i]) {
        const k = radii[i] / Math.sqrt(squared);
        p[3 * i] = x * k;
        p[3 * i + 1] = y * k;
        p[3 * i + 2] = z * k;
      }
    }
  };

  const squeezeTotal = s.squeezeSteps + s.settleSteps;
  for (let step = 0; step < squeezeTotal; step++) {
    const t = Math.min(1, step / s.squeezeSteps);
    radius = startRadius + (s.ballRadius - startRadius) * (1 - Math.pow(1 - t, 1.6));
    cosX = Math.cos(spin[0] * t);
    sinX = Math.sin(spin[0] * t);
    cosY = Math.cos(spin[1] * t);
    sinY = Math.sin(spin[1] * t);
    stepOnce(s.damping, measureRadii, keepInside, s.stiffness, 0.02, radius < 0.62);

    if (step % 3 === 0) {
      for (let q = 0; q < quadCount; q++) {
        const a = 3 * quads[4 * q];
        const b = 3 * quads[4 * q + 1];
        const c = 3 * quads[4 * q + 2];
        const d = 3 * quads[4 * q + 3];
        let sum = 0;
        for (let axis = 0; axis < 3; axis++) {
          const value =
            weights[4 * q] * current[a + axis] +
            weights[4 * q + 1] * current[b + axis] +
            weights[4 * q + 2] * current[c + axis] +
            weights[4 * q + 3] * current[d + axis];
          sum += value * value;
        }
        bendAmount[q] = Math.sqrt(sum);
      }
      const measured = hingeLengths(current, quads);
      for (let q = 0; q < quadCount; q++) {
        if (!cracked[q] && bendAmount[q] > s.crackAt) cracked[q] = 1;
        if (cracked[q]) hinges[q] += (measured[q] - hinges[q]) * s.creaseGive;
      }
    }
  }

  // Centre the ball
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < n; i++) {
    cx += current[3 * i];
    cy += current[3 * i + 1];
    cz += current[3 * i + 2];
  }
  for (let i = 0; i < n; i++) {
    current[3 * i] -= cx / n;
    current[3 * i + 1] -= cy / n;
    current[3 * i + 2] -= cz / n;
  }
  velocity.fill(0);

  // Open: each part of the sheet starts opening at a slightly different moment.
  const ball = new Float32Array(current);
  const ballHinges = hingeLengths(ball, quads);
  const targets = new Float32Array(size);
  const lateness = new Float32Array(n);
  const blobs = Array.from({ length: 4 }, () => [random() - 0.5, (random() - 0.5) * ASPECT, 0.22 + 0.3 * random(), random() < 0.5 ? -1 : 1]);
  let lowest = Infinity;
  let highest = -Infinity;
  for (let i = 0; i < n; i++) {
    let value = 0;
    for (const [bx, by, width, sign] of blobs) {
      value += sign * Math.exp(-((rest[3 * i] - bx) ** 2 + (rest[3 * i + 1] - by) ** 2) / (width * width));
    }
    lateness[i] = value;
    lowest = Math.min(lowest, value);
    highest = Math.max(highest, value);
  }
  for (let i = 0; i < n; i++) lateness[i] = (lateness[i] - lowest) / (highest - lowest || 1);

  let crushed = 0;
  for (let i = 0; i < size; i++) crushed += Math.abs(rest[i] - ball[i]);

  const frames = [{ open: 0, pos: new Float32Array(ball) }];
  const nothing = () => {};
  for (let step = 1; step <= s.openSteps; step++) {
    const t = step / s.openSteps;
    for (let i = 0; i < n; i++) {
      const eased = smoothstep(0, 1, (t - s.unevenOpening * lateness[i]) / (1 - s.unevenOpening));
      for (let k = 3 * i; k < 3 * i + 3; k++) targets[k] = ball[k] + (rest[k] - ball[k]) * eased;
    }
    const forgetting = smoothstep(s.forget[0], s.forget[1], t) * (1 - s.keepCreases);
    for (let q = 0; q < quadCount; q++) hinges[q] = ballHinges[q] + (flatHinges[q] - ballHinges[q]) * forgetting;

    const pull = s.pull[0] + (s.pull[1] - s.pull[0]) * t * t;
    const depth = pull * (s.depthPull + (1 - s.depthPull) * (1 - smoothstep(0.3, 0.7, t)));
    const pullToTargets = (p) => {
      for (let k = 0; k < size; k += 3) {
        p[k] += (targets[k] - p[k]) * pull;
        p[k + 1] += (targets[k + 1] - p[k + 1]) * pull;
        p[k + 2] += (targets[k + 2] - p[k + 2]) * depth;
      }
    };
    stepOnce(s.openDamping, nothing, pullToTargets, s.openStiffness, s.hingeStiffness, t < 0.75);

    if (step % s.saveEvery === 0 || step === s.openSteps) {
      let remaining = 0;
      for (let i = 0; i < size; i++) remaining += Math.abs(rest[i] - current[i]);
      frames.push({ open: Math.max(0, 1 - remaining / crushed), pos: new Float32Array(current) });
    }
  }

  return POSE_OPENNESS.map((openness) => {
    let closest = frames[0];
    for (const candidate of frames) {
      if (Math.abs(candidate.open - openness) < Math.abs(closest.open - openness)) closest = candidate;
    }
    return { open: closest.open, pos: closest.pos, ...occlusion(mesh, closest.pos) };
  });
}

// Shading for each side of the paper: darker in folds, where neighbouring paper overhangs.
function occlusion(mesh, positions) {
  const { n, tris } = mesh;
  const normals = new Float32Array(3 * n);
  for (let t = 0; t < tris.length; t += 3) {
    const a = 3 * tris[t];
    const b = 3 * tris[t + 1];
    const c = 3 * tris[t + 2];
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      normals[v] += nx;
      normals[v + 1] += ny;
      normals[v + 2] += nz;
    }
  }

  const hash = createHash(n);
  fillHash(hash, positions, n, OCCLUSION_RADIUS);
  const { start, items, size } = hash;
  const mask = size - 1;
  const front = new Float32Array(n);
  const back = new Float32Array(n);
  const radiusSquared = OCCLUSION_RADIUS * OCCLUSION_RADIUS;
  for (let i = 0; i < n; i++) {
    const x = positions[3 * i];
    const y = positions[3 * i + 1];
    const z = positions[3 * i + 2];
    const length = Math.hypot(normals[3 * i], normals[3 * i + 1], normals[3 * i + 2]) || 1;
    const nx = normals[3 * i] / length;
    const ny = normals[3 * i + 1] / length;
    const nz = normals[3 * i + 2] / length;
    let above = 0;
    let below = 0;
    const cx = Math.floor(x / OCCLUSION_RADIUS);
    const cy = Math.floor(y / OCCLUSION_RADIUS);
    const cz = Math.floor(z / OCCLUSION_RADIUS);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const h = hashCell(cx + dx, cy + dy, cz + dz, mask);
          for (let k = start[h], end = start[h + 1]; k < end; k++) {
            const other = items[k];
            if (other === i) continue;
            const ox = positions[3 * other] - x;
            const oy = positions[3 * other + 1] - y;
            const oz = positions[3 * other + 2] - z;
            const squared = ox * ox + oy * oy + oz * oz;
            if (squared > radiusSquared || squared < 1e-10) continue;
            const distance = Math.sqrt(squared);
            const facing = (ox * nx + oy * ny + oz * nz) / distance;
            const falloff = 1 - distance / OCCLUSION_RADIUS;
            const weight = (6.084e-4 / (squared + 6.084e-4)) * falloff * falloff;
            if (facing > 0) above += facing * weight;
            else below -= facing * weight;
          }
        }
      }
    }
    front[i] = Math.exp(-0.9 * above);
    back[i] = Math.exp(-0.9 * below);
  }
  return { front, back };
}

// Turns a pose into per-triangle attributes: smooth across gentle bends, sharp at creases.
export function bakePose(mesh, positions, front, back) {
  const { tris, n } = mesh;
  const triangleCount = tris.length / 3;
  const faceNormals = new Float32Array(3 * triangleCount);
  const facesOfVertex = mesh.facesOfVertex ?? (mesh.facesOfVertex = (() => {
    const lists = Array.from({ length: n }, () => []);
    for (let t = 0; t < triangleCount; t++) for (let k = 0; k < 3; k++) lists[tris[3 * t + k]].push(t);
    return lists;
  })());

  for (let t = 0; t < triangleCount; t++) {
    const a = 3 * tris[3 * t];
    const b = 3 * tris[3 * t + 1];
    const c = 3 * tris[3 * t + 2];
    const ux = positions[b] - positions[a];
    const uy = positions[b + 1] - positions[a + 1];
    const uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a];
    const vy = positions[c + 1] - positions[a + 1];
    const vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    faceNormals[3 * t] = nx / length;
    faceNormals[3 * t + 1] = ny / length;
    faceNormals[3 * t + 2] = nz / length;
  }

  const P = new Float32Array(9 * triangleCount);
  const N = new Float32Array(9 * triangleCount);
  const F = new Float32Array(9 * triangleCount);
  const B = new Float32Array(9 * triangleCount);
  for (let t = 0; t < triangleCount; t++) {
    const fx = faceNormals[3 * t];
    const fy = faceNormals[3 * t + 1];
    const fz = faceNormals[3 * t + 2];
    for (let k = 0; k < 3; k++) {
      const vertex = tris[3 * t + k];
      const o = (3 * t + k) * 3;
      P[o] = positions[3 * vertex];
      P[o + 1] = positions[3 * vertex + 1];
      P[o + 2] = positions[3 * vertex + 2];
      let nx = 0;
      let ny = 0;
      let nz = 0;
      for (const other of facesOfVertex[vertex]) {
        const ox = faceNormals[3 * other];
        const oy = faceNormals[3 * other + 1];
        const oz = faceNormals[3 * other + 2];
        if (ox * fx + oy * fy + oz * fz < CREASE_ANGLE_COS) continue;
        nx += ox;
        ny += oy;
        nz += oz;
      }
      const length = Math.hypot(nx, ny, nz) || 1;
      N[o] = nx / length;
      N[o + 1] = ny / length;
      N[o + 2] = nz / length;
      F[o] = F[o + 1] = F[o + 2] = front ? front[vertex] : 1;
      B[o] = B[o + 1] = B[o + 2] = back ? back[vertex] : 1;
    }
  }
  return { P, N, F, B };
}
