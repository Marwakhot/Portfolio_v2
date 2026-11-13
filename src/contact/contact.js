import { card as cardDetails, contact } from '../config.js';

// The back of the card, shown when it flips over at the end of the page: a magnetic stripe, and
// the ways to reach out, as real links. It leans a little toward the cursor.

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// The last part of a profile link, without LinkedIn's trailing number: "marwa-khot".
const handle = (url) => url.replace(/\/+$/, '').split('/').pop().replace(/-\d+$/, '');

function row(label, value, href) {
  const link = el('a', 'cb-row');
  link.href = href;
  if (!href.startsWith('mailto:') && !href.startsWith('tel:')) {
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
  }
  link.append(el('span', 'cb-label', label), el('span', 'cb-value', value));
  return link;
}

export function createContact() {
  const back = el('section', 'cb');
  back.setAttribute('aria-label', 'Reach out');
  const face = el('div', 'cb-face');
  // The same metal and printing as the front.
  if (cardDetails.colors?.body) face.style.setProperty('--cb-body', `linear-gradient(115deg, ${cardDetails.colors.body.join(', ')})`);
  if (cardDetails.colors?.ink) face.style.setProperty('--cb-ink', cardDetails.colors.ink);

  const stripe = el('div', 'cb-stripe');
  stripe.setAttribute('aria-hidden', 'true');

  const head = el('div', 'cb-head');
  const title = el('div', 'cb-title');
  title.append(el('h2', 'cb-heading', 'Reach out'), el('p', 'cb-lead', 'Building something? I’d love to hear about it.'));
  head.append(title, el('span', 'cb-mark', cardDetails.mark ?? ''));

  const rows = el('div', 'cb-rows');
  rows.append(...[
    contact.email && row('Email', contact.email, `mailto:${contact.email}`),
    contact.linkedin && row('LinkedIn', `in/${handle(contact.linkedin)} ↗`, contact.linkedin),
    contact.github && row('GitHub', `${handle(contact.github)} ↗`, contact.github),
    contact.phone && row('Phone', contact.phone, contact.phoneHref ?? `tel:${contact.phone}`),
  ].filter(Boolean));

  const foot = el('div', 'cb-foot');
  foot.setAttribute('aria-hidden', 'true');
  foot.append(el('span', 'cb-sign', cardDetails.name), el('span', 'cb-small', cardDetails.footnote ?? ''));

  face.append(stripe, head, rows, foot);
  back.append(face);

  // A small lean toward the cursor once the back is up.
  let live = false;
  window.addEventListener('pointermove', (e) => {
    if (!live || e.pointerType === 'touch') return;
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = (e.clientY / window.innerHeight) * 2 - 1;
    face.style.setProperty('--lean-x', `${(x * 7).toFixed(2)}deg`);
    face.style.setProperty('--lean-y', `${(-y * 7).toFixed(2)}deg`);
    face.style.setProperty('--glint', `${(50 + x * 40).toFixed(1)}%`);
  }, { passive: true });

  return {
    node: back,
    // live: the back is facing the viewer and can be used.
    setLive(next) {
      if (next === live) return;
      live = next;
      back.style.pointerEvents = live ? 'auto' : 'none';
      if (!live) {
        face.style.setProperty('--lean-x', '0deg');
        face.style.setProperty('--lean-y', '0deg');
      }
    },
  };
}
