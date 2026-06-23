/* =========================================================

   BRAND STORY — 타임라인 마커 등장 모션 (ScrollTrigger)

   ---------------------------------------------------------

   • 모든 뷰포트(PC / 태블릿 / 모바일) 동일 방식

     — 마커(아이콘)마다 개별 트리거, 스크롤 시 하나씩 등장

   • 아래에서 위로 (opacity + y), scale 바운스 없음

   • 스크롤 업 시 자연스럽게 되감김 (scrub)

   • GSAP/ScrollTrigger 없으면 IntersectionObserver 폴백

   • prefers-reduced-motion → 즉시 표시

   ========================================================= */

(() => {

  const section = document.querySelector('.brand-story-section');

  const markers = Array.from(document.querySelectorAll('.brand-roadmap__marker'));

  if (!section || !markers.length) return;



  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;



  const SCROLL_START = 'top 90%';

  const SCROLL_END = 'top 72%';

  const SCRUB = 0.42;

  const REVEAL_EASE = 'power2.out';

  const REVEAL_DURATION = 0.85;

  const MEDIA_Y_RATIO = 0.55;



  /** 뷰포트별 등장 거리 */

  function revealOffsetPx() {

    const w = window.innerWidth;

    if (w <= 767) return 52;

    if (w <= 1023) return 72;

    if (w <= 1440) return 88;

    return 100;

  }



  /** PC 절대좌표에서도 실제 화면 위치 기준 — 아이콘 우선 */

  function scrollTriggerEl(marker) {

    return marker.querySelector('.brand-roadmap__media') || marker;

  }



  if (prefersReduced) {

    markers.forEach((el) => el.classList.add('is-visible'));

    return;

  }



  const hasGSAP = !!(window.gsap && window.ScrollTrigger);



  /* ---------- Fallback: GSAP 미로드 — IntersectionObserver ---------- */

  if (!hasGSAP) {

    const io = new IntersectionObserver(

      (entries) => {

        entries.forEach((entry) => {

          const m = entry.target.closest('.brand-roadmap__marker') || entry.target;

          if (!m.classList.contains('brand-roadmap__marker')) return;

          if (entry.intersectionRatio >= 0.35) {

            m.classList.add('is-visible');

          } else if (entry.intersectionRatio <= 0.08) {

            m.classList.remove('is-visible');

          }

        });

      },

      {

        threshold: [0, 0.08, 0.22, 0.4, 0.6],

        rootMargin: '0px 0px -38% 0px',

      }

    );

    markers.forEach((m) => io.observe(scrollTriggerEl(m)));

    return;

  }



  /* ---------- GSAP + ScrollTrigger — PC / 태블릿 / 모바일 공통 ---------- */

  const { gsap } = window;

  const { ScrollTrigger } = window;

  gsap.registerPlugin(ScrollTrigger);



  document.body.classList.add('js-roadmap-anim');



  const yOffset = revealOffsetPx();

  const mediaYOffset = yOffset * MEDIA_Y_RATIO;



  const mediaEls = markers

    .map((marker) => marker.querySelector('.brand-roadmap__media'))

    .filter(Boolean);



  gsap.set(markers, { opacity: 0, y: yOffset, willChange: 'transform, opacity' });

  if (mediaEls.length) {

    gsap.set(mediaEls, { y: mediaYOffset, willChange: 'transform' });

  }



  markers.forEach((marker) => {

    const media = marker.querySelector('.brand-roadmap__media');

    const tl = gsap.timeline({

      scrollTrigger: {

        trigger: scrollTriggerEl(marker),

        start: SCROLL_START,

        end: SCROLL_END,

        scrub: SCRUB,

        invalidateOnRefresh: true,

      },

    });



    tl.to(marker, { opacity: 1, y: 0, ease: REVEAL_EASE, duration: REVEAL_DURATION });

    if (media) {

      tl.to(media, { y: 0, ease: REVEAL_EASE, duration: REVEAL_DURATION }, 0);

    }

  });



  const refreshRoadmap = () => {

    ScrollTrigger.refresh();

  };



  window.addEventListener('load', refreshRoadmap, { once: true });



  let resizeTimer;

  window.addEventListener('resize', () => {

    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(refreshRoadmap, 150);

  });

})();


