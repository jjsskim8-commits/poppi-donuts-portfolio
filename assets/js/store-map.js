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
// 테스팅
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
  const searchBtns = Array.from(document.querySelectorAll('[data-store-search]'));
  const nearbyBtn  = document.querySelector('[data-store-nearby]');

  /* ───── 상태 ───── */
  let mapInstance = null;
  let activeMapMarkers = [];
  let lastVisibleItems = [];                /* 가장 최근에 그린 가시 매장 (리사이즈 재-fit 용) */
  let resizeObs = null;                     /* ResizeObserver 핸들 */
  let resizeTimer = null;                   /* debounce 타이머 */

  /* ───── 대한민국 영역 클램프 설정 ─────
     사용자가 일본/중국까지 드래그하지 못하도록 idle 시점에 한국 경계 박스 안으로 되돌림.
     수치는 본토+제주 + 약간의 여유를 포함하는 BBox (lat: 33.0~38.9, lng: 124.5~131.9). */
  const KOREA_SW = { lat: 33.0, lng: 124.5 };
  const KOREA_NE = { lat: 38.9, lng: 131.9 };

  function clampToKorea() {
    if (!mapInstance || !window.kakao || !window.kakao.maps) return;
    const c = mapInstance.getCenter();
    const lat = c.getLat();
    const lng = c.getLng();
    const cl = Math.min(Math.max(lat, KOREA_SW.lat), KOREA_NE.lat);
    const cg = Math.min(Math.max(lng, KOREA_SW.lng), KOREA_NE.lng);
    if (cl !== lat || cg !== lng) {
      mapInstance.panTo(new kakao.maps.LatLng(cl, cg));
    }
  }

  /* ───── 유틸 ───── */
  function debounce(fn, ms) {
    return function () {
      const args = arguments;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  /* 지도 fit 시 좌측 매장 리스트 오버레이(380px)에 가려지지 않도록
     동적으로 패딩을 계산. 모바일에서는 오버레이가 다르게 배치되므로 0 처리. */
  function computeFitPadding() {
    const basePad = 60;
    const listEl = document.querySelector('.store-search__list');
    const mapRect = mapEl.getBoundingClientRect();
    if (!listEl || mapRect.width === 0) {
      return { top: basePad, right: basePad, bottom: basePad, left: basePad };
    }
    const listRect = listEl.getBoundingClientRect();
    /* 리스트가 지도 좌측에 겹쳐 떠 있는 데스크탑 레이아웃에서만 좌측 패딩 증가 */
    const overlapsLeft =
      listRect.left >= mapRect.left - 4 &&
      listRect.left < mapRect.left + mapRect.width * 0.6 &&
      listRect.width > 0 &&
      listRect.width < mapRect.width;
    const extraLeft = overlapsLeft ? Math.round(listRect.width + 40) : basePad;
    return { top: basePad, right: basePad, bottom: basePad, left: extraLeft };
  }

  /* 현재 가시 매장 기준으로 bounds 재계산 (renderMarkers 와 resize 양쪽에서 사용) */
  function refitToVisible(items) {
    if (!mapInstance || !items || items.length === 0) return;
    const pad = computeFitPadding();
    if (items.length >= 2) {
      const bounds = new kakao.maps.LatLngBounds();
      items.forEach((item) => {
        const lat = parseFloat(item.dataset.lat);
        const lng = parseFloat(item.dataset.lng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return;
        bounds.extend(new kakao.maps.LatLng(lat, lng));
      });
      mapInstance.setBounds(bounds, pad.top, pad.right, pad.bottom, pad.left);
    } else if (items.length === 1) {
      const it = items[0];
      const lat = parseFloat(it.dataset.lat);
      const lng = parseFloat(it.dataset.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        mapInstance.panTo(new kakao.maps.LatLng(lat, lng));
      }
    }
  }

  /* 컨테이너 크기 변경(반응형/회전) 시:
       1) Kakao 내부 캔버스 재배치 — relayout()
       2) 다음 프레임에 가시 매장 기준 bounds 재-fit
     디바운스 적용으로 드래그 리사이즈 도중 과호출 방지. */
  const handleContainerResize = debounce(() => {
    if (!mapInstance) return;
    mapInstance.relayout();
    /* relayout 직후엔 컨테이너 사이즈가 아직 안정화 안 됐을 수 있어 RAF 로 한 프레임 미룸 */
    requestAnimationFrame(() => {
      mapInstance.relayout();
      refitToVisible(lastVisibleItems);
    });
  }, 120);

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
      const desc = fallback.querySelector('.store-search__map-fallback-desc');
      if (desc) {
        desc.textContent =
          'Kakao SDK 로드에 실패했습니다. Live Server(또는 실제 도메인)에서 실행 중인지, Kakao Developers 콘솔의 Web 플랫폼에 현재 도메인/localhost가 등록되어 있는지 확인해 주세요.';
      }
    }
  }

  function loadKakao(key) {
    return new Promise((resolve, reject) => {
      if (window.kakao && window.kakao.maps) return resolve();
      const script = document.createElement('script');
      // file:// 환경에서는 프로토콜 상대 URL이 깨질 수 있어 https로 보정
      const base =
        typeof location !== 'undefined' && location.protocol === 'file:'
          ? 'https://dapi.kakao.com'
          : '//dapi.kakao.com';
      script.src = `${base}/v2/maps/sdk.js?autoload=false&appkey=${encodeURIComponent(key)}&libraries=services`;
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

  if (!KAKAO_APP_KEY || KAKAO_APP_KEY === 'KAKAO_APP_KEY') {
    showFallback();
  } else {
    loadKakao(KAKAO_APP_KEY)
      .then(() => initMap())
      .catch(() => showFallback('Kakao Map 로드에 실패했습니다'));
  }

  /* ───── 지도 컨테이너 사이즈 보장 ─────
     Kakao Map 은 컨테이너가 0×0 인 상태에서 생성되면 내부 캔버스가 0으로 고정돼
     이후 relayout 으로도 회복이 잘 안 됩니다. 특히 모바일 바텀시트 레이아웃이
     아직 계산되기 전(첫 paint 직후)에 init 이 호출되면 발생.
     → 인라인 min-* 으로 최소치를 미리 깔아 안전장치 마련. */
  function ensureMapSize() {
    if (!mapEl) return;
    const cs = window.getComputedStyle(mapEl);
    /* 명시적 height/width 가 0 이거나 auto 일 때만 보강 (CSS 가 잘 깔린 경우 덮어쓰지 않음) */
    if (mapEl.offsetHeight < 100) mapEl.style.minHeight = '320px';
    if (mapEl.offsetWidth  < 100) mapEl.style.minWidth  = '100%';
    /* display:none 으로 막혀있는 경우엔 명시적으로 block 처리 */
    if (cs.display === 'none') mapEl.style.display = 'block';
  }

  /* ───── 지도 초기화 ───── */
  function initMap() {
    ensureMapSize();

    const center = pickCenterFromList();
    try {
      mapInstance = new kakao.maps.Map(mapEl, {
        center: new kakao.maps.LatLng(center.lat, center.lng),
        level: 10, /* 전국 매장 보이도록 좀 넓게 시작 */
      });
    } catch (err) {
      console.error('[kakao-map] 지도 생성 실패 — 도메인/키 등록 확인 필요', err);
      showFallback('지도 생성에 실패했습니다');
      return;
    }

    /* 한국 영역 밖으로 줌아웃 막기 (값이 클수록 더 넓게 보임 — 13 ≈ 전국이 한눈에) */
    if (typeof mapInstance.setMaxLevel === 'function') mapInstance.setMaxLevel(13);
    if (typeof mapInstance.setMinLevel === 'function') mapInstance.setMinLevel(1);

    /* 사용자의 드래그/줌이 멈춘 idle 시점에 중심이 한국 밖이면 되돌림 */
    kakao.maps.event.addListener(mapInstance, 'idle', clampToKorea);

    applyFilters(); /* 초기 마커 + 자동 fit */

    /* ── 첫 paint 직후 모바일 레이아웃 안정화용 다단계 relayout ──
       (CSS clamp/svh/grid 가 적용되는 데 한두 프레임이 필요한 경우가 있음) */
    requestAnimationFrame(() => {
      mapInstance.relayout();
      requestAnimationFrame(() => {
        mapInstance.relayout();
        refitToVisible(lastVisibleItems);
      });
    });
    /* 일부 모바일 브라우저에서 첫 페인트가 더 늦게 끝나는 케이스 안전망 */
    setTimeout(() => {
      if (!mapInstance) return;
      mapInstance.relayout();
      refitToVisible(lastVisibleItems);
    }, 400);

    /* ── 컨테이너 크기 변경 감지 ──
       window resize 만으로는 ".store-search__map" 자체의 크기 변화를 못 잡는 경우가 있어
       ResizeObserver 로 컨테이너를 직접 관찰. 둘 다 묶어 안전망 구성. */
    if (typeof ResizeObserver !== 'undefined') {
      resizeObs = new ResizeObserver(() => handleContainerResize());
      resizeObs.observe(mapEl);
      const wrap = mapEl.closest('.store-search__map-wrap');
      if (wrap && wrap !== mapEl) resizeObs.observe(wrap);
      /* 모바일 바텀시트 변형(열림/접힘) 도 컨테이너 사이즈에 영향을 주므로 stage 도 관찰 */
      const stage = document.querySelector('[data-store-search-stage]');
      if (stage) resizeObs.observe(stage);
    }
    window.addEventListener('resize', handleContainerResize);
    window.addEventListener('orientationchange', handleContainerResize);

    /* 페이지가 백그라운드 → 포그라운드로 돌아왔을 때 회복(모바일 탭 전환 시 종종 발생) */
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) handleContainerResize();
    });
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

    /* 현재 가시 매장을 보관 — 리사이즈/회전 시 동일 항목으로 재-fit */
    lastVisibleItems = visibleItems.slice();

    /* visible 매장 다수면 bounds fit (좌측 리스트 오버레이 고려한 동적 패딩),
       1건이면 panTo, 0건이면 그대로 */
    if (visibleItems.length >= 2) {
      refitToVisible(visibleItems);
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
  searchBtns.forEach((btn) => btn.addEventListener('click', applyFilters));

  function distanceKm(lat1, lng1, lat2, lng2) {
    const r = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function activateNearestStore(lat, lng) {
    const visible = listItems.filter((item) => item.style.display !== 'none');
    const pool = visible.length > 0 ? visible : listItems;
    let nearest = null;
    let minD = Infinity;
    pool.forEach((item) => {
      const lat2 = parseFloat(item.dataset.lat);
      const lng2 = parseFloat(item.dataset.lng);
      if (Number.isNaN(lat2) || Number.isNaN(lng2)) return;
      const d = distanceKm(lat, lng, lat2, lng2);
      if (d < minD) {
        minD = d;
        nearest = item;
      }
    });
    if (nearest) activateItem(nearest, true);
  }

  if (nearbyBtn) {
    nearbyBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        window.alert('이 브라우저에서는 위치 정보를 사용할 수 없습니다.');
        return;
      }
      nearbyBtn.disabled = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          nearbyBtn.disabled = false;
          const { latitude, longitude } = pos.coords;
          if (mapInstance) {
            mapInstance.setLevel(6);
            mapInstance.panTo(new kakao.maps.LatLng(latitude, longitude));
          }
          activateNearestStore(latitude, longitude);
        },
        () => {
          nearbyBtn.disabled = false;
          window.alert('위치 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.');
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
      );
    });
  }
})();
