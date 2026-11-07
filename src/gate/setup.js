import { boardingPass, content } from '../config.js';

const HINT = 'Insert your boarding pass to continue.';
const GRANTED = 'Access granted';
const PAUSE_AFTER_SWIPE_MS = 800;
const DISSOLVE_MS = 1600; // matches the dissolve in gate.css
const DISSOLVE_SAFETY_MS = 1500; // in case the browser never reports the dissolve's end
const LONGEST_HERO_WAIT_MS = 4000;

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

// The site's opening screen. Starts the 3D gate straight away. On a swipe or a skip it
// gets the page ready underneath, then the whole screen dissolves to reveal it.
// Returns a promise that settles once the gate is ready to be seen.
export function setUpGate(section, { onEnter, onGone }) {
  const canvas = section.querySelector('.gate-canvas');
  const hint = section.querySelector('.gate-hint');
  const skip = section.querySelector('.gate-skip');
  let scene = null;
  let entered = false;

  hint.textContent = HINT;

  async function enter() {
    if (entered) return;
    entered = true;
    await Promise.race([onEnter(), new Promise((resolve) => setTimeout(resolve, LONGEST_HERO_WAIT_MS))]);
    // Let the page underneath draw its first frames, which is the slowest part, so
    // that work can't interrupt the dissolve.
    await nextFrame();
    await nextFrame();

    // Stops drawing, so the dissolve stays smooth; the last frame stays on screen.
    scene?.setVisible(false);

    let gone = false;
    const finish = () => {
      if (gone) return;
      gone = true;
      scene?.dispose();
      section.remove();
      onGone();
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }
    // Removed once the dissolve has really finished, not after a fixed time.
    section.addEventListener('transitionend', (event) => {
      if (event.target === section && event.propertyName === 'opacity') finish();
    });
    setTimeout(finish, DISSOLVE_MS + DISSOLVE_SAFETY_MS);
    section.classList.add('is-leaving');
  }

  function granted() {
    hint.textContent = GRANTED;
    hint.classList.remove('shimmer');
    setTimeout(enter, PAUSE_AFTER_SWIPE_MS);
  }

  skip.addEventListener('click', enter);

  async function start() {
    try {
      await Promise.all([
        document.fonts.load('62px DSEG14'),
        document.fonts.load('500 40px "Geist Variable"'),
      ]);
      const { createGateScene } = await import('./scene.js');
      if (entered) return;
      const created = await createGateScene(canvas, {
        pass: boardingPass,
        name: `${content.firstName} ${content.lastName}`,
        onGranted: granted,
      });
      if (entered) created.dispose();
      else scene = created;
    } catch (error) {
      // Without WebGL nobody could swipe, so don't lock them out of the site.
      console.error('Boarding gate could not start:', error);
      enter();
    }
  }

  return start();
}
