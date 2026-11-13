import { FOILS, HoloTilt, applyFoil } from './holo-engine.js';

// The platinum holo card: brushed silver with a holographic foil that slides over it as the
// card tilts toward the cursor, and a photo tile in a hard steel duotone that flips past a tilt.

// The default metal, if the config doesn't give the card its own colours.
const PLATINUM = {
  body: ['#dfe2e7', '#a9aeb7', '#f1f2f5', '#959aa4'],
  ink: '#2b2e35',
  tile: ['#33363d', '#e4e7ec'],
};

// Rough lightness of a #rrggbb colour, 0 to 1.
const lightness = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
};

// A small sparkle motif that comes up on the side the card is turned toward.
function sparkles(color) {
  const star = (x, y, r, turn) => `<path d='M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z' transform='rotate(${turn} ${x} ${y})'/>`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g fill='none' stroke='${color}' stroke-width='2.4' stroke-linejoin='round'>`
    + star(24, 22, 11, 0) + star(84, 16, 8, 12) + star(54, 62, 13, -8) + star(104, 72, 9, 6) + star(22, 94, 10, -12)
    + '</g></svg>';
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function contactless() {
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('class', 'pc-wave');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 8.5a5 5 0 0 1 0 7"/><path d="M11 6a8.5 8.5 0 0 1 0 12"/><path d="M15 3.5a12 12 0 0 1 0 17"/></g>';
  return icon;
}

// The printed face: tier and mark, chip, number, holder and a tile. The glass layers in the
// experience section reuse it with a company logo in the tile.
export function cardFace(details, tile) {
  const face = el('div', 'holo-content');
  const top = el('div', 'pc-top');
  top.append(el('span', 'pc-tier', details.tier), el('span', 'pc-mark', details.mark));
  const chips = el('div', 'pc-chips');
  chips.append(el('span', 'pc-chip'), contactless());
  const bottom = el('div', 'pc-bottom');
  const holder = el('div', 'pc-holder');
  holder.append(el('span', 'pc-small', details.footnote), el('span', 'pc-name', details.name));
  bottom.append(holder, el('span', 'pc-brand', details.brand));
  face.append(top, chips, el('p', 'pc-number', details.number), bottom, tile);
  return face;
}

export function createCard(details) {
  const card = el('div', 'holo-card');
  for (const name of ['holo-body', 'holo-pattern', 'holo-pattern--lit', 'holo-foil', 'holo-foil--b', 'holo-foil--c', 'holo-smear', 'holo-spot', 'holo-noise', 'holo-glare', 'holo-sheen']) {
    card.append(el('div', name));
  }

  const tile = el('div', 'holo-tile');
  for (const name of ['photo', 'photo--neg', 'duo', 'tone', 'foil', 'grain', 'wear', 'vignette', 'gloss']) {
    tile.append(el('div', `holo-tile__${name}`));
  }
  const face = cardFace(details, tile);
  card.append(face);

  const colors = { ...PLATINUM, ...details.colors };
  const dark = lightness(colors.body[0]) < 0.4;
  card.style.setProperty('--ink', colors.ink);
  // The embossed highlight on the printing: softer on a dark card, where it would glow.
  card.style.setProperty('--ink-lift', dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.55)');
  // On a dark card the rainbow foil would wash the colour out, so it's kept to a sheen.
  if (dark) {
    card.style.setProperty('--foil-k', '0.28');
    card.style.setProperty('--glare-k', '0.6');
  }
  card.style.setProperty('--pattern-ink', sparkles(dark ? '#7f95c4' : '#2a2d34'));
  card.style.setProperty('--pattern-lit', sparkles('#ffffff'));

  const host = el('div', 'holo-host');
  host.setAttribute('role', 'img');
  host.setAttribute('aria-label', `${details.name}'s platinum card, with a holographic foil that tilts and catches the light as the pointer moves.`);
  host.append(card);

  const foil = FOILS[details.foil] ?? FOILS.holo;
  applyFoil(card, foil, { body: colors.body, tile: colors.tile, image: details.photo });
  const engine = new HoloTilt(card, foil);

  // Runs only while the card's sections are on screen, the tab is visible and motion is welcome.
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const watched = new Map();
  let running = false;
  function sync() {
    const onScreen = [...watched.values()].some(Boolean);
    const next = onScreen && !document.hidden && !motion.matches;
    if (motion.matches) engine.renderStill();
    if (next === running) return;
    running = next;
    if (running) engine.start();
    else engine.stop();
  }
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) watched.set(entry.target, entry.isIntersecting);
    sync();
  }, { threshold: 0 });
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  if (motion.matches) engine.renderStill();

  return {
    host,
    card,
    // Turns the card toward an angle, by a weight from 0 (the cursor's) to 1 (fully scripted).
    steer(aim, weight) {
      engine.steer(aim, weight);
    },
    // The card animates while any of these elements is on screen.
    watch(...elements) {
      for (const element of elements) observer.observe(element);
    },
    destroy() {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
      engine.destroy();
    },
  };
}
