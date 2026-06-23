/*
  Business Point Carousel
  - Center-distance focus (0–1) drives accordion text width per slide
  - Seamless triple-buffer loop
*/
(() => {
  const root = document.querySelector("[data-business-point-carousel]");
  if (!root) return;

  const viewport = root.querySelector(".business-point__viewport");
  const track = root.querySelector("[data-business-point-track]");
  const slides = Array.from(root.querySelectorAll("[data-business-point-slide]"));
  const dots = Array.from(document.querySelectorAll("[data-business-point-dot]"));

  if (!viewport || !track || slides.length === 0) return;

  const N = slides.length;
  const AUTOPLAY_MS = 5000;
  const SWIPE_THRESHOLD = 48;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function cloneSlide(slide) {
    const el = slide.cloneNode(true);
    el.dataset.businessPointClone = "1";
    el.removeAttribute("data-business-point-slide");
    el.classList.remove("is-active");
    el.style.setProperty("--focus", "0");
    el.setAttribute("aria-hidden", "true");
    return el;
  }

  slides.map(cloneSlide).forEach((el) => track.insertBefore(el, slides[0]));
  slides.map(cloneSlide).forEach((el) => track.appendChild(el));

  const allTrackSlides = () => Array.from(track.children);

  let logicalIndex = 0;
  let domPos = N;
  let timer = null;
  let isPaused = false;
  let isAnimating = false;
  let isDragging = false;
  let dragStartX = 0;
  let dragDeltaX = 0;
  let pointerId = null;
  let focusLoopId = null;

  function slideGap() {
    return parseFloat(getComputedStyle(viewport).getPropertyValue("--bp-slide-gap")) || 24;
  }

  function logicalFromDom(pos) {
    return ((pos % N) + N) % N;
  }

  function viewportCenterX() {
    const rect = viewport.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }

  function influenceRadius() {
    return Math.max(220, viewport.clientWidth * 0.32);
  }

  function smoothstep(t) {
    const x = Math.min(1, Math.max(0, t));
    return x * x * (3 - 2 * x);
  }

  function updateSlideFocus() {
    const center = viewportCenterX();
    const radius = influenceRadius();
    let bestFocus = -1;
    let bestIndex = domPos;

    allTrackSlides().forEach((slide, i) => {
      const rect = slide.getBoundingClientRect();
      const slideCenter = rect.left + rect.width / 2;
      const distance = Math.abs(slideCenter - center);
      const raw = Math.max(0, 1 - distance / radius);
      const focus = smoothstep(raw);

      slide.style.setProperty("--focus", focus.toFixed(4));
      slide.classList.toggle("is-active", focus >= 0.55);

      if (slide.dataset.businessPointClone) {
        slide.setAttribute("aria-hidden", "true");
      } else {
        slide.setAttribute("aria-hidden", focus < 0.35 ? "true" : "false");
      }

      if (focus > bestFocus) {
        bestFocus = focus;
        bestIndex = i;
      }
    });

    const bestSlide = allTrackSlides()[bestIndex];
    if (bestSlide?.dataset?.businessPointSlide != null) {
      logicalIndex = Number(bestSlide.dataset.businessPointSlide);
    } else {
      logicalIndex = logicalFromDom(bestIndex);
    }

    updateDots();
  }

  function updateDots() {
    dots.forEach((dot, i) => {
      const on = i === logicalIndex;
      dot.classList.toggle("is-active", on);
      dot.setAttribute("aria-current", on ? "true" : "false");
    });
  }

  function centerOffsetForDom(index) {
    const children = allTrackSlides();
    const target = children[index];
    if (!target) return 0;

    const gap = slideGap();
    let leading = 0;

    for (let i = 0; i < index; i += 1) {
      leading += children[i].offsetWidth + gap;
    }

    leading += target.offsetWidth / 2;
    return viewport.clientWidth / 2 - leading;
  }

  function layoutTrack(offsetPx = 0) {
    const tx = centerOffsetForDom(domPos) + offsetPx;
    track.style.transform = `translate3d(${tx}px, 0, 0)`;
    updateSlideFocus();
    const tx2 = centerOffsetForDom(domPos) + offsetPx;
    if (Math.abs(tx2 - tx) > 0.5) {
      track.style.transform = `translate3d(${tx2}px, 0, 0)`;
      updateSlideFocus();
    }
  }

  function applyTransform(offsetPx = 0, animate = true) {
    if (!animate) track.style.transition = "none";
    layoutTrack(offsetPx);
    if (!animate) {
      void track.offsetWidth;
      track.style.transition = "";
    }
  }

  function getTrackTranslateX() {
    const transform = getComputedStyle(track).transform;
    if (!transform || transform === "none") return 0;
    return new DOMMatrix(transform).m41;
  }

  function slideCenterX(slide) {
    const rect = slide.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }

  function normalizeDomPos() {
    const children = allTrackSlides();
    let targetPos = domPos;

    if (domPos >= N * 2) targetPos = domPos - N;
    else if (domPos < N) targetPos = domPos + N;
    else return;

    const fromEl = children[domPos];
    if (!fromEl) return;

    const anchorCenter = slideCenterX(fromEl);

    domPos = targetPos;
    track.style.transition = "none";
    layoutTrack(0);

    const toEl = children[domPos];
    if (!toEl) return;

    const drift = anchorCenter - slideCenterX(toEl);
    if (Math.abs(drift) > 0.5) {
      track.style.transform = `translate3d(${getTrackTranslateX() + drift}px, 0, 0)`;
      updateSlideFocus();
    }
  }

  function startFocusLoop() {
    if (focusLoopId != null) return;
    const loop = () => {
      layoutTrack(isDragging ? dragDeltaX : 0);
      focusLoopId = requestAnimationFrame(loop);
    };
    focusLoopId = requestAnimationFrame(loop);
  }

  function stopFocusLoop() {
    if (focusLoopId != null) {
      cancelAnimationFrame(focusLoopId);
      focusLoopId = null;
    }
  }

  function snapWithoutTransition() {
    normalizeDomPos();
    logicalIndex = logicalFromDom(domPos);
    applyTransform(0, false);
    updateDots();
  }

  function onTrackTransitionEnd(event) {
    if (event.target !== track || event.propertyName !== "transform") return;
    isAnimating = false;
    stopFocusLoop();
    track.style.transition = "none";
    normalizeDomPos();
    logicalIndex = logicalFromDom(domPos);
    layoutTrack(0);
    void track.offsetWidth;
    track.style.transition = "";
  }

  track.addEventListener("transitionend", onTrackTransitionEnd);

  function step(direction) {
    if (isAnimating) return;
    domPos += direction;
    logicalIndex = logicalFromDom(domPos);
    isAnimating = true;
    track.style.transition = "";
    startFocusLoop();
    layoutTrack(0);

    if (prefersReduced) {
      isAnimating = false;
      stopFocusLoop();
      normalizeDomPos();
      layoutTrack(0);
    }
  }

  function goNext() {
    step(+1);
    restartAutoplay();
  }

  function goPrev() {
    step(-1);
    restartAutoplay();
  }

  function jumpTo(targetLogical) {
    if (isAnimating) return;
    targetLogical = ((targetLogical % N) + N) % N;
    if (targetLogical === logicalIndex) return;

    domPos = N + targetLogical;
    logicalIndex = targetLogical;
    isAnimating = true;
    track.style.transition = "";
    startFocusLoop();
    layoutTrack(0);

    if (prefersReduced) {
      isAnimating = false;
      stopFocusLoop();
      layoutTrack(0);
    }
  }

  function snapToNearest() {
    const center = viewportCenterX();
    let closest = domPos;
    let minDist = Infinity;

    allTrackSlides().forEach((slide, i) => {
      const rect = slide.getBoundingClientRect();
      const d = Math.abs(rect.left + rect.width / 2 - center);
      if (d < minDist) {
        minDist = d;
        closest = i;
      }
    });

    domPos = closest;
    logicalIndex = logicalFromDom(domPos);
    isAnimating = true;
    track.style.transition = "";
    startFocusLoop();
    layoutTrack(0);
  }

  function startAutoplay() {
    if (prefersReduced) return;
    stopAutoplay();
    timer = window.setInterval(goNext, AUTOPLAY_MS);
    isPaused = false;
  }

  function stopAutoplay() {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
    isPaused = true;
  }

  function restartAutoplay() {
    if (isPaused) return;
    stopAutoplay();
    startAutoplay();
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const target = Number(dot.dataset.businessPointDot);
      if (Number.isFinite(target)) {
        jumpTo(target);
        restartAutoplay();
      }
    });
  });

  root.addEventListener("pointerenter", () => stopAutoplay());
  root.addEventListener("pointerleave", () => {
    isPaused = false;
    startAutoplay();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAutoplay();
    else if (!isPaused) startAutoplay();
  });

  viewport.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (isAnimating) return;
    isDragging = true;
    pointerId = e.pointerId;
    dragStartX = e.clientX;
    dragDeltaX = 0;
    viewport.setPointerCapture?.(pointerId);
    track.style.transition = "none";
    stopFocusLoop();
    startFocusLoop();
    stopAutoplay();
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!isDragging || e.pointerId !== pointerId) return;
    dragDeltaX = e.clientX - dragStartX;
  });

  function endDrag(e) {
    if (!isDragging) return;
    if (e && pointerId != null && e.pointerId !== pointerId) return;
    isDragging = false;
    viewport.releasePointerCapture?.(pointerId);
    pointerId = null;
    track.style.transition = "";
    stopFocusLoop();

    if (dragDeltaX > SWIPE_THRESHOLD) goPrev();
    else if (dragDeltaX < -SWIPE_THRESHOLD) goNext();
    else snapToNearest();

    dragDeltaX = 0;
    isPaused = false;
    startAutoplay();
  }

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("pointerleave", (e) => {
    if (isDragging) endDrag(e);
  });

  root.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
  });
  root.setAttribute("tabindex", "0");

  let resizeRaf = null;
  window.addEventListener("resize", () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => snapWithoutTransition());
  });

  const initial = Math.max(0, slides.findIndex((s) => s.classList.contains("is-active")));
  logicalIndex = initial >= 0 ? initial : 0;
  domPos = N + logicalIndex;

  requestAnimationFrame(() => {
    snapWithoutTransition();
    window.addEventListener("load", () => snapWithoutTransition(), { once: true });
    startAutoplay();
  });
})();
