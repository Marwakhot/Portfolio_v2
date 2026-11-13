import { events, eventsSection } from '../config.js';

// Hackathons and events as frosted glass cards in a row that steps sideways one at a time as you
// scroll down (journey.js drives it). Each card has its photos on the left, and on the right the
// placing, the win, the story, and where and when. The card waits small on the left, with the
// heading beside it.

const pad = (n) => String(n).padStart(2, '0');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const imagesOf = (event) => [event.images ?? event.image].flat().filter(Boolean);

function glassCard(event) {
  const node = el('article', 'ev-card');
  node.style.setProperty('--event', event.color ?? '#1400ff');
  const paper = el('div', 'ev-paper');

  // The photos: one fills the side, two are stacked.
  const photos = el('div', 'ev-photos');
  for (const src of imagesOf(event).slice(0, 2)) {
    const img = el('img', 'ev-img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    img.draggable = false;
    photos.append(img);
  }

  const text = el('div', 'ev-text');
  const head = el('div', 'ev-head');
  head.append(el('span', 'ev-badge', event.award ?? ''), el('h3', 'ev-title', event.headline ?? event.title));

  const foot = el('div', 'ev-foot');
  foot.append(el('p', 'ev-where', [event.place, event.date].filter(Boolean).join(' · ')));
  if (event.links?.length) {
    const links = el('div', 'ev-links');
    for (const { label, href } of event.links) {
      const link = el('a', 'ev-link', `${label} ↗`);
      link.href = href;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      links.append(link);
    }
    foot.append(links);
  }
  text.append(head, el('p', 'ev-desc', event.description), foot);

  paper.append(photos, text);
  node.append(paper);
  return node;
}

export function createCarousel() {
  const root = el('section', 'ev');
  root.setAttribute('aria-label', eventsSection.heading);
  const heading = el('h2', 'ev-heading', eventsSection.heading);
  const counter = el('p', 'ev-count');
  const view = el('div', 'ev-view');
  const track = el('div', 'ev-track');
  track.append(...events.map(glassCard));
  view.append(track);
  root.append(heading, counter, view);
  return {
    root,
    heading,
    count: events.length,
    // How many steps it takes to bring the last card in, one at a time.
    steps: Math.max(0, events.length - 1),
    // shown: 0 to 1, the row coming in or going. at: which card is in front, as a number
    // that slides from one to the next.
    update({ shown, at }) {
      const cards = track.children;
      const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 0;
      root.style.visibility = shown > 0 ? 'visible' : 'hidden';
      root.style.pointerEvents = shown > 0.95 ? 'auto' : 'none';
      heading.style.opacity = shown.toFixed(3);
      counter.style.opacity = shown.toFixed(3);
      counter.textContent = `${pad(Math.round(at) + 1)} / ${pad(events.length)}`;
      view.style.opacity = shown.toFixed(3);
      view.style.translate = `0 ${((1 - shown) * 40).toFixed(1)}px`;
      track.style.transform = `translateX(${(-at * step).toFixed(1)}px)`;
      // The card in front is the one to read; its neighbours peek in, dimmed.
      [...cards].forEach((card, k) => {
        card.style.opacity = (1 - Math.min(1, Math.abs(k - at)) * 0.55).toFixed(3);
      });
    },
  };
}
