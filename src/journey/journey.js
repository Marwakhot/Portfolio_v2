import { card as cardDetails, journey } from '../config.js';
import { cardFace } from '../card/card.js';

// The platinum card and the experience story, on one fixed stage.
// First screen: the card sits on the left and tilts toward the cursor.
// Scrolling: it tips back and see-through copies of it rise out, one per job with the company
// logo in the tile, labelled like an exploded diagram. Then the view zooms into the diagram and
// moves down it one layer at a time, while that job's story shows on the right. After the last
// job the view pulls back and the layers drop into the card. Then the card shrinks to a small card
// on the left with the hackathons heading beside it, while a row of event cards slides sideways
// as you scroll (events/carousel.js). After the last event, the card moves back down, grows back
// into its tilt, and the view zooms into its gold chip, which becomes the centre of the projects
// circuit (circuit.js). Last, the circuit folds back into the chip, the view pulls out to the
// card, and the card flips over into the middle of the page to show its back: the ways to reach
// out (contact/contact.js).

const TILT_X = 56; // the exploded view, tipped back...
const TILT_Z = -28; // ...and turned
const PERSPECTIVE = 2400;
const CARD_RATIO = 1.55; // width / height, like a bank card

// Timeline, in screen heights scrolled past the top of the experience section.
const DOWN = [-0.6, 0.35]; // the card tips back
const OPEN = [0.3, 1.3]; // the layers rise out of it
const CLEAR = [1.6, 1.8]; // the heading and labels fade as the view zooms in
const ZOOM_IN = [1.6, 2.3];
const FOCUS_START = 2.3; // the first job is in view here
const PER_JOB = 0.8; // screens of scrolling per job
const SWAP = 0.45; // how long the move to the next layer takes
const HOLD_LAST = 0.6; // the last job stays a little longer
const ZOOM_OUT_TIME = 0.6;
const JUMP_STAGGER = 0.08; // layers drop into the card one after another
const JUMP_TIME = 0.5;
const CHIP_TIME = 1; // the view zooms into the card's chip
const CIRCUIT_TIME = 1; // the chip turns flat and the traces grow out to the project areas
const CIRCUIT_HOLD = 1.6; // the circuit stays put, to be explored, before the page moves on
const UNCIRCUIT_TIME = 0.8; // the traces draw back into the chip
const FLIP_TIME = 1.2; // the card flips over into the middle of the page
const CONTACT_HOLD = 0.6; // the back of the card stays up at the end of the page
const SMALL_WIDTH = 88; // the card beside the hackathons heading
const SHRINK_TIME = 0.8; // the card shrinks to the left for the hackathons
const PER_EVENT = 0.8; // screens of scrolling for each step along the hackathon cards
const EVENT_SWAP = 0.5; // how long each step takes
const SLIDE_HOLD = 0.5; // the last card stays a moment before the row goes
const RETURN_TIME = 0.9; // the card moves back down and grows back into its tilt

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const ramp = (t, [from, to]) => clamp((t - from) / (to - from));
const smooth = (x) => x * x * (3 - 2 * x);
const easeIn = (x) => x * x * x;
const mix = (a, b, amount) => a + (b - a) * amount;
const mixPose = (a, b, amount) => Object.fromEntries(Object.keys(a).map((key) => [key, mix(a[key], b[key], amount)]));
const pad = (n) => String(n).padStart(2, '0');
const rad = (deg) => (deg * Math.PI) / 180;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A job's card: the company's colours, its logo in a big tile, and the position held.
function layer(item) {
  const node = el('div', 'exp-pane');
  node.style.setProperty('--brand', item.color ?? '#2b2e35');
  if (item.gradient) node.style.setProperty('--fill', `linear-gradient(135deg, ${item.gradient.join(', ')})`);
  const tile = el('div', item.logoEdge === false ? 'pane-tile no-edge' : 'pane-tile');
  if (item.logo) {
    const logo = el('img');
    logo.src = item.logo;
    logo.alt = '';
    tile.append(logo);
  }
  // The same card layout, printed for this job: the company up top and the position where
  // the card number would be.
  const face = cardFace({
    tier: item.company,
    mark: '',
    number: item.role,
    footnote: item.dates,
    name: cardDetails.name,
    brand: item.current ? 'Current' : '',
  }, tile);
  face.classList.add('pane-face');
  node.append(face);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

// The job's story, shown on the right while its layer is in view.
function detail(item, index, count) {
  const node = el('article', 'exp-detail');
  const head = el('div', 'exp-head');
  head.append(el('span', 'exp-count', `${pad(index + 1)} / ${pad(count)}`));
  if (item.current) head.append(el('span', 'exp-now', 'Current'));

  node.append(head, el('h3', 'exp-role', item.role), el('p', 'exp-company', `${item.company} · ${item.dates}`));
  if (item.description) node.append(el('p', 'exp-desc', item.description));
  if (item.built?.length) {
    const list = el('ul', 'exp-built');
    list.append(...item.built.map((text) => el('li', '', text)));
    node.append(list);
  }
  if (item.skills?.length) {
    const skills = el('ul', 'exp-skills');
    skills.append(...item.skills.map((skill) => el('li', '', skill)));
    node.append(skills);
  }
  if (item.gallery?.length) {
    const gallery = el('div', 'exp-gallery');
    for (const shot of item.gallery) {
      const image = el('img', shot.wide ? 'is-wide' : undefined);
      image.src = shot.src;
      image.alt = shot.alt;
      image.loading = 'lazy';
      gallery.append(image);
    }
    node.append(gallery);
  }
  return node;
}

// The point on screen where a spot on the card (u, v from its centre) lands, for a pose.
function project(u, v, pose, base) {
  const s = pose.width / base;
  const x = u * s;
  const y = v * s;
  const ax = rad(pose.tiltX);
  const az = rad(pose.tiltZ);
  const x1 = x * Math.cos(az) - y * Math.sin(az);
  const y1 = x * Math.sin(az) + y * Math.cos(az);
  const y2 = y1 * Math.cos(ax) - pose.z * Math.sin(ax);
  const z2 = y1 * Math.sin(ax) + pose.z * Math.cos(ax);
  const f = PERSPECTIVE / (PERSPECTIVE - z2);
  return { x: pose.x + x1 * f, y: pose.y + y2 * f };
}

export function showJourney(section, holo, circuit, carousel, contact) {
  const jobs = journey.experience;
  const count = jobs.length;
  const lastAt = FOCUS_START + (count - 1) * PER_JOB;
  const ZOOM_OUT = [lastAt + HOLD_LAST, lastAt + HOLD_LAST + ZOOM_OUT_TIME];
  const JUMP_START = ZOOM_OUT[1] - 0.1;
  const JUMP_END = JUMP_START + JUMP_TIME + count * JUMP_STAGGER;
  // Hackathons: the card shrinks to the left and the row of events comes in and slides sideways at
  // the page's own pace. Then the row goes, the card moves back down into its tilt, and the view
  // zooms into its chip, which opens into the projects circuit. How long the slide takes depends
  // on how wide the row is, so these are worked out in plan().
  const SHRINK = [JUMP_END + 0.15, JUMP_END + 0.15 + SHRINK_TIME];
  const ROW_IN = [SHRINK[0] + 0.4, SHRINK[1] + 0.1];
  const FIRST_EVENT = ROW_IN[1]; // the first card is in place here
  let ROW_OUT, RETURN, CHIP, CIRCUIT, UNCIRCUIT, CHIP_OUT, FLIP;

  // Where each of the four parts is in view, in screens past the top of the section.
  const partAt = () => [FOCUS_START, FIRST_EVENT, CIRCUIT[1], FLIP[1] + 0.1];

  function plan() {
    // Two cards on screen, stepping along one card at a time, a screen of scrolling each.
    const lastEvent = FIRST_EVENT + carousel.steps * PER_EVENT;
    ROW_OUT = [lastEvent + SLIDE_HOLD, lastEvent + SLIDE_HOLD + 0.4];
    RETURN = [ROW_OUT[0] + 0.1, ROW_OUT[0] + 0.1 + RETURN_TIME];
    CHIP = [RETURN[1] + 0.05, RETURN[1] + 0.05 + CHIP_TIME];
    CIRCUIT = [CHIP[1] - 0.15, CHIP[1] - 0.15 + CIRCUIT_TIME];
    // Contact: the circuit folds back, the view pulls out of the chip, and the card flips over.
    UNCIRCUIT = [CIRCUIT[1] + CIRCUIT_HOLD, CIRCUIT[1] + CIRCUIT_HOLD + UNCIRCUIT_TIME];
    CHIP_OUT = [UNCIRCUIT[1] - 0.15, UNCIRCUIT[1] - 0.15 + CHIP_TIME];
    FLIP = [CHIP_OUT[1] + 0.05, CHIP_OUT[1] + 0.05 + FLIP_TIME];
    section.style.setProperty('--run', FLIP[1] + CONTACT_HOLD + 1);
  }

  const stage = el('div', 'exp-stage');
  const heading = el('h2', 'exp-heading', journey.heading);
  const camera = el('div', 'exp-camera');
  const labelBox = el('div', 'exp-labels');
  labelBox.setAttribute('aria-hidden', 'true');
  const detailBox = el('div', 'exp-details');

  // The card, at the bottom of the stack.
  const cardPose = el('div', 'exp-card');
  const drop = el('div', 'card-drop');
  drop.append(holo.host);
  cardPose.append(drop, contact.node);
  camera.append(cardPose);

  // The layers: the newest job on top.
  const panes = jobs.map(layer);
  [...panes].reverse().forEach((node) => camera.append(node));
  const details = jobs.map((item, j) => detail(item, j, count));
  detailBox.append(...details);

  // The diagram's labels name each position held; the last one is the card itself.
  const names = [...jobs.map((item) => item.role), cardDetails.tier ? `${cardDetails.tier} card` : 'Card'];
  const labels = names.map((name) => {
    const label = el('div', 'exp-label');
    label.append(el('span', 'exp-label-line'), el('span', 'exp-label-text', name));
    labelBox.append(label);
    return label;
  });

  const lens = el('div', 'exp-lens');
  lens.append(camera);

  // Where you are in the story: a thin bar along the top and the four parts, which jump there.
  const progress = el('div', 'exp-progress');
  progress.setAttribute('aria-hidden', 'true');
  const nav = el('nav', 'exp-nav');
  nav.setAttribute('aria-label', 'Sections');
  const parts = ['Experience', 'Hackathons', 'Projects', 'Contact'].map((name, k) => {
    const button = el('button', 'exp-nav-item', name);
    button.type = 'button';
    button.addEventListener('click', () => {
      const box = section.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + box.top + partAt()[k] * window.innerHeight, behavior: 'smooth' });
    });
    nav.append(button);
    return button;
  });

  stage.append(carousel.root, heading, lens, labelBox, detailBox, circuit.root, progress, nav);
  const chipOnCard = holo.host.querySelector('.pc-chip');
  document.body.append(stage);
  section.hidden = false;
  holo.watch(section, document.querySelector('.hero'));

  function sizes() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const phone = vw <= 700;
    const cardWidth = phone ? Math.min(vw - 48, 420) : Math.min(540, vw * 0.36, vh * 0.48 * CARD_RATIO);
    const stackWidth = phone ? Math.min(vw * 0.62, 260) : Math.min(380, vw * 0.27, vh * 0.42);
    const layerWidth = stackWidth * (Math.cos(rad(TILT_Z)) + Math.abs(Math.sin(rad(TILT_Z))) / CARD_RATIO);
    return {
      vw,
      vh,
      phone,
      cardWidth,
      gap: stackWidth * 0.3,
      // The card face down in the middle of the page, showing its back.
      centre: { x: vw / 2, y: vh * 0.5, width: phone ? Math.min(vw - 32, 440) : Math.min(660, vw * 0.48, vh * 0.62 * CARD_RATIO) },
      hero: { x: phone ? vw / 2 : vw * 0.3, y: vh * (phone ? 0.46 : 0.52), width: cardWidth },
      stack: { x: phone ? vw / 2 : vw * 0.3, y: vh * (phone ? 0.42 : 0.54), width: stackWidth },
      // Where the layer in view sits once zoomed, and how big it gets.
      anchor: { x: phone ? vw / 2 : vw * 0.27, y: vh * (phone ? 0.27 : 0.5) },
      zoom: Math.max(1, (phone ? vw * 0.9 : vw * 0.44) / layerWidth),
      reach: layerWidth / 2,
    };
  }

  function place(node, pose, base) {
    const height = base / CARD_RATIO;
    node.style.width = `${base}px`;
    node.style.height = `${height}px`;
    node.style.transform = `translate(${(pose.x - base / 2).toFixed(1)}px, ${(pose.y - height / 2).toFixed(1)}px) perspective(${PERSPECTIVE}px) rotateX(${pose.tiltX.toFixed(2)}deg) rotateZ(${pose.tiltZ.toFixed(2)}deg) rotateY(${(pose.flip ?? 0).toFixed(2)}deg) translateZ(${pose.z.toFixed(1)}px) scale(${(pose.width / base).toFixed(4)})`;
  }

  let queued = 0;
  let areaOpenedAt = null; // where the page was scrolled to when a project area was opened
  let lastT = null; // where it was scrolled to on the frame before

  function update() {
    queued = 0;
    const box = section.getBoundingClientRect();
    const { vw, vh, phone, cardWidth, gap, hero, centre, stack, anchor, zoom, reach } = sizes();
    const t = -box.top / vh;

    // Fixed over the page, sliding away with the end of the section.
    stage.style.transform = `translateY(${Math.min(0, box.bottom - vh).toFixed(1)}px)`;
    stage.style.visibility = box.bottom > 0 ? 'visible' : 'hidden';
    holo.host.style.setProperty('--card-w', `${cardWidth}px`);

    const down = smooth(ramp(t, DOWN));
    const open = smooth(ramp(t, OPEN));
    const cleared = smooth(ramp(t, CLEAR));
    const chipZoom = smooth(ramp(t, CHIP)) * (1 - smooth(ramp(t, CHIP_OUT)));
    const reveal = ramp(t, CIRCUIT) * (1 - ramp(t, UNCIRCUIT));
    const flipped = smooth(ramp(t, FLIP)); // 0 face up, 1 face down in the middle
    const zoomed = smooth(ramp(t, ZOOM_IN)) * (1 - smooth(ramp(t, ZOOM_OUT)));

    // The card is the bottom layer; layer i (1 = just above it) rises above it.
    const cardZ = (-count / 2) * gap;
    const inStack = (z) => ({ x: stack.x, y: stack.y, width: stack.width, tiltX: TILT_X, tiltZ: TILT_Z, z });
    const flat = (spot) => ({ x: spot.x, y: spot.y, width: spot.width, tiltX: 0, tiltZ: 0, z: 0 });
    const layerY = (z) => stack.y - z * Math.sin(rad(TILT_X));

    // Which job is in view: 0 for the first, sliding smoothly to the next as you scroll.
    let focus = 0;
    for (let j = 1; j < count; j += 1) {
      const at = FOCUS_START + j * PER_JOB;
      focus += smooth(ramp(t, [at - SWAP, at]));
    }
    const focusLayer = count - focus; // the newest job is the top layer

    // The camera: zooms in around the layer in view and keeps it at the anchor.
    const target = { x: stack.x, y: layerY(cardZ + focusLayer * gap) };
    const scale = mix(1, zoom, zoomed);
    const at = { x: mix(target.x, anchor.x, zoomed), y: mix(target.y, anchor.y, zoomed) };
    // Zooming into the card's chip: the card stays tilted, and from the first moment of the
    // zoom the circuit's chip takes the card chip's exact place, so there's only ever one chip.
    const chipAt = circuit.anchor(vw, vh, phone);
    let cam = { at, scale, target };
    let chipPose = null;
    // Where a spot on the card's face is, from the card's centre.
    const spotOnCard = (node) => {
      const content = node.offsetParent;
      return {
        u: content.offsetLeft + node.offsetLeft + node.offsetWidth / 2 - cardWidth / 2,
        v: content.offsetTop + node.offsetTop + node.offsetHeight / 2 - cardWidth / CARD_RATIO / 2,
      };
    };
    if (chipZoom > 0) {
      const { u, v } = spotOnCard(chipOnCard);
      const centre = project(u, v, inStack(cardZ), cardWidth);
      const onScreen = chipOnCard.offsetWidth * (stack.width / cardWidth); // its width in the stack
      const deep = circuit.chipSize(phone) / onScreen;
      cam = {
        target: centre,
        scale: Math.exp(Math.log(deep) * chipZoom),
        at: { x: mix(centre.x, chipAt.x, chipZoom), y: mix(centre.y, chipAt.y, chipZoom) },
      };
      chipPose = { dx: cam.at.x - chipAt.x, dy: cam.at.y - chipAt.y, scale: (onScreen * cam.scale) / circuit.chipSize(phone) };
    }
    chipOnCard.style.visibility = chipZoom > 0 ? 'hidden' : '';
    // A project area is open and the visitor scrolls on: close it smoothly back to the chip first,
    // so the rest of the story carries on from the overview.
    if (circuit.isOpen()) {
      areaOpenedAt ??= lastT ?? t; // it opened on a click, while the page sat where it was last frame
      if (Math.abs(t - areaOpenedAt) > 0.03) circuit.close();
    } else {
      areaOpenedAt = null;
    }
    lastT = t;
    circuit.update({ vw, vh, phone, reveal, chipPose });
    camera.style.transform = `translate(${cam.at.x.toFixed(1)}px, ${cam.at.y.toFixed(1)}px) scale(${cam.scale.toFixed(4)}) translate(${(-cam.target.x).toFixed(1)}px, ${(-cam.target.y).toFixed(1)}px)`;
    // The circuit opens out of the chip: the card is cut away in a widening circle round it,
    // rather than fading, so the dark card never washes out to grey.
    const opening = smooth(ramp(chipZoom, [0.62, 1]));
    if (opening > 0) {
      const radius = opening * Math.hypot(vw, vh) * 1.1;
      const edge = 90;
      lens.style.maskImage = `radial-gradient(circle at ${chipAt.x.toFixed(0)}px ${chipAt.y.toFixed(0)}px, transparent ${Math.max(0, radius - edge).toFixed(0)}px, #000 ${radius.toFixed(0)}px)`;
    } else {
      lens.style.maskImage = '';
    }
    camera.style.visibility = opening >= 1 ? 'hidden' : '';

    // Progress along the whole story, and which part is in view.
    const run = FLIP[1] + CONTACT_HOLD;
    progress.style.transform = `scaleX(${clamp(t / run).toFixed(4)})`;
    const chrome = smooth(ramp(t, [-0.5, 0]));
    progress.style.opacity = chrome.toFixed(3);
    nav.style.opacity = chrome.toFixed(3);
    nav.style.pointerEvents = chrome > 0.5 ? 'auto' : 'none';
    const starts = [0, SHRINK[0], RETURN[1], UNCIRCUIT[0] + 0.4];
    const current = starts.reduce((found, start, k) => (t >= start - 0.05 ? k : found), 0);
    parts.forEach((button, k) => button.classList.toggle('is-on', k === current));

    // Every card but the one in view fades almost completely away.
    const dimFor = (i) => 1 - zoomed * 0.97 * clamp(Math.abs(i - focusLayer));

    // Hackathons: the row comes in, steps sideways one card at a time with the scroll, then goes.
    carousel.update({
      shown: smooth(ramp(t, ROW_IN)) * (1 - smooth(ramp(t, ROW_OUT))),
      at: Array.from({ length: carousel.steps }, (_, k) => FIRST_EVENT + (k + 1) * PER_EVENT)
        .reduce((sum, at) => sum + smooth(ramp(t, [at - EVENT_SWAP, at])), 0),
    });

    // The card tips back for the diagram, shrinks to the left beside the hackathons heading,
    // then moves back down into its tilt for the zoom into the chip.
    const small = {
      x: carousel.heading.offsetLeft - (phone ? 14 : 24) - (phone ? SMALL_WIDTH * 0.62 : SMALL_WIDTH) / 2,
      y: carousel.heading.offsetTop + carousel.heading.offsetHeight / 2,
      width: phone ? SMALL_WIDTH * 0.62 : SMALL_WIDTH,
    };
    const shrunk = smooth(ramp(t, SHRINK)) * (1 - smooth(ramp(t, RETURN)));
    // At the end it flips over into the middle of the page to show its back.
    const tilted = mixPose(mixPose(flat(hero), inStack(cardZ), down), flat(small), shrunk);
    const cardNow = { ...mixPose(tilted, flat(centre), flipped), flip: 180 * flipped };
    const backUp = flipped > 0.5;
    drop.style.visibility = backUp ? 'hidden' : '';
    contact.node.style.visibility = backUp ? 'visible' : 'hidden';
    contact.setLive(flipped > 0.98);
    place(cardPose, cardNow, cardWidth);
    cardPose.style.opacity = dimFor(0);
    holo.host.style.setProperty('--tilt-k', clamp(1 - down + shrunk).toFixed(3));

    panes.forEach((node, j) => {
      const i = count - j;
      const start = JUMP_START + (i - 1) * JUMP_STAGGER;
      const jump = easeIn(ramp(t, [start, start + JUMP_TIME]));
      place(node, inStack(cardZ + i * gap * open * (1 - jump)), cardWidth);
      const shown = smooth(ramp(open, [0, 0.35])) * (1 - smooth(ramp(jump, [0.75, 1])));
      node.style.opacity = shown * dimFor(i);
      node.style.zIndex = 1 + i;
      node.style.visibility = shown > 0 ? 'visible' : 'hidden';
    });

    // Labels to the right of the open stack, each on a line from its layer.
    labels.forEach((label, k) => {
      const i = count - k; // labels run top to bottom; the last one is the card
      const y = layerY(cardZ + i * gap * open);
      const lineStart = stack.x + reach * 0.4;
      const lineEnd = stack.x + reach + 40;
      const show = smooth(ramp(open, [(k / names.length) * 0.6, (k / names.length) * 0.6 + 0.4])) * (1 - cleared);
      label.style.opacity = phone ? 0 : show;
      label.style.transform = `translate(${lineStart.toFixed(1)}px, ${y.toFixed(1)}px)`;
      label.style.setProperty('--line', `${(lineEnd - lineStart).toFixed(1)}px`);
    });

    heading.style.opacity = open * (1 - cleared);

    // The story of the job in view, on the right.
    details.forEach((node, j) => {
      const near = clamp(1 - Math.abs(focus - j) * 2.2);
      const shown = near * smooth(ramp(t, [ZOOM_IN[1] - 0.25, ZOOM_IN[1]])) * (1 - smooth(ramp(t, [ZOOM_OUT[0], ZOOM_OUT[0] + 0.25])));
      node.style.opacity = shown;
      node.style.visibility = shown > 0 ? 'visible' : 'hidden';
      node.style.transform = `translateY(calc(var(--center) + ${((1 - shown) * 16).toFixed(1)}px))`;
    });
  }

  function queue() {
    queued ||= requestAnimationFrame(update);
  }

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', () => {
    plan();
    queue();
  });
  plan();
  update();
  // The row's width can change once the fonts and photos are in.
  document.fonts?.ready.then(() => {
    plan();
    queue();
  });
  window.addEventListener('load', () => {
    plan();
    queue();
  });
}
