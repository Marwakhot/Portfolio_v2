import { events, eventsSection } from '../config.js';
import { createCrumpleScene } from './scene.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function eventDetails(event, index) {
  const details = el('div', 'event-details');

  const meta = el('p', 'event-meta');
  const pill = [event.date, event.place].filter(Boolean).join(' · ');
  if (pill) meta.append(el('span', 'event-pill', pill));
  if (event.result) meta.append(el('span', 'event-result', event.result));

  const links = el('ul', 'event-links');
  for (const { label, href } of event.links ?? []) {
    const item = el('li');
    const link = el('a', '', `${label} ↗`);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    item.append(link);
    links.append(item);
  }

  details.append(
    el('p', 'event-count', `${String(index + 1).padStart(2, '0')} / ${String(events.length).padStart(2, '0')}`),
    el('h3', 'event-title', event.title),
    meta,
    el('p', 'event-description', event.description),
  );
  if (event.links?.length) details.append(links);
  return details;
}

// The section is pinned while you scroll past it, one screen of scrolling per event.
export function showEvents(section) {
  if (!events.length) return;

  section.style.setProperty('--event-count', events.length);
  const pin = el('div', 'events-pin');
  const canvas = el('canvas', 'events-canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'A printed poster for each event, which crumples into a ball and opens out as the next one.');
  const stage = el('div', 'events-stage');
  stage.append(canvas);
  const copy = el('div', 'events-copy');
  const slot = el('div', 'events-slot');
  slot.setAttribute('aria-live', 'polite');
  copy.append(slot);
  pin.append(stage, copy);
  const run = el('div', 'events-run');
  run.append(pin);

  const head = el('header', 'events-head');
  const row = el('div', 'way-row');
  row.append(el('span', 'way-dot'), el('h2', 'events-heading', eventsSection.heading));
  head.append(row);
  section.append(head, run);
  section.hidden = false;

  function showDetails(index) {
    slot.replaceChildren(eventDetails(events[index], index));
  }
  showDetails(0);

  const scene = createCrumpleScene(canvas, events, { onIndex: showDetails });

  function onScroll() {
    const box = run.getBoundingClientRect();
    const travel = box.height - window.innerHeight;
    const progress = travel > 0 ? Math.min(1, Math.max(0, -box.top / travel)) : 0;
    scene.goTo(Math.round(progress * (events.length - 1)));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  new IntersectionObserver(([entry]) => scene.setVisible(entry.isIntersecting), { rootMargin: '100px 0px' }).observe(section);
}
