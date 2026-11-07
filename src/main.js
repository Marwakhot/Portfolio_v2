import '@fontsource-variable/geist/wght.css';
import './style.css';
import './gate/gate.css';
import './journey/journey.css';
import './events/events.css';
import './projects/projects.css';
import './flight/flight.css';
import { createFlight } from './flight/flight.js';
import { content, card, journey } from './config.js';
import { drawArtwork, drawJobArtworks } from './artwork.js';
import { setUpGate } from './gate/setup.js';
import { playWelcome } from './gate/welcome.js';
import { showJourney } from './journey/journey.js';
import { showEvents } from './events/events.js';
import { showProjects } from './projects/projects.js';

const $ = (selector) => document.querySelector(selector);

function setLines(element, lines) {
  lines.forEach((line, index) => {
    if (index) element.append(document.createElement('br'));
    element.append(line);
  });
}

function moreLink() {
  const link = document.createElement('a');
  link.className = 'more';
  link.href = content.moreHref;
  link.textContent = '[more]';
  return link;
}

function renderCopy() {
  const fullName = `${content.firstName} ${content.lastName}`;
  document.title = fullName;
  setLines($('.intro'), content.intro);
  $('.intro').append(' ', moreLink());
  setLines($('.education'), content.education);
  $('.first').textContent = content.firstName;
  $('.last').textContent = content.lastName;
  $('.lead').textContent = content.lead;
  $('.cruising-left').textContent = content.cruising[0];
  $('.cruising-right').textContent = content.cruising[1];
  $('.meta').append(content.meta, ' ', moreLink());
  $('.badge canvas').setAttribute('aria-label', `${fullName}'s interactive badge. Drag to move it.`);
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
    showStop(badgeState.stop);
    if (badgeState.popped) badgeState.scene.pop();
  } catch (error) {
    console.error('Badge could not start:', error);
    artwork.className = 'fallback';
    $('.badge canvas').replaceWith(artwork);
  }
}

// Drops the card in once its white page has scrolled up far enough to be seen.
function popCardWhenSeen() {
  new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    $('.badge').classList.add('is-in');
    badgeState.popped = true;
    badgeState.scene?.pop();
  }, { threshold: 0.45 }).observe($('.hero'));
}

// The order a visitor sees: welcome, boarding gate, swipe, then the ID page.
function start() {
  renderCopy();
  const flight = createFlight();
  const artworkReady = prepareHero();
  const sceneModule = import('./badge/scene.js');
  sceneModule.catch(() => {}); // reported when the hero starts

  const gateReady = setUpGate($('.gate'), {
    // Everything is set up under the gate, so the slide reveals a finished page.
    onEnter() {
      $('main').inert = false;
      window.scrollTo(0, 0);
      showJourney($('.journey'), showStop);
      popCardWhenSeen();
      showEvents($('.events'));
      showProjects($('.projects'));
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
