/* =========================================================
   site-header.js — 공통 헤더(PLATE NAV) 컴포넌트
   ---------------------------------------------------------
   사용 방법:
     1. <head> 안에 assets/css/header.css 가 이미 로드되어 있어야 함
     2. <body> 안의 적당한 위치(보통 <body> 직후)에 마커 삽입:
          <div data-include="site-header"></div>
        마커가 없으면 자동으로 <body> 끝에 append 됨 (구버전 호환)
     3. <script src="../assets/js/components/site-header.js"></script>
        (main.js 보다 먼저 또는 같이 로드)

   기능:
     • plate-nav 고정 버튼 + 풀스크린 오버레이
     • location.pathname 기반 현재 페이지 active 자동 판정
     • 메뉴 항목 클릭 시 같은 페이지 해시면 부드러운 스크롤
     • Esc / 배경 클릭 / 닫기 버튼 모두 동작
     • 오버레이 열림 동안 body 스크롤 잠금

   data-no-header 가 body 에 있으면 마운트하지 않음.
   ========================================================= */
(function (root) {
  "use strict";

  function mount() {
    if (document.body && document.body.hasAttribute("data-no-header")) return;
    if (document.querySelector("[data-plate-nav]")) return;

    /* 페이지 위치 기반 자산/페이지 경로 prefix 결정.
       - index.html (루트): assets="./assets", pages="./pages"
       - pages/*.html : assets="../assets", pages="."  */
    var inPagesFolder = /\/pages\//i.test(location.pathname);
    var assetPrefix = inPagesFolder ? "../assets" : "./assets";
    var pagePrefix  = inPagesFolder ? "."         : "./pages";
    var indexHref   = inPagesFolder ? "../index.html" : "./index.html";

    var plateSrc      = assetPrefix + "/images/nav/plate-menu.png";
    var plateCloseSrc = assetPrefix + "/images/nav/plate-close.png";

    var items = [
      { label: "HOME",     href: indexHref,                          key: "home"     },
      { label: "BRAND",    href: pagePrefix + "/brand-story.html",   key: "brand"    },
      { label: "MENU",     href: pagePrefix + "/menu.html",          key: "menu"     },
      { label: "STORE",    href: pagePrefix + "/store.html",         key: "store"    },
      { label: "BUSINESS", href: pagePrefix + "/business.html",      key: "business" },
      { label: "SUPPORT",  href: pagePrefix + "/support.html",       key: "support"  },
      { label: "EVENT",    href: pagePrefix + "/event-news.html",    key: "event"    },
      { label: "SHOP",     href: "#",                                key: "shop", external: true }
    ];

    var path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    var currentKey =
      path.indexOf("event")    !== -1 ? "event"    :
      path.indexOf("brand")    !== -1 ? "brand"    :
      path.indexOf("store")    !== -1 ? "store"    :
      path.indexOf("support")  !== -1 ? "support"  :
      path.indexOf("business") !== -1 ? "business" :
      path.indexOf("menu")     !== -1 ? "menu"     :
      "home";

    var rootEl = document.createElement("div");
    rootEl.setAttribute("data-plate-nav", "");

    function renderItem(it) {
      var active = it.key === currentKey ? " is-active" : "";
      var arrow = it.external ? '<span class="plate-nav-arrow" aria-hidden="true">↗</span>' : "";
      return '<a href="' + it.href + '" class="plate-nav-item' + active + '" data-nav-key="' + it.key + '">' + it.label + arrow + '</a>';
    }

    var leftCol  = items.slice(0, 4).map(renderItem).join("");
    var rightCol = items.slice(4).map(renderItem).join("");

    rootEl.innerHTML =
      '<button class="plate-nav-btn" type="button" aria-label="메뉴 열기" data-nav-open>' +
        '<img src="' + plateSrc + '" alt="POPPI 메뉴" />' +
      '</button>' +
      '<div class="plate-nav-overlay" data-nav-overlay role="dialog" aria-modal="true" aria-label="전체 메뉴" hidden>' +
        '<button class="plate-nav-close" type="button" aria-label="메뉴 닫기" data-nav-close>' +
          '<img src="' + plateCloseSrc + '" alt="메뉴 닫기" />' +
        '</button>' +
        '<nav class="plate-nav-menu" aria-label="사이트 전체 메뉴">' +
          '<div class="plate-nav-col">' + leftCol  + '</div>' +
          '<div class="plate-nav-col">' + rightCol + '</div>' +
        '</nav>' +
      '</div>';

    /* 마운트 위치: data-include="site-header" 마커가 있으면 그 자리에,
       없으면 body 마지막에 append (오버레이는 fixed 라 위치 무관). */
    var marker = document.querySelector('[data-include="site-header"]');
    if (marker && marker.parentNode) {
      marker.parentNode.replaceChild(rootEl, marker);
    } else {
      document.body.appendChild(rootEl);
    }

    var overlay  = rootEl.querySelector("[data-nav-overlay]");
    var openBtn  = rootEl.querySelector("[data-nav-open]");
    var closeBtn = rootEl.querySelector("[data-nav-close]");

    var scrollLock = 0;

    function lockScroll() {
      scrollLock = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = "-" + scrollLock + "px";
      document.body.style.width = "100%";
    }

    function unlockScroll() {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollLock);
    }

    function openMenu() {
      overlay.hidden = false;
      requestAnimationFrame(function () { overlay.classList.add("is-open"); });
      lockScroll();
      var first = overlay.querySelector(".plate-nav-item");
      if (first) first.focus({ preventScroll: true });
    }

    function closeMenu() {
      overlay.classList.remove("is-open");
      setTimeout(function () {
        overlay.hidden = true;
        unlockScroll();
        if (openBtn) openBtn.focus({ preventScroll: true });
      }, 350);
    }

    if (openBtn)  openBtn.addEventListener("click", openMenu);
    if (closeBtn) closeBtn.addEventListener("click", closeMenu);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !overlay.hidden) closeMenu();
    });

    function isSamePageHash(href) {
      if (!href) return false;
      try {
        var url = new URL(href, location.href);
        var samePath =
          url.pathname.replace(/\/+$/, "") === location.pathname.replace(/\/+$/, "") &&
          url.origin === location.origin;
        return samePath && !!url.hash;
      } catch (_) {
        return false;
      }
    }

    overlay.querySelectorAll(".plate-nav-item").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var href = link.getAttribute("href") || "";
        if (link.dataset.navKey === "shop") {
          e.preventDefault();
          closeMenu();
          setTimeout(function () {
            if (root.SiteReadyModal) root.SiteReadyModal.open("shop");
          }, 380);
          return;
        }

        if (isSamePageHash(href)) {
          e.preventDefault();
          var hash = new URL(href, location.href).hash;
          var targetId = decodeURIComponent(hash.slice(1));
          var target = targetId ? document.getElementById(targetId) : null;

          closeMenu();
          /* closeMenu 트랜지션(≈350ms) 후 스크롤 잠금이 풀린 다음 이동 */
          setTimeout(function () {
            if (target) {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
              history.replaceState(null, "", hash);
            } else {
              location.hash = hash;
            }
          }, 380);
        } else {
          closeMenu();
        }
      });
    });
  }

  /* 외부 명시 호출용 API */
  root.SiteHeader = { mount: mount };

  /* DOM 준비 시점 자동 마운트 */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})(window);
