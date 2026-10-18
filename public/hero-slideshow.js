(() => {
  const carousel = document.querySelector('[data-hero-slideshow]');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('.hero-slide')];
  const dots = [...carousel.querySelectorAll('.hero-photo-dot')];
  const playback = carousel.querySelector('.hero-photo-playback');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, timer, request = 0, pointerPlaybackState = null;
  let paused = reduced.matches, interactionPaused = false, hovered = false, visible = true;
  const canPlay = () => !paused && !interactionPaused && !hovered && visible && !document.hidden;
  function schedule() {
    clearTimeout(timer);
    playback.textContent = paused || interactionPaused ? 'Play slideshow' : 'Pause slideshow';
    carousel.dataset.playing = String(canPlay());
    if (canPlay()) timer = setTimeout(() => show(current + 1, false), 6000);
  }
  async function show(index, manual) {
    clearTimeout(timer);
    const target = (index + slides.length) % slides.length;
    const latest = ++request;
    if (manual) paused = true;
    const image = slides[target].querySelector('img');
    image.loading = 'eager';
    try { await image.decode(); }
    catch { if (latest === request) schedule(); return; }
    if (latest !== request) return;
    // An offscreen or hidden tab must not advance after an asynchronous image load.
    if (!manual && !canPlay()) { schedule(); return; }
    current = target;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === current);
      slide.setAttribute('aria-hidden', String(i !== current));
      dots[i].setAttribute('aria-pressed', String(i === current));
    });
    carousel.dataset.activeIndex = String(current);
    carousel.querySelector('.hero-photo-caption').textContent = slides[current].dataset.caption;
    carousel.querySelector('.hero-photo-credit').textContent = slides[current].dataset.credit || 'Blank Slate Entertainment';
    carousel.querySelector('.hero-photo-count').textContent = (current + 1) + ' / ' + slides.length;
    if (manual) carousel.querySelector('.hero-photo-announcement').textContent = 'Photograph ' + (current + 1) + ' of ' + slides.length + ': ' + slides[current].dataset.caption;
    schedule();
  }
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i, true)));
  playback.addEventListener('pointerdown', () => { pointerPlaybackState = paused || interactionPaused; });
  playback.addEventListener('pointercancel', () => { pointerPlaybackState = null; });
  playback.addEventListener('click', () => {
    paused = !(pointerPlaybackState ?? (paused || interactionPaused));
    pointerPlaybackState = null;
    interactionPaused = false;
    schedule();
  });
  carousel.addEventListener('focusin', () => { interactionPaused = true; schedule(); });
  carousel.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + slides.length) % slides.length;
    dots[target].focus();
    show(target, true);
  });
  carousel.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = true; schedule(); } });
  carousel.addEventListener('pointerleave', () => { hovered = false; schedule(); });
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => { if (reduced.matches) paused = true; schedule(); });
  new IntersectionObserver(entries => { visible = entries[0].intersectionRatio >= .35; schedule(); }, {threshold: [0, .35]}).observe(carousel);
  carousel.dataset.activeIndex = '0';
  carousel.querySelector('.hero-photo-controls').hidden = false;
  schedule();
})();
