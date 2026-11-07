const EASE = 0.12;
const READING_LINE = 0.45; // how far down the screen a job counts as reached

// The plane flies down the line as you scroll, lighting each stop as it reaches it. Past the
// last job it carries on through the sections below, to the tiny stops by their headings.
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

  function measure() {
    const top = line.getBoundingClientRect().top;
    const centre = (node) => {
      const box = node.getBoundingClientRect();
      return box.top + box.height / 2 - top;
    };
    waypoints = [...document.querySelectorAll('.way-dot')].map((node) => ({ node, y: centre(node), lit: node.classList.contains('is-lit') }));
    length = Math.max(1, waypoints.at(-1)?.y ?? outro.getBoundingClientRect().top - top);
    line.style.height = `${length}px`;
    stops = dots.map((node) => {
      const box = node.getBoundingClientRect();
      return { node, entry: node.closest('.tl-entry'), y: box.top + box.height / 2 - top, lit: node.classList.contains('is-lit') };
    });
  }

  function paint() {
    frame = 0;
    const gap = target - shown;
    shown = Math.abs(gap) < 0.2 ? target : shown + gap * EASE;
    line.style.setProperty('--head', `${shown.toFixed(1)}px`);
    for (const stop of [...stops, ...waypoints]) {
      const isLit = stop.y <= shown;
      if (isLit !== stop.lit) {
        stop.lit = isLit;
        stop.node.classList.toggle('is-lit', isLit);
      }
    }
    if (shown !== target) frame = requestAnimationFrame(paint);
  }

  function update() {
    const head = window.innerHeight * READING_LINE - line.getBoundingClientRect().top;
    target = Math.min(length, Math.max(0, head));
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
