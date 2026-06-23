(function () {
  /* [REMOVED] 중앙 도넛 이미지 mouse parallax 호버 효과 — 사용자 요청으로 PC/TA/MO 모두 비활성화.
     기존 bindParallax(...) 호출 및 함수 제거. 도넛은 항상 정중앙 고정. */

  const drive = document.querySelector('[data-vscroll-drive]');
  const pin = document.querySelector('[data-vscroll-pin]');
  const track = document.querySelector('[data-wheel-horizontal-track]');
  const panels = drive ? Array.from(drive.querySelectorAll('.wheel-horizontal-panel[data-flavor]')) : [];

  /* 우측 세로 4점 progress indicator (.flavor-indicator) — 패널과 1:1 동기화 */
  const flavorIndicator = document.querySelector('[data-flavor-indicator]');
  const flavorIndicatorDots = flavorIndicator
    ? Array.from(flavorIndicator.querySelectorAll('[data-flavor-dot]'))
    : [];

  if (!drive || !pin || !track || !panels.length || typeof gsap === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- 모바일·태블릿 친화 ScrollTrigger 셋업 ----------
     - ignoreMobileResize: iOS 주소창 높이 변화에 ST refresh 안 시킴 (pin jank 방지)
     - normalizeScroll: 터치 기기에서 모멘텀 스크롤을 GSAP가 직접 정규화 →
       iOS Safari pin 글리치/오버슈트가 줄고 scrub이 매끄럽게.
     - fastScrollEnd: 빠른 플릭으로 pin을 지나치는 현상 방지.
     - preventOverlaps: 다른 ScrollTrigger 와 충돌 시 자동 동기화. */
  const isTouch =
    window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
    'ontouchstart' in window;

  ScrollTrigger.config({
    ignoreMobileResize: true,
    fastScrollEnd: true,
    preventOverlaps: true,
  });

  /* normalizeScroll — 터치 기기만. allowNestedScroll 로 모달 등 내부 스크롤 허용 (iOS) */
  if (isTouch) {
    try {
      ScrollTrigger.normalizeScroll({
        allowNestedScroll: true,
        type: 'touch,wheel,pointer',
      });
    } catch (e) {
      try { ScrollTrigger.normalizeScroll(true); } catch (e2) { /* 구버전 GSAP fallback */ }
    }
  }

  const MOBILE_FLAVOR_MQ = window.matchMedia('(max-width: 768px)');

  let flavorST = null;
  let currentPanel = 0;
  let wheelCooldown = false;
  let lastPanelFloat = 0;
  let lastActivePanel = -1;

  function isMobileFlavorLayout() {
    return MOBILE_FLAVOR_MQ.matches;
  }

  function getPanelWidth() {
    return pin.clientWidth || window.innerWidth;
  }

  function getMaxPanelIndex() {
    return Math.max(0, panels.length - 1);
  }

  function cssDriveNumber(name, fallback) {
    const value = getComputedStyle(drive).getPropertyValue(name).trim();
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function getPinViewportHeight() {
    return pin.offsetHeight || window.innerHeight;
  }

  function setDriveHeight() {
    const stepVh = cssDriveNumber('--step-vh', 88);
    const driveHeight = 100 + getMaxPanelIndex() * stepVh;
    drive.style.setProperty('--slide-count', String(panels.length));
    drive.style.setProperty('--drive-height', `${driveHeight}vh`);
    drive.style.setProperty('--drive-height-dvh', `${driveHeight}dvh`);
  }

  function setHorizontalLayout() {
    const panelWidth = getPanelWidth();
    track.style.width = `${panelWidth * panels.length}px`;
    panels.forEach((panel) => {
      panel.style.flex = `0 0 ${panelWidth}px`;
      panel.style.width = `${panelWidth}px`;
    });
  }

  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  }

  /* 스크롤 진행도 → 패널 위치 (한 구간씩만 슬라이드, 건너뛰기 방지) */
  function progressToPanelFloat(progress) {
    const maxIdx = getMaxPanelIndex();
    if (maxIdx === 0) return 0;

    const pos = progress * maxIdx;
    const base = Math.min(maxIdx, Math.floor(pos));
    const frac = pos - base;

    if (base >= maxIdx) return maxIdx;

    const holdRatio = cssDriveNumber('--spring-slider-hold-ratio', 0.32);
    if (frac < holdRatio) return base;

    const t = (frac - holdRatio) / (1 - holdRatio);
    return base + easeInOutQuad(t);
  }

  function applyPanelTransform(panelFloat) {
    gsap.set(track, { x: -panelFloat * getPanelWidth() });
  }

  function updateFlavorState(panelIndex) {
    const idx = Math.min(getMaxPanelIndex(), Math.max(0, panelIndex));
    currentPanel = idx;

    const flavor = panels[idx]?.dataset?.flavor;
    if (flavor) document.body.dataset.activeFlavor = flavor;

    panels.forEach((el, i) => {
      el.setAttribute('aria-hidden', i !== idx ? 'true' : 'false');
    });

    /* 인디케이터 dots 동기화 */
    flavorIndicatorDots.forEach((dot, i) => {
      const isActive = i === idx;
      dot.classList.toggle('is-active', isActive);
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    /* ---------- 패널 전환 시 도넛 GSAP 엔트런스 (PC/태블릿/모바일 공통) ----------
       - 같은 패널이 다시 호출되는 건 무시 (lastActivePanel 캐시)
       - 활성 도넛: 작게(0.86) → 정상(1.0) + 살짝 회전 → 정착
       - prefers-reduced-motion 시 정적 노출 (gsap이 자동으로 0초 처리) */
    if (idx !== lastActivePanel) {
      lastActivePanel = idx;
      const activeDonut = panels[idx]?.querySelector('.donut-visual img');
      if (activeDonut) {
        gsap.fromTo(
          activeDonut,
          { scale: 0.86, rotation: -6, opacity: 0.6 },
          {
            scale: 1,
            rotation: 0,
            opacity: 1,
            duration: 0.7,
            ease: 'back.out(1.4)',
            overwrite: 'auto',
          }
        );
      }
      /* 활성 패널의 마퀴 텍스트 살짝 강조 — opacity 페이드 인 */
      const activeMarquee = panels[idx]?.querySelector('.flavor-marquee');
      if (activeMarquee) {
        gsap.fromTo(
          activeMarquee,
          { opacity: 0.5 },
          { opacity: 1, duration: 0.55, ease: 'power2.out', overwrite: 'auto' }
        );
      }
    }
  }

  function killFlavorSpringSlider() {
    ScrollTrigger.getAll().forEach((st) => {
      if (st.vars?.id === 'flavorSpringSlider') st.kill();
    });
    flavorST?.kill();
    flavorST = null;
  }

  /* 모바일(≤768px): GSAP pin/가로 스크롤 해제 → 패널 세로 스택 */
  function teardownFlavorSpringSlider() {
    killFlavorSpringSlider();
    drive.classList.add('is-mobile-stack');
    gsap.set(track, { x: 0, clearProps: 'x,transform' });
    drive.style.height = 'auto';
    drive.style.removeProperty('--drive-height');
    drive.style.removeProperty('--drive-height-dvh');
    track.style.width = '';
    panels.forEach((panel) => {
      panel.style.flex = '';
      panel.style.width = '';
      panel.removeAttribute('aria-hidden');
      panel.querySelectorAll('.donut-visual').forEach((el) => {
        el.style.transform = '';
      });
    });
    delete document.body.dataset.activeFlavor;
    currentPanel = 0;
    lastPanelFloat = 0;
    lastActivePanel = -1;
  }

  function setupFlavorSpringSlider() {
    if (isMobileFlavorLayout()) {
      teardownFlavorSpringSlider();
      return;
    }

    drive.classList.remove('is-mobile-stack');
    drive.style.height = '';
    killFlavorSpringSlider();
    setDriveHeight();
    setHorizontalLayout();

    const maxIdx = getMaxPanelIndex();
    if (maxIdx === 0) return;

    gsap.set(track, { x: 0 });
    panels.forEach((panel) => {
      panel.querySelectorAll('.donut-visual').forEach((el) => {
        el.style.transform = '';
      });
    });
    currentPanel = 0;
    lastPanelFloat = 0;
    updateFlavorState(0);

    flavorST = ScrollTrigger.create({
      id: 'flavorSpringSlider',
      trigger: drive,
      pin: pin,
      /* 터치 기기는 transform 기반 pin (position:fixed 보다 iOS Safari 에서 안정).
         데스크탑은 기본값('fixed')이 더 매끄러움. */
      pinType: isTouch ? 'transform' : 'fixed',
      pinSpacing: true,
      scrub: cssDriveNumber('--spring-slider-scrub', 0.9),
      start: 'top top',
      end: () => {
        const range = Math.max(1, drive.offsetHeight - getPinViewportHeight());
        return `+=${range}`;
      },
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const maxIdx = getMaxPanelIndex();
        const rawPanelFloat = progressToPanelFloat(self.progress);
        let panelFloat = rawPanelFloat;

        if (self.progress >= 0.98) {
          panelFloat = maxIdx;
        } else if (self.progress <= 0.02) {
          panelFloat = 0;
        } else {
          const jump = rawPanelFloat - lastPanelFloat;
          if (Math.abs(jump) > 0.55) {
            const maxStep = 0.5;
            panelFloat = lastPanelFloat + Math.sign(jump) * maxStep;
            panelFloat = Math.min(maxIdx, Math.max(0, panelFloat));
          }
        }

        lastPanelFloat = panelFloat;
        applyPanelTransform(panelFloat);
        updateFlavorState(Math.round(panelFloat));
      },
      onLeave: (self) => {
        if (self.progress >= 0.99) {
          lastPanelFloat = getMaxPanelIndex();
          applyPanelTransform(lastPanelFloat);
          updateFlavorState(getMaxPanelIndex());
        }
      },
    });
  }

  function scrollToPanelIndex(index, duration) {
    if (isMobileFlavorLayout()) {
      const panel = panels[Math.min(getMaxPanelIndex(), Math.max(0, index))];
      panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const st = ScrollTrigger.getById('flavorSpringSlider');
    if (!st || getMaxPanelIndex() === 0) return;

    const clamped = Math.min(getMaxPanelIndex(), Math.max(0, index));
    const targetY = st.start + (clamped / getMaxPanelIndex()) * (st.end - st.start);
    const scrollPos = { y: window.scrollY };
    const panelDuration =
      duration ?? cssDriveNumber('--spring-slider-panel-duration', 1.15);
    const root = document.documentElement;
    const prevScrollBehavior = root.style.scrollBehavior;

    root.style.scrollBehavior = 'auto';

    gsap.to(scrollPos, {
      y: targetY,
      duration: panelDuration,
      ease: 'power1.inOut',
      overwrite: true,
      onUpdate: () => window.scrollTo(0, scrollPos.y),
      onComplete: () => {
        root.style.scrollBehavior = prevScrollBehavior;
        ScrollTrigger.update();
        lastPanelFloat = clamped;
        applyPanelTransform(clamped);
        updateFlavorState(clamped);
      },
    });
  }

  function goToPanelIndex(index) {
    scrollToPanelIndex(index);
  }

  /* 인디케이터 dot 클릭/키보드 → 해당 패널로 점프 */
  flavorIndicatorDots.forEach((dot, i) => {
    dot.addEventListener('click', () => goToPanelIndex(i));
    dot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        goToPanelIndex(i);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const next = Math.min(getMaxPanelIndex(), i + 1);
        flavorIndicatorDots[next]?.focus();
        goToPanelIndex(next);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = Math.max(0, i - 1);
        flavorIndicatorDots[prev]?.focus();
        goToPanelIndex(prev);
      }
    });
  });

  function isInFlavorSliderZone() {
    if (isMobileFlavorLayout()) return false;
    const st = ScrollTrigger.getById('flavorSpringSlider');
    if (!st) return false;
    const y = window.scrollY;
    return y >= st.start - 4 && y <= st.end + 4;
  }

  pin.addEventListener(
    'wheel',
    (event) => {
      if (!isInFlavorSliderZone()) return;

      const maxIdx = getMaxPanelIndex();
      const dir = event.deltaY > 0 ? 1 : -1;
      const next = currentPanel + dir;

      /* 마지막 도넛에서 아래 / 첫 도넛에서 위 → 다음·이전 섹션 스크롤 허용 */
      if (next < 0 || next > maxIdx) return;

      event.preventDefault();
      if (wheelCooldown) return;

      wheelCooldown = true;
      scrollToPanelIndex(next);
      gsap.delayedCall(cssDriveNumber('--spring-slider-wheel-cooldown', 1.1), () => {
        wheelCooldown = false;
      });
    },
    { passive: false }
  );

  let touchStartX = 0;
  let touchStartY = 0;

  pin.addEventListener(
    'touchstart',
    (event) => {
      if (!event.touches[0]) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    },
    { passive: true }
  );

  pin.addEventListener(
    'touchend',
    (event) => {
      if (!isInFlavorSliderZone() || !event.changedTouches[0]) return;

      const dx = event.changedTouches[0].clientX - touchStartX;
      const dy = event.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;

      const maxIdx = getMaxPanelIndex();
      const next = currentPanel + (dx < 0 ? 1 : -1);
      if (next < 0 || next > maxIdx || wheelCooldown) return;

      wheelCooldown = true;
      scrollToPanelIndex(next);
      gsap.delayedCall(cssDriveNumber('--spring-slider-wheel-cooldown', 0.85), () => {
        wheelCooldown = false;
      });
    },
    { passive: true }
  );

  pin.addEventListener('keydown', (event) => {
    const maxIdx = getMaxPanelIndex();

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      if (currentPanel >= maxIdx) return;
      event.preventDefault();
      goToPanelIndex(currentPanel + 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      if (currentPanel <= 0) return;
      event.preventDefault();
      goToPanelIndex(currentPanel - 1);
    }
  });

  let resizeTimer = 0;
  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      setupFlavorSpringSlider();
      ScrollTrigger.refresh();
    }, 120);
  }

  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onResize);
  }
  if (typeof MOBILE_FLAVOR_MQ.addEventListener === 'function') {
    MOBILE_FLAVOR_MQ.addEventListener('change', onResize);
  } else if (typeof MOBILE_FLAVOR_MQ.addListener === 'function') {
    MOBILE_FLAVOR_MQ.addListener(onResize);
  }
  window.addEventListener('load', () => {
    setupFlavorSpringSlider();
    ScrollTrigger.refresh();
  });

  setupFlavorSpringSlider();
})();

/* =========================================================
   ORDER 04. Event receipt — 자동 출력 후 스크롤로 되감기
   트리거: event-section 상단이 뷰포트 --event-pin-offset 이하.
   자동 출력이 끝난 뒤에는 같은 방향으로 스크롤하면 영수증이 아래에서 위로 다시 들어갑니다.
   ========================================================= */

(() => {
  const section = document.getElementById("eventSection");
  const mask = document.getElementById("receiptMask");
  const image = document.getElementById("receiptImage");

  if (!section || !mask || !image) return;

  let maxReveal = 1181;
  let imageHeight = 0;
  let lastFed = -1;
  let played = false;
  let autoFinished = false;
  let retractScrollStart = 0;
  let animating = false;
  let rafId = 0;

  const cssNumber = (name, fallback) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  function getImageRenderedHeight() {
    const maskWidth = mask.getBoundingClientRect().width;
    if (maskWidth > 0 && image.naturalWidth > 0) {
      return (maskWidth / image.naturalWidth) * image.naturalHeight;
    }
    return image.getBoundingClientRect().height;
  }

  function getScrollY() {
    return window.scrollY || document.documentElement.scrollTop || 0;
  }

  function layoutSectionHeight() {
    section.style.removeProperty("height");
    section.style.removeProperty("max-height");
    const bakeryHeight = Math.max(
      1,
      Math.round(section.getBoundingClientRect().height) ||
      parseFloat(getComputedStyle(section).height) ||
      cssNumber("--event-bakery-bg-height", 1793)
    );
    section.style.setProperty("--event-section-height", `${bakeryHeight}px`);
    section.style.height = `${bakeryHeight}px`;
    section.style.maxHeight = `${bakeryHeight}px`;
  }

  function applyReceipt(fed) {
    const revealHeight = Math.min(fed, maxReveal);
    const offsetY = -(imageHeight - fed);

    mask.style.setProperty("--receipt-reveal-height", `${revealHeight}px`);
    mask.style.setProperty("--receipt-offset-y", `${offsetY}px`);
  }

  function easeOutCubic(t) {
    return 1 - (1 - t) ** 3;
  }

  function cancelReceiptAnimation() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    animating = false;
    mask.classList.remove("receipt-animating");
  }

  function resetReceiptState() {
    cancelReceiptAnimation();
    played = false;
    autoFinished = false;
    retractScrollStart = 0;
    lastFed = -1;
    applyReceipt(0);
  }

  function beginRetractPhase() {
    autoFinished = true;
    retractScrollStart = getScrollY();
    applyRetractFromScroll();
  }

  function applyRetractFromScroll() {
    if (!autoFinished || animating || imageHeight <= 1) return;

    const retractRange = Math.max(1, cssNumber("--event-receipt-retract-scroll", 1100));
    const delta = getScrollY() - retractScrollStart;
    const t = Math.max(0, Math.min(1, delta / retractRange));
    const fed = imageHeight * (1 - t);

    if (fed !== lastFed) {
      lastFed = fed;
      applyReceipt(fed);
    }
  }

  function syncRetractAnchorFromCurrentFed() {
    if (!autoFinished || imageHeight <= 1) return;
    const retractRange = Math.max(1, cssNumber("--event-receipt-retract-scroll", 1100));
    const fed = Math.max(0, Math.min(imageHeight, lastFed < 0 ? imageHeight : lastFed));
    const t = 1 - fed / imageHeight;
    retractScrollStart = getScrollY() - t * retractRange;
  }

  function startAutoReceiptPrint() {
    if (animating || played) return;

    imageHeight = getImageRenderedHeight();
    const cssMax = cssNumber("--receipt-max-visible", 1181);
    maxReveal = Math.max(160, Math.min(imageHeight, cssMax));

    if (imageHeight <= 1) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      played = true;
      lastFed = imageHeight;
      applyReceipt(imageHeight);
      beginRetractPhase();
      return;
    }

    played = true;
    animating = true;
    mask.classList.add("receipt-animating");

    const durationMs = cssNumber("--event-receipt-auto-duration-sec", 8.5) * 1000;
    const start = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const fed = easeOutCubic(t) * imageHeight;

      if (fed !== lastFed) {
        lastFed = fed;
        applyReceipt(fed);
      }

      if (t < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        lastFed = imageHeight;
        applyReceipt(imageHeight);
        animating = false;
        rafId = 0;
        mask.classList.remove("receipt-animating");
        beginRetractPhase();
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  function measure() {
    if (animating) {
      cancelReceiptAnimation();
      played = false;
      autoFinished = false;
    }

    imageHeight = getImageRenderedHeight();
    const cssMax = cssNumber("--receipt-max-visible", 1181);
    maxReveal = Math.max(160, Math.min(imageHeight, cssMax));
    layoutSectionHeight();

    if (!played) {
      lastFed = -1;
      applyReceipt(0);
    } else if (!autoFinished) {
      lastFed = imageHeight;
      applyReceipt(imageHeight);
    } else {
      syncRetractAnchorFromCurrentFed();
      applyRetractFromScroll();
    }
  }

  function checkScrollTrigger() {
    const pinLine = cssNumber("--event-pin-offset", 360);
    const resetGap = cssNumber("--event-trigger-reset-gap", 140);
    const top = section.getBoundingClientRect().top;

    if (top > pinLine + resetGap) {
      resetReceiptState();
      return;
    }

    if (!played && !animating && top <= pinLine) {
      startAutoReceiptPrint();
    }
  }

  let scrollScheduled = false;
  function onScroll() {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => {
      scrollScheduled = false;
      checkScrollTrigger();
      if (autoFinished && played && !animating) {
        applyRetractFromScroll();
      }
    });
  }

  function onResize() {
    measure();
    checkScrollTrigger();
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", () => {
    window.setTimeout(onResize, 150);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", onResize);
  }

  function boot() {
    measure();
    requestAnimationFrame(checkScrollTrigger);
  }

  if (image.complete) {
    boot();
  } else {
    image.addEventListener("load", boot, { once: true });
  }
})();

/* =========================================================
   Event slider + calendar month navigation
   ========================================================= */
(function () {
  document.querySelectorAll("[data-event-slider]").forEach((slider) => {
    const viewport = slider.querySelector(".event-slide-card__viewport");
    const track = slider.querySelector("[data-event-track]");
    const originals = Array.from(slider.querySelectorAll("[data-event-slide]"));
    const dots = Array.from(slider.querySelectorAll("[data-event-dot]"));
    const prevBtn = slider.querySelector("[data-event-prev]");
    const nextBtn = slider.querySelector("[data-event-next]");

    if (!viewport || !track || originals.length === 0) return;

    /* ──────────────────────────────────────────────────────────
       완전한 무한 루프 구성 (clone-based, 양옆 2개씩 클론):
         트랙 = [head2, head1, 0, 1, ..., N-1, tail1, tail2]
                 = [원본N-2, 원본N-1, 0, 1, ..., N-1, 원본0, 원본1]
         physical 인덱스 : 0..N+3
           0 = head2 (원본 N-2)
           1 = head1 (원본 N-1)
           2..N+1 = 진짜 슬라이드 0..N-1
           N+2 = tail1 (원본 0)
           N+3 = tail2 (원본 1)
         logical 인덱스 : 0..N-1

         양옆 클론이 2개씩이므로 어느 위치(진짜/클론 어디든)에서도
         좌/우 peek 가 항상 보이고, 마지막 → 첫 슬라이드 루프 시에도
         빈 공간이 노출되지 않는다. transitionend 직후 클론 위치에서
         무전환 점프로 진짜 위치 보정 → 시각적 끊김 없음.
       ────────────────────────────────────────────────────────── */
    const N = originals.length;
    const REAL_START = 2;          // 진짜 슬라이드 첫 인덱스 (head 클론 2개 다음)
    const REAL_END = N + 1;        // 진짜 슬라이드 마지막 인덱스
    const TOTAL = N + 4;           // 총 슬라이드 수 (진짜 N + 양옆 2개씩)

    /* 양옆 클론 생성 (N>=2 가정. N==1 인 경우엔 무한 루프 의미가 없음 → 그대로) */
    if (N >= 2) {
      const head2 = originals[(N - 2 + N) % N].cloneNode(true); // 원본 N-2
      const head1 = originals[(N - 1 + N) % N].cloneNode(true); // 원본 N-1
      const tail1 = originals[0].cloneNode(true);                // 원본 0
      const tail2 = originals[1 % N].cloneNode(true);            // 원본 1

      [head1, head2, tail1, tail2].forEach((c) => {
        c.classList.remove("is-active");
        c.setAttribute("data-event-clone", "true");
        c.setAttribute("aria-hidden", "true");
      });

      track.insertBefore(head1, originals[0]);
      track.insertBefore(head2, head1);
      track.appendChild(tail1);
      track.appendChild(tail2);
    }

    const slides = Array.from(slider.querySelectorAll(".event-slide-card__slide"));

    /* 상태 */
    let logical = Math.max(0, originals.findIndex((s) => s.classList.contains("is-active")));
    if (logical < 0) logical = 0;
    let physical = logical + REAL_START;
    let isTransitioning = false;
    let dragging = false;
    let startX = 0;
    let dragDelta = 0;

    /* 슬라이드 폭 / gap / 트랙 padding 을 모두 정수 픽셀로 강제 락
       — CSS 의 64% / 18px / calc(50% - ...) 가 소수픽셀(예 760.768, 213.966)로
         렌더링되면, physical * step 곱셈 + transform translate 시 누적 오차가
         서브픽셀 단위로 쌓여 클론 ↔ 진짜 슬라이드 스냅이 미세하게 보이게 됨.
       — JS 로 inline 값을 박아 모든 레이아웃 측정값을 정수에 정렬하면
         모든 슬라이드(첫·중간·마지막·클론) 위치가 1px 도 어긋나지 않음. */
    let lockedSlideWidth = 0;
    let lockedGap = 0;

    const lockSlideLayout = () => {
      if (!slides.length) return;
      const vpWidth = viewport.clientWidth;
      if (!vpWidth) return;

      /* PC/TA(≥768px): peek 모드 — 슬라이드 60vw, 양옆 padding 20vw 씩
           → 활성 슬라이드 중앙 정렬 + 이전/다음 슬라이드가 1/3 (20vw / 60vw) 노출
         MO(<768px): 1-slide 모드 — 슬라이드 100%, padding 0 */
      const isPeek = window.innerWidth >= 768;
      let slideWidth;
      let padding;
      if (isPeek) {
        padding = Math.round(vpWidth * 0.20);
        slideWidth = vpWidth - padding * 2;
      } else {
        padding = 0;
        slideWidth = Math.round(vpWidth);
      }
      const gap = 0;

      lockedSlideWidth = slideWidth;
      lockedGap = gap;

      slides.forEach((s) => {
        s.style.flex = `0 0 ${slideWidth}px`;
        s.style.width = `${slideWidth}px`;
      });
      track.style.columnGap = `0px`;
      track.style.paddingLeft = `${padding}px`;
      track.style.paddingRight = `${padding}px`;
    };

    /* 한 슬라이드의 가로 이동량 = 락된 슬라이드 폭 + 락된 gap (항상 정수) */
    const getStep = () => {
      if (!lockedSlideWidth) lockSlideLayout();
      return lockedSlideWidth + lockedGap;
    };

    const setTransition = (enabled) => {
      track.style.transition = enabled
        ? "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)"
        : "none";
    };

    /* 트랙 transform 도 정수 픽셀 — 모든 슬라이드 위치가 동일한 정수 그리드에 정렬 */
    const applyTransform = (extraPx = 0) => {
      const step = getStep();
      const x = Math.round(-physical * step + extraPx);
      track.style.transform = `translate3d(${x}px, 0, 0)`;
    };

    /* 활성 상태 동기화 (is-active 클래스 + 도트) */
    const syncActive = () => {
      slides.forEach((slide, i) => slide.classList.toggle("is-active", i === physical));
      dots.forEach((dot, i) => {
        const active = i === logical;
        dot.classList.toggle("is-active", active);
        if (active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    };

    /* 클론 위치(0,1 또는 N+2,N+3)에 머무는 경우 — 무전환 점프로 진짜 위치 보정.
       슬라이더 루트에 `.is-snapping` 을 부여하면 CSS 가 !important 로 트랙·슬라이드의
       모든 트랜지션을 차단하므로 인라인 transition 설정과 무관하게 무전환 점프가 보장된다.
       두 번의 RAF 후 클래스 제거 → 브라우저가 합성·페인트를 안정시킬 시간을 확보. */
    const normalizePhysical = () => {
      let snapped = false;
      if (physical < REAL_START) {
        physical += N;
        snapped = true;
      } else if (physical > REAL_END) {
        physical -= N;
        snapped = true;
      }
      if (snapped) {
        slider.classList.add("is-snapping");
        applyTransform(0);
        syncActive();
        /* 동일 프레임 내 reflow 강제 — 이후 transition 복구가 새 위치 기준이 되게 함 */
        void track.offsetWidth;
      }
      return snapped;
    };

    /* `is-snapping` 클래스 해제 — 다음 합성 사이클까지 두 RAF 대기.
       단일 RAF 만 사용하면 스냅 직후 첫 페인트에서 트랜지션이 다시 켜져
       잔여 보간(=버벅임)이 생길 수 있음. */
    const endSnap = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          slider.classList.remove("is-snapping");
        });
      });
    };

    /* go(delta): -1/+1 로 한 칸 이동. 진행 중이면 무시.
       정상 흐름에서는 onTransitionEnd 가 항상 진짜 위치로 보정해 두므로
       여기서 normalize 를 다시 부르지 않는다 — is-snapping 상태에서 새 애니메이션을
       시작시키는 레이스를 피하기 위함. */
    const go = (delta) => {
      if (isTransitioning) return;
      physical += delta;
      logical = ((logical + delta) % N + N) % N;
      isTransitioning = true;
      setTransition(true);
      applyTransform(0);
      syncActive();
    };

    const jumpTo = (newLogical) => {
      if (isTransitioning) return;
      const delta = newLogical - logical;
      if (delta === 0) return;
      go(delta);
    };

    /* 트랜지션 종료 → 클론 위치면 진짜 위치로 무전환 점프
       isTransitioning 은 endSnap 완료 후 해제하여 스냅 도중 auto-advance 가 끼어드는
       레이스 컨디션 방지. */
    const onTransitionEnd = (event) => {
      if (event.target !== track) return;
      if (event.propertyName && event.propertyName !== "transform") return;
      const snapped = normalizePhysical();
      if (snapped) {
        endSnap();
        /* 스냅이 끝나는 시점(약 2프레임 후)에 transitioning 해제 */
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isTransitioning = false;
          });
        });
      } else {
        isTransitioning = false;
      }
    };
    track.addEventListener("transitionend", onTransitionEnd);

    /* ── 컨트롤 ── */
    if (prevBtn) prevBtn.addEventListener("click", () => { restartAuto(); go(-1); });
    if (nextBtn) nextBtn.addEventListener("click", () => { restartAuto(); go(1); });
    dots.forEach((dot, i) => dot.addEventListener("click", () => {
      restartAuto();
      jumpTo(i);
    }));

    /* ── 포인터 드래그/스와이프 ── */
    const onDown = (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (isTransitioning) return;
      dragging = true;
      startX = event.clientX;
      dragDelta = 0;
      viewport.classList.add("is-dragging");
      track.classList.add("is-dragging");
      viewport.setPointerCapture?.(event.pointerId);
      setTransition(false);
      stopAuto();
    };

    const onMove = (event) => {
      if (!dragging) return;
      dragDelta = event.clientX - startX;
      applyTransform(dragDelta);
    };

    const onUp = (event) => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove("is-dragging");
      track.classList.remove("is-dragging");
      viewport.releasePointerCapture?.(event.pointerId);

      const threshold = Math.max(48, viewport.clientWidth * 0.12);
      setTransition(true);
      if (dragDelta < -threshold) {
        go(1);
      } else if (dragDelta > threshold) {
        go(-1);
      } else {
        applyTransform(0);
      }
      dragDelta = 0;
      startAuto();
    };

    viewport.addEventListener("pointerdown", onDown);
    viewport.addEventListener("pointermove", onMove);
    viewport.addEventListener("pointerup", onUp);
    viewport.addEventListener("pointercancel", onUp);
    viewport.addEventListener("pointerleave", (event) => {
      if (dragging) onUp(event);
    });

    /* ── 5초 자동 슬라이드 (hover/focus/탭 비활성 시 일시정지) ── */
    let autoTimer = null;
    const AUTO_MS = 5000;
    const startAuto = () => {
      stopAuto();
      if (document.hidden) return;
      autoTimer = window.setInterval(() => {
        if (!dragging && !isTransitioning) go(1);
      }, AUTO_MS);
    };
    const stopAuto = () => {
      if (autoTimer) {
        window.clearInterval(autoTimer);
        autoTimer = null;
      }
    };
    const restartAuto = () => {
      stopAuto();
      startAuto();
    };

    slider.addEventListener("mouseenter", stopAuto);
    slider.addEventListener("mouseleave", startAuto);
    slider.addEventListener("focusin", stopAuto);
    slider.addEventListener("focusout", startAuto);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopAuto(); else startAuto();
    });

    /* 리사이즈 시 슬라이드 폭 재락 → transform 재계산 */
    window.addEventListener("resize", () => {
      setTransition(false);
      lockSlideLayout();
      applyTransform(0);
      requestAnimationFrame(() => setTransition(true));
    });

    /* 초기 세팅 — 슬라이드 폭 락 후 첫 프레임은 transition 없이 위치만 잡고 활성화 */
    lockSlideLayout();
    setTransition(false);
    applyTransform(0);
    syncActive();
    requestAnimationFrame(() => setTransition(true));
    startAuto();
  });

  /* =========================================================
     EVENT CALENDAR — < June > 버튼으로 자유롭게 월 이동
     Figma 1183-357: 주별로 이벤트 컬러 도트 + 행 아래 이벤트 라벨
     ========================================================= */
  document.querySelectorAll("[data-calendar-grid]").forEach((gridEl) => {
    const card = gridEl.closest(".event-calendar-card");
    if (!card) return;
    const monthEl = card.querySelector("[data-calendar-month]");
    if (!monthEl) return;

    const MONTH_NAMES = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    /* 시안 기준 이벤트 데이터 — 키: "YYYY-MM" (월은 1~12)
       각 일에 color(이벤트 컬러)와 label(행 아래 텍스트) 부여 */
    const EVENT_DATA = {
      "2025-05": {
        5: { color: "orange", label: "해시태그 이벤트 시작" },
        14: { color: "peach", label: "복숭아 도넛 출시" },
        20: { color: "purple", label: "단체주문 이벤트 시작" },
        27: { color: "blue", label: "굿즈 이벤트 시작" },
      },
      "2025-06": {
        4: { color: "peach", label: "복숭아 도넛 출시" },
        8: { color: "orange", label: "해시태그<br>이벤트 시작" },
        23: { color: "purple", label: "단체주문<br>이벤트 시작" },
        30: { color: "blue", label: "굿즈 이벤트 시작" },
      },
      "2025-07": {
        9: { color: "orange", label: "해시태그 이벤트 종료" },
        13: { color: "peach", label: "복숭아 도넛<br>이벤트 종료" },
        21: { color: "purple", label: "단체주문 이벤트 종료" },
        29: { color: "blue", label: "굿즈 이벤트 종료" },
      },
      "2025-08": {
        5: { color: "orange", label: "해시태그<br>이벤트 시작" },
        14: { color: "peach", label: "복숭아 도넛 출시" },
        21: { color: "purple", label: "단체주문 이벤트 시작" },
        28: { color: "blue", label: "굿즈 이벤트 시작" },
      },
      "2026-06": {
        8: { color: "orange", label: "해시태그<br>이벤트 시작" },
        18: { color: "peach", label: "복숭아 도넛 출시" },
        23: { color: "purple", label: "단체주문 이벤트 시작" },
        30: { color: "blue", label: "굿즈 이벤트 시작" },
      },
    };

    /* 초기 상태: HTML의 [data-calendar-month] 텍스트 기반 (없으면 2025-06) */
    const initialName = monthEl.textContent.trim();
    const initialMonthIdx = MONTH_NAMES.indexOf(initialName);
    let year = 2025;
    let month = initialMonthIdx >= 0 ? initialMonthIdx : 5; /* 0~11 */

    const eventsFor = (y, m) => EVENT_DATA[`${y}-${String(m + 1).padStart(2, "0")}`] || {};

    const render = () => {
      const first = new Date(year, month, 1);
      const startWeekday = first.getDay();
      const totalDays = new Date(year, month + 1, 0).getDate();
      const events = eventsFor(year, month);

      monthEl.textContent = MONTH_NAMES[month];

      const weekCount = Math.ceil((startWeekday + totalDays) / 7);
      const weeksHtml = [];

      for (let w = 0; w < weekCount; w++) {
        const cells = [];
        const labels = [];

        for (let col = 0; col < 7; col++) {
          const slot = w * 7 + col;
          const day = slot - startWeekday + 1;

          if (day < 1 || day > totalDays) {
            cells.push('<span class="cal-cell cal-cell--empty"></span>');
            continue;
          }

          const isSun = col === 0;
          const ev = events[day];
          const classes = ["cal-cell"];
          if (isSun) classes.push("cal-cell--sun");
          if (ev) classes.push("cal-cell--event-" + ev.color);
          cells.push(`<span class="${classes.join(" ")}">${day}</span>`);

          if (ev && ev.label) {
            labels.push(
              `<span class="cal-week-label cal-week-label--${ev.color}" style="--col:${col}">${ev.label}</span>`
            );
          }
        }

        /* 라벨을 cal-week 안 두 번째 행(cal-week-labels-row)으로 포함
           → 이벤트 유무와 무관하게 모든 주가 동일한 grid 행 높이를 유지 */
        const labelsRow = `<span class="cal-week-labels-row">${labels.join("")}</span>`;
        weeksHtml.push(`<div class="cal-week">${cells.join("")}${labelsRow}</div>`);
      }

      /* 주 수에 맞는 CSS 클래스 부여 (4~6주) */
      gridEl.className = gridEl.className
        .replace(/\bcal-weeks-\d\b/g, "")
        .trim();
      gridEl.classList.add(`cal-weeks-${weekCount}`);

      gridEl.innerHTML = weeksHtml.join("");

      /* fade-in */
      gridEl.classList.remove("is-fade");
      void gridEl.offsetWidth;
      gridEl.classList.add("is-fade");
    };

    const prevBtn = card.querySelector("[data-calendar-prev], .event-calendar-card__nav-btn--prev");
    const nextBtn = card.querySelector("[data-calendar-next], .event-calendar-card__nav-btn--next");

    if (prevBtn) prevBtn.addEventListener("click", () => {
      month -= 1;
      if (month < 0) { month = 11; year -= 1; }
      render();
    });
    if (nextBtn) nextBtn.addEventListener("click", () => {
      month += 1;
      if (month > 11) { month = 0; year += 1; }
      render();
    });

    render();
  });
})();

/* =========================================================
   SITE HEADER (plate-nav)  +  SITE FOOTER (poppi-footer)
   ---------------------------------------------------------
   이 두 컴포넌트는 별도 파일로 분리되어 있습니다:
     · assets/js/components/site-header.js
     · assets/js/components/site-footer.js
   각 HTML 페이지에서 두 스크립트를 main.js 보다 먼저 로드하고,
   <body> 안 적당한 위치에 마커를 두면 자동 마운트됩니다:
     <div data-include="site-header"></div>
     <div data-include="site-footer"></div>
   ========================================================= */
(function () {
  if (document.querySelector("[data-plate-nav]")) return;

  /* 페이지 위치를 자동 감지해서 자산/페이지 경로 prefix 를 결정한다.
     - index.html 은 프로젝트 루트 → assets="./assets", pages="./pages"
     - pages/*.html 은 한 단계 하위 → assets="../assets", pages="."  */
  const inPagesFolder = /\/pages\//i.test(location.pathname);
  const assetPrefix = inPagesFolder ? "../assets" : "./assets";
  const pagePrefix = inPagesFolder ? "." : "./pages";
  const indexHref = inPagesFolder ? "../index.html" : "./index.html";

  const plateSrc = `${assetPrefix}/images/nav/plate-menu.png`;
  const plateCloseSrc = `${assetPrefix}/images/nav/plate-close.png`;

  /* 메뉴 항목 (좌측 / 우측 컬럼) */
  const items = [
    { label: "HOME", href: indexHref, key: "home" },
    { label: "BRAND", href: `${pagePrefix}/brand-story.html`, key: "brand" },
    { label: "MENU", href: `${pagePrefix}/menu.html`, key: "menu" },
    { label: "STORE", href: `${pagePrefix}/store.html`, key: "store" },
    { label: "BUSINESS", href: `${pagePrefix}/business.html`, key: "business" },
    { label: "SUPPORT", href: `${pagePrefix}/support.html`, key: "support" },
    { label: "EVENT", href: `${pagePrefix}/event-news.html`, key: "event" },
    { label: "SHOP", href: "#", key: "shop", external: true },
  ];

  /* 현재 페이지 파일명 추출 (기본: index.html) */
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const currentKey =
    path.includes("event") ? "event" :
      path.includes("brand") ? "brand" :
        path.includes("store") ? "store" :
          path.includes("support") ? "support" :
            path.includes("business") ? "business" :
              path.includes("menu") ? "menu" :
                "home";

  /* HTML 빌드 */
  const root = document.createElement("div");
  root.setAttribute("data-plate-nav", "");

  const renderItem = (it) => {
    const active = it.key === currentKey ? " is-active" : "";
    const arrow = it.external ? '<span class="plate-nav-arrow" aria-hidden="true">↗</span>' : "";
    return `<a href="${it.href}" class="plate-nav-item${active}" data-nav-key="${it.key}">${it.label}${arrow}</a>`;
  };

  const leftCol = items.slice(0, 4).map(renderItem).join("");
  const rightCol = items.slice(4).map(renderItem).join("");

  root.innerHTML = `
    <button class="plate-nav-btn" type="button" aria-label="메뉴 열기" data-nav-open>
      <img src="${plateSrc}" alt="POPPI 메뉴" />
    </button>
    <div class="plate-nav-overlay" data-nav-overlay role="dialog" aria-modal="true" aria-label="전체 메뉴" hidden>
      <button class="plate-nav-close" type="button" aria-label="메뉴 닫기" data-nav-close>
        <img src="${plateCloseSrc}" alt="메뉴 닫기" />
      </button>
      <nav class="plate-nav-menu" aria-label="사이트 전체 메뉴">
        <div class="plate-nav-col">${leftCol}</div>
        <div class="plate-nav-col">${rightCol}</div>
      </nav>
    </div>
  `;

  document.body.appendChild(root);

  const overlay = root.querySelector("[data-nav-overlay]");
  const openBtn = root.querySelector("[data-nav-open]");
  const closeBtn = root.querySelector("[data-nav-close]");

  let scrollLock = 0;

  const lockScroll = () => {
    scrollLock = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollLock}px`;
    document.body.style.width = "100%";
  };

  const unlockScroll = () => {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    window.scrollTo(0, scrollLock);
  };

  const openMenu = () => {
    overlay.hidden = false;
    /* 다음 프레임에 클래스 추가 → 트랜지션 fade-in */
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    lockScroll();
    /* 첫 항목에 포커스 — 키보드 사용성 */
    const first = overlay.querySelector(".plate-nav-item");
    if (first) first.focus({ preventScroll: true });
  };

  const closeMenu = () => {
    overlay.classList.remove("is-open");
    setTimeout(() => {
      overlay.hidden = true;
      unlockScroll();
      openBtn.focus({ preventScroll: true });
    }, 350);
  };

  openBtn.addEventListener("click", openMenu);
  closeBtn.addEventListener("click", closeMenu);
  overlay.addEventListener("click", (e) => {
    /* 배경 클릭 시에만 닫기 (메뉴/버튼 영역은 제외) */
    if (e.target === overlay) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeMenu();
  });

  /* 메뉴 항목 클릭 처리:
     - 같은 페이지 해시 링크(예: index.html#event)이면 메뉴를 먼저 닫아 스크롤 잠금을 풀고,
       해제가 끝난 뒤 해당 섹션으로 부드럽게 스크롤한다.
     - 다른 페이지로 가는 링크는 메뉴만 닫고 기본 이동을 그대로 둔다. */
  const isSamePageHash = (href) => {
    if (!href) return false;
    try {
      const url = new URL(href, location.href);
      const samePath =
        url.pathname.replace(/\/+$/, "") === location.pathname.replace(/\/+$/, "") &&
        url.origin === location.origin;
      return samePath && !!url.hash;
    } catch (_) {
      return false;
    }
  };

  overlay.querySelectorAll(".plate-nav-item").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href") || "";
      if (link.dataset.navKey === "shop") {
        e.preventDefault();
        closeMenu();
        setTimeout(() => {
          if (window.SiteReadyModal) window.SiteReadyModal.open("shop");
        }, 380);
        return;
      }

      if (isSamePageHash(href)) {
        e.preventDefault();
        const hash = new URL(href, location.href).hash;
        const targetId = decodeURIComponent(hash.slice(1));
        const target = targetId ? document.getElementById(targetId) : null;

        closeMenu();
        /* closeMenu 의 트랜지션(≈350ms) 후 스크롤 잠금이 해제되므로,
           그 다음에 스크롤을 실행해야 정확한 위치로 이동한다. */
        setTimeout(() => {
          if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            /* URL 해시도 갱신해 두면 새로고침/공유 시 동일 위치로 진입할 수 있다 */
            history.replaceState(null, "", hash);
          } else {
            location.hash = hash;
          }
        }, 380);
      } else {
        /* 다른 페이지로 이동: 사용자에게 메뉴가 살짝 닫히는 피드백을 주고 이동 */
        closeMenu();
      }
    });
  });
})();

/* =========================================================
   COMMON FOOTER — Contact / Logo / Quick Menu 자동 주입
   - 모든 페이지에서 중복 작성하지 않고 main.js 한 곳에서 관리합니다.
   - 이미 .poppi-footer-wrap 이 있는 경우에는 중복 생성하지 않습니다.
   ========================================================= */
(function () {
  if (document.querySelector('.poppi-footer-wrap')) return;

  const inPagesFolder = /\/pages\//i.test(location.pathname);
  const assetPrefix = inPagesFolder ? '../assets' : './assets';
  const pagePrefix = inPagesFolder ? '.' : './pages';
  const indexHref = inPagesFolder ? '../index.html' : './index.html';

  const wrap = document.createElement('div');
  wrap.className = 'poppi-footer-wrap';
  wrap.setAttribute('data-common-footer', '');

  wrap.innerHTML = `
    <footer class="poppi-footer" aria-label="POPPI DONUTS footer">
      <img class="footer-bg" src="${assetPrefix}/images/footer/footer-PC.png" alt="" aria-hidden="true" decoding="async" style="border-radius: inherit;" />

      <div class="footer-info">
        <section class="footer-col footer-contact" aria-label="Contact information">
          <h2>Contact</h2>
          <ul>
            <li>Seoul, South Korea</li>
            <li>Mon - Sun / 10:00 - 22:00</li>
            <li>hello@poppi-donut.com</li>
            <li>+82 02-567-1025</li>
          </ul>
        </section>

        <section class="footer-center" aria-label="POPPI brand area">
          <img class="footer-logo" src="${assetPrefix}/images/footer/logo-poppi-donuts.png" alt="POPPI DONUTS" />
          <p class="footer-tagline">small sweet moments everyday.</p>
        </section>

        <section class="footer-col footer-menu" aria-label="Quick menu">
          <h2>Quick Menu</h2>
          <div class="menu-grid">
            <ul>
              <li><a href="${pagePrefix}/brand-story.html">Brand</a></li>
              <li><a href="${pagePrefix}/menu.html">Menu</a></li>
              <li><a href="${pagePrefix}/store.html">Store</a></li>
              <li><a href="${pagePrefix}/business.html">Business</a></li>
            </ul>
            <ul>
              <li><a href="${pagePrefix}/event-news.html">Event</a></li>
              <li><a href="${pagePrefix}/support.html">Support</a></li>
              <li><a href="#" class="js-ready-trigger" data-ready-variant="shop">Shop <span class="arrow" aria-hidden="true">↗</span></a></li>
            </ul>
          </div>
        </section>
      </div>

      <div class="footer-rights">
        <nav class="footer-legal" aria-label="Legal links">
          <a href="#" class="footer-legal__btn">이용약관</a>
          <span class="footer-legal__sep" aria-hidden="true">|</span>
          <a href="#" class="footer-legal__btn">개인정보처리방침</a>
        </nav>
        <div class="footer-socials" aria-label="social links">
          <a href="https://www.threads.com/@poppidonuts?igshid=NTc4MTIwNjQ2YQ==" target="_blank" rel="noopener noreferrer" aria-label="Threads"><img src="${assetPrefix}/images/footer/icon-threads.png" alt="" /></a>
          <a href="https://github.com/dltjsrb/POPPI_Donut" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><img src="${assetPrefix}/images/footer/icon-github.png" alt="" /></a>
          <a href="https://www.instagram.com/poppidonuts/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><img src="${assetPrefix}/images/footer/icon-instagram.png" alt="" /></a>
        </div>
        <p class="footer-copyright">© 2025 POPPI. All rights reserved.</p>
      </div>
    </footer>
  `;

  const main = document.querySelector('main');
  if (main) {
    main.insertAdjacentElement('afterend', wrap);
  } else {
    document.body.appendChild(wrap);
  }
})();

/* ===== MERGED: review-slider.js -> main.js ===== */
(() => {
  const root = document.querySelector('[data-poppi-slider]');
  if (!root) return;

  const phoneScreen = root.querySelector('[data-phone-screen]');
  const phoneTrack = root.querySelector('[data-phone-track]');
  const thumbTrack = root.querySelector('[data-thumb-track]');

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
  const AUTOPLAY_DELAY = 2000;
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

  function ensureAutoplayRunning() {
    if (prefersReducedMotion || document.hidden || isDragging) return;
    if (autoplayTimer === null) startAutoplay();
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

  /* 슬라이더 위로 마우스가 올라오면 자동 재생 일시정지 (UX) — 모달 오버레이 시에는 유지 */
  root.addEventListener('pointerenter', () => {
    if (document.body.classList.contains('is-modal-open')) return;
    stopAutoplay();
  });
  root.addEventListener('pointerleave', () => {
    if (!isDragging) startAutoplay();
  });

  /* 이용약관 모달 열림/닫힘 — 갤러리 자동 슬라이드 계속 재생 */
  document.addEventListener('poppi:legal-modal-open', () => {
    requestAnimationFrame(ensureAutoplayRunning);
  });
  document.addEventListener('poppi:legal-modal-close', () => {
    requestAnimationFrame(() => {
      if (!isDragging) restartAutoplay();
    });
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

  window.addEventListener('resize', () => {
    setPosition(false);
    if (document.body.classList.contains('is-modal-open')) {
      ensureAutoplayRunning();
    }
  });

  buildInfiniteTracks();
  setPosition(false);
  startAutoplay();
})();

/* =========================================================
   PC/TA hero 캐러셀 — 좌측 4장 슬라이드 + 우측 도트 인디케이터
   - 도트 클릭 시 .pc-hero__track 을 translateX(-index * 100%) 이동
   - 7초 자동 회전(prefers-reduced-motion 또는 hidden 시 정지)
   - hover 시 일시 정지(데스크톱 마우스 환경에서만)
   ========================================================= */
(function () {
  const root  = document.querySelector('[data-pchero]');
  if (!root) return;
  const track = root.querySelector('[data-pchero-track]');
  const dotsWrap = root.querySelector('[data-pchero-dots]');
  if (!track || !dotsWrap) return;

  const dots = Array.from(dotsWrap.querySelectorAll('.pc-hero__dot'));
  const slides = Array.from(track.children);
  const carousel = root.querySelector('.pc-hero__carousel');
  const swipeArea = root.querySelector('.pc-hero__media') || carousel;
  const slideCount = Math.min(slides.length, dots.length);
  if (slideCount === 0 || !carousel || !swipeArea) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = 0;
  let timer = null;
  let dragging = false;
  let startX = 0;
  let dragDelta = 0;
  const AUTOPLAY_MS = 7000;

  const setTransition = (enabled) => {
    track.style.transition =
      enabled && !reduceMotion ? '' : 'none';
  };

  const applyDragOffset = (offsetPx) => {
    track.style.transform = `translateX(calc(-${current * 100}% + ${offsetPx}px))`;
  };

  /* ── 슬라이드 안의 <video> 동기화 ─────────────────────────────────────
     - 활성 슬라이드의 비디오는 play (currentTime=0 으로 항상 처음부터)
     - 비활성 슬라이드의 비디오는 pause (CPU/배터리 절약)
     - 이미지 슬라이드는 영향 없음 */
  const syncVideos = () => {
    slides.forEach((slide, i) => {
      const v = slide.tagName === 'VIDEO' ? slide : slide.querySelector('video');
      if (!v) return;
      if (i === current) {
        try { v.currentTime = 0; } catch (e) {}
        const p = v.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } else {
        try { v.pause(); } catch (e) {}
      }
    });
  };

  const goTo = (index, { animate = true } = {}) => {
    current = ((index % slideCount) + slideCount) % slideCount;
    setTransition(animate);
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => {
      const active = i === current;
      d.classList.toggle('is-active', active);
      d.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    syncVideos();
  };

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  const startAuto = () => {
    if (reduceMotion) return;
    stopAuto();
    timer = window.setInterval(next, AUTOPLAY_MS);
  };
  const stopAuto = () => {
    if (timer) { window.clearInterval(timer); timer = null; }
  };

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => { goTo(i); startAuto(); });
    dot.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); startAuto(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prev(); startAuto(); }
    });
  });

  /* 캐러셀 드래그/스와이프 — pc-hero__dot 순서와 동일 (좌→다음, 우→이전) */
  const onCarouselDown = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    dragDelta = 0;
    swipeArea.classList.add('is-dragging');
    carousel.classList.add('is-dragging');
    track.classList.add('is-dragging');
    swipeArea.setPointerCapture?.(event.pointerId);
    setTransition(false);
    stopAuto();
  };

  const onCarouselMove = (event) => {
    if (!dragging) return;
    dragDelta = event.clientX - startX;
    applyDragOffset(dragDelta);
  };

  const onCarouselUp = (event) => {
    if (!dragging) return;
    dragging = false;
    swipeArea.classList.remove('is-dragging');
    carousel.classList.remove('is-dragging');
    track.classList.remove('is-dragging');
    swipeArea.releasePointerCapture?.(event.pointerId);

    const threshold = Math.max(48, swipeArea.clientWidth * 0.12);
    if (dragDelta < -threshold) {
      next();
    } else if (dragDelta > threshold) {
      prev();
    } else {
      goTo(current);
    }
    dragDelta = 0;
    startAuto();
  };

  swipeArea.addEventListener('pointerdown', onCarouselDown);
  swipeArea.addEventListener('pointermove', onCarouselMove);
  swipeArea.addEventListener('pointerup', onCarouselUp);
  swipeArea.addEventListener('pointercancel', onCarouselUp);
  swipeArea.addEventListener('pointerleave', (event) => {
    if (dragging) onCarouselUp(event);
  });

  /* hover 일시 정지 (포인터 환경에서만) */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    root.addEventListener('mouseenter', stopAuto);
    root.addEventListener('mouseleave', startAuto);
  }

  /* 탭 hidden 시 자동 정지 */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAuto(); else startAuto();
  });

  /* 화면 밖이면 정지 — 배터리/CPU 절약 */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startAuto();
          syncVideos();
        } else {
          stopAuto();
          /* 화면 밖이면 모든 비디오 정지 */
          slides.forEach((s) => {
            const v = s.tagName === 'VIDEO' ? s : s.querySelector('video');
            if (v) { try { v.pause(); } catch (e) {} }
          });
        }
      });
    }, { threshold: 0.2 });
    io.observe(root);
  } else {
    startAuto();
  }

  /* ──────────────────────────────────────────────────────────────
     PC Hero 데코 blob 마우스 패럴랙스 — 매우 미세하게(±0.5%)
     - 디자인 의도: "거의 안 보일 정도" 의 살아있는 호흡 (사용자 brief)
     - reduced-motion / 모바일·태블릿 / 호버 디바이스 X / hero off-screen 시 비활성
     - rAF throttle + transform composite (translate3d) 로 GPU 친화
     ────────────────────────────────────────────────────────────── */
  const blobs = Array.from(root.querySelectorAll('.pc-hero__blob'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)');
  const wideViewport = window.matchMedia('(min-width: 1025px)');

  if (blobs.length && finePointer.matches && wideViewport.matches && !reducedMotion.matches) {
    let rectCx = 0, rectCy = 0, rectW = 1, rectH = 1;
    let tgtX = 0, tgtY = 0;
    let curX = 0, curY = 0;
    let active = true;
    let rafId = 0;

    /* blob 별 강도 — 위치별로 미세하게 다르게 (각 0.4% ~ 0.6% 폭 내 이동) */
    const intensity = [
      { x: 0.006,  y: 0.005  },
      { x: -0.005, y: 0.006  },
      { x: 0.005,  y: -0.005 },
    ];

    function updateRect() {
      const r = root.getBoundingClientRect();
      rectCx = r.left + r.width / 2;
      rectCy = r.top + r.height / 2;
      rectW = r.width || 1;
      rectH = r.height || 1;
    }
    updateRect();
    window.addEventListener('resize', updateRect, { passive: true });
    window.addEventListener('scroll', updateRect, { passive: true });

    function onMove(e) {
      if (!active) return;
      const dx = (e.clientX - rectCx) / (rectW / 2);
      const dy = (e.clientY - rectCy) / (rectH / 2);
      tgtX = Math.max(-1, Math.min(1, dx));
      tgtY = Math.max(-1, Math.min(1, dy));
      if (!rafId) rafId = requestAnimationFrame(loop);
    }
    function loop() {
      curX += (tgtX - curX) * 0.06;
      curY += (tgtY - curY) * 0.06;
      blobs.forEach((el, i) => {
        const k = intensity[i % intensity.length];
        const px = curX * k.x * rectW;
        const py = curY * k.y * rectH;
        el.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0)`;
      });
      if (Math.abs(tgtX - curX) > 0.001 || Math.abs(tgtY - curY) > 0.001) {
        rafId = requestAnimationFrame(loop);
      } else {
        rafId = 0;
      }
    }
    window.addEventListener('mousemove', onMove, { passive: true });

    /* hero 보일 때만 활성 (위 IntersectionObserver 와 같은 root 재활용) */
    if ('IntersectionObserver' in window) {
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          active = entry.isIntersecting;
          if (!active) {
            tgtX = 0; tgtY = 0;
            if (!rafId) rafId = requestAnimationFrame(loop);
          }
        });
      }, { threshold: 0.05 });
      io2.observe(root);
    }
  }
})();
