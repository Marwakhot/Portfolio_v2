import { events, eventsSection } from '../config.js';

// Hackathons and events as rows: hovering one lights it up and fans out three photo cards beside
// its title. The rows scroll up through the page's fixed stage under a pinned heading
// (journey.js moves them), while the card waits, tiny, beside the heading.

const PREVIEWS = 3;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Always three cards of the same size; a missing photo is an empty box.
function previews(event) {
  const box = el('div', 'event-previews');
  for (let i = 0; i < PREVIEWS; i += 1) {
    const src = event.images?.[i];
    const card = el(src ? 'img' : 'div', `event-preview event-preview-${i}${src ? '' : ' is-empty'}`);
    if (src) {
      card.src = src;
      card.alt = '';
      card.loading = 'lazy';
      card.decoding = 'async';
      card.draggable = false;
    }
    box.append(card);
  }
  box.setAttribute('aria-hidden', 'true');
  return box;
}

function row(event) {
  const item = el('li', 'event-row');
  item.tabIndex = 0;

  const copy = el('div', 'event-copy');
  copy.append(
    el('h3', 'event-title', event.title),
    el('p', 'event-desc', event.description),
    el('p', 'event-date', [event.award, event.place, event.date].filter(Boolean).join(' · ')),
  );
  if (event.links?.length) {
    const links = el('p', 'event-links');
    for (const { label, href } of event.links) {
      const link = el('a', '', `${label} ↗`);
      link.href = href;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      links.append(link);
    }
    copy.append(links);
  }

  const label = el('div', 'event-label');
  label.append(copy);
  item.append(label, previews(event));
  return item;
}

export function createEventList() {
  const root = el('section', 'events');
  root.setAttribute('aria-label', eventsSection.heading);
  // The heading stays put at the top, with the small card beside it; the rows scroll up
  // underneath it through a window that fades out at its top edge.
  const head = el('header', 'events-head');
  const heading = el('h2', 'events-heading', eventsSection.heading);
  head.append(heading);
  const view = el('div', 'events-window');
  const list = el('ol', 'events-list');
  const rows = events.map(row);
  list.append(...rows);
  view.append(list);
  root.append(head, view);
  return { root, head, heading, view, list, rows };
}
