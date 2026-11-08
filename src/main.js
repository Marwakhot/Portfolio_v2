import '@fontsource-variable/geist/wght.css';
import '@fontsource/young-serif/400.css';
import './style.css';
import './gate/gate.css';
import './journey/journey.css';
import './events/events.css';
import './projects/projects.css';
import './projects/baggage.css';
import './flight/flight.css';
import './landing/landing.css';
import { createFlight } from './flight/flight.js';
import { contact, content, card, journey } from './config.js';
import { drawArtwork, drawJobArtworks } from './artwork.js';
import { setUpGate } from './gate/setup.js';
import { playWelcome } from './gate/welcome.js';
import { showJourney } from './journey/journey.js';
import { showEvents } from './events/events.js';
import { showProjects } from './projects/projects.js';
import { showArrivals, showLanding } from './landing/landing.js';

const $ = (selector) => document.querySelector(selector);

function renderCopy() {
  const fullName = `${content.firstName} ${content.lastName}`;
  document.title = fullName;
  $('.first').textContent = content.firstName;
  $('.last').textContent = content.lastName;
  $('.hero-line').textContent = content.line;
  $('.hero-class').textContent = content.classOf;
  const links = [
    ['LinkedIn', contact.linkedin],
    ['GitHub', contact.github],
    ['Email', `mailto:${contact.email}`],
    [contact.phone, contact.phoneHref],
  ];
  $('.hero-links').append(...links.map(([label, href]) => {
    const link = document.createElement('a');
    link.textContent = label;
    link.href = href;
    if (href.startsWith('http')) {
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
    }
    return link;
  }));
  $('.cruising-left').textContent = content.cruising[0];
  $('.cruising-right').textContent = content.cruising[1];
  $('.badge canvas').setAttribute('aria-label', `${fullName}'s interactive badge. Drag to move it.`);
}

// The big name runs edge to edge, whatever the screen width.
function fitName() {
  const name = $('h1');
  const hero = $('.hero');
  const { paddingLeft, paddingRight } = getComputedStyle(hero);
  const room = hero.clientWidth - parseFloat(paddingLeft) - parseFloat(paddingRight);
  name.style.fontSize = '100px';
  name.style.fontSize = `${(100 * room * 0.98) / name.getBoundingClientRect().width}px`;
}

// Gets the ID page ready behind the gate, without starting it.
async function prepareHero() {
  await document.fonts.load('600 100px "Geist Variable"');
  return drawArtwork(content, card);
}

// The card follows the visitor down the timeline, printed with whichever job they've reached.
const badgeState = { scene: null, general: null, jobs: [], stop: -1, popped: false };

function showStop(index) {
  badgeState.stop = index;
  const next = index < 0 ? badgeState.general : badgeState.jobs[index];
  if (next) badgeState.scene?.setArtwork(next);
}

// Called after the swipe. The card stays hidden until the visitor reaches it.
async function startHero(artworkReady, sceneModule) {
  const artwork = await artworkReady;
  try {
    const { createBadgeScene } = await sceneModule;
    badgeState.general = artwork;
    badgeState.jobs = drawJobArtworks(content, card, journey.experience);
    badgeState.scene = await createBadgeScene($('.badge canvas'), artwork);
    badgeState.updateSide?.();
    showStop(badgeState.stop);
    if (badgeState.popped) badgeState.scene.pop();
  } catch (error) {
    console.error('Badge could not start:', error);
    artwork.className = 'fallback';
    $('.badge canvas').replaceWith(artwork);
  }
}

// The card hangs in the middle of the first screen, then moves right as the timeline arrives.
function moveCardWithScroll() {
  const hero = $('.hero');
  const update = () => {
    const box = hero.getBoundingClientRect();
    const moved = Math.min(1, Math.max(0, -box.top / (box.height * 0.7)));
    badgeState.scene?.setSide(moved * moved * (3 - 2 * moved));
  };
  window.addEventListener('scroll', update, { passive: true });
  badgeState.updateSide = update;
}

// Drops the card in once its white page has scrolled up far enough to be seen.
function dropCard() {
  if (badgeState.popped) return;
  $('.badge').classList.add('is-in');
  badgeState.popped = true;
  badgeState.scene?.pop();
}

function popCardWhenSeen() {
  new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    dropCard();
  }, { threshold: 0.45 }).observe($('.hero'));
}

// Jumps past the take-off and the first screen, straight to the timeline.
function skipToExperience() {
  dropCard();
  window.scrollTo({ top: $('.journey').getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
}

// The order a visitor sees: welcome, boarding gate, swipe, then the ID page.
function start() {
  renderCopy();
  document.fonts.load('400 100px "Young Serif"').then(fitName);
  window.addEventListener('resize', fitName);
  const flight = createFlight();
  $('.cabin-skip').addEventListener('click', skipToExperience);
  const artworkReady = prepareHero();
  const sceneModule = import('./badge/scene.js');
  sceneModule.catch(() => {}); // reported when the hero starts

  const gateReady = setUpGate($('.gate'), {
    // Everything is set up under the gate, so the slide reveals a finished page.
    async onEnter() {
      $('main').inert = false;
      window.scrollTo(0, 0);
      // One section per frame, so building the page never freezes the screen in one go.
      const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
      showJourney($('.journey'), showStop);
      popCardWhenSeen();
      moveCardWithScroll();
      await nextFrame();
      showEvents($('.events'));
      await nextFrame();
      showProjects($('.projects'));
      await nextFrame();
      showArrivals($('.arrivals'));
      showLanding($('.landing'));
      await nextFrame();
      return startHero(artworkReady, sceneModule);
    },
    onGone() {
      document.documentElement.classList.remove('is-boarding');
      flight.openShade();
    },
  });
  playWelcome($('.gate'), content.welcome, gateReady);
}

history.scrollRestoration = 'manual';
start();
