/* ===== MERGED FROM assets/js/business-point-carousel.js ===== */
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
  let simpleAnimTimer = null;

  function slideGap() {
    return parseFloat(getComputedStyle(viewport).getPropertyValue("--bp-slide-gap")) || 24;
  }

  function logicalFromDom(pos) {
    return ((pos % N) + N) % N;
  }

  function viewportLayoutWidth() {
    return viewport.getBoundingClientRect().width;
  }

  function viewportCenterX() {
    const rect = viewport.getBoundingClientRect();
    return rect.left + rect.width / 2;
  }

  function influenceRadius() {
    return Math.max(220, viewport.clientWidth * 0.32);
  }

  function isSimpleCarousel() {
    return window.innerWidth <= 768;
  }

  function smoothstep(t) {
    const x = Math.min(1, Math.max(0, t));
    return x * x * (3 - 2 * x);
  }

  function updateSlideFocus() {
    const children = allTrackSlides();

    if (isSimpleCarousel()) {
      children.forEach((slide, i) => {
        const on = i === domPos;
        slide.style.setProperty("--focus", on ? "1" : "0");
        slide.classList.toggle("is-active", on);

        if (slide.dataset.businessPointClone) {
          slide.setAttribute("aria-hidden", "true");
        } else {
          slide.setAttribute("aria-hidden", on ? "false" : "true");
        }
      });

      const current = children[domPos];
      if (current?.dataset?.businessPointSlide != null) {
        logicalIndex = Number(current.dataset.businessPointSlide);
      } else {
        logicalIndex = logicalFromDom(domPos);
      }

      updateDots();
      return;
    }

    const center = viewportCenterX();
    const radius = influenceRadius();
    let bestFocus = -1;
    let bestIndex = domPos;

    children.forEach((slide, i) => {
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

    const bestSlide = children[bestIndex];
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

  function syncPointHeights() {
    const viewportEl = root.querySelector(".business-point__viewport");
    if (!viewportEl) return;

    const w = window.innerWidth;

    /* PC(769+): JS로 카드 최소 높이 동기화 */
    if (w >= 769) {
      root.style.removeProperty("--bp-mobile-body-min-h");

      let maxCard = 0;
      slides.forEach((slide) => {
        const card = slide.querySelector(".business-point__card");
        const body = slide.querySelector(".business-point__card-body");
        if (!card || !body) return;

        const prevFocus = slide.style.getPropertyValue("--focus");
        slide.style.setProperty("--focus", "1");
        body.style.width = "";
        maxCard = Math.max(maxCard, card.offsetHeight);

        if (prevFocus) slide.style.setProperty("--focus", prevFocus);
        else slide.style.removeProperty("--focus");
      });

      if (maxCard > 0) {
        viewportEl.style.setProperty("--bp-card-min-h", `${Math.ceil(maxCard)}px`);
      } else {
        viewportEl.style.removeProperty("--bp-card-min-h");
      }
      return;
    }

    /* 태블릿·모바일: PC에서 잡힌 인라인 min-height 제거 → CSS clamp만 사용 */
    viewportEl.style.removeProperty("--bp-card-min-h");

    if (w <= 402) {
      let maxBody = 0;
      slides.forEach((slide) => {
        const body = slide.querySelector(".business-point__card-body");
        if (!body) return;
        maxBody = Math.max(maxBody, body.scrollHeight);
      });
      if (maxBody > 0) {
        root.style.setProperty("--bp-mobile-body-min-h", `${Math.ceil(maxBody)}px`);
      } else {
        root.style.removeProperty("--bp-mobile-body-min-h");
      }
      return;
    }

    root.style.removeProperty("--bp-mobile-body-min-h");
  }

  function slideUnitWidth(slide) {
    const card = slide.querySelector(".business-point__card");
    return card?.offsetWidth || slide.offsetWidth;
  }

  function centerOffsetForDom(index) {
    const children = allTrackSlides();
    const target = children[index];
    if (!target) return 0;

    const gap = slideGap();
    let leading = 0;

    for (let i = 0; i < index; i += 1) {
      leading += (isSimpleCarousel() ? slideUnitWidth(children[i]) : children[i].offsetWidth) + gap;
    }

    leading += (isSimpleCarousel() ? slideUnitWidth(target) : target.offsetWidth) / 2;
    const vpW = isSimpleCarousel() ? viewportLayoutWidth() : viewport.clientWidth;
    return vpW / 2 - leading;
  }

  /**
   * ≤768px: 중앙 보정값만 계산 (transform은 layoutTrack에서 1회 적용 → transitionend 보장)
   * 드래그 중에는 보정 측정 생략
   */
  function simpleCarouselOffset(index, offsetPx = 0) {
    const base = centerOffsetForDom(index) + offsetPx;
    const target = allTrackSlides()[index];
    if (!target || isDragging) return base;

    const prevTransition = track.style.transition;
    const savedTx = getTrackTranslateX();

    track.style.transition = "none";
    track.style.transform = `translate3d(${base}px, 0, 0)`;

    const vpRect = viewport.getBoundingClientRect();
    const slideRect = target.getBoundingClientRect();
    const drift =
      vpRect.left + vpRect.width / 2 - (slideRect.left + slideRect.width / 2);
    const tx = base + drift;

    track.style.transform = `translate3d(${savedTx}px, 0, 0)`;
    track.style.transition = prevTransition;

    return tx;
  }

  function trackTranslateFor(index, offsetPx = 0) {
    return isSimpleCarousel()
      ? simpleCarouselOffset(index, offsetPx)
      : centerOffsetForDom(index) + offsetPx;
  }

  function layoutTrack(offsetPx = 0) {
    const tx = trackTranslateFor(domPos, offsetPx);
    track.style.transform = `translate3d(${tx}px, 0, 0)`;
    updateSlideFocus();

    if (!isSimpleCarousel()) {
      const tx2 = trackTranslateFor(domPos, offsetPx);
      if (Math.abs(tx2 - tx) > 0.5) {
        track.style.transform = `translate3d(${tx2}px, 0, 0)`;
        updateSlideFocus();
      }
    }
  }

  function clearSimpleAnimTimer() {
    if (simpleAnimTimer) {
      window.clearTimeout(simpleAnimTimer);
      simpleAnimTimer = null;
    }
  }

  /** transitionend 미발생 시 태블릿·모바일 isAnimating 잠금 방지 (PC 동작 변경 없음) */
  function scheduleSimpleAnimRelease() {
    if (!isSimpleCarousel()) return;
    clearSimpleAnimTimer();
    simpleAnimTimer = window.setTimeout(() => {
      simpleAnimTimer = null;
      if (!isAnimating) return;
      releaseCarouselInteraction();
      normalizeDomPos();
      applyTransform(0, false);
      updateDots();
    }, 700);
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
    if (!isDragging && isSimpleCarousel()) return;
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

  /** 리사이즈·스냅 시 transition이 끊겨 isAnimating이 true로 남는 것 방지 */
  function releaseCarouselInteraction() {
    isAnimating = false;
    isDragging = false;
    dragDeltaX = 0;
    pointerId = null;
    clearSimpleAnimTimer();
    stopFocusLoop();
    viewport.classList.remove("is-dragging");
    track.style.transition = "";
  }

  function snapWithoutTransition() {
    releaseCarouselInteraction();
    normalizeDomPos();
    logicalIndex = logicalFromDom(domPos);
    applyTransform(0, false);
    updateDots();
  }

  function relayoutAfterResize() {
    snapWithoutTransition();
    syncPointHeights();
    if (!document.hidden && !prefersReduced) {
      startAutoplay();
    }
  }

  function onTrackTransitionEnd(event) {
    if (event.target !== track || event.propertyName !== "transform") return;
    clearSimpleAnimTimer();
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
    scheduleSimpleAnimRelease();

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
    scheduleSimpleAnimRelease();

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
    scheduleSimpleAnimRelease();
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

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAutoplay();
    else startAutoplay();
  });

  viewport.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (isAnimating) return;
    e.preventDefault();
    isDragging = true;
    viewport.classList.add("is-dragging");
    pointerId = e.pointerId;
    dragStartX = e.clientX;
    dragDeltaX = 0;
    viewport.setPointerCapture?.(pointerId);
    track.style.transition = "none";
    stopFocusLoop();
    startFocusLoop();
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!isDragging || e.pointerId !== pointerId) return;
    e.preventDefault();
    dragDeltaX = e.clientX - dragStartX;
  });

  function endDrag(e) {
    if (!isDragging) return;
    if (e && pointerId != null && e.pointerId !== pointerId) return;
    isDragging = false;
    viewport.classList.remove("is-dragging");
    viewport.releasePointerCapture?.(pointerId);
    pointerId = null;
    track.style.transition = "";
    stopFocusLoop();

    if (dragDeltaX > SWIPE_THRESHOLD) goPrev();
    else if (dragDeltaX < -SWIPE_THRESHOLD) goNext();
    else snapToNearest();

    dragDeltaX = 0;
  }

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("pointerleave", (e) => {
    if (isDragging) endDrag(e);
  });

  // PointerEvent 미지원/제한 환경용 마우스 드래그 폴백
  if (!("PointerEvent" in window)) {
    function onMouseMove(e) {
      if (!isDragging || pointerId !== "mouse") return;
      e.preventDefault();
      dragDeltaX = e.clientX - dragStartX;
    }

    function onMouseUp(e) {
      if (!isDragging || pointerId !== "mouse") return;
      if (e.button !== undefined && e.button !== 0) return;
      endDrag();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    viewport.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (isAnimating) return;
      e.preventDefault();
      isDragging = true;
      viewport.classList.add("is-dragging");
      pointerId = "mouse";
      dragStartX = e.clientX;
      dragDeltaX = 0;
      track.style.transition = "none";
      stopFocusLoop();
      startFocusLoop();
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  }

  viewport.addEventListener("dragstart", (e) => e.preventDefault());
  viewport.addEventListener("selectstart", (e) => {
    if (isDragging) e.preventDefault();
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
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        relayoutAfterResize();
      });
    });
  });

  const initial = Math.max(0, slides.findIndex((s) => s.classList.contains("is-active")));
  logicalIndex = initial >= 0 ? initial : 0;
  domPos = N + logicalIndex;

  requestAnimationFrame(() => {
    snapWithoutTransition();
    syncPointHeights();
    window.addEventListener("load", () => {
      snapWithoutTransition();
      syncPointHeights();
    }, { once: true });
    startAutoplay();
  });
})();

/* ===== MERGED FROM assets/js/business-plan-accordion.js ===== */
(() => {
  const root = document.querySelector("[data-business-plan]");
  if (!root) return;

  const cards = [...root.querySelectorAll("[data-business-plan-card]")];
  const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function setCardState(card, isOpen) {
    card.classList.toggle("is-open", isOpen);

    const panel = card.querySelector(".business-plan__panel");
    const media = card.querySelector(".business-plan__media");

    card.setAttribute("aria-expanded", isOpen ? "true" : "false");
    panel?.setAttribute("aria-hidden", isOpen ? "false" : "true");
    media?.setAttribute("aria-hidden", isOpen ? "true" : "false");
  }

  function syncDetailHeight() {
    let max = 0;

    cards.forEach((card) => {
      const panel = card.querySelector(".business-plan__panel");
      if (!panel) return;

      const prev = {
        position: panel.style.position,
        visibility: panel.style.visibility,
        pointerEvents: panel.style.pointerEvents,
        opacity: panel.style.opacity,
        height: panel.style.height,
      };

      panel.style.position = "absolute";
      panel.style.visibility = "hidden";
      panel.style.pointerEvents = "none";
      panel.style.opacity = "1";
      panel.style.height = "auto";

      max = Math.max(max, panel.offsetHeight);

      panel.style.position = prev.position;
      panel.style.visibility = prev.visibility;
      panel.style.pointerEvents = prev.pointerEvents;
      panel.style.opacity = prev.opacity;
      panel.style.height = prev.height;
    });

    if (max > 0) {
      root.style.setProperty("--business-plan-detail-height", `${max}px`);
    }
  }

  function activateCard(target) {
    if (target.classList.contains("is-open")) return;
    cards.forEach((card) => setCardState(card, card === target));
  }

  cards.forEach((card) => {
    if (hoverCapable) {
      card.addEventListener("mouseenter", () => activateCard(card));
    }

    card.addEventListener("click", () => activateCard(card));
    card.addEventListener("focusin", () => activateCard(card));
  });

  const initial = cards.find((card) => card.classList.contains("is-open")) || cards[0];
  if (initial) {
    cards.forEach((card) => setCardState(card, card === initial));
  }

  syncDetailHeight();
  window.addEventListener("resize", syncDetailHeight);
})();

/* ===== business-process mobile active-step ===== */
(() => {
  const cards = Array.from(document.querySelectorAll(".business-process__card"));
  if (!cards.length) return;

  let rafId = null;

  function clearActive() {
    cards.forEach((card) => card.classList.remove("is-active-step"));
  }

  function updateActiveStep() {
    rafId = null;

    if (window.innerWidth > 402) {
      clearActive();
      return;
    }

    const centerY = window.innerHeight * 0.5;
    let bestCard = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
      const cardCenterY = rect.top + rect.height / 2;
      const distance = Math.abs(cardCenterY - centerY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCard = card;
      }
    });

    clearActive();
    if (bestCard) bestCard.classList.add("is-active-step");
  }

  function requestUpdate() {
    if (rafId != null) return;
    rafId = requestAnimationFrame(updateActiveStep);
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("load", requestUpdate, { once: true });
  requestUpdate();
})();

/* ===== MERGED FROM assets/js/business-submit-form.js ===== */
(() => {
  const form = document.querySelector("[data-business-submit-form]");
  const modal = document.querySelector("[data-business-submit-modal]");
  if (!form || !modal) return;

  const closeTargets = modal.querySelectorAll("[data-business-submit-modal-close]");
  const confirmBtn = modal.querySelector(".business-submit-modal__confirm");
  let lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("is-business-submit-modal-open");
    requestAnimationFrame(() => modal.classList.add("is-open"));
    confirmBtn?.focus();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.classList.remove("is-business-submit-modal-open");

    window.setTimeout(() => {
      if (modal.classList.contains("is-open")) return;
      modal.hidden = true;
      form.reset();
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }, 300);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    openModal();
  });

  closeTargets.forEach((el) => {
    el.addEventListener("click", () => closeModal());
  });

  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
    }
  });
})();

/* ===== MERGED FROM inline script in pages/business.html  ===== */
(() => {
      const items = document.querySelectorAll('[data-reveal]');
      if (!items.length) return;

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        items.forEach((el) => el.classList.add('is-revealed'));
        return;
      }

      items.forEach((el) => {
        const delay = parseInt(el.dataset.revealDelay || '0', 10);
        if (delay > 0) el.style.transitionDelay = delay + 'ms';
      });

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            io.unobserve(entry.target);
          });
        },
        { threshold: 0.18, rootMargin: '0px 0px -60px 0px' }
      );

      items.forEach((el) => io.observe(el));
    })();
