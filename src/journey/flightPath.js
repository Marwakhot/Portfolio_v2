const FOLLOW = 16; // higher follows the scroll more tightly
const READING_LINE = 0.45; // how far down the screen a job counts as reached
const CATCH_UP = 0.5; // screens of scrolling the plane takes to rejoin the reading line after parking

// The plane flies down the line as you scroll, lighting each stop as it reaches it. Past the
// last job it carries on through the sections below, to the tiny stops by their headings.
// It parks on the events dot while that section is pinned, then flies on to the next stop.
// onStopChange gets the index of the job reached, or -1 before the first one.
export function startFlightPath(track, outro, onStopChange) {
  const line = track.querySelector('.flight-line');
  const dots = [...track.querySelectorAll('.tl-dot')];

  let length = 0;
  let stops = [];
  let waypoints = [];
  let shown = 0;
  let target = 0;
  let frame = 0;
  let active = -1;
  let park = null;
  let holding = false;
  let lastPaint = 0;

  function measure() {
    const top = line.getBoundingClientRect().top;
    const pin = document.querySelector('.events-pin');
    // A stop inside the pinned section is measured from where it sits before the pin starts.
    const unpinned = pin ? pin.parentElement.getBoundingClientRect().top - pin.getBoundingClientRect().top : 0;
    const centre = (node) => {
      const box = node.getBoundingClientRect();
      return box.top + box.height / 2 - top + (pin?.contains(node) ? unpinned : 0);
    };
    const parkDot = pin?.querySelector('.way-dot');
    park = parkDot
      ? { run: pin.parentElement, plane: pin.querySelector('.way-plane'), y: centre(parkDot), travel: pin.parentElement.offsetHeight - pin.offsetHeight }
      : null;
    waypoints = [...document.querySelectorAll('.way-dot')].map((node) => ({ node, y: centre(node), lit: node.classList.contains('is-lit') }));
    length = Math.max(1, waypoints.at(-1)?.y ?? outro.getBoundingClientRect().top - top);
    line.style.height = `${length}px`;
    stops = dots.map((node) => {
      const box = node.getBoundingClientRect();
      return { node, entry: node.closest('.tl-entry'), y: box.top + box.height / 2 - top, lit: node.classList.contains('is-lit') };
    });
  }

  // Where the plane should be, given how far the reading line has come.
  function flown(reading) {
    holding = false;
    if (!park || reading < park.y) return reading;
    const scrolled = -park.run.getBoundingClientRect().top;
    if (scrolled < park.travel) {
      holding = scrolled > 0;
      return park.y + Math.max(0, scrolled);
    }
    const released = park.y + park.travel;
    const past = scrolled - park.travel;
    const behind = Math.max(0, reading - released - past);
    return Math.min(reading, released + past * (1 + behind / (window.innerHeight * CATCH_UP)));
  }

  function paint(time) {
    frame = 0;
    const dt = Math.min(0.05, lastPaint ? (time - lastPaint) / 1000 : 1 / 60);
    lastPaint = time;
    const gap = target - shown;
    shown = holding || Math.abs(gap) < 0.2 ? target : shown + gap * (1 - Math.exp(-dt * FOLLOW));
    line.style.setProperty('--head', `${shown.toFixed(1)}px`);
    // While pinned, a copy of the plane inside the pinned section takes over so it can't jitter.
    line.classList.toggle('is-parked', holding);
    park?.plane.classList.toggle('is-on', holding);
    for (const stop of [...stops, ...waypoints]) {
      const isLit = stop.y <= shown;
      if (isLit !== stop.lit) {
        stop.lit = isLit;
        stop.node.classList.toggle('is-lit', isLit);
      }
    }
    if (shown !== target) frame = requestAnimationFrame(paint);
    else lastPaint = 0;
  }

  function update() {
    const head = window.innerHeight * READING_LINE - line.getBoundingClientRect().top;
    target = Math.min(length, Math.max(0, flown(head)));
    frame ||= requestAnimationFrame(paint);

    const reached = stops.findLastIndex((stop) => stop.y <= head);
    if (reached !== active) {
      stops[active]?.entry.classList.remove('is-active');
      stops[reached]?.entry.classList.add('is-active');
      active = reached;
      onStopChange(reached);
    }
  }

  function refresh() {
    measure();
    update();
  }

  // Entries slide in when revealed, so measure again once they've landed.
  track.addEventListener('animationend', (event) => {
    if (event.animationName === 'itemReveal' || event.animationName === 'itemRevealReduced') refresh();
  });
  window.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(refresh).observe(document.body); // the sections below can change the length
  document.fonts.ready.then(refresh);
  refresh();
}
