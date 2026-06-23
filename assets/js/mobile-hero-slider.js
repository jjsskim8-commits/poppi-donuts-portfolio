/* =========================================================
   Mobile Hero Slider (≤768px only)
   - 4장 배경 페이드 자동 슬라이더
   - hero가 화면 밖일 때 자동 정지 (IntersectionObserver, 배터리 절약)
   - prefers-reduced-motion / 백그라운드 탭 시 자동 일시정지
   - 768px 초과 화면에서는 비활성화 (성능)
   ========================================================= */
(() => {
  const root = document.querySelector('[data-mhero]');
  if (!root) return;

  const slider = root.querySelector('[data-mhero-slider]');
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll('.m-hero__slide'));
  if (!slides.length) return;

  const AUTO_DELAY = 4500;
  const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mql = window.matchMedia('(max-width: 768px)');

  let current = 0;
  let timer = null;
  /* hero가 viewport 안에 보이는지 (IntersectionObserver) */
  let isVisible = true;

  /* ---------- prefers-reduced-motion: SVG 필터 안의 SMIL <animate> 정지 ----------
     CSS animation 은 미디어쿼리로 멈출 수 있지만 SVG SMIL은 그게 안 되므로
     사용자 모션 거부 시 svg 필터의 <animate> 들을 명시적으로 stop() 호출. */
  if (prefersReduce) {
    const svgAnims = root.querySelectorAll('.m-hero__svg-defs animate');
    svgAnims.forEach((a) => {
      try { a.beginElement && a.beginElement(); a.endElement && a.endElement(); } catch (e) {}
    });
  }

  /* ---------- hero 가 화면 밖이면 SVG 필터 SMIL 도 함께 멈춤 ----------
     feTurbulence + feDisplacementMap 은 GPU 비용이 비싸므로 안 보일 땐 정지. */
  const svgAnimateNodes = root.querySelectorAll('.m-hero__svg-defs animate');
  function setBlobAnimRunning(run) {
    svgAnimateNodes.forEach((a) => {
      try {
        if (run) { a.beginElement && a.beginElement(); }
        else     { a.endElement   && a.endElement();   }
      } catch (e) {}
    });
  }

  /* 슬라이드 내 <video> 동기화 — 활성 슬라이드만 처음부터 재생 */
  function syncVideos() {
    slides.forEach((slide, i) => {
      const v = slide.querySelector('video');
      if (!v) return;
      if (i === current) {
        try { v.currentTime = 0; } catch (e) {}
        const p = v.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } else {
        try { v.pause(); } catch (e) {}
      }
    });
  }

  function goTo(idx) {
    current = ((idx % slides.length) + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('is-active', i === current));
    syncVideos();
  }

  function next() { goTo(current + 1); }

  function stopAuto() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  /* 자동 회전을 시작해도 되는 모든 조건이 만족될 때만 startAuto 실행 */
  function maybeStartAuto() {
    stopAuto();
    if (prefersReduce) return;
    if (!mql.matches) return;
    if (!isVisible) return;
    if (document.hidden) return;
    timer = setInterval(next, AUTO_DELAY);
  }

  /* ---------- 헤더 햄버거 slot ↔ 기존 .plate-nav-btn 이동 ----------
     모바일(≤768px) 진입 시: .plate-nav-btn 을 hero 헤더 slot 안으로 이동
     PC/TA 복귀 시          : 원래 부모(body)로 되돌림
     → 기존 도넛 이미지 버튼/오버레이 동작/접근성 그대로 재사용 */
  const menuSlot = root.querySelector('[data-mhero-menu-slot]');
  let plateBtnOriginalParent = null;
  let plateBtnOriginalNext   = null;

  function syncPlateBtnPlacement() {
    const plateBtn = document.querySelector('.plate-nav-btn');
    if (!plateBtn || !menuSlot) return;

    if (mql.matches) {
      if (plateBtn.parentNode !== menuSlot) {
        plateBtnOriginalParent = plateBtn.parentNode;
        plateBtnOriginalNext   = plateBtn.nextSibling;
        menuSlot.appendChild(plateBtn);
      }
    } else {
      if (plateBtnOriginalParent && plateBtn.parentNode === menuSlot) {
        if (plateBtnOriginalNext && plateBtnOriginalNext.parentNode === plateBtnOriginalParent) {
          plateBtnOriginalParent.insertBefore(plateBtn, plateBtnOriginalNext);
        } else {
          plateBtnOriginalParent.appendChild(plateBtn);
        }
      }
    }
  }

  /* main.js의 plate-nav IIFE가 .plate-nav-btn 을 body에 주입한 직후 한 번 동기화.
     일부 환경에서 주입이 약간 늦을 수 있으므로 짧은 재시도 폴링(최대 1초) 사용 */
  let tries = 0;
  const initialSync = () => {
    if (document.querySelector('.plate-nav-btn')) {
      syncPlateBtnPlacement();
      return;
    }
    if (++tries < 20) setTimeout(initialSync, 50);
  };
  initialSync();

  /* ---------- 백그라운드 탭 시 일시정지 ---------- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAuto();
    else maybeStartAuto();
  });

  /* ---------- IntersectionObserver — hero가 화면 밖이면 자동/SVG morph 정지 ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
          if (isVisible) {
            maybeStartAuto();
            if (!prefersReduce) setBlobAnimRunning(true);
            syncVideos(); /* 다시 보이면 활성 슬라이드 비디오 재생 */
          } else {
            stopAuto();
            setBlobAnimRunning(false);
            /* 화면 밖이면 모든 슬라이드 비디오 정지 (배터리/CPU 절약) */
            slides.forEach((s) => {
              const v = s.querySelector('video');
              if (v) { try { v.pause(); } catch (e) {} }
            });
          }
        });
      },
      { threshold: 0.25 }
    );
    io.observe(root);
  }

  /* ---------- 뷰포트 폭 변화 감지 (모바일/PC 토글) ---------- */
  function handleViewport() {
    syncPlateBtnPlacement();
    if (mql.matches) maybeStartAuto();
    else stopAuto();
  }
  if (mql.addEventListener) mql.addEventListener('change', handleViewport);
  else if (mql.addListener) mql.addListener(handleViewport);

  goTo(0);
  handleViewport();
})();
