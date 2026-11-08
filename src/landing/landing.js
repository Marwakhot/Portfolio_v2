import { arrivals, boardingPass, contact, content, landing } from '../config.js';
import { drawPassFront } from '../gate/passArt.js';

const SCROLL_DAMPING = 6;
const MAX_ZOOM = 7; // the same push as take-off, played backwards
const ARRIVE_AT = 0.985; // the shade closes by itself once the scroll gets this far
const LEAVE_AT = 0.93; // and only reopens if the visitor scrolls well back

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smooth = (value) => value * value * (3 - 2 * value);

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// The inside of the plane is the same artwork as take-off, reused.
function cabinView() {
  const stage = document.querySelector('.jet-stage').cloneNode(true);
  stage.removeAttribute('style');
  stage.querySelector('.jet').removeAttribute('style');
  stage.querySelector('.jet-lift').removeAttribute('style');
  return stage;
}

// Down through the clouds and back out through the window. At the end the shade closes,
// and the white Arrivals page dissolves in over the top.
export function showLanding(section) {
  const sky = el('div', 'landing-sky');
  const clouds = [el('div', 'landing-cloud'), el('div', 'landing-cloud is-near')];
  const stage = cabinView();
  const jet = stage.querySelector('.jet');
  const note = el('p', 'landing-note', landing.descent);
  const white = el('div', 'landing-white');

  const scene = el('div', 'landing-scene');
  scene.setAttribute('aria-hidden', 'true');
  scene.append(sky, ...clouds, stage, note, white);
  const pin = el('div', 'landing-pin');
  pin.append(scene, document.querySelector('.arrivals'));
  const run = el('div', 'landing-run');
  run.append(pin);
  section.append(run);
  section.hidden = false;

  function draw(p) {
    const descent = smooth(clamp01(p / 0.7));
    white.style.opacity = 1 - smooth(clamp01(p / 0.1));
    sky.style.transform = `translateY(${(descent - 1) * 35}vh)`;
    clouds[0].style.transform = `translateY(${-descent * 30}vh) scale(${1 + descent * 0.3})`;
    clouds[1].style.opacity = clamp01((0.5 - p) / 0.16);
    clouds[1].style.transform = `translateY(${-descent * 110}vh) scale(${1 + descent})`;

    const push = 1 - clamp01((p - 0.45) / 0.5);
    jet.style.transform = `scale(${MAX_ZOOM ** (push ** 2.2)})`;
    stage.style.opacity = 1 - smooth(clamp01((push - 0.88) / 0.12));

    note.style.opacity = Math.min(clamp01((p - 0.08) / 0.06), clamp01((0.44 - p) / 0.06));

    if (p >= ARRIVE_AT) pin.classList.add('is-arrived');
    else if (p < LEAVE_AT) pin.classList.remove('is-arrived');
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = () => clamp01(-run.getBoundingClientRect().top / Math.max(1, run.offsetHeight - pin.offsetHeight));
  let shown = progress();
  let drawn = shown;
  let lastTime = 0;
  let frame = 0;

  function tick(time) {
    const dt = lastTime ? Math.min(0.1, (time - lastTime) / 1000) : 1 / 60;
    lastTime = time;
    const target = progress();
    shown += (target - shown) * (reduced ? 1 : 1 - Math.exp(-dt * SCROLL_DAMPING));
    if (Math.abs(target - shown) < 0.0005) shown = target;
    if (shown !== drawn) draw(shown); // nothing to do while the visitor is elsewhere on the page
    drawn = shown;
    if (shown !== target) {
      frame = requestAnimationFrame(tick);
    } else {
      frame = 0;
      lastTime = 0;
    }
  }
  const wake = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };
  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', wake);
  draw(shown);
}

export function showArrivals(section) {
  const pass = drawPassFront(boardingPass, `${content.firstName} ${content.lastName}`);
  pass.className = 'arrivals-pass';
  pass.setAttribute('role', 'img');
  pass.setAttribute('aria-label', `${boardingPass.airline} boarding pass, stamped ${arrivals.stamp}.`);

  const stamp = el('div', 'arrivals-stamp');
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  stamp.setAttribute('aria-hidden', 'true');
  stamp.append(el('span', 'arrivals-stamp-word', arrivals.stamp), el('span', 'arrivals-stamp-line', `${boardingPass.to.city} · ${today}`));
  const ticket = el('div', 'arrivals-ticket');
  ticket.append(pass, stamp);

  const links = el('ul', 'arrivals-links');
  const rows = [
    ['Email', contact.email.toLowerCase(), `mailto:${contact.email}`],
    ['LinkedIn', 'marwa-khot', contact.linkedin],
    ['GitHub', contact.github.split('/').pop(), contact.github],
    ['Phone', contact.phone, contact.phoneHref],
  ];
  for (const [label, value, href] of rows) {
    const item = el('li');
    const link = el('a');
    link.href = href;
    if (href.startsWith('http')) {
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
    }
    link.append(el('span', 'arrivals-label', label), el('span', 'arrivals-value', value), el('span', 'arrivals-arrow', '↗'));
    item.append(link);
    links.append(item);
  }

  const replay = el('button', 'arrivals-replay', `${arrivals.replay} ↺`);
  replay.type = 'button';
  replay.addEventListener('click', () => location.reload());

  const text = el('div', 'arrivals-copy');
  text.append(el('h2', 'arrivals-heading', arrivals.heading), el('p', 'arrivals-message', arrivals.message), links, replay);

  const inner = el('div', 'arrivals-inner');
  inner.append(ticket, text);
  section.append(inner);
  section.hidden = false;
}
