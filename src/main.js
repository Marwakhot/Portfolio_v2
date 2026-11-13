import '@fontsource-variable/geist/wght.css';
import '@fontsource/young-serif/400.css';
import './style.css';
import './card/holo.css';
import './journey/journey.css';
import './circuit/circuit.css';
import './events/carousel.css';
import './contact/contact.css';
import { contact, content, card } from './config.js';
import { createCard } from './card/card.js';
import { showJourney } from './journey/journey.js';
import { createCircuit } from './circuit/circuit.js';
import { createCarousel } from './events/carousel.js';
import { createContact } from './contact/contact.js';

const $ = (selector) => document.querySelector(selector);

function renderCopy() {
  const fullName = `${content.firstName} ${content.lastName}`;
  document.title = fullName;
  $('.first').textContent = content.firstName;
  $('.last').textContent = content.lastName;
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
}

function start() {
  renderCopy();

  window.scrollTo(0, 0);
  // The card carries the whole page: experience, then the hackathons beside it, then the projects
  // circuit inside its chip, then its back, to reach out.
  showJourney($('.journey'), createCard(card), createCircuit(), createCarousel(), createContact());
}

history.scrollRestoration = 'manual';
start();
