/* ===== MERGED FROM assets/js/interior-carousel.js ===== */
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
    const first = slides[0];
    if (!first) return 0;
    const rect = first.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || '0') || 0;
    return rect.width + gap;
  }

  function applyTransform(offsetPx = 0) {
    const x = -(domPos * slideAdvance()) + offsetPx;
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

/* ===== MERGED FROM assets/js/store-map.js ===== */
/*
  Kakao Map 연동 — POPPI Store 매장 검색
  ───────────────────────────────────────
  필터 입력원 (모두 AND 결합, 한 번이라도 비면 조건 무시):
    · [data-filter-city]      : 도/시 (서울특별시, 인천광역시, 경기도, 부산광역시)
    · [data-filter-district]  : 구/군 (강남구, 마포구, 송파구 …)
    · [data-filter-type]      : 점포유형 (주차 가능, 드라이브스루, 테라스) — data-type 가 콤마구분 값일 경우 포함
    · [data-store-keyword-top]: 상단 검색 입력 (매장명/주소 부분일치)
    · [data-store-keyword]    : 좌측 패널 검색 입력 (매장명/주소 부분일치)

  동작:
    1) 어떤 필터든 바뀌면 applyFilters() 즉시 재계산 → 리스트 show/hide
    2) 지도 마커도 visible 매장만 다시 그려서 동기화
    3) 결과가 1건 이상이면 자동으로 bounds 맞춰 fit, 0건이면 "검색 결과가 없습니다." 표시
    4) 검색 버튼 클릭/Enter — 키워드 강제 동기화 + 재계산
    5) 리스트 항목 클릭 — 해당 매장으로 지도 panTo + active 표시

  설치:
    카카오 개발자 콘솔(https://developers.kakao.com) 에서 JS 키 발급 후 KAKAO_APP_KEY 교체.
    키가 비어있거나 잘못된 경우, 지도 영역에 안내가 표시됩니다.
*/
(() => {
  const KAKAO_APP_KEY = 'a89dbba1679e6b91737dfe1223d8c5d4';

  /* ───── DOM 참조 ───── */
  const mapEl = document.getElementById('kakao-map');
  if (!mapEl) return;

  const fallback   = document.querySelector('[data-map-fallback]');
  const listItems  = Array.from(document.querySelectorAll('[data-store-id]'));
  const emptyMsg   = document.querySelector('[data-store-empty]');

  const cityEl     = document.querySelector('[data-filter-city]');
  const districtEl = document.querySelector('[data-filter-district]');
  const typeEl     = document.querySelector('[data-filter-type]');
  const keywordTop = document.querySelector('[data-store-keyword-top]');
  const keywordSide= document.querySelector('[data-store-keyword]');
  const searchBtn  = document.querySelector('[data-store-search]');

  /* ───── 상태 ───── */
  let mapInstance = null;
  let activeMapMarkers = [];

  /* ───── 도/시 → 구/군 매핑 (data-* 속성에서 자동 추출, 매장 추가 시 자동 반영) ───── */
  const CITY_DISTRICTS = {};
  listItems.forEach((item) => {
    const city = item.dataset.city;
    const district = item.dataset.district;
    if (!city || !district) return;
    if (!CITY_DISTRICTS[city]) CITY_DISTRICTS[city] = new Set();
    CITY_DISTRICTS[city].add(district);
  });
  /* Set → 정렬된 배열로 변환 */
  Object.keys(CITY_DISTRICTS).forEach((city) => {
    CITY_DISTRICTS[city] = Array.from(CITY_DISTRICTS[city]).sort((a, b) => a.localeCompare(b, 'ko'));
  });
  /* 전체 구/군 목록 (city 미선택 시 노출) */
  const ALL_DISTRICTS = Array.from(
    new Set(Object.values(CITY_DISTRICTS).flat())
  ).sort((a, b) => a.localeCompare(b, 'ko'));

  function populateDistrictDropdown(selectedCity) {
    if (!districtEl) return;
    const prev = districtEl.value;                /* 기존 선택값 보존 시도 */
    const hasCity = !!(selectedCity && CITY_DISTRICTS[selectedCity]);
    const list = hasCity ? CITY_DISTRICTS[selectedCity] : [];

    /* 기존 옵션 제거 후 재구성 */
    districtEl.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '구/군 선택';
    districtEl.appendChild(placeholder);
    list.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d;
      opt.textContent = d;
      districtEl.appendChild(opt);
    });

    /* 도/시 미선택 → 구/군 비활성화 + 값 리셋 */
    districtEl.disabled = !hasCity;
    districtEl.parentElement?.classList.toggle('is-disabled', !hasCity);

    /* 도/시 변경 후에도 기존 구/군이 새 목록에 있으면 유지, 아니면 리셋 */
    districtEl.value = hasCity && list.includes(prev) ? prev : '';
  }

  /* ───── Kakao SDK 로드 ───── */
  function showFallback(message) {
    mapEl.style.display = 'none';
    if (!fallback) return;
    fallback.hidden = false;
    if (message) {
      const title = fallback.querySelector('.store-search__map-fallback-title');
      if (title) title.textContent = message;
    }
  }

  function loadKakao(key) {
    return new Promise((resolve, reject) => {
      if (window.kakao && window.kakao.maps) return resolve();
      const script = document.createElement('script');
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${encodeURIComponent(key)}&libraries=services`;
      script.async = true;
      script.onload = () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(resolve);
        } else {
          reject(new Error('kakao-load'));
        }
      };
      script.onerror = () => reject(new Error('kakao-script-error'));
      document.head.appendChild(script);
    });
  }

  if (!KAKAO_APP_KEY) {
    showFallback();
  } else {
    loadKakao(KAKAO_APP_KEY)
      .then(() => initMap())
      .catch(() => showFallback('Kakao Map 로드에 실패했습니다'));
  }

  /* ───── 지도 초기화 ───── */
  function initMap() {
    const center = pickCenterFromList();
    mapInstance = new kakao.maps.Map(mapEl, {
      center: new kakao.maps.LatLng(center.lat, center.lng),
      level: 10, /* 전국 매장 보이도록 좀 넓게 시작 */
    });
    applyFilters(); /* 초기 마커 + 자동 fit */
  }

  function pickCenterFromList() {
    const active = listItems.find((el) => el.classList.contains('is-active')) || listItems[0];
    if (!active) return { lat: 37.5665, lng: 126.978 };
    return {
      lat: parseFloat(active.dataset.lat) || 37.5665,
      lng: parseFloat(active.dataset.lng) || 126.978,
    };
  }

  /* ───── 마커 렌더링 (visible 매장만) ───── */
  function clearMarkers() {
    activeMapMarkers.forEach((m) => m.setMap(null));
    activeMapMarkers = [];
  }

  function renderMarkers(visibleItems) {
    if (!mapInstance) return;
    clearMarkers();

    visibleItems.forEach((item) => {
      const lat = parseFloat(item.dataset.lat);
      const lng = parseFloat(item.dataset.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;
      const pos = new kakao.maps.LatLng(lat, lng);

      const marker = new kakao.maps.Marker({ position: pos, map: mapInstance });
      const name = item.querySelector('.store-search__store-name')?.textContent.trim() || '';
      const overlay = new kakao.maps.CustomOverlay({
        position: pos,
        content: `<div class="map-pin"><span>${name}</span></div>`,
        yAnchor: 1.6,
      });
      overlay.setMap(mapInstance);

      /* 마커 클릭 → 리스트 active + panTo */
      kakao.maps.event.addListener(marker, 'click', () => activateItem(item, /*pan*/ true));

      activeMapMarkers.push(marker, overlay);
    });

    /* visible 매장 다수면 bounds fit, 1건이면 panTo, 0건이면 그대로 */
    if (visibleItems.length >= 2) {
      const bounds = new kakao.maps.LatLngBounds();
      visibleItems.forEach((item) => {
        bounds.extend(new kakao.maps.LatLng(parseFloat(item.dataset.lat), parseFloat(item.dataset.lng)));
      });
      mapInstance.setBounds(bounds, 80, 80, 80, 80);
    } else if (visibleItems.length === 1) {
      const it = visibleItems[0];
      mapInstance.setLevel(5);
      mapInstance.panTo(new kakao.maps.LatLng(parseFloat(it.dataset.lat), parseFloat(it.dataset.lng)));
    }
  }

  /* ───── 필터 본체 ───── */
  function syncKeywords(source) {
    /* 두 키워드 입력값을 양방향 동기화 (사용자가 어느 쪽에 쳐도 동일 동작) */
    if (!keywordTop || !keywordSide) return;
    if (source === keywordTop) keywordSide.value = keywordTop.value;
    else if (source === keywordSide) keywordTop.value = keywordSide.value;
  }

  function getFilterState() {
    const kw = (keywordTop?.value || keywordSide?.value || '').trim().toLowerCase();
    return {
      city: cityEl?.value || '',
      district: districtEl?.value || '',
      type: typeEl?.value || '',
      keyword: kw,
    };
  }

  function matchesFilter(item, f) {
    if (f.city && item.dataset.city !== f.city) return false;
    if (f.district && item.dataset.district !== f.district) return false;
    if (f.type) {
      const types = (item.dataset.type || '').split(',').map((s) => s.trim());
      if (!types.includes(f.type)) return false;
    }
    if (f.keyword) {
      const name = item.querySelector('.store-search__store-name')?.textContent.toLowerCase() || '';
      const addr = item.querySelector('.store-search__store-addr')?.textContent.toLowerCase() || '';
      if (!name.includes(f.keyword) && !addr.includes(f.keyword)) return false;
    }
    return true;
  }

  function applyFilters() {
    const f = getFilterState();
    const visible = [];

    listItems.forEach((item) => {
      const match = matchesFilter(item, f);
      item.style.display = match ? '' : 'none';
      if (match) visible.push(item);
    });

    /* 결과 없음 메시지 */
    if (emptyMsg) emptyMsg.hidden = visible.length > 0;

    /* 지도 마커 동기화 */
    if (mapInstance) renderMarkers(visible);

    /* 현재 active 가 hidden 되면 첫 visible 을 active 로 */
    const activeStillVisible = visible.some((it) => it.classList.contains('is-active'));
    if (!activeStillVisible && visible.length > 0) {
      listItems.forEach((it) => it.classList.toggle('is-active', it === visible[0]));
    }
  }

  /* ───── 인터랙션 ───── */
  function activateItem(item, pan = false) {
    listItems.forEach((other) => other.classList.toggle('is-active', other === item));
    if (!mapInstance || !pan) return;
    const lat = parseFloat(item.dataset.lat);
    const lng = parseFloat(item.dataset.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    mapInstance.setLevel(5);
    mapInstance.panTo(new kakao.maps.LatLng(lat, lng));
  }

  listItems.forEach((item) => {
    item.addEventListener('click', () => activateItem(item, /*pan*/ true));
  });

  /* 도/시 변경 → 구/군 드롭다운 재구성 + 필터 재계산 */
  if (cityEl) {
    cityEl.addEventListener('change', () => {
      populateDistrictDropdown(cityEl.value);
      applyFilters();
    });
  }
  /* 구/군·점포유형 변경 → 즉시 필터 */
  [districtEl, typeEl].forEach((el) => {
    if (el) el.addEventListener('change', applyFilters);
  });

  /* 초기 진입 시 구/군 옵션을 도/시 기준으로 1회 정리 (HTML 의 정적 옵션 → 동적 일관) */
  populateDistrictDropdown(cityEl?.value || '');

  /* 키워드 입력 → 양방향 동기화 + 즉시 필터 */
  if (keywordTop) {
    keywordTop.addEventListener('input', () => { syncKeywords(keywordTop); applyFilters(); });
    keywordTop.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyFilters(); }});
  }
  if (keywordSide) {
    keywordSide.addEventListener('input', () => { syncKeywords(keywordSide); applyFilters(); });
    keywordSide.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); applyFilters(); }});
  }
  /* 돋보기 버튼 → 강제 재계산 */
  if (searchBtn) searchBtn.addEventListener('click', applyFilters);
})();

/* ===== MERGED FROM inline script in pages/store.html  ===== */
/* 스크롤 fade-in reveal — IntersectionObserver 기반 */
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
