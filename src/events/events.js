import { events, eventsSection } from '../config.js';
import { plane } from '../journey/journey.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svg(tag, attributes = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent?.append(node);
  return node;
}

const pad = (number) => String(number).padStart(2, '0');

// Soft colours, one set per postcard in turn: the paper, then the two airmail stripes.
const POSTCARD_COLORS = [
  ['#fdf5df', '#f3cdbd', '#c5d6f3'],
  ['#efeafb', '#d9cdf3', '#f6d3df'],
  ['#e8f5ec', '#bfe3c9', '#f5e7ae'],
  ['#fdeee6', '#f7cdb9', '#bfe0e6'],
];

function stamp({ stamp: { top, bottom, color } }) {
  const node = el('div', 'stamp');
  node.style.setProperty('--stamp', color);
  const face = el('div', 'stamp-face');
  face.append(el('span', 'stamp-top', top), el('span', 'stamp-bottom', bottom));
  node.append(face);
  return node;
}

function postmark(event, index) {
  const mark = svg('svg', { class: 'postmark', viewBox: '0 0 120 120', 'aria-hidden': 'true' });
  svg('circle', { cx: 60, cy: 60, r: 57 }, mark);
  svg('circle', { cx: 60, cy: 60, r: 33 }, mark);
  const id = `postmark-ring-${index}`;
  svg('path', { id, d: 'M60 60m-41 0a41 41 0 1 1 82 0a41 41 0 1 1-82 0', fill: 'none', stroke: 'none' }, mark);
  const ring = svg('text', { class: 'postmark-ring' }, mark);
  const path = svg('textPath', { href: `#${id}`, textLength: 250 }, ring);
  path.textContent = `${event.postmark} · AIR MAIL ·`;
  const year = svg('text', { class: 'postmark-year', x: 60, y: 66, 'text-anchor': 'middle' }, mark);
  year.textContent = event.date;
  return mark;
}

function photos(event) {
  const list = [event.image].flat().filter(Boolean);
  const box = el('div', `postcard-photos${list.length > 1 ? ' is-double' : ''}`);
  for (const path of list) {
    const image = el('img');
    image.src = path;
    image.alt = event.title;
    image.draggable = false;
    box.append(image);
  }
  return box;
}

function postcard(event, index) {
  const card = el('li', 'postcard');
  card.style.setProperty('--tilt', `${index % 2 ? 0.7 : -0.8}deg`);
  const [paper, stripeA, stripeB] = POSTCARD_COLORS[index % POSTCARD_COLORS.length];
  card.style.setProperty('--paper', paper);
  card.style.setProperty('--stripe-a', stripeA);
  card.style.setProperty('--stripe-b', stripeB);

  const back = el('div', 'postcard-back');
  back.append(
    stamp(event),
    postmark(event, index),
    el('h3', 'postcard-title', event.title),
    el('p', 'postcard-message', event.description),
  );

  const foot = el('div', 'postcard-foot');
  foot.append(el('p', 'postcard-place', `${event.place} · ${event.date}`));
  if (event.links?.length) {
    const links = el('ul', 'postcard-links');
    for (const { label, href } of event.links) {
      const item = el('li');
      const link = el('a', '', `${label} ↗`);
      link.href = href;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      item.append(link);
      links.append(item);
    }
    foot.append(links);
  }
  back.append(foot);

  const inner = el('article', 'postcard-inner');
  inner.append(photos(event), back);
  card.append(inner);
  return card;
}

// The section pins while the postcards slide past, so scrolling down moves them sideways.
export function showEvents(section) {
  if (!events.length) return;

  section.style.setProperty('--event-count', events.length);

  const row = el('div', 'way-row');
  row.append(el('span', 'way-dot'), plane('way-plane'), el('h2', 'events-heading', eventsSection.heading));
  const count = el('p', 'events-count');
  const head = el('header', 'events-head');
  head.append(row, count);

  const track = el('ol', 'postcards');
  const cards = events.map(postcard);
  track.append(...cards);
  const view = el('div', 'events-view');
  view.append(track);

  const pin = el('div', 'events-pin');
  pin.append(head, view);
  const run = el('div', 'events-run');
  run.append(pin);
  section.append(run);
  section.hidden = false;

  const travel = () => Math.max(1, run.offsetHeight - pin.offsetHeight);

  let placed = -1;
  function place(event) {
    const progress = Math.min(1, Math.max(0, -run.getBoundingClientRect().top / travel()));
    if (progress === placed && event?.type === 'scroll') return; // not near this section
    placed = progress;
    const distance = Math.max(0, track.offsetWidth - view.clientWidth);
    track.style.transform = `translate3d(${(-progress * distance).toFixed(1)}px, 0, 0)`;
    count.textContent = `${pad(Math.round(progress * (events.length - 1)) + 1)} / ${pad(events.length)}`;
  }
  window.addEventListener('scroll', place, { passive: true });
  window.addEventListener('resize', place);
  place();

  // Tabbing to a link on a card that's off to the side brings that card into view.
  track.addEventListener('focusin', (event) => {
    const index = cards.indexOf(event.target.closest('.postcard'));
    const share = events.length > 1 ? index / (events.length - 1) : 0;
    window.scrollTo(0, window.scrollY + run.getBoundingClientRect().top + share * travel());
  });
}
