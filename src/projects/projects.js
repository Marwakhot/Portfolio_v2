import { projectFields, projectsSection } from '../config.js';

// A pinboard: one card per project, pinned at an angle. Clicking a card pulls its pin and
// shoves the other cards aside before the card grows into a full view with the problem and
// solution. The coloured pills gather one field's cards in the middle and tuck the rest away
// at the sides. Cards can be dragged (or nudged with the arrow keys) to a new spot.

// Where each card hangs: left as a share of the board, top in px, and its tilt.
const SLOTS = [
  [36, 10, -2],
  [58, 30, 2.5],
  [79, 0, -1],
  [0, 200, -3.5],
  [23, 230, 1.5],
  [47, 205, -1],
  [71, 245, 3],
  [9, 430, 2],
  [34, 445, -2.5],
  [60, 425, 1],
];
const PIN_Y = 12; // where the pin goes through the card; cards turn around this point
const TUCK_SCALE = 0.7; // size of the cards tucked at the sides while a field is picked
const EASE_OUT = 'cubic-bezier(.23, 1, .32, 1)';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(width <= 700px)');
const still = () => reducedMotion.matches;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
// A steady pseudo-random number in [0, amount), so the same card always lands the same way.
const jitter = (index, salt, amount) => {
  const n = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return (n - Math.floor(n)) * amount;
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Fields take turns, so the colours mix across the board.
function interleave(fields) {
  const queues = fields.map((field) => field.projects.map((project) => ({ project, field })));
  const out = [];
  while (queues.some((queue) => queue.length)) {
    for (const queue of queues) if (queue.length) out.push(queue.shift());
  }
  return out;
}

function slot(index) {
  if (index < SLOTS.length) return SLOTS[index];
  const [left, top, tilt] = SLOTS[index % SLOTS.length];
  return [left, top + 240 * Math.floor(index / SLOTS.length), tilt];
}

// A push pin: glossy round head, collar and a needle that shows once it's pulled out.
function pin(index) {
  const holder = el('span', 'ppin');
  holder.setAttribute('aria-hidden', 'true');
  const head = `pin-head-${index}`;
  const body = `pin-body-${index}`;
  holder.innerHTML = `<span class="ppin-shadow"></span><svg class="ppin-art" viewBox="0 0 32 44" width="32" height="44">
  <defs>
    <radialGradient id="${head}" cx="36%" cy="30%" r="75%">
      <stop offset="0" style="stop-color:color-mix(in srgb, var(--pin) 45%, #fff)"/>
      <stop offset=".5" style="stop-color:var(--pin)"/>
      <stop offset="1" style="stop-color:color-mix(in srgb, var(--pin) 60%, #000)"/>
    </radialGradient>
    <linearGradient id="${body}" x1="0" x2="1">
      <stop offset="0" style="stop-color:color-mix(in srgb, var(--pin) 70%, #000)"/>
      <stop offset=".4" style="stop-color:color-mix(in srgb, var(--pin) 85%, #fff)"/>
      <stop offset="1" style="stop-color:color-mix(in srgb, var(--pin) 55%, #000)"/>
    </linearGradient>
  </defs>
  <path class="ppin-needle" d="M16 30V43" stroke="#a3a3ab" stroke-width="1.6" stroke-linecap="round"/>
  <ellipse cx="16" cy="29.5" rx="7.5" ry="2.6" fill="url(#${body})"/>
  <path d="M10.5 17c0 6 2 9 2 12.4h7c0-3.4 2-6.4 2-12.4z" fill="url(#${body})"/>
  <ellipse cx="16" cy="12" rx="10.5" ry="9.5" fill="url(#${head})"/>
  <ellipse cx="12.4" cy="8.2" rx="3.6" ry="2.2" fill="#fff" opacity=".5"/>
</svg>`;
  return holder;
}

function list(label, items) {
  const block = el('div', 'pview-block');
  const points = el('ul', 'pview-points');
  points.append(...(items ?? []).map((text) => el('li', '', text)));
  block.append(el('h4', 'pview-label', label), points);
  return block;
}

function fillPanel(panel, { project, field }) {
  const title = el('h3', 'pview-title', project.title);
  title.id = 'pview-title';
  const columns = el('div', 'pview-columns');
  columns.append(list('Problem', project.problem), list('Solution', project.solution));
  const foot = el('div', 'pview-foot');
  foot.append(el('span', 'pview-tags', (project.tags ?? []).join(' · ')));
  if (project.href) {
    const link = el('a', 'pview-link', 'View project ↗');
    link.href = project.href;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    foot.append(link);
  }
  panel.replaceChildren(el('span', `ppill ${field.color}`, field.label), title, el('p', 'pview-summary', project.summary), columns, foot);
}

export function showProjects(section) {
  if (!projectFields.length) return;

  // The heading, and a sentence whose coloured pills pick a field.
  const head = el('div', 'projects-head');
  const sentence = el('p', 'projects-lead');
  sentence.append(`${projectsSection.lead} `);
  const pills = projectFields.map((field, index) => {
    const button = el('button', 'pcategory');
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.append(el('span', `ppill ${field.color}`, field.label));
    const last = index === projectFields.length - 1;
    sentence.append(button, last ? '.' : index === projectFields.length - 2 ? ', and ' : ', ');
    return { field, button };
  });
  head.append(el('h2', 'projects-title', projectsSection.heading), sentence);

  const board = el('ul', 'pboard');
  const items = interleave(projectFields);
  let order = items.map((_, index) => index); // back to front

  const cards = items.map((item, index) => {
    const [left, top, tilt] = slot(index);
    const card = el('li', `pcard pin-${item.field.color}`);
    card.style.left = `${left}%`;
    card.style.top = `${top}px`;
    const note = el('button', 'pnote');
    note.type = 'button';
    note.setAttribute('aria-label', `${item.project.title}: ${item.project.line}. Open details`);
    note.append(el('span', 'pnote-title', item.project.title), el('span', 'pnote-line', item.project.line));
    card.append(note, pin(index));
    board.append(card);
    const home = { x: 0, y: 0, angle: tilt };
    return {
      card, note, item,
      pos: { ...home, scale: 1 },
      target: { ...home, scale: 1 },
      home,
      vx: 0, vy: 0, va: 0, vs: 0, swing: 0,
      startAt: 0, moving: false, dimmed: false, keepUp: false,
    };
  });

  // The open-card view.
  const dialog = el('dialog', 'pview');
  const backdrop = el('div', 'pview-backdrop');
  const panel = el('article', 'pview-panel');
  const close = el('button', 'pview-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  dialog.setAttribute('aria-labelledby', 'pview-title');
  dialog.append(backdrop, panel, close);

  section.append(head, board, dialog);
  section.hidden = false;

  // ---- Drawing ----

  function draw(state) {
    const { x, y, angle, scale } = state.pos;
    state.card.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${angle.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
  }

  function restack() {
    order.forEach((index, depth) => { cards[index].card.style.zIndex = depth + 1; });
  }

  function toFront(index) {
    order = [...order.filter((i) => i !== index), index];
    restack();
  }

  function setLift(state, up) {
    state.card.classList.toggle('is-lifted', up);
  }

  // ---- Springs: each card chases its target and swings on its pin as it moves ----

  let frame = 0;
  let lastTime = 0;
  let held = -1;

  function tick(now) {
    frame = 0;
    const steps = clamp((now - lastTime) / (1000 / 60), 0.1, 4);
    lastTime = now;
    const n = Math.ceil(steps);
    const r = steps / n;
    let busy = false;

    cards.forEach((state, index) => {
      if (!state.moving) return;
      const { pos, target } = state;
      const isHeld = held === index;
      const started = now >= state.startAt;
      if (started && !isHeld) state.card.classList.toggle('aside', state.dimmed);

      for (let step = 0; step < n; step += 1) {
        if (isHeld) {
          state.swing *= 0.9 ** r;
        } else if (started) {
          state.vx = (state.vx + (target.x - pos.x) * 0.03 * r) * 0.72 ** r;
          state.vy = (state.vy + (target.y - pos.y) * 0.03 * r) * 0.72 ** r;
          state.vs = (state.vs + (target.scale - pos.scale) * 0.05 * r) * 0.7 ** r;
          pos.x += state.vx * r;
          pos.y += state.vy * r;
          pos.scale += state.vs * r;
          state.swing = clamp(state.vx * 1.2, -14, 14);
        }
        const goal = (isHeld ? 0 : started ? target.angle : pos.angle) + state.swing;
        state.va = (state.va + (goal - pos.angle) * 0.06 * r) * 0.72 ** r;
        pos.angle += state.va * r;
      }

      const near = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y);
      const slow = Math.abs(state.vx) + Math.abs(state.vy);
      // Re-pin once the card has almost stopped.
      if (!isHeld && started && near < 3 && slow < 0.3 && !state.keepUp && state.card.classList.contains('is-lifted') && viewing !== index) {
        setLift(state, false);
      }
      if (!isHeld && started && near < 0.4 && slow + Math.abs(state.va) < 0.04
        && Math.abs(target.angle - pos.angle) < 0.05 && Math.abs(target.scale - pos.scale) < 0.002) {
        Object.assign(pos, target);
        state.moving = false;
      } else {
        busy = true;
      }
      draw(state);
    });

    if (busy || held >= 0) frame = requestAnimationFrame(tick);
  }

  function wake() {
    if (frame) return;
    lastTime = performance.now();
    frame = requestAnimationFrame(tick);
  }

  // Sends a card somewhere new, lifting its pin while it travels.
  function moveTo(index, target, { delay = 0, dimmed = false, keepUp = false } = {}) {
    const state = cards[index];
    state.target = { ...target };
    state.dimmed = dimmed;
    state.keepUp = keepUp;
    if (still() || narrow.matches) {
      Object.assign(state.pos, target);
      state.card.classList.toggle('aside', dimmed);
      state.moving = false;
      draw(state);
      return;
    }
    setLift(state, true);
    state.startAt = state.moving ? 0 : performance.now() + delay + 160;
    state.moving = true;
    wake();
  }

  // ---- Layouts ----

  function measure() {
    return {
      width: board.offsetWidth,
      height: board.offsetHeight,
      gutter: board.getBoundingClientRect().left - section.getBoundingClientRect().left,
      boxes: cards.map(({ card }) => ({ left: card.offsetLeft, top: card.offsetTop, width: card.offsetWidth, height: card.offsetHeight })),
    };
  }

  // The offset that puts a card's top-left corner at (left, top) on the board at a given size.
  const placeAt = (box, left, top, scale, angle) => ({
    x: left - box.left - (box.width / 2) * (1 - scale),
    y: top - box.top - PIN_Y * (1 - scale),
    angle,
    scale,
  });

  // Pushes cards away from a point, harder the closer they are.
  function pushedFrom(indices, boxes, [cx, cy], squash = 0.7) {
    const out = [];
    for (const index of indices) {
      const box = boxes[index];
      const from = cards[index].target;
      const dx = box.left + from.x + box.width / 2 - cx;
      const dy = (box.top + from.y + box.height / 2 - cy) / squash;
      const distance = Math.hypot(dx, dy) || 1;
      const push = 120 + 220 * Math.max(0, 1 - distance / 900);
      out[index] = {
        ...from,
        x: from.x + (dx / distance) * push,
        y: from.y + (dy / distance) * squash * push,
        angle: from.angle + Math.sign(dx || 1) * 5,
      };
    }
    return out;
  }

  // Shrinks cards and stacks them down the left and right edges, mostly out of view.
  function tucked(indices, { width, height, gutter, boxes }) {
    const out = [];
    const sides = { left: [], right: [] };
    for (const index of indices) {
      const center = boxes[index].left + cards[index].home.x + boxes[index].width / 2;
      sides[center < width / 2 ? 'left' : 'right'].push(index);
    }
    for (const [side, list] of Object.entries(sides)) {
      list.sort((a, b) => boxes[a].top - boxes[b].top);
      const startTop = side === 'left' ? 230 : 10;
      const heights = list.map((index) => boxes[index].height * TUCK_SCALE);
      const room = height - startTop - heights.reduce((sum, h) => sum + h, 0);
      const gap = Math.min(40, room / Math.max(1, list.length));
      let top = startTop + jitter(list[0] ?? 0, 1, 20);
      list.forEach((index, n) => {
        const box = boxes[index];
        const showing = 0.35 + (index % 3) * 0.08;
        const left = side === 'left'
          ? -gutter - box.width * TUCK_SCALE * (1 - showing)
          : width + gutter - box.width * TUCK_SCALE * showing;
        const angle = (side === 'left' ? -1 : 1) * (4 + ((index * 5) % 9));
        out[index] = placeAt(box, left + jitter(index, 2, 14), top, TUCK_SCALE, angle);
        top += heights[n] + gap + jitter(index, 3, Math.max(0, gap / 3));
      });
    }
    return out;
  }

  // ---- Picking a field ----

  let picked = null; // the field whose pill was clicked
  let showing = null; // the field currently gathered, including a hover preview
  let unhover = 0;

  function gather(field) {
    clearTimeout(unhover);
    if (field === showing || viewing >= 0) return;
    showing = field;
    for (const { field: f, button } of pills) {
      button.classList.toggle('off', field !== null && f !== field);
      button.setAttribute('aria-pressed', String(picked === f));
    }

    const all = cards.map((_, index) => index);
    if (field === null) {
      all.forEach((index, n) => moveTo(index, { ...cards[index].home, scale: 1 }, { delay: n * 30 }));
      return;
    }
    if (still() || narrow.matches) {
      for (const index of all) {
        const off = cards[index].item.field !== field;
        moveTo(index, { ...cards[index].home, scale: 1 }, { dimmed: off });
        cards[index].card.classList.toggle('is-hidden', narrow.matches && off);
      }
      return;
    }

    const layout = measure();
    const { width, height, gutter, boxes } = layout;
    const centerOf = (index) => boxes[index].left + cards[index].home.x + boxes[index].width / 2;
    const chosen = all.filter((index) => cards[index].item.field === field).sort((a, b) => centerOf(a) - centerOf(b));
    const rest = all.filter((index) => !chosen.includes(index));
    const targets = tucked(all, layout);

    // The chosen cards line up in rows in the middle of the board.
    const sideRoom = Math.max(0, ...rest.map((index) => boxes[index].width * TUCK_SCALE * 0.51 + 14)) - gutter;
    const rowWidth = Math.max(1, width - 2 * Math.max(60, sideRoom + 32));
    const gap = Math.min(32, rowWidth / Math.max(1, chosen.length * 2));
    const rows = [];
    for (const index of chosen) {
      let row = rows.at(-1);
      if (!row || row.width + gap + boxes[index].width > rowWidth) {
        row = { indices: [], width: 0, height: 0 };
        rows.push(row);
      }
      row.width += (row.indices.length ? gap : 0) + boxes[index].width;
      row.height = Math.max(row.height, boxes[index].height);
      row.indices.push(index);
    }
    const total = rows.reduce((sum, row) => sum + row.height, 0) + gap * Math.max(0, rows.length - 1);
    let top = height * 0.52 - total / 2;
    let turn = 0;
    for (const row of rows) {
      let left = (width - row.width) / 2;
      for (const index of row.indices) {
        toFront(index);
        targets[index] = placeAt(boxes[index], left, top + (row.height - boxes[index].height) / 2, 1, turn++ % 2 ? 1.5 : -1.5);
        left += boxes[index].width + gap;
      }
      top += row.height + gap;
    }

    let n = 0;
    for (const index of all) {
      const isChosen = chosen.includes(index);
      moveTo(index, targets[index], {
        delay: isChosen ? 70 + chosen.indexOf(index) * 45 : n++ * 30,
        dimmed: !isChosen,
        keepUp: !isChosen,
      });
    }
  }

  for (const { field, button } of pills) {
    button.addEventListener('click', () => {
      picked = picked === field ? null : field;
      showing = undefined; // force a re-layout
      gather(picked);
      if (picked === null) for (const { card } of cards) card.classList.remove('is-hidden');
    });
    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'mouse' && picked === null) gather(field);
    });
    const leave = () => {
      clearTimeout(unhover);
      if (picked === null) unhover = setTimeout(() => gather(null), 160);
    };
    button.addEventListener('pointerleave', leave);
    button.addEventListener('blur', leave);
  }

  // ---- Opening a card ----

  let viewing = -1;
  let shown = false;
  let saved = [];

  // The transform that lays the panel exactly over the card on the board.
  function overCard(index) {
    const state = cards[index];
    const from = state.note.getBoundingClientRect();
    const to = panel.getBoundingClientRect();
    const scale = (state.note.offsetWidth * state.pos.scale) / to.width;
    const dx = from.left + from.width / 2 - (to.left + to.width / 2);
    const dy = from.top + from.height / 2 - (to.top + to.height / 2);
    return `translate(${dx}px, ${dy}px) rotate(${state.pos.angle}deg) scale(${scale})`;
  }

  async function openCard(index) {
    if (viewing >= 0 || held >= 0) return;
    clearTimeout(unhover);
    viewing = index;
    const state = cards[index];
    toFront(index);
    const motion = !still() && !narrow.matches;

    if (motion) {
      // Pull the pin, and shove everything else out of the way, nearest first.
      setLift(state, true);
      state.card.classList.add('is-pulled');
      const layout = measure();
      const boardBox = board.getBoundingClientRect();
      const centers = cards.map(({ card }) => {
        const box = card.getBoundingClientRect();
        return [box.left - boardBox.left + box.width / 2, box.top - boardBox.top + box.height / 2];
      });
      const others = cards.map((_, i) => i).filter((i) => i !== index);
      saved = others.map((i) => [i, { target: { ...cards[i].target }, dimmed: cards[i].dimmed, keepUp: cards[i].keepUp }]);
      const targets = pushedFrom(others, layout.boxes, centers[index]);
      for (const i of others) {
        const distance = Math.hypot(centers[i][0] - centers[index][0], centers[i][1] - centers[index][1]);
        moveTo(i, targets[i], { delay: Math.round(distance / 12), dimmed: cards[i].dimmed, keepUp: cards[i].keepUp });
      }
      await wait(200);
    }

    fillPanel(panel, state.item);
    dialog.showModal();
    panel.scrollTop = 0;
    document.documentElement.style.overflow = 'hidden';
    state.card.classList.add('is-viewing');
    shown = true;

    if (motion) {
      panel.animate(
        [{ transform: overCard(index), boxShadow: '0 1px 2px rgb(0 0 0 / .08)' }, { transform: 'none', boxShadow: '0 40px 90px -30px rgb(0 0 0 / .35)' }],
        { duration: 520, easing: EASE_OUT, fill: 'backwards' },
      );
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 440, delay: 140, easing: EASE_OUT, fill: 'backwards' });
      close.animate([{ opacity: 0, transform: 'scale(.95)' }, { opacity: 1, transform: 'none' }], { duration: 200, delay: 420, easing: EASE_OUT, fill: 'backwards' });
    } else {
      dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 });
    }
  }

  async function closeCard() {
    if (viewing < 0 || !shown) return;
    shown = false;
    const index = viewing;
    const state = cards[index];
    const motion = !still() && !narrow.matches;

    if (motion) {
      close.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' });
      backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: EASE_OUT, fill: 'forwards' });
      await panel.animate(
        [{ transform: 'none', boxShadow: '0 40px 90px -30px rgb(0 0 0 / .35)' }, { transform: overCard(index), boxShadow: '0 1px 2px rgb(0 0 0 / .08)' }],
        { duration: 420, easing: EASE_OUT, fill: 'forwards' },
      ).finished;
    } else {
      await dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: 'forwards' }).finished;
    }

    dialog.close();
    for (const node of [panel, backdrop, close, dialog]) node.getAnimations().forEach((animation) => animation.cancel());
    document.documentElement.style.overflow = '';
    state.card.classList.remove('is-viewing', 'is-pulled');
    viewing = -1;
    if (!state.keepUp) setLift(state, false);

    // Everyone else springs back to where they were.
    for (const [i, before] of saved) moveTo(i, before.target, { dimmed: before.dimmed, keepUp: before.keepUp });
    saved = [];
    state.note.focus({ preventScroll: true });
  }

  backdrop.addEventListener('click', closeCard);
  close.addEventListener('click', closeCard);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeCard();
  });

  // ---- Dragging ----

  let press = null;
  let dragged = false;

  cards.forEach((state, index) => {
    const { note } = state;
    note.addEventListener('pointerdown', (event) => {
      dragged = false;
      if (event.button !== 0 || event.pointerType === 'touch' || narrow.matches || showing || viewing >= 0) return;
      press = { index, x: event.clientX, y: event.clientY, from: { ...state.pos }, lastX: event.clientX };
    });
    note.addEventListener('pointermove', (event) => {
      if (press?.index !== index) return;
      const mx = event.clientX - press.x;
      const my = event.clientY - press.y;
      if (held !== index) {
        if (Math.hypot(mx, my) <= 4) return;
        note.setPointerCapture(event.pointerId);
        held = index;
        toFront(index);
        setLift(state, true);
        state.card.classList.add('is-held');
        state.moving = true;
        wake();
      }
      state.pos.x = press.from.x + mx;
      state.pos.y = press.from.y + my;
      state.swing = clamp(state.swing + (event.clientX - press.lastX) * 0.6, -14, 14);
      press.lastX = event.clientX;
    });
    const release = () => {
      if (press?.index !== index) return;
      press = null;
      if (held !== index) return;
      held = -1;
      dragged = true;
      state.card.classList.remove('is-held');
      state.home = { x: state.pos.x, y: state.pos.y, angle: clamp(state.pos.angle, -8, 8) };
      Object.assign(state, { vx: 0, vy: 0, startAt: 0 });
      state.target = { ...state.home, scale: 1 };
      state.keepUp = false;
      wake();
    };
    note.addEventListener('pointerup', release);
    note.addEventListener('pointercancel', release);
    note.addEventListener('click', () => {
      if (dragged) {
        dragged = false;
        return;
      }
      openCard(index);
    });
    // Arrow keys nudge a card around the board.
    note.addEventListener('keydown', (event) => {
      const step = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] }[event.key];
      if (!step || showing || narrow.matches) return;
      event.preventDefault();
      state.home = { ...state.home, x: state.home.x + step[0], y: state.home.y + step[1] };
      moveTo(index, { ...state.home, scale: 1 });
    });
  });

  // ---- Size ----

  function fit() {
    let bottom = 0;
    for (const { card } of cards) bottom = Math.max(bottom, card.offsetTop + card.offsetHeight);
    board.style.setProperty('--board-height', `${Math.ceil(bottom) + 48}px`);
  }

  narrow.addEventListener('change', () => {
    picked = null;
    showing = undefined;
    gather(null);
    for (const { card } of cards) card.classList.remove('is-hidden', 'aside');
  });

  restack();
  cards.forEach(draw);
  new ResizeObserver(fit).observe(board);
  document.fonts.ready.then(fit);
  fit();
  showing = null;
}
