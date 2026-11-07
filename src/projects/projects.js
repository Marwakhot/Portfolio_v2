import { projectFields, projectsSection } from '../config.js';

// One string of hanging cards, one card per field. Opening a card widens it to hold every
// project in that field, and the other cards slide along the string into the corner.
const SAG = 26; // how far the string dips in the middle, in pixels
const STRING_OVERHANG = 4; // how far the string runs past the row at each end, in percent
const GAP = 28;
const DROPS = [0, 64, 30, 52]; // how far below the string each card hangs
const TILTS = [-2.2, 1.4, -1, 1.8];
const STEM = 34;
const CLIP = 10;
const CORNER_SCALE = 0.5;
const CORNER_STEP = 62; // the space between cards bunched up in the corner
const CORNER_GAP = 28; // between the open card and the corner

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

function string() {
  const line = svg('svg', { class: 'pstring', viewBox: '0 0 100 60', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  svg('path', { d: `M0 0Q50 ${SAG * 2} 100 0`, 'vector-effect': 'non-scaling-stroke' }, line);
  return line;
}

// How far the string has dipped at this point across the row (0 to 1).
function stringDrop(across) {
  const along = (across * 100 + STRING_OVERHANG) / (100 + STRING_OVERHANG * 2);
  return 4 * along * (1 - along) * SAG;
}

function cover(field, index) {
  const button = el('button', 'pcover');
  button.type = 'button';
  const head = el('span', 'pcover-head');
  head.append(el('span', '', `#${pad(index)}`), el('span', '', projectCount(field.projects.length)));
  const titles = el('span', 'pcover-titles');
  titles.append(...field.projects.map((project) => el('span', '', project.title)));
  const foot = el('span', 'pcover-foot');
  foot.append(el('span', '', 'Open'), el('span', 'pcover-arrow', '↗'));
  button.append(head, el('span', 'pcover-name', field.name), titles, foot);
  return button;
}

function projectDetail(project) {
  const item = el('article', 'pproject');
  item.append(el('h4', 'pproject-title', project.title), el('p', 'pproject-summary', project.summary), el('p', 'pproject-about', project.about));
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
  head.append(el('span', 'pdetail-count', `#${pad(index)} · ${projectCount(field.projects.length)}`), el('h3', 'pdetail-name', field.name));
  const list = el('div', 'pdetail-list');
  list.append(...field.projects.map(projectDetail));
  panel.append(back, head, list);
  return { panel, back };
}

export function showProjects(section) {
  if (!projectFields.length) return;

  const head = el('header', 'projects-head');
  const row = el('div', 'way-row');
  row.append(el('span', 'way-dot'), el('h2', 'projects-title', projectsSection.heading));
  head.append(row, el('p', 'projects-intro', projectsSection.intro));

  const rail = el('div', 'prail');
  const list = el('ol', 'pcards');
  let open = -1;

  const cards = projectFields.map((field, index) => {
    const hang = el('li', 'phang');
    const card = el('div', 'pcard');
    const button = cover(field, index);
    const { panel, back } = detail(field, index, () => setOpen(-1));
    button.addEventListener('click', () => setOpen(index));
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${((event.clientX - box.left) / box.width) * 100}%`);
      card.style.setProperty('--my', `${((event.clientY - box.top) / box.height) * 100}%`);
    });
    card.append(button, panel);
    hang.append(el('span', 'ppin'), el('span', 'pstem'), el('span', 'pclip'), card);
    list.append(hang);
    return { hang, card, button, panel, back };
  });

  rail.append(string(), list);
  section.append(head, rail);
  section.hidden = false;

  // Every position comes from the row's width, so opening and resizing share one layout.
  function layout() {
    const count = cards.length;
    const width = rail.clientWidth;
    const closedWidth = (width - GAP * (count - 1)) / count;
    const closedHeight = Math.round(closedWidth * 1.2);
    const others = count - 1;
    const cornerWidth = closedWidth * CORNER_SCALE + CORNER_STEP * (others - 1);
    const openWidth = width - cornerWidth - CORNER_GAP;
    rail.style.setProperty('--open-width', `${openWidth}px`);

    let bottom = 0;
    let cornerSlot = 0;
    cards.forEach(({ hang, card, panel }, index) => {
      const isOpen = index === open;
      const inCorner = open >= 0 && !isOpen;
      const cardWidth = isOpen ? openWidth : closedWidth;
      const cardHeight = isOpen ? panel.offsetHeight : closedHeight;
      const scale = inCorner ? CORNER_SCALE : 1;
      const dropBelow = open >= 0 ? 0 : DROPS[index % DROPS.length];
      let left = index * (closedWidth + GAP);
      if (isOpen) left = 0;
      if (inCorner) {
        // Scaling happens around the card's centre, so its visible left edge is further in.
        const visibleLeft = width - cornerWidth + cornerSlot * CORNER_STEP;
        left = visibleLeft - (closedWidth * (1 - CORNER_SCALE)) / 2;
        cornerSlot += 1;
      }
      const top = stringDrop((left + cardWidth / 2) / width);

      hang.classList.toggle('is-open', isOpen);
      hang.classList.toggle('is-corner', inCorner);
      hang.style.width = `${cardWidth}px`;
      hang.style.zIndex = isOpen ? count + 1 : index + 1;
      hang.style.setProperty('--drop', `${dropBelow}px`);
      hang.style.setProperty('--tilt', `${isOpen ? 0 : TILTS[index % TILTS.length]}deg`);
      hang.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px) rotate(var(--swing, var(--tilt))) scale(${scale})`;
      card.style.height = `${cardHeight}px`;
      bottom = Math.max(bottom, top + (STEM + dropBelow + CLIP + cardHeight) * scale);
    });
    rail.style.height = `${Math.ceil(bottom) + 48}px`;
  }

  function setOpen(index) {
    const previous = open;
    open = index;
    cards.forEach(({ button, panel }, i) => {
      panel.inert = i !== index;
      button.tabIndex = i === index ? -1 : 0;
      button.setAttribute('aria-expanded', String(i === index));
    });
    layout();
    if (index >= 0) cards[index].back.focus({ preventScroll: true });
    else if (previous >= 0) cards[previous].button.focus({ preventScroll: true });
    // A long card may have left the visitor below the top of the row.
    const top = rail.getBoundingClientRect().top;
    if (top < 0) window.scrollBy({ top: top - 80, behavior: 'smooth' });
  }

  section.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open >= 0) setOpen(-1);
  });
  new ResizeObserver(layout).observe(rail);
  document.fonts.ready.then(layout);
  layout();
}
