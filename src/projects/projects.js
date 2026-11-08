import { projectFields, projectsSection } from '../config.js';

// A conveyor: claim tickets on hangers ride a moving chain and loop past on their own, one
// ticket per field. Opening a ticket widens it to hold every project in that field, and the
// others slide into the corner. Hovering slows the chain to a stop.
const GAP = 28;
const HANGER = 68; // height of the hanger above each ticket
const BELT_SPEED = 62; // pixels per second
const OFFSCREEN = 40; // how far past the screen edge a ticket goes before looping round
const CHAIN_TILE = 28; // width of one repeat of the chain artwork
const CORNER_SCALE = 0.5;
const CORNER_STEP = 62; // the space between cards bunched up in the corner
const CORNER_GAP = 28; // between the open card and the corner
const SETTLE_MS = 720; // matches --move, the time a closing ticket takes to get back on the chain
const SPRING = 18;
const DAMPING = 2.2;
const TICKET_COLORS = ['#dfd6f6', '#d2eadb', '#f5ecb4', '#f7d9c9'];

const pad = (index) => String(index + 1).padStart(2, '0');
const projectCount = (count) => `${count} ${count === 1 ? 'project' : 'projects'}`;

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

function hanger() {
  const art = svg('svg', { class: 'phanger', viewBox: '0 0 150 70', 'aria-hidden': 'true' });
  svg('rect', { class: 'phanger-trolley', x: 61, y: 0, width: 28, height: 9, rx: 2 }, art);
  svg('path', { d: 'M75 9V17c8 0 11 9 4 13l-4 3M75 33L8 66H142Z' }, art);
  return art;
}

function cover(field, index) {
  const button = el('button', 'pcover');
  button.type = 'button';
  const head = el('span', 'pcover-head');
  head.append(el('span', '', `Bag ${pad(index)}`), el('span', '', projectCount(field.projects.length)));
  const titles = el('span', 'pcover-titles');
  titles.append(...field.projects.map((project) => el('span', '', project.title)));
  const foot = el('span', 'pcover-foot');
  foot.append(el('span', '', 'Claim'), el('span', 'pcover-arrow', '↗'));
  button.append(head, el('span', 'pcover-name', field.name), titles, foot);
  return button;
}

function points(label, items) {
  const block = el('div', 'pproject-block');
  const list = el('ul', 'pproject-points');
  list.append(...items.map((text) => el('li', '', text)));
  block.append(el('p', 'pproject-label', label), list);
  return block;
}

function projectDetail(project) {
  const item = el('article', 'pproject');
  item.append(
    el('h4', 'pproject-title', project.title),
    el('p', 'pproject-summary', project.summary),
    points('Problem', project.problem),
    points('Solution', project.solution),
  );
  const foot = el('div', 'pproject-foot');
  foot.append(el('span', 'pproject-tags', (project.tags ?? []).join(' · ')));
  if (project.href) {
    const link = el('a', 'pproject-link', 'View project ↗');
    link.href = project.href;
    link.target = '_blank';
    link.rel = 'noreferrer noopener';
    foot.append(link);
  }
  item.append(foot);
  return item;
}

function detail(field, index, onBack) {
  const panel = el('div', 'pdetail');
  panel.inert = true;
  const back = el('button', 'pback-button', '← Back');
  back.type = 'button';
  back.addEventListener('click', onBack);
  const head = el('header', 'pdetail-head');
  head.append(el('span', 'pdetail-count', `Bag ${pad(index)} · ${projectCount(field.projects.length)}`), el('h3', 'pdetail-name', field.name));
  const list = el('div', 'pdetail-list');
  list.append(...field.projects.map(projectDetail));
  panel.append(back, head, list);
  return { panel, back };
}

export function showProjects(section) {
  if (!projectFields.length) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const head = el('header', 'projects-head');
  const row = el('div', 'way-row');
  row.append(el('span', 'way-dot'), el('h2', 'projects-title', projectsSection.heading));
  head.append(row, el('p', 'projects-intro', projectsSection.intro));

  const rail = el('div', 'prail');
  const conveyor = el('div', 'pconveyor');
  conveyor.setAttribute('aria-hidden', 'true');
  const chain = el('div', 'pchain');
  conveyor.append(el('div', 'ptube'), chain);
  const list = el('ol', 'pcards');

  let open = -1;
  let riding = !reduced;
  let belt = 0;
  let speed = BELT_SPEED;
  let goal = null;
  let hovering = 0;
  let focusHeld = false;
  let visible = false;
  let frame = 0;
  let lastTime = 0;
  let settle = 0;
  let closedWidth = 0;
  let loop = 1;
  let spacing = 1;
  let railLeft = 0;

  const cards = projectFields.map((field, index) => {
    const hang = el('li', 'phang');
    hang.style.setProperty('--face', TICKET_COLORS[index % TICKET_COLORS.length]);
    const card = el('div', 'pcard');
    const button = cover(field, index);
    const { panel, back } = detail(field, index, () => setOpen(-1));
    button.addEventListener('click', () => setOpen(index));
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((event.clientX - box.left) / box.width) * 100}%`);
      card.style.setProperty('--my', `${((event.clientY - box.top) / box.height) * 100}%`);
    });
    hang.addEventListener('pointerenter', () => { hovering += 1; });
    hang.addEventListener('pointerleave', () => { hovering = Math.max(0, hovering - 1); });
    card.append(button, panel);
    hang.append(hanger(), card);
    list.append(hang);
    return { hang, card, button, panel, back, angle: 0, spin: 0 };
  });

  rail.append(conveyor, list);
  rail.classList.toggle('is-riding', riding);
  section.append(head, rail);
  section.hidden = false;

  // How far along the loop a ticket is, with 0 just off the left of the screen.
  const loopPosition = (index) => (((belt + index * spacing) % loop) + loop) % loop;
  const beltLeft = (index) => loopPosition(index) - closedWidth - OFFSCREEN - railLeft;

  function placeRiding(item, index) {
    item.hang.style.transform = `translate3d(${beltLeft(index).toFixed(1)}px, 0, 0) rotate(${item.angle.toFixed(2)}deg)`;
  }

  function tick(time) {
    frame = 0;
    if (!riding || !visible || document.hidden) {
      lastTime = 0;
      return;
    }
    frame = requestAnimationFrame(tick);
    const dt = Math.min(0.05, lastTime ? (time - lastTime) / 1000 : 1 / 60);
    lastTime = time;

    const wanted = hovering || focusHeld ? 0 : BELT_SPEED;
    speed += (wanted - speed) * (1 - Math.exp(-dt * 5));
    belt += speed * dt;
    if (goal !== null) {
      const step = (goal - belt) * (1 - Math.exp(-dt * 6));
      belt += step;
      if (Math.abs(goal - belt) < 0.5) goal = null;
    }
    chain.style.transform = `translate3d(${((belt % CHAIN_TILE) - CHAIN_TILE).toFixed(1)}px, 0, 0)`;

    // Each ticket trails the chain a little and sways on a spring of its own.
    const moving = speed / BELT_SPEED;
    cards.forEach((item, index) => {
      const target = moving * (1.1 + Math.sin(time * 0.0011 + index * 1.7) * 1.5);
      item.spin += (-SPRING * (item.angle - target) - DAMPING * item.spin) * dt;
      item.angle += item.spin * dt;
      placeRiding(item, index);
    });
  }

  function wake() {
    if (!frame && riding && visible) frame = requestAnimationFrame(tick);
  }

  // Every position comes from the row's width, so opening and resizing share one layout.
  function layout() {
    const count = cards.length;
    const width = rail.clientWidth;
    const viewport = document.documentElement.clientWidth;
    railLeft = rail.getBoundingClientRect().left;
    closedWidth = Math.min(300, Math.max(230, (width - GAP * (count - 1)) / count));
    const closedHeight = Math.round(closedWidth * 1.28);
    loop = Math.max(viewport + closedWidth + OFFSCREEN * 2, count * (closedWidth + GAP * 2));
    spacing = loop / count;

    // Too narrow for a corner: the open ticket takes the whole row and the others step aside.
    const compact = width < 720;
    const others = count - 1;
    const cornerWidth = closedWidth * CORNER_SCALE + CORNER_STEP * (others - 1);
    const openWidth = compact ? width : width - cornerWidth - CORNER_GAP;
    const columns = Math.max(1, Math.floor((width + GAP) / (closedWidth + GAP)));
    rail.style.setProperty('--open-width', `${openWidth}px`);

    let bottom = 0;
    let cornerSlot = 0;
    cards.forEach((item, index) => {
      const { hang, card, panel } = item;
      const isOpen = index === open;
      const inCorner = open >= 0 && !isOpen;
      const cardWidth = isOpen ? openWidth : closedWidth;
      const cardHeight = isOpen ? panel.offsetHeight : closedHeight;
      const scale = inCorner ? CORNER_SCALE : 1;
      let left = 0;
      let top = 0;
      if (open < 0) {
        // With reduced motion the chain stays still and the tickets simply sit in rows.
        left = reduced ? (index % columns) * (closedWidth + GAP) : beltLeft(index);
        top = reduced ? Math.floor(index / columns) * (HANGER + closedHeight + GAP) : 0;
      } else if (inCorner) {
        // Scaling happens around the card's centre, so its visible left edge is further in.
        const visibleLeft = width - cornerWidth + cornerSlot * CORNER_STEP;
        left = visibleLeft - (closedWidth * (1 - CORNER_SCALE)) / 2;
        cornerSlot += 1;
      }

      hang.classList.toggle('is-open', isOpen);
      hang.classList.toggle('is-corner', inCorner);
      hang.classList.toggle('is-tucked', inCorner && compact);
      hang.style.width = `${cardWidth}px`;
      hang.style.zIndex = isOpen ? count + 1 : index + 1;
      hang.style.transform = `translate3d(${left.toFixed(1)}px, ${top}px, 0) rotate(${open < 0 ? item.angle.toFixed(2) : 0}deg) scale(${scale})`;
      card.style.height = `${cardHeight}px`;
      bottom = Math.max(bottom, top + (HANGER + cardHeight) * scale);
    });
    rail.style.height = `${Math.ceil(bottom) + 48}px`;
  }

  function setRiding(next) {
    riding = next && !reduced;
    rail.classList.toggle('is-riding', riding);
    wake();
  }

  function setOpen(index) {
    const previous = open;
    open = index;
    clearTimeout(settle);
    setRiding(false); // the tickets need their slide transitions while this happens
    cards.forEach(({ button, panel }, i) => {
      panel.inert = i !== index;
      button.tabIndex = i === index ? -1 : 0;
      button.setAttribute('aria-expanded', String(i === index));
    });
    layout();
    if (index >= 0) cards[index].back.focus({ preventScroll: true });
    else {
      if (previous >= 0) cards[previous].button.focus({ preventScroll: true });
      settle = setTimeout(() => setRiding(true), SETTLE_MS);
    }
    // A long card may have left the visitor below the top of the row.
    const top = rail.getBoundingClientRect().top;
    if (top < 0) window.scrollBy({ top: top - 80, behavior: 'smooth' });
  }

  section.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open >= 0) setOpen(-1);
  });

  // Tabbing to a ticket stops the chain and brings that ticket to the middle of the screen.
  list.addEventListener('focusin', (event) => {
    if (open >= 0 || reduced || !event.target.matches('.pcover:focus-visible')) return;
    focusHeld = true;
    const index = cards.findIndex(({ button }) => button === event.target);
    const centre = document.documentElement.clientWidth / 2 + closedWidth / 2 + OFFSCREEN;
    const wrapped = (((centre - loopPosition(index) + loop / 2) % loop) + loop) % loop;
    goal = belt + wrapped - loop / 2;
  });
  list.addEventListener('focusout', () => { focusHeld = false; });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    wake();
  }, { rootMargin: '100px 0px' }).observe(rail);
  document.addEventListener('visibilitychange', wake);
  new ResizeObserver(layout).observe(rail);
  document.fonts.ready.then(layout);
  layout();
}
