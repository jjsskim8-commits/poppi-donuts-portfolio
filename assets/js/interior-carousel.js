/*
  Interior Carousel — Figma 1176-750 peek 스타일
  - 중앙 슬라이드 강조 + 좌우 peek (CSS padding-left/right calc 로 가운데 정렬 유지)
  - 5초 자동 슬라이드, 마우스 hover 시 일시정지
  - dot 클릭, 드래그 / 스와이프, 키보드 ←/→
  - **진짜 무한 루프**: 첫/마지막 슬라이드 clone 을 양 끝에 추가하고,
    경계를 넘어갈 때 transition 종료 후 보이지 않게 snap-back
*/
(() => {
  const root = document.querySelector('[data-interior-carousel]');
  if (!root) return;

  const viewport = root.querySelector('.interior-carousel__viewport');
  const track = root.querySelector('[data-interior-track]');
  const slides = Array.from(root.querySelectorAll('[data-interior-slide]'));
  const dots = Array.from(root.querySelectorAll('[data-interior-dot]'));
  const progressBar = root.querySelector('[data-interior-progress]');

  if (!track || !viewport || slides.length === 0) return;

  const N = slides.length;
  const AUTOPLAY_MS = 5000;
  const SWIPE_THRESHOLD = 50;
  /* transitionend 가 발화하지 않을 경우(탭 백그라운드 등)를 위한 안전 fallback */
  const SNAP_FALLBACK_MS = 1200;
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 무한 루프용 clone — DOM: [secondLastClone, lastClone, slide0..slide(N-1), firstClone, secondClone]
     ▶ 양 끝에 클론 2개씩 필요한 이유:
       · 경계 슬라이드(firstClone) 가운데로 전환되는 순간, 그 옆(peek 위치)에도
         DOM 요소가 있어야 사용자가 옆 카드 사라짐을 보지 않음.
       · 1개 클론만 있으면 firstClone 중앙일 때 우측 peek 슬롯이 비어있어
         "한 바퀴 돌고나서 옆 카드가 사라짐" 현상 발생 → 2번째 클론으로 해결. */
  const lastClone = slides[N - 1].cloneNode(true);
  const secondLastClone = slides[N - 2].cloneNode(true);
  const firstClone = slides[0].cloneNode(true);
  const secondClone = slides[1].cloneNode(true);
  [secondLastClone, lastClone, firstClone, secondClone].forEach((el) => {
    el.dataset.interiorClone = '1';
    el.removeAttribute('data-interior-slide');
    el.classList.remove('is-active');
    el.setAttribute('aria-hidden', 'true');
  });
  /* 순서 중요: insertBefore 는 [secondLast, last, slide0...] 가 되도록 lastClone 먼저 */
  track.insertBefore(lastClone, slides[0]);
  track.insertBefore(secondLastClone, lastClone);
  track.appendChild(firstClone);
  track.appendChild(secondClone);

  /* logicalIndex: 사용자가 보는 실제 slide 인덱스 (0..N-1)
     domPos: 트랙 안에서의 위치 (0..N+3), domPos = logicalIndex + 2 (선행 클론 2개 보정) */
  let logicalIndex = 0;
  let domPos = 2;

  let timer = null;
  let progressStart = 0;
  let progressRafId = null;
  let isPaused = false;
  let isSnapping = false;

  /* 드래그 상태 */
  let isDragging = false;
  let dragStartX = 0;
  let dragDeltaX = 0;
  let pointerId = null;

  function slideAdvance() {
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0') || 0;
    const slide = slides[0];
    if (!slide) return 0;
    return slide.offsetWidth + gap;
  }

  /** 뷰포트 기준 활성 슬라이드 중앙 — 좌·우 peek 대칭 (242px 모바일, CSS 풀폭 뷰포트) */
  function centerOffsetPx() {
    const vpW = viewport.getBoundingClientRect().width;
    const slideW = slides[0].getBoundingClientRect().width;
    return (vpW - slideW) / 2;
  }

  function applyTransform(offsetPx = 0) {
    const step = slideAdvance();
    const x = centerOffsetPx() - domPos * step + offsetPx;
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  function updateActiveUI() {
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === logicalIndex);
      slide.setAttribute('aria-hidden', i === logicalIndex ? 'false' : 'true');
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === logicalIndex);
      dot.setAttribute('aria-current', i === logicalIndex ? 'true' : 'false');
    });
  }

  function snapWithoutTransition() {
    const prev = track.style.transition;
    track.style.transition = 'none';
    applyTransform(0);
    void track.offsetWidth; // 강제 reflow
    track.style.transition = prev || '';
  }

  /* ±1 step — 경계 도달 시 clone 으로 애니메이션 후 snap-back
     ▶ snap 타이밍: setTimeout(620ms) 대신 transitionend 이벤트 사용
       → 브라우저가 transform 트랜지션을 "픽셀 단위로 완전히 종료한 시점" 에 정확히 발화
       → setTimeout 의 ±수십ms 오차로 인한 시각적 끊김(clone 위치와 real 위치 사이 미세 점프) 완전 제거 */
  function step(direction) {
    if (isSnapping) return;
    const nextDomPos = domPos + direction;

    /* 실제 슬라이드 영역: domPos 2 ~ N+1 (logicalIndex 0 ~ N-1) */
    if (nextDomPos >= 2 && nextDomPos <= N + 1) {
      logicalIndex = nextDomPos - 2;
      domPos = nextDomPos;
      applyTransform(0);
      updateActiveUI();
      return;
    }

    /* 경계 도달: 정방향 N+2 = firstClone, 역방향 1 = lastClone
       → 부드럽게 전환된 후 transitionend 에서 reral slide 로 invisible snap
       (이때 peek 슬롯에 secondClone / secondLastClone 이 있어서 옆 카드가 안 사라짐) */
    isSnapping = true;
    domPos = nextDomPos;
    logicalIndex = direction > 0 ? 0 : N - 1;
    applyTransform(0);
    updateActiveUI();

    let snapped = false;
    const doSnap = () => {
      if (snapped) return;
      snapped = true;
      track.removeEventListener('transitionend', onTransitionEnd);
      /* 정방향: N+2 (firstClone) → 2 (real slide_0)
         역방향: 1 (lastClone) → N+1 (real slide_(N-1)) */
      domPos = direction > 0 ? 2 : N + 1;
      snapWithoutTransition();
      isSnapping = false;
    };
    const onTransitionEnd = (event) => {
      if (event.target !== track) return;
      if (event.propertyName && event.propertyName !== 'transform') return;
      doSnap();
    };
    track.addEventListener('transitionend', onTransitionEnd);
    /* fallback — transitionend 가 안 오는 비정상 케이스 대비 */
    setTimeout(doSnap, SNAP_FALLBACK_MS);
  }

  function goNext() { step(+1); resetProgress(); }
  function goPrev() { step(-1); resetProgress(); }

  function jumpTo(targetLogical) {
    if (isSnapping) return;
    targetLogical = ((targetLogical % N) + N) % N;
    if (targetLogical === logicalIndex) return;
    logicalIndex = targetLogical;
    domPos = logicalIndex + 2;            /* DOM 에 선행 클론 2개 → +2 보정 */
    applyTransform(0);
    updateActiveUI();
  }

  function startAutoplay() {
    if (prefersReduced) return;
    stopAutoplay();
    timer = setInterval(goNext, AUTOPLAY_MS);
    isPaused = false;
    resetProgress();
  }

  function stopAutoplay() {
    if (timer) { clearInterval(timer); timer = null; }
    isPaused = true;
    if (progressRafId) cancelAnimationFrame(progressRafId);
  }

  function resetProgress() {
    if (!progressBar || prefersReduced) return;
    progressStart = performance.now();
    if (progressRafId) cancelAnimationFrame(progressRafId);
    if (!timer) { progressBar.style.transform = 'scaleX(0)'; return; }
    tickProgress();
  }

  function tickProgress() {
    if (!progressBar) return;
    const ratio = Math.min(1, (performance.now() - progressStart) / AUTOPLAY_MS);
    progressBar.style.transform = `scaleX(${ratio})`;
    if (ratio < 1 && timer) progressRafId = requestAnimationFrame(tickProgress);
  }

  function restart() { if (isPaused) return; stopAutoplay(); startAutoplay(); }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const target = Number(dot.dataset.interiorDot);
      if (Number.isFinite(target)) { jumpTo(target); restart(); }
    });
  });

  slides.forEach((slide, i) => {
    slide.addEventListener('click', () => {
      if (i !== logicalIndex && !isDragging) { jumpTo(i); restart(); }
    });
  });

  root.addEventListener('pointerenter', () => stopAutoplay());
  root.addEventListener('pointerleave', () => { isPaused = false; startAutoplay(); });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoplay();
    else if (!isPaused) startAutoplay();
  });

  viewport.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (isSnapping) return;
    isDragging = true;
    pointerId = e.pointerId;
    dragStartX = e.clientX;
    dragDeltaX = 0;
    viewport.setPointerCapture?.(pointerId);
    track.style.transition = 'none';
    stopAutoplay();
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!isDragging || e.pointerId !== pointerId) return;
    dragDeltaX = e.clientX - dragStartX;
    applyTransform(dragDeltaX);
  });

  function endDrag(e) {
    if (!isDragging) return;
    if (e && pointerId != null && e.pointerId !== pointerId) return;
    isDragging = false;
    viewport.releasePointerCapture?.(pointerId);
    pointerId = null;
    track.style.transition = '';

    if (dragDeltaX > SWIPE_THRESHOLD) goPrev();
    else if (dragDeltaX < -SWIPE_THRESHOLD) goNext();
    else applyTransform(0);

    dragDeltaX = 0;
    isPaused = false;
    startAutoplay();
  }

  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('pointerleave', (e) => { if (isDragging) endDrag(e); });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); goPrev(); restart(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); goNext(); restart(); }
  });
  root.setAttribute('tabindex', '0');

  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => snapWithoutTransition());
  });

  /* HTML 의 .is-active 슬라이드를 초기 인덱스로 사용 (없으면 0) */
  const initial = Math.max(0, slides.findIndex((s) => s.classList.contains('is-active')));
  logicalIndex = initial >= 0 ? initial : 0;
  domPos = logicalIndex + 2;              /* DOM 에 선행 클론 2개 → +2 보정 */
  snapWithoutTransition();
  updateActiveUI();
  startAutoplay();
})();
