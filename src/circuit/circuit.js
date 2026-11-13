import { projectFields, projectsSection } from '../config.js';

// Projects as a circuit. The card's gold chip sits on the left and four traces run from it to the
// four project areas on the right. Clicking an area slides the whole circuit left until that
// area sits where the chip was, and new traces grow out of it to each of its projects, with the
// chosen project's story beside them. journey.js drives the reveal from the scroll and places the
// chip while the view is still zooming into the card; the clicks are handled here.

const SVG_NS = 'http://www.w3.org/2000/svg';
const ACCENT = { blue: '#1400ff', orange: '#f3742b', pink: '#ec3293', black: '#1b1b1f' };
const EASE = 'cubic-bezier(.65, 0, .35, 1)';
const CHIP_RATIO = 1.3; // width / height, the same as the chip printed on the card
const TILT_X = 56; // the card's tilt, which the chip starts in
const TILT_Z = -28;

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ramp = (t, [from, to]) => clamp((t - from) / (to - from));
const smooth = (x) => x * x * (3 - 2 * x);
const pad = (n) => String(n).padStart(2, '0');
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const chipSize = (phone) => (phone ? 112 : 176);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svg(tag, attributes = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent?.append(node);
  return node;
}

// A right-angled trace from a to b, turning at x = turn, with rounded corners.
function route(a, turn, b, radius = 10) {
  const dy = b.y - a.y;
  if (Math.abs(dy) < 1) return `M${a.x} ${a.y}H${b.x}`;
  const down = Math.sign(dy);
  const out = Math.sign(turn - a.x) || 1;
  const into = Math.sign(b.x - turn) || 1;
  const r = Math.min(radius, Math.abs(dy) / 2, Math.abs(turn - a.x), Math.abs(b.x - turn));
  return `M${a.x} ${a.y}H${turn - out * r}Q${turn} ${a.y} ${turn} ${a.y + down * r}`
    + `V${b.y - down * r}Q${turn} ${b.y} ${turn + into * r} ${b.y}H${b.x}`;
}

// Where each trace turns, so none of them cross: traces heading farthest from the middle turn first.
function turns(starts, ends, first, step) {
  const order = starts.map((start, i) => ({ i, rise: ends[i].y - start.y }));
  const up = order.filter((o) => o.rise < 0).sort((a, b) => a.rise - b.rise);
  const down = order.filter((o) => o.rise >= 0).sort((a, b) => b.rise - a.rise);
  const out = [];
  for (const group of [up, down]) group.forEach((o, k) => { out[o.i] = first + k * step; });
  return out;
}

// A layer of traces, each with a little current running along it once it's drawn.
function wires(className, idPrefix) {
  const layer = svg('svg', { class: `cx-wires ${className}`, 'aria-hidden': 'true' });
  const paths = [];
  return {
    layer,
    paths,
    set(count) {
      while (paths.length < count) {
        const n = paths.length;
        const id = `${idPrefix}-${n}`;
        const path = svg('path', { id, class: 'cx-trace' }, layer);
        const dot = svg('circle', { r: 2.6, class: 'cx-current' }, layer);
        const motion = svg('animateMotion', { dur: `${2.4 + n * 0.35}s`, repeatCount: 'indefinite' }, dot);
        svg('mpath', { href: `#${id}` }, motion);
        paths.push({ path, dot });
      }
      paths.forEach(({ path, dot }, n) => {
        path.style.display = n < count ? '' : 'none';
        dot.style.display = n < count ? '' : 'none';
      });
    },
    draw(n, d, amount) {
      const { path, dot } = paths[n];
      if (path.getAttribute('d') !== d) path.setAttribute('d', d);
      const length = path.getTotalLength() || 1;
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${(length * (1 - amount)).toFixed(1)}`;
      path.style.visibility = amount > 0 ? '' : 'hidden'; // a round cap would leave a dot
      dot.style.opacity = amount >= 1 ? 1 : 0;
    },
  };
}

function list(label, items) {
  const block = el('div', 'cx-block');
  const points = el('ul', 'cx-points');
  points.append(...(items ?? []).map((text) => el('li', '', text)));
  block.append(el('h4', 'cx-label', label), points);
  return block;
}

// Runs fn(amount) from 0 to 1 over the given time, one frame at a time.
function tween(duration, fn) {
  if (reduced()) {
    fn(1);
    return Promise.resolve();
  }
  const start = performance.now();
  return new Promise((resolve) => {
    const step = (now) => {
      const amount = clamp((now - start) / duration);
      fn(amount);
      if (amount < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

export function createCircuit() {
  const root = el('section', 'cx');
  root.setAttribute('aria-label', 'Projects');

  const title = el('div', 'cx-title');
  title.append(el('h2', 'cx-heading', projectsSection.heading), el('p', 'cx-hint', projectsSection.hint));

  // The chip: an outer box placed by the scroll, and a body that tilts toward the cursor.
  const chip = el('div', 'cx-chip');
  chip.setAttribute('aria-hidden', 'true');
  const chipBody = el('div', 'cx-chip-body');
  chipBody.append(el('span', 'cx-chip-core'), el('span', 'cx-chip-shine'));
  chip.append(chipBody);

  // Overview: the chip's traces and the four areas. All of it slides when an area opens.
  const overview = el('div', 'cx-overview');
  const overWires = wires('cx-wires--over', 'cx-over');
  const nodes = projectFields.map((field, i) => {
    const node = el('button', 'cx-node');
    node.type = 'button';
    node.style.setProperty('--accent', ACCENT[field.color] ?? '#1b1b1f');
    const count = `${field.projects.length} ${field.projects.length === 1 ? 'project' : 'projects'}`;
    node.append(el('span', 'cx-node-index', pad(i + 1)), el('span', 'cx-node-name', field.name), el('span', 'cx-node-count', count));
    node.addEventListener('click', () => (open === i ? closeArea() : openArea(i)));
    return node;
  });
  overview.append(overWires.layer, chip, ...nodes);

  // Inside an area: traces from the chosen area to its projects, and the chosen project's story.
  const area = el('div', 'cx-area');
  area.inert = true;
  const areaWires = wires('cx-wires--area', 'cx-area');
  const back = el('button', 'cx-back', '← All areas');
  back.type = 'button';
  back.addEventListener('click', () => closeArea());
  const parts = el('div', 'cx-parts');
  const detail = el('article', 'cx-detail');
  detail.setAttribute('aria-live', 'polite');
  area.append(areaWires.layer, back, parts, detail);

  root.append(title, overview, area);

  let geometry = null;
  let revealed = 0;
  let open = -1;
  let picked = 0;
  let busy = false;
  let run = 0; // bumped by every open or close, so an animation that's been overtaken stops
  let closing = false;
  let closeAfterOpen = false; // asked to close while still opening
  let areaParts = [];
  let shift = { x: 0, y: 0 }; // how far the overview has slid for the open area
  let grown = 0; // how far the open area's traces have grown

  const anchor = (vw, vh, phone) => (phone ? { x: vw / 2, y: vh * 0.24 } : { x: vw * 0.2, y: vh * 0.54 });

  // ---- Overview layout ----

  function layoutOverview(vw, vh, phone, reveal) {
    const chipWidth = chipSize(phone);
    const chipHeight = chipWidth / CHIP_RATIO;
    const chipAt = anchor(vw, vh, phone);
    chip.style.width = `${chipWidth}px`;
    chip.style.height = `${chipHeight}px`;
    chip.style.left = `${chipAt.x - chipWidth / 2}px`;
    chip.style.top = `${chipAt.y - chipHeight / 2}px`;

    const nodeWidth = phone ? vw - 96 : Math.min(320, vw * 0.26);
    const count = nodes.length;
    const boxes = nodes.map((node, i) => {
      node.style.width = `${nodeWidth}px`;
      const height = node.offsetHeight || 72;
      const left = phone ? 72 : vw * 0.6;
      const center = phone ? vh * (0.46 + i * 0.13) : vh * (0.54 + (i - (count - 1) / 2) * 0.17);
      node.style.left = `${left}px`;
      node.style.top = `${center - height / 2}px`;
      return { left, top: center - height / 2, width: nodeWidth, height, center };
    });

    // Ports along the chip's right side (left side on phones), one per area.
    const spread = chipHeight * 0.56;
    const starts = boxes.map((_, i) => ({
      x: phone ? chipAt.x - chipWidth / 2 : chipAt.x + chipWidth / 2,
      y: chipAt.y + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread),
    }));
    if (phone) starts.reverse(); // the farthest area leaves from the top port and goes out widest
    const ends = boxes.map((box) => ({ x: box.left, y: box.center }));
    const turnAt = phone ? boxes.map((_, i) => 22 + (count - 1 - i) * 10) : turns(starts, ends, chipAt.x + chipWidth / 2 + 56, 22);
    overWires.set(count);
    boxes.forEach((box, i) => {
      overWires.draw(i, route(starts[i], turnAt[i], ends[i]), smooth(ramp(reveal, [0.25 + i * 0.08, 0.6 + i * 0.08])));
      const show = smooth(ramp(reveal, [0.5 + i * 0.08, 0.75 + i * 0.08]));
      nodes[i].style.opacity = show;
      nodes[i].style.translate = `${((1 - show) * 16).toFixed(1)}px 0`;
      nodes[i].tabIndex = show > 0.9 ? 0 : -1;
    });
    return { chipAt, boxes };
  }

  // ---- Inside an area ----

  function fillArea(index) {
    const field = projectFields[index];
    root.style.setProperty('--accent', ACCENT[field.color] ?? '#1b1b1f');
    areaParts = field.projects.map((project, j) => {
      const part = el('button', 'cx-part');
      part.type = 'button';
      part.append(el('span', 'cx-part-title', project.title), el('span', 'cx-part-line', project.line ?? project.summary));
      part.addEventListener('click', () => pick(j));
      return part;
    });
    parts.replaceChildren(...areaParts);
    pick(0, true);
  }

  function pick(j, quiet = false) {
    picked = j;
    const field = projectFields[open];
    const project = field.projects[j];
    areaParts.forEach((part, k) => {
      part.classList.toggle('is-on', k === j);
      part.setAttribute('aria-pressed', String(k === j));
    });
    areaWires.paths.forEach(({ path }, k) => path.classList.toggle('is-on', k === j));

    const foot = el('div', 'cx-foot');
    foot.append(el('span', 'cx-tags', (project.tags ?? []).join(' · ')));
    if (project.href) {
      const link = el('a', 'cx-link', 'View project ↗');
      link.href = project.href;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      foot.append(link);
    }
    detail.replaceChildren(
      el('p', 'cx-detail-kicker', `${field.name} · ${pad(j + 1)} / ${pad(field.projects.length)}`),
      el('h3', 'cx-detail-title', project.title),
      el('p', 'cx-detail-summary', project.summary),
      list('Problem', project.problem),
      list('Solution', project.solution),
      foot,
    );
    if (!quiet && !reduced()) {
      const moves = geometry?.phone ? ['translateY(8px)', 'none'] : ['translateY(calc(-50% + 8px))', 'translateY(-50%)'];
      detail.animate([{ opacity: 0, transform: moves[0] }, { opacity: 1, transform: moves[1] }], { duration: 260, easing: 'ease-out' });
    }
  }

  // Where the chosen area slides to: the left of the board, level with the middle.
  function slideFor(index, vw, vh) {
    const box = geometry.boxes[index];
    // Phones: the chosen area rises to just under the heading, and its projects list under it.
    if (geometry.phone) return { x: 24 - box.left, y: 136 + box.height / 2 - box.center };
    return { x: vw * 0.08 - box.left, y: vh * 0.54 - box.center };
  }

  // The projects of the open area, with traces growing out of the area as `amount` goes 0 to 1.
  function layoutArea(amount) {
    const { vw, vh, phone, boxes } = geometry;
    const box = boxes[open];
    const nodeRight = box.left + box.width + shift.x;
    const nodeMid = box.center + shift.y;

    const nodeLeft = box.left + shift.x;
    const partWidth = phone ? vw - nodeLeft - 52 : Math.min(300, vw * 0.22);
    const partLeft = phone ? nodeLeft + 28 : nodeRight + Math.max(80, vw * 0.07);
    const gap = phone ? 8 : 16;
    const heights = areaParts.map((part) => {
      part.style.width = `${partWidth}px`;
      return part.offsetHeight || 64;
    });
    const total = heights.reduce((sum, h) => sum + h, 0) + gap * (heights.length - 1);
    // Phones list the projects down from under the area; wider screens centre them beside it.
    let top = phone ? nodeMid + box.height / 2 + 16 : nodeMid - total / 2;
    const ends = areaParts.map((part, j) => {
      part.style.left = `${partLeft}px`;
      part.style.top = `${top}px`;
      const end = { x: partLeft, y: top + heights[j] / 2 };
      top += heights[j] + gap;
      return end;
    });

    const spread = Math.min(box.height * 0.5, 40);
    // Phones: every trace drops from the area's bottom left corner, then turns into its project.
    const starts = phone
      ? ends.map(() => ({ x: nodeLeft + 12, y: nodeMid + box.height / 2 }))
      : ends.map((_, j) => ({ x: nodeRight, y: nodeMid + (ends.length === 1 ? 0 : (j / (ends.length - 1) - 0.5) * spread) }));
    const turnAt = phone ? ends.map(() => nodeLeft + 12) : turns(starts, ends, nodeRight + Math.max(28, (partLeft - nodeRight) * 0.4), 14);
    areaWires.set(ends.length);
    ends.forEach((end, j) => {
      areaWires.draw(j, route(starts[j], turnAt[j], end), smooth(ramp(amount, [j * 0.08, 0.55 + j * 0.08])));
      const show = smooth(ramp(amount, [0.4 + j * 0.08, 0.75 + j * 0.08]));
      areaParts[j].style.opacity = show;
      areaParts[j].style.translate = phone ? `0 ${((1 - show) * 10).toFixed(1)}px` : `${((1 - show) * 12).toFixed(1)}px 0`;
    });
    areaWires.paths.forEach(({ path }, k) => path.classList.toggle('is-on', k === picked));

    if (phone) {
      // The story is a sheet across the bottom of the screen.
      detail.style.left = '0px';
      detail.style.width = `${vw}px`;
    } else {
      const detailLeft = partLeft + partWidth + 56;
      detail.style.left = `${detailLeft}px`;
      detail.style.width = `${Math.max(240, Math.min(440, vw * 0.95 - detailLeft))}px`;
    }
    detail.style.opacity = smooth(ramp(amount, [0.6, 1]));
  }

  function slideTo(next, amount) {
    shift = next;
    overview.style.transform = `translate(${(next.x * amount).toFixed(1)}px, ${(next.y * amount).toFixed(1)}px)`;
  }

  // ---- Opening and closing an area ----

  async function openArea(index) {
    if (busy || open >= 0 || revealed < 0.95 || !geometry) return;
    busy = true;
    closeAfterOpen = false;
    const mine = ++run;
    open = index;
    fillArea(index);
    root.classList.add('is-area');
    nodes.forEach((node, i) => node.classList.toggle('is-dim', i !== index));
    nodes[index].classList.add('is-hub');
    overWires.paths.forEach(({ path, dot }, i) => {
      path.classList.toggle('is-dim', i !== index);
      path.classList.toggle('is-on', i === index);
      dot.classList.toggle('is-dim', i !== index);
    });
    area.inert = false;
    const target = slideFor(index, geometry.vw, geometry.vh);
    shift = target;
    grown = 0;
    layoutArea(0);
    // The whole circuit slides left; then the new traces grow out of the chosen area.
    await tween(750, (amount) => mine === run && slideTo(target, smooth(amount)));
    if (mine !== run) return;
    await tween(1000, (amount) => {
      if (mine !== run) return;
      grown = amount;
      layoutArea(amount);
    });
    if (mine !== run) return;
    busy = false;
    if (closeAfterOpen) closeArea();
    else areaParts[0]?.focus({ preventScroll: true });
  }

  // Puts the overview back as it was, with no area open.
  function settle() {
    root.classList.remove('is-area');
    nodes.forEach((node) => node.classList.remove('is-dim', 'is-hub'));
    overWires.paths.forEach(({ path, dot }) => {
      path.classList.remove('is-dim', 'is-on');
      dot.classList.remove('is-dim');
    });
    area.inert = true;
    grown = 0;
    if (open >= 0) layoutArea(0);
    slideTo({ x: 0, y: 0 }, 1);
    open = -1;
    busy = false;
    closing = false;
  }

  // Closes the open area: the projects' traces draw back, then the circuit slides home. Instant
  // when the scroll has already moved on, which also stops any animation still running.
  async function closeArea(instant = false) {
    if (open < 0) return;
    if (instant) {
      run += 1;
      settle();
      return;
    }
    if (closing) return;
    if (busy) {
      closeAfterOpen = true; // still opening: close as soon as it's open
      return;
    }
    busy = true;
    closing = true;
    const mine = ++run;
    const index = open;
    const from = shift;
    const startGrown = grown;
    await tween(350, (amount) => {
      if (mine !== run) return;
      grown = startGrown * (1 - amount);
      layoutArea(grown);
    });
    if (mine !== run) return;
    root.classList.remove('is-area');
    nodes.forEach((node) => node.classList.remove('is-dim'));
    overWires.paths.forEach(({ path, dot }) => {
      path.classList.remove('is-dim');
      dot.classList.remove('is-dim');
    });
    await tween(700, (amount) => mine === run && slideTo(from, 1 - smooth(amount)));
    if (mine !== run) return;
    settle();
    if (root.contains(document.activeElement)) nodes[index].focus({ preventScroll: true });
  }

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open >= 0) closeArea();
  });

  // The chip leans a little toward the cursor, so it reads as a solid piece of metal.
  root.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch' || reduced()) return;
    const box = chipBody.getBoundingClientRect();
    const x = clamp((event.clientX - (box.left + box.width / 2)) / 400, -1, 1);
    const y = clamp((event.clientY - (box.top + box.height / 2)) / 400, -1, 1);
    chipBody.style.setProperty('--lean-x', `${(x * 14).toFixed(1)}deg`);
    chipBody.style.setProperty('--lean-y', `${(-y * 14).toFixed(1)}deg`);
    chipBody.style.setProperty('--shine', `${(50 + x * 40).toFixed(0)}%`);
  });

  // ---- Driven by journey.js on every scroll frame ----

  return {
    root,
    chipSize,
    anchor,
    // reveal: 0 to 1 through the chip turning flat and the traces growing out of it.
    // chipPose: while the view is zooming into the card, where the card's chip is relative to
    // its final spot ({ dx, dy, scale }), or null before the zoom starts.
    // Whether a project area is open (or on its way open or shut).
    isOpen: () => open >= 0,
    // Closes the open area with its animation, as when the visitor scrolls on.
    close: () => closeArea(),
    update({ vw, vh, phone, reveal, chipPose }) {
      revealed = reveal;
      const showing = Boolean(chipPose) || reveal > 0;
      root.style.visibility = showing ? 'visible' : 'hidden';
      root.classList.toggle('is-live', reveal >= 0.95);
      const slant = 1 - smooth(ramp(reveal, [0, 0.3]));
      const pose = chipPose ?? { dx: 0, dy: 0, scale: 1 };
      chip.style.visibility = showing ? 'visible' : 'hidden';
      chip.style.transform = `translate(${pose.dx.toFixed(1)}px, ${pose.dy.toFixed(1)}px) perspective(2400px) rotateX(${(TILT_X * slant).toFixed(2)}deg) rotateZ(${(TILT_Z * slant).toFixed(2)}deg) scale(${pose.scale.toFixed(4)})`;
      chip.classList.toggle('is-flat', slant < 0.05);
      title.style.opacity = smooth(ramp(reveal, [0.6, 0.9]));
      geometry = { vw, vh, phone, ...layoutOverview(vw, vh, phone, reveal) };
      if (open >= 0) {
        if (reveal < 0.95) closeArea(true);
        else if (!busy && !closing) {
          slideTo(slideFor(open, vw, vh), 1);
          layoutArea(grown);
        }
      }
    },
  };
}
