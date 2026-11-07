const START_DELAY_MS = 300;
const MS_PER_CHARACTER = 42;
const PAUSE_BETWEEN_LINES_MS = 260;
const HOLD_AFTER_TYPING_MS = 550;
const LONGEST_WAIT_MS = 9000; // never keep someone waiting on a slow-loading gate

// Types the welcome lines, then slides them up to the top of the screen, where they
// stay above the boarding gate. Clicking or pressing a key finishes the typing early.
export function playWelcome(gate, lines, gateReady) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const text = gate.querySelector('.welcome-text');
  text.setAttribute('aria-label', lines.join(' '));

  // The untyped letters are laid out but invisible, so the text never shifts as it types.
  const rows = lines.map((line) => {
    const row = document.createElement('span');
    row.className = 'welcome-line';
    row.setAttribute('aria-hidden', 'true');
    const typed = document.createElement('span');
    const rest = document.createElement('span');
    rest.className = 'welcome-rest';
    rest.textContent = line;
    row.append(typed, rest);
    text.append(row);
    return { line, typed, rest };
  });
  const caret = document.createElement('span');
  caret.className = 'welcome-caret';

  let typingDone = false;
  let gateIsReady = false;
  let docked = false;
  let timer = 0;

  function dock() {
    if (docked) return;
    docked = true;
    clearTimeout(timer);
    caret.remove();
    for (const { line, typed, rest } of rows) {
      typed.textContent = line;
      rest.textContent = '';
    }
    gate.classList.remove('is-intro');
  }

  const dockIfReady = () => {
    if (typingDone && gateIsReady) dock();
  };

  function finishTyping() {
    if (typingDone) return;
    typingDone = true;
    clearTimeout(timer);
    for (const { line, typed, rest } of rows) {
      typed.textContent = line;
      rest.textContent = '';
    }
    rows.at(-1).typed.after(caret);
    timer = setTimeout(dockIfReady, HOLD_AFTER_TYPING_MS);
  }

  function typeFrom(rowIndex, characters) {
    const row = rows[rowIndex];
    row.typed.textContent = row.line.slice(0, characters);
    row.rest.textContent = row.line.slice(characters);
    row.typed.after(caret);
    if (characters < row.line.length) {
      timer = setTimeout(() => typeFrom(rowIndex, characters + 1), MS_PER_CHARACTER);
    } else if (rowIndex < rows.length - 1) {
      timer = setTimeout(() => typeFrom(rowIndex + 1, 0), PAUSE_BETWEEN_LINES_MS);
    } else {
      finishTyping();
    }
  }

  const settled = () => {
    gateIsReady = true;
    dockIfReady();
  };
  gateReady.then(settled, settled);
  setTimeout(dock, LONGEST_WAIT_MS);

  if (reduced) {
    finishTyping();
  } else {
    timer = setTimeout(() => typeFrom(0, 0), START_DELAY_MS);
    gate.addEventListener('pointerdown', finishTyping, { once: true });
    window.addEventListener('keydown', finishTyping, { once: true });
  }
}
