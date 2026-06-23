/*
  STORE SEARCH — 모바일 바텀시트 (≤540px)
  · 지도 상단 고정, 패널을 위로 스와이프하면 검색·결과 확장 (던킨 매장찾기 UX)
*/
(() => {
  const mq = window.matchMedia('(max-width: 540px)');
  const stage = document.querySelector('[data-store-search-stage]');
  const sheet = document.querySelector('[data-store-search-sheet]');
  const handle = document.querySelector('[data-store-sheet-handle]');
  const scroll = document.querySelector('[data-store-sheet-scroll]');

  if (!stage || !sheet || !handle) return;

  const COLLAPSED_MIN = 280;
  const STAGE_MAP_RATIO = 0.86;
  const SHEET_EXPAND_RATIO = 0.92;
  let dragging = false;
  let startY = 0;
  let startH = 0;
  let lastY = 0;
  let lastT = 0;
  let pointerId = null;
  let didDrag = false;

  function isMobile() {
    return mq.matches;
  }

  function stageHeight() {
    const vh = window.innerHeight * STAGE_MAP_RATIO;
    return Math.max(580, Math.min(vh, 820));
  }

  function applyStageHeight() {
    if (!isMobile()) return;
    stage.style.height = `${stageHeight()}px`;
  }

  function expandedHeight() {
    const stageH = stage.getBoundingClientRect().height;
    return Math.max(measurePeekHeight() + 100, Math.min(stageH * SHEET_EXPAND_RATIO, stageH - 32));
  }

  /** 접힌 상태 — 핸들 + 제목 + 필터 + 버튼까지 노출 */
  function measurePeekHeight() {
    const scrollStyle = getComputedStyle(scroll);
    const scrollPadBottom = parseFloat(scrollStyle.paddingBottom) || 0;
    const handleH = handle.getBoundingClientRect().height;

    const parts = [
      scroll.querySelector('.store-search__head'),
      scroll.querySelector('.store-search__filters'),
      scroll.querySelector('.store-search__actions'),
    ].filter(Boolean);

    let contentH = 0;
    parts.forEach((el) => {
      const style = getComputedStyle(el);
      contentH += el.getBoundingClientRect().height;
      contentH += parseFloat(style.marginBottom) || 0;
    });

    return Math.ceil(handleH + contentH + scrollPadBottom + 6);
  }

  function collapsedHeight() {
    const peek = measurePeekHeight();
    return Math.min(Math.max(peek, COLLAPSED_MIN), expandedHeight() - 48);
  }

  function currentHeight() {
    return sheet.getBoundingClientRect().height;
  }

  function setHeight(px, expanded) {
    const max = expandedHeight();
    const h = Math.max(collapsedHeight(), Math.min(max, px));
    sheet.style.setProperty('--store-sheet-h', `${h}px`);
    sheet.classList.toggle('is-expanded', expanded);
    sheet.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    handle.setAttribute('aria-label', expanded ? '검색 패널 닫기' : '검색 패널 열기');
    window.dispatchEvent(new Event('resize'));
  }

  function snap(velocityY) {
    const mid = (collapsedHeight() + expandedHeight()) / 2;
    const h = currentHeight();
    const expand = velocityY < -0.35 || (Math.abs(velocityY) < 0.35 && h > mid);
    setHeight(expand ? expandedHeight() : collapsedHeight(), expand);
  }

  function toggle() {
    const expand = !sheet.classList.contains('is-expanded');
    setHeight(expand ? expandedHeight() : collapsedHeight(), expand);
  }

  function resetDesktop() {
    sheet.classList.remove('is-expanded', 'is-dragging');
    sheet.style.removeProperty('--store-sheet-h');
    sheet.removeAttribute('aria-expanded');
  }

  function initMobile() {
    if (!isMobile()) {
      resetDesktop();
      stage.style.removeProperty('height');
      return;
    }
    applyStageHeight();
    requestAnimationFrame(() => {
      setHeight(collapsedHeight(), false);
    });
  }

  function onPointerDown(e) {
    if (!isMobile()) return;
    if (!e.target.closest('[data-store-sheet-handle]')) return;

    dragging = true;
    didDrag = false;
    pointerId = e.pointerId;
    startY = e.clientY;
    startH = currentHeight();
    lastY = e.clientY;
    lastT = performance.now();
    sheet.classList.add('is-dragging');
    handle.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    const dy = startY - e.clientY;
    if (Math.abs(dy) > 4) didDrag = true;
    setHeight(startH + dy, startH + dy > (collapsedHeight() + expandedHeight()) / 2);
    const now = performance.now();
    lastY = e.clientY;
    lastT = now;
  }

  function onPointerUp(e) {
    if (!dragging || (e.pointerId != null && e.pointerId !== pointerId)) return;
    dragging = false;
    handle.releasePointerCapture?.(pointerId);
    pointerId = null;
    sheet.classList.remove('is-dragging');
    const dt = Math.max(performance.now() - lastT, 1);
    const velocityY = (lastY - e.clientY) / dt;
    snap(velocityY);
  }

  handle.addEventListener('click', () => {
    if (!isMobile() || didDrag) return;
    toggle();
  });

  handle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  });

  handle.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  mq.addEventListener('change', initMobile);
  window.addEventListener('load', () => {
    if (!isMobile() || sheet.classList.contains('is-expanded')) return;
    setHeight(collapsedHeight(), false);
  });
  window.addEventListener('resize', () => {
    if (!isMobile()) return;
    applyStageHeight();
    if (sheet.classList.contains('is-expanded')) {
      setHeight(expandedHeight(), true);
    } else {
      setHeight(collapsedHeight(), false);
    }
  });

  initMobile();
})();
