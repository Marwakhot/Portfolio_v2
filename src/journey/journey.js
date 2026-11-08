import { content, journey } from '../config.js';
import { startFlightPath } from './flightPath.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function linkOrSpan(href, className) {
  if (!href) return el('span', className);
  const link = el('a', className);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noreferrer noopener';
  return link;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svg(tag, attributes = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  parent?.append(node);
  return node;
}

function dot(variant) {
  const node = el('span', `tl-dot tl-dot-${variant}`);
  node.setAttribute('aria-hidden', 'true');
  return node;
}

function entry(item) {
  const row = el('li', 'tl-entry');
  const year = el('span', 'tl-year');
  year.append(el('span', 'tl-yearnum', item.dates));

  const head = el('span', 'tl-head');
  const company = linkOrSpan(item.href, 'tl-company');
  company.textContent = `${item.role} @ ${item.company}`;
  if (item.logo) {
    const logo = el('img', 'tl-logo');
    logo.src = item.logo;
    logo.alt = '';
    head.append(logo);
  }
  head.append(company);
  if (item.current) head.append(el('span', 'tl-badge', 'Current'));

  const body = el('div', 'tl-body');
  body.append(head);
  if (item.description) body.append(el('p', 'tl-desc', item.description));
  if (item.built?.length) {
    const list = el('ul', 'tl-built');
    list.append(...item.built.map((text) => el('li', '', text)));
    body.append(list);
  }
  if (item.gallery?.length) {
    const gallery = el('div', 'tl-gallery');
    for (const shot of item.gallery) {
      const image = el('img', shot.wide ? 'is-wide' : undefined);
      image.src = shot.src;
      image.alt = shot.alt;
      gallery.append(image);
    }
    body.append(gallery);
  }
  row.append(year, dot(item.current ? 'now' : 'past'), body);
  return row;
}

export function plane(className = 'plan-plane') {
  const icon = svg('svg', { class: className, viewBox: '0 0 16 15', fill: 'none', 'aria-hidden': 'true' });
  svg(
    'path',
    {
      fill: 'currentColor',
      d: 'M8 0c.73 0 1.32 1.05 1.32 2.35v2.2l6.13 3.54c.25.14.4.4.4.69v1.1a.44.44 0 0 1-.56.42L9.32 8.5v3.06l1.9 1.33c.15.11.24.28.24.47v.79a.44.44 0 0 1-.56.42L8 13.79l-2.9.78a.44.44 0 0 1-.56-.42v-.79c0-.19.09-.36.24-.47l1.9-1.33V8.5L.71 10.3a.44.44 0 0 1-.56-.42v-1.1c0-.29.15-.55.4-.69l6.13-3.54v-2.2C6.68 1.05 7.27 0 8 0Z',
    },
    icon,
  );
  return icon;
}

function flightLine() {
  const line = el('div', 'flight-line');
  line.setAttribute('aria-hidden', 'true');
  const lit = el('div', 'flight-lit');
  line.append(lit, plane());
  return line;
}

function render(section) {
  const top = el('div', 'journey-top');
  top.append(el('h2', 'folio-heading reveal', journey.heading));

  const track = el('div', 'folio-track');
  const label = el('span', 'plan-label reveal', journey.planLabel);
  const timeline = el('ol', 'folio-timeline');
  timeline.append(...journey.experience.map(entry));
  const outro = el('div', 'folio-outro reveal');
  track.append(flightLine(), label, timeline, outro);

  const stage = el('div', 'journey-stage');
  stage.append(track);

  const pin = el('div', 'journey-pin');
  pin.append(top, stage);
  section.append(pin);
  return { track, outro };
}

export function showJourney(section, onStopChange) {
  const { track, outro } = render(section);
  section.hidden = false;
  startFlightPath(track, outro, onStopChange);
}
