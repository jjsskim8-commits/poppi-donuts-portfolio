(() => {
  const root = document.querySelector('[data-poppi-slider]');
  if (!root) return;

  const phoneScreen = root.querySelector('[data-phone-screen]');
  const phoneTrack = root.querySelector('[data-phone-track]');
  const thumbTrack = root.querySelector('[data-thumb-track]');
  const prevBtn = document.querySelector('[data-phone-prev]');
  const nextBtn = document.querySelector('[data-phone-next]');
  const phoneDots = Array.from(document.querySelectorAll('[data-phone-dot]'));

  if (!phoneScreen || !phoneTrack || !thumbTrack) return;

  let active = 2;
  let phoneIndex = 0;
  let thumbIndex = 0;

  let slideCount = 5;
  let originalPhoneSlides = [];
  let originalThumbSlides = [];

  let isDragging = false;
  let startX = 0;
  let dragX = 0;

  const cloneSetCount = 5;
  const middleSet = cloneSetCount;
  const speed = 620;

  /* 자동 재생 설정 */
  const AUTOPLAY_DELAY = 4500;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let autoplayTimer = null;

  const mod = (value, length) => ((value % length) + length) % length;

  function buildInfiniteTracks() {
    originalPhoneSlides = Array.from(phoneTrack.children);
    originalThumbSlides = Array.from(thumbTrack.children);
    slideCount = originalPhoneSlides.length;

    phoneTrack.innerHTML = '';
    thumbTrack.innerHTML = '';

    /*
      핵심 수정:
      기존에는 휴대폰 트랙에 앞/뒤 clone 1장만 있어서 빠르게 이동하거나
      먼 카드 클릭 시 빈 영역까지 이동할 수 있었습니다.
      이제 휴대폰 트랙도 썸네일처럼 여러 세트를 복제해서
      어떤 방향으로 이동해도 흰 화면이 나오지 않습니다.
    */
    for (let set = 0; set < cloneSetCount * 2 + 1; set += 1) {
      originalPhoneSlides.forEach((slide) => {
        const clone = slide.cloneNode(true);
        clone.dataset.realIndex = slide.dataset.slideIndex;
        clone.dataset.setIndex = String(set);
        if (set !== middleSet) clone.classList.add('is-clone');
        phoneTrack.appendChild(clone);
      });

      originalThumbSlides.forEach((slide) => {
        const clone = slide.cloneNode(true);
        clone.dataset.realIndex = slide.dataset.slideIndex;
        clone.dataset.setIndex = String(set);
        if (set !== middleSet) clone.classList.add('is-clone');
        thumbTrack.appendChild(clone);
      });
    }

    phoneIndex = middleSet * slideCount + active;
    thumbIndex = middleSet * slideCount + active;
  }

  function getThumbStep() {
    const slide = thumbTrack.querySelector('.thumb-slide');
    if (!slide) return 0;

    const styles = getComputedStyle(thumbTrack);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;
    return slide.getBoundingClientRect().width + gap;
  }

  function setTransition(enabled) {
    phoneTrack.style.transitionDuration = enabled ? `${speed}ms` : '0ms';
    thumbTrack.style.transitionDuration = enabled ? `${speed}ms` : '0ms';
  }

  function setPosition(enabled = true, dragPercent = 0) {
    setTransition(enabled);

    const phoneX = `calc(${-phoneIndex * 100}% + ${dragPercent}%)`;
    phoneTrack.style.transform = `translate3d(${phoneX}, 0, 0)`;

    const thumbStep = getThumbStep();
    const stageWidth = root.getBoundingClientRect().width;
    const slide = thumbTrack.querySelector('.thumb-slide');
    const slideWidth = slide ? slide.getBoundingClientRect().width : 0;

    const centerOffset = (stageWidth / 2) - (slideWidth / 2);
    const dragPx = (dragPercent / 100) * (phoneScreen.clientWidth || 1);
    const thumbX = centerOffset - (thumbIndex * thumbStep) + dragPx;

    thumbTrack.style.transform = `translate3d(${thumbX}px, 0, 0)`;

    updateCenterHidden();
  }

  function updateCenterHidden() {
    Array.from(thumbTrack.children).forEach((slide, index) => {
      slide.classList.toggle('is-center-hidden', index === thumbIndex);
    });
    syncDots();
  }

  function syncDots() {
    if (!phoneDots.length) return;
    const real = mod(active, slideCount);
    phoneDots.forEach((dot, i) => {
      const isActive = i === real;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
      dot.tabIndex = isActive ? 0 : -1;
    });
  }

  function normalizeIfNeeded() {
    const safeStart = slideCount * 2;
    const safeEnd = slideCount * (cloneSetCount * 2 - 1);

    const real = mod(active, slideCount);

    if (phoneIndex < safeStart || phoneIndex > safeEnd || thumbIndex < safeStart || thumbIndex > safeEnd) {
      phoneIndex = middleSet * slideCount + real;
      thumbIndex = middleSet * slideCount + real;
      setPosition(false);
    }
  }

  function finishTransition() {
    normalizeIfNeeded();
  }

  function moveBy(step) {
    active = mod(active + step, slideCount);
    phoneIndex += step;
    thumbIndex += step;
    setPosition(true);
  }

  /* ---------- Autoplay (2s) ---------- */
  function startAutoplay() {
    if (prefersReducedMotion) return;
    stopAutoplay();
    autoplayTimer = setInterval(() => {
      if (isDragging) return;
      goNext();
    }, AUTOPLAY_DELAY);
  }

  function stopAutoplay() {
    if (autoplayTimer !== null) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function restartAutoplay() {
    stopAutoplay();
    startAutoplay();
  }

  function goNext() {
    moveBy(1);
  }

  function goPrev() {
    moveBy(-1);
  }

  function goTo(targetIndex) {
    targetIndex = mod(targetIndex, slideCount);
    if (targetIndex === active) return;

    const forward = mod(targetIndex - active, slideCount);
    const backward = mod(active - targetIndex, slideCount);
    const step = forward <= backward ? forward : -backward;

    active = targetIndex;
    phoneIndex += step;
    thumbIndex += step;

    setPosition(true);
  }

  function onDown(event) {
    isDragging = true;
    startX = event.clientX;
    dragX = 0;

    phoneScreen.classList.add('is-dragging');
    phoneTrack.classList.add('is-dragging');
    thumbTrack.classList.add('is-dragging');

    phoneScreen.setPointerCapture?.(event.pointerId);
    setTransition(false);
    stopAutoplay();
  }

  function onMove(event) {
    if (!isDragging) return;

    dragX = event.clientX - startX;
    const width = phoneScreen.clientWidth || 1;
    const dragPercent = (dragX / width) * 100;

    setPosition(false, dragPercent);
  }

  function onUp(event) {
    if (!isDragging) return;

    isDragging = false;

    phoneScreen.classList.remove('is-dragging');
    phoneTrack.classList.remove('is-dragging');
    thumbTrack.classList.remove('is-dragging');

    const threshold = Math.max(48, phoneScreen.clientWidth * 0.16);

    if (dragX < -threshold) {
      goNext();
    } else if (dragX > threshold) {
      goPrev();
    } else {
      setPosition(true);
    }

    phoneScreen.releasePointerCapture?.(event.pointerId);
    restartAutoplay();
  }

  thumbTrack.addEventListener('click', (event) => {
    const slide = event.target.closest('.thumb-slide');
    if (!slide) return;

    const targetIndex = Number(slide.dataset.realIndex ?? slide.dataset.slideIndex);
    if (!Number.isFinite(targetIndex)) return;

    goTo(targetIndex);
    restartAutoplay();
  });

  /* 좌/우 네비게이션 버튼 */
  if (prevBtn) prevBtn.addEventListener('click', () => {
    goPrev();
    restartAutoplay();
  });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    goNext();
    restartAutoplay();
  });

  /* 하단 5점 도트 */
  phoneDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.phoneDot, 10);
      if (!Number.isFinite(idx)) return;
      goTo(idx);
      restartAutoplay();
    });
  });

  /* 슬라이더 위로 마우스가 올라오면 자동 재생 일시정지 (UX) */
  root.addEventListener('pointerenter', stopAutoplay);
  root.addEventListener('pointerleave', () => {
    if (!isDragging) startAutoplay();
  });

  /* 탭이 백그라운드면 자동 재생 일시정지 (성능) */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  });

  phoneTrack.addEventListener('transitionend', finishTransition);
  thumbTrack.addEventListener('transitionend', finishTransition);

  phoneScreen.addEventListener('pointerdown', onDown);
  phoneScreen.addEventListener('pointermove', onMove);
  phoneScreen.addEventListener('pointerup', onUp);
  phoneScreen.addEventListener('pointercancel', onUp);
  phoneScreen.addEventListener('pointerleave', (event) => {
    if (isDragging) onUp(event);
  });

  window.addEventListener('resize', () => setPosition(false));

  buildInfiniteTracks();
  setPosition(false);
  startAutoplay();
})();
