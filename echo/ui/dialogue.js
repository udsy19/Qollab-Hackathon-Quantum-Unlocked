// Captioned dialogue (vision §6.2): speaker name, at most 2 lines per page, optional reveal,
// immediate skip to the full caption. A beat too long for 2 lines is split into pages at sentence
// boundaries, measured in the live layout so it holds at every text scale; only a single sentence
// longer than 2 lines is split between words.
import { el, displayKets } from './accessibility.js';

const MAX_LINES = 2;
// A word that closes a sentence: . ? ! or …, then any closing quotes or brackets.
const SENTENCE_END = /[.?!…]["'”’)\]]*$/;
const REVEAL_CHARS_PER_SECOND = 60;

export function mountDialogue(root) {
  const box = el('section', 'echo-dialogue');
  box.setAttribute('aria-label', 'Dialogue');
  box.dataset.visible = 'false';
  const speaker = el('p', 'echo-dialogue__speaker');
  const text = el('p', 'echo-dialogue__text');
  // Screen readers get each page once, whole; the revealing text is visual only.
  text.setAttribute('aria-hidden', 'true');
  const live = el('p', 'echo-sr-only');
  live.setAttribute('aria-live', 'polite');
  const footer = el('div', 'echo-dialogue__footer');
  const pageInfo = el('span', 'echo-dialogue__page');
  const next = el('button', 'echo-dialogue__next echo-button');
  next.type = 'button';
  next.innerHTML = '<kbd class="echo-key">Enter</kbd> <span>Continue</span>';
  footer.append(pageInfo, next);
  box.append(speaker, text, live, footer);
  root.append(box);

  let queue = [];
  let beat = null;
  let words = [];
  let pageStart = 0;
  let pageEnd = 0;
  let pageText = '';
  let revealed = 0;
  let revealTimer = 0;
  let resolveDone = null;
  // Timed mode (the opening): pages advance themselves after `auto(pageText)` ms and the keys and
  // Continue button stand down, so a cinematic's clock, not the reader, moves the captions.
  let auto = null;
  let autoTimer = 0;

  const reducedMotion = () => root.closest('[data-reduced-motion="on"]') !== null;

  function linesOf(node) {
    const lh = parseFloat(getComputedStyle(node).lineHeight);
    return Math.round(node.scrollHeight / lh);
  }

  // Longest run of words from `start` that fits in MAX_LINES of the live text box, pulled back to
  // the last sentence end inside it when there is one. A single word longer than the box still
  // gets its own page (CSS breaks it).
  function measurePage(start) {
    let end = start + 1;
    while (end < words.length) {
      text.textContent = words.slice(start, end + 1).join(' ');
      if (linesOf(text) > MAX_LINES) break;
      end += 1;
    }
    if (end < words.length && !SENTENCE_END.test(words[end - 1])) {
      for (let k = end - 1; k > start; k -= 1) {
        if (SENTENCE_END.test(words[k - 1])) return k;
      }
    }
    return end;
  }

  function countPages() {
    let n = 0;
    let i = 0;
    let current = 0;
    while (i < words.length) {
      if (i === pageStart) current = n + 1;
      i = measurePage(i);
      n += 1;
    }
    return { n, current };
  }

  function stopReveal() {
    clearTimeout(revealTimer);
    revealTimer = 0;
    clearTimeout(autoTimer);
    autoTimer = 0;
  }

  function scheduleAuto() {
    if (auto) autoTimer = setTimeout(() => api.advance(), auto(pageText));
  }

  function renderPage() {
    stopReveal();
    pageEnd = measurePage(pageStart);
    pageText = words.slice(pageStart, pageEnd).join(' ');
    const { n, current } = countPages();
    pageInfo.textContent = n > 1 ? `${current}/${n}` : '';
    live.textContent = `${beat.speaker}: ${pageText}`;
    if (reducedMotion() || beat.reveal === false) {
      revealed = pageText.length;
      text.textContent = pageText;
      scheduleAuto();
      return;
    }
    revealed = 0;
    text.textContent = '';
    const step = () => {
      revealed = Math.min(pageText.length, revealed + 2);
      text.textContent = pageText.slice(0, revealed);
      if (revealed < pageText.length) revealTimer = setTimeout(step, 2000 / REVEAL_CHARS_PER_SECOND);
      else {
        revealTimer = 0;
        scheduleAuto();
      }
    };
    step();
  }

  function startBeat(next) {
    beat = next;
    words = displayKets(beat.text).trim().split(/\s+/).filter(Boolean);
    pageStart = 0;
    speaker.textContent = beat.speaker;
    box.dataset.speaker = String(beat.speaker).toLowerCase();
    box.dataset.auto = auto ? 'true' : 'false';
    box.dataset.visible = 'true';
    renderPage();
  }

  function finish() {
    stopReveal();
    beat = null;
    box.dataset.visible = 'false';
    live.textContent = '';
    const done = resolveDone;
    resolveDone = null;
    if (done) done();
  }

  const api = {
    element: box,
    get active() {
      return beat !== null;
    },
    // Plays beats [{speaker, text, reveal?}] in order; resolves after the last page is advanced.
    // `options.auto(pageText) -> ms` switches on timed mode (see above).
    play(beats, options = {}) {
      if (resolveDone) resolveDone();
      auto = typeof options.auto === 'function' ? options.auto : null;
      queue = [...beats];
      return new Promise((resolve) => {
        resolveDone = resolve;
        if (queue.length === 0) finish();
        else startBeat(queue.shift());
      });
    },
    // First press completes a revealing page; the next press moves on.
    advance() {
      if (!beat) return;
      if (revealed < pageText.length) {
        api.skip();
        return;
      }
      if (pageEnd < words.length) {
        pageStart = pageEnd;
        renderPage();
      } else if (queue.length > 0) {
        startBeat(queue.shift());
      } else {
        finish();
      }
    },
    skip() {
      if (!beat) return;
      stopReveal();
      revealed = pageText.length;
      text.textContent = pageText;
    },
    // Re-measure the current page, e.g. after the text scale changes.
    relayout() {
      if (beat) renderPage();
    },
    clear() {
      queue = [];
      finish();
    },
    destroy() {
      api.clear();
      document.removeEventListener('keydown', onKey);
      resizer.disconnect();
      box.remove();
    },
  };

  next.addEventListener('click', () => api.advance());

  // Enter/Space advance only when focus is not on another control and no one handled the key,
  // so menus and terminals keep their own Enter.
  function onKey(event) {
    if (!beat || auto || event.defaultPrevented) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const active = document.activeElement;
    const free = !active || active === document.body || active === next;
    if (!free || root.closest('[data-menu-open="true"]')) return;
    event.preventDefault();
    api.advance();
  }
  document.addEventListener('keydown', onKey);

  // Width or font size changes re-paginate; height changes from the reveal itself do not.
  let lastKey = '';
  const resizer = new ResizeObserver(() => {
    const key = `${text.clientWidth}/${getComputedStyle(text).fontSize}`;
    if (key !== lastKey) {
      lastKey = key;
      api.relayout();
    }
  });
  resizer.observe(text);

  return api;
}
