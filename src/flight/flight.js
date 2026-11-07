// The take-off: a jet window whose shade lifts, a scroll-driven push through the glass
// into the sky, the ID card over that sky, then clouds that fade to the white page.
const SHADE_OPEN_MS = 1700;
const SHADE_TRAVEL = 110; // percent of its height, which parks the shade behind the frame
const ZOOM_END = 0.85; // share of the pinned scroll spent pushing through the window
const MAX_ZOOM = 7; // the glass fills the screen by here
const SCROLL_DAMPING = 6; // higher follows the wheel more tightly

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smooth = (value) => value * value * (3 - 2 * value);

export function createFlight() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sky = document.querySelector('.sky');
  const photo = sky.querySelector('.sky-photo');
  const layers = [...sky.querySelectorAll('.cloud-layer')];
  const run = document.querySelector('.cabin-run');
  const cabin = run.querySelector('.cabin');
  const stage = cabin.querySelector('.jet-stage');
  const jet = cabin.querySelector('.jet');
  const lift = cabin.querySelector('.jet-lift');
  const copy = cabin.querySelector('.cabin-copy');
  const fade = document.querySelector('.sky-fade');

  let shadeStart = reduced ? -Infinity : Infinity;
  let shown = window.scrollY;
  let lastTime = 0;
  let frame = 0;

  function draw(scroll) {
    const height = window.innerHeight;
    const travel = run.offsetHeight - height;
    const p = clamp01(scroll / travel);
    const push = clamp01(p / ZOOM_END);
    const e = push ** 2.2;
    const after = Math.max(0, scroll - travel);

    // The shade lifts by itself on arrival; scrolling early hurries it along.
    const timed = clamp01((performance.now() - shadeStart) / SHADE_OPEN_MS);
    const open = Math.max(smooth(timed), smooth(clamp01(push * 4)));
    lift.style.transform = `translateY(${-open * SHADE_TRAVEL}%)`;

    jet.style.transform = `scale(${MAX_ZOOM ** e})`;
    stage.style.opacity = 1 - smooth(clamp01((push - 0.88) / 0.12));
    cabin.style.visibility = p >= 1 ? 'hidden' : 'visible';
    copy.style.opacity = timed >= 1 ? 1 - clamp01(push * 8) : 0;

    // Climbing: the sea of cloud in the photo rises into view.
    photo.style.transform = `translateY(${-(e * 0.35 * height + after * 0.12)}px) scale(${1 + e * 0.1})`;

    layers.forEach((layer, index) => {
      const depth = [0.15, 0.5, 1.7][index];
      const rise = after * [0.06, 0.14, 0.3][index];
      layer.style.transform = `translateY(${e * height * 0.1 * depth - rise}px) scale(${1 + e * depth})`;
    });
    // Only the far strip shows through the window; the near ones rush past during the push.
    layers[1].style.opacity = 0.7 * clamp01(e * 3);
    layers[2].style.opacity = Math.sin(Math.PI * clamp01(e));
  }

  const skyDone = () => window.scrollY > fade.offsetTop + fade.offsetHeight;

  function tick(time) {
    const dt = lastTime ? Math.min(0.1, (time - lastTime) / 1000) : 1 / 60;
    lastTime = time;
    const target = window.scrollY;
    shown += (target - shown) * (reduced ? 1 : 1 - Math.exp(-dt * SCROLL_DAMPING));
    if (Math.abs(target - shown) < 0.2) shown = target;
    draw(shown);

    const hidden = skyDone();
    sky.style.visibility = hidden ? 'hidden' : 'visible';
    const now = performance.now();
    const opening = now >= shadeStart && now - shadeStart < SHADE_OPEN_MS + 100;
    if ((shown !== target || opening) && !hidden) {
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
  wake();

  return {
    openShade() {
      if (!reduced) shadeStart = performance.now();
      wake();
    },
  };
}
