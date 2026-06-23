/* =========================================================
   site-footer.js — 공통 푸터(POPPI FOOTER) 컴포넌트
   ---------------------------------------------------------
   사용 방법:
     1. <head> 안에 assets/css/footer.css 가 이미 로드되어 있어야 함
     2. <main> 직후 등 적당한 위치에 마커 삽입:
          <div data-include="site-footer"></div>
        마커가 없으면 <main> 다음, 혹은 <body> 끝에 자동 append.
     3. <script src="../assets/js/components/site-footer.js"></script>

   data-no-footer 가 body 에 있으면 마운트하지 않음.
   ========================================================= */
(function (root) {
  "use strict";

  /* 모달은 푸터 마운트 여부와 관계없이 한 번 보장 + 이벤트 위임으로 영구 바인딩 */
  function ensureLegal() {
    mountLegalModals();
    bindLegalTriggers();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureLegal, { once: true });
  } else {
    ensureLegal();
  }

  function mount() {
    if (document.body && document.body.hasAttribute("data-no-footer")) return;
    if (document.querySelector(".poppi-footer-wrap")) return;

    var inPagesFolder = /\/pages\//i.test(location.pathname);
    var assetPrefix = inPagesFolder ? "../assets" : "./assets";
    var pagePrefix  = inPagesFolder ? "."         : "./pages";

    var wrap = document.createElement("div");
    wrap.className = "poppi-footer-wrap";
    wrap.setAttribute("data-common-footer", "");

    wrap.innerHTML =
      '<footer class="poppi-footer" aria-label="POPPI DONUTS footer">' +
        '<img class="footer-bg" src="' + assetPrefix + '/images/footer/footer-PC.png" alt="" aria-hidden="true" decoding="async" />' +

        '<div class="footer-info">' +
          '<section class="footer-col footer-contact" aria-label="Contact information">' +
            '<h2>Contact</h2>' +
            '<ul>' +
              '<li>Seoul, South Korea</li>' +
              '<li>Mon - Sun / 10:00 - 22:00</li>' +
              /* 사용자 요청 — 이메일/전화번호는 링크가 아닌 일반 텍스트 */
              '<li>hello@poppi-donut.com</li>' +
              '<li>+82 02-567-1025</li>' +
            '</ul>' +
          '</section>' +

          '<section class="footer-center" aria-label="POPPI brand area">' +
            '<img class="footer-logo" src="' + assetPrefix + '/images/footer/logo-poppi-donuts.png" alt="POPPI DONUTS" />' +
            '<p class="footer-tagline">small sweet moments everyday.</p>' +
          '</section>' +

          '<section class="footer-col footer-menu" aria-label="Quick menu">' +
            '<h2>Quick Menu</h2>' +
            '<div class="menu-grid">' +
              '<ul>' +
                '<li><a href="' + pagePrefix + '/brand-story.html">Brand</a></li>' +
                '<li><a href="' + pagePrefix + '/menu.html">Menu</a></li>' +
                '<li><a href="' + pagePrefix + '/store.html">Store</a></li>' +
                '<li><a href="' + pagePrefix + '/business.html">Business</a></li>' +
              '</ul>' +
              '<ul>' +
                '<li><a href="' + pagePrefix + '/event-news.html">Event</a></li>' +
                '<li><a href="' + pagePrefix + '/support.html">Support</a></li>' +
                '<li><a href="#" class="js-ready-trigger" data-ready-variant="shop">Shop <span class="arrow" aria-hidden="true">↗</span></a></li>' +
              '</ul>' +
            '</div>' +
          '</section>' +
        '</div>' +

        '<div class="footer-rights">' +
          /* 사용자 요청 — brand-copy 자리에 이용약관/개인정보처리방침 버튼 배치 */
          '<nav class="footer-legal" aria-label="Legal links">' +
            '<a href="#" class="footer-legal__btn">이용약관</a>' +
            '<span class="footer-legal__sep" aria-hidden="true">|</span>' +
            '<a href="#" class="footer-legal__btn">개인정보처리방침</a>' +
          '</nav>' +
          '<div class="footer-socials" aria-label="social links">' +
            '<a href="https://www.threads.com/@poppidonuts?igshid=NTc4MTIwNjQ2YQ==" target="_blank" rel="noopener noreferrer" aria-label="Threads"><img src="' + assetPrefix + '/images/footer/icon-threads.png" alt="" /></a>' +
            '<a href="https://github.com/dltjsrb/POPPI_Donut" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><img src="' + assetPrefix + '/images/footer/icon-github.png" alt="" /></a>' +
            '<a href="https://www.instagram.com/poppidonuts/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><img src="' + assetPrefix + '/images/footer/icon-instagram.png" alt="" /></a>' +
          '</div>' +
          '<p class="footer-copyright">© 2025 POPPI. All rights reserved.</p>' +
        '</div>' +
      '</footer>';

    /* 마운트 위치 우선순위:
         1) [data-include="site-footer"] 마커 자리
         2) <main> 바로 다음
         3) <body> 마지막 */
    var marker = document.querySelector('[data-include="site-footer"]');
    if (marker && marker.parentNode) {
      marker.parentNode.replaceChild(wrap, marker);
    } else {
      var main = document.querySelector("main");
      if (main) {
        main.insertAdjacentElement("afterend", wrap);
      } else {
        document.body.appendChild(wrap);
      }
    }

    /* Legal 모달 + 이벤트는 ensureLegal() 에서 이미 처리되므로 여기선 호출하지 않음 */
  }

  /* =========================================================
     이용약관 모달 콘텐츠
     ========================================================= */
  var TERMS_HTML =
    '<div class="legal-modal" id="modal-terms" role="dialog" aria-modal="true" aria-labelledby="modal-terms-title" hidden>' +
      '<div class="legal-modal__overlay" data-modal-close></div>' +
      '<div class="legal-modal__panel">' +
        '<div class="legal-modal__box" role="document">' +
          '<h2 class="legal-modal__title" id="modal-terms-title">이용약관</h2>' +

          '<h3 class="legal-modal__h">제1조 (목적)</h3>' +
          '<p class="legal-modal__p">본 약관은 POPPi DONUTS(이하 "회사")가 제공하는 웹사이트 및 관련 서비스의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>' +

          '<h3 class="legal-modal__h">제2조 (서비스 내용)</h3>' +
          '<p class="legal-modal__p">회사는 다음과 같은 서비스를 제공합니다.\n  · 브랜드 및 메뉴 정보 제공\n  · 공지사항 및 이벤트 안내\n  · 매장 및 가맹 문의 서비스\n  · 기타 회사가 제공하는 콘텐츠 서비스</p>' +

          '<h3 class="legal-modal__h">제3조 (저작권)</h3>' +
          '<p class="legal-modal__p">웹사이트 내 모든 콘텐츠(이미지, 로고, 텍스트 등)의 저작권은 회사에 있으며, 사전 동의 없이 무단 복제 및 사용을 금합니다.</p>' +

          '<h3 class="legal-modal__h">제4조 (서비스 이용 제한)</h3>' +
          '<p class="legal-modal__p">이용자는 다음 행위를 해서는 안 됩니다.\n\n  · 사이트 운영을 방해하는 행위\n  · 허위 정보 등록\n  · 회사 및 제3자의 권리를 침해하는 행위\n  · 법령에 위반되는 행위</p>' +

          '<h3 class="legal-modal__h">제5조 (서비스 변경 및 중단)</h3>' +
          '<p class="legal-modal__p">회사는 운영상 또는 기술상의 필요에 따라 서비스의 일부 또는 전부를 변경하거나 중단할 수 있습니다.</p>' +

          '<h3 class="legal-modal__h">제6조 (개인정보 보호)</h3>' +
          '<p class="legal-modal__p">회사는 관련 법령에 따라 이용자의 개인정보를 보호하며, 자세한 사항은 개인정보처리방침을 따릅니다.</p>' +

          '<h3 class="legal-modal__h">제7조 (문의)</h3>' +
          '<p class="legal-modal__p">서비스 이용과 관련한 문의는 고객센터 또는 공식 이메일을 통해 가능합니다.\n본 약관은 2026년 5월 20일부터 적용됩니다.</p>' +
        '</div>' +
        '<button type="button" class="legal-modal__close" data-modal-close aria-label="닫기">×</button>' +
      '</div>' +
    '</div>';

  /* =========================================================
     개인정보처리방침 모달 콘텐츠
     ========================================================= */
  var PRIVACY_HTML =
    '<div class="legal-modal" id="modal-privacy" role="dialog" aria-modal="true" aria-labelledby="modal-privacy-title" hidden>' +
      '<div class="legal-modal__overlay" data-modal-close></div>' +
      '<div class="legal-modal__panel">' +
        '<div class="legal-modal__box" role="document">' +
          '<h2 class="legal-modal__title" id="modal-privacy-title">개인정보처리방침</h2>' +

          '<p class="legal-modal__p">POPPi DONUTS(이하 "회사")는 이용자의 개인정보를 중요하게 생각하며, 「개인정보 보호법」 등 관련 법령을 준수하고 있습니다. 회사는 본 개인정보처리방침을 통해 이용자가 제공한 개인정보가 어떠한 용도와 방식으로 이용되고 있으며, 개인정보 보호를 위해 어떤 조치가 이루어지고 있는지 안내드립니다.</p>' +

          '<h3 class="legal-modal__h">1. 수집하는 개인정보 항목</h3>' +
          '<p class="legal-modal__p">회사는 서비스 이용을 위해 아래와 같은 개인정보를 수집할 수 있습니다.\n  · 이름\n  · 연락처\n  · 이메일 주소\n  · 문의 내용\n  · 접속 로그 및 쿠키 정보</p>' +

          '<h3 class="legal-modal__h">2. 개인정보 수집 및 이용 목적</h3>' +
          '<p class="legal-modal__p">회사는 수집한 개인정보를 다음 목적을 위해 활용합니다.\n\n  · 고객 문의 응대\n  · 가맹 문의 상담\n  · 공지사항 및 서비스 정보 제공\n  · 서비스 개선 및 운영 관리</p>' +

          '<h3 class="legal-modal__h">3. 개인정보 보유 및 이용 기간</h3>' +
          '<p class="legal-modal__p">회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.\n단, 관련 법령에 따라 일정 기간 보관이 필요한 경우에는 해당 기간 동안 보관할 수 있습니다.</p>' +

          '<h3 class="legal-modal__h">4. 개인정보 제3자 제공</h3>' +
          '<p class="legal-modal__p">회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다.\n다만, 다음의 경우에는 예외로 합니다.\n  · 이용자의 사전 동의를 받은 경우\n  · 법령의 규정에 의거하거나 수사기관의 요청이 있는 경우</p>' +

          '<h3 class="legal-modal__h">5. 개인정보 보호를 위한 조치</h3>' +
          '<p class="legal-modal__p">회사는 개인정보 보호를 위하여 다음과 같은 조치를 시행하고 있습니다.\n  · 개인정보 접근 제한\n  · 보안 시스템 운영\n  · 개인정보 취급자 최소화\n  · 정기적인 보안 점검</p>' +

          '<h3 class="legal-modal__h">6. 쿠키(Cookie) 사용 안내</h3>' +
          '<p class="legal-modal__p">회사는 보다 나은 서비스 제공을 위해 쿠키를 사용할 수 있습니다.\n이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.</p>' +

          '<h3 class="legal-modal__h">7. 이용자의 권리</h3>' +
          '<p class="legal-modal__p">이용자는 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제를 요청할 수 있습니다.</p>' +

          '<h3 class="legal-modal__h">8. 개인정보 보호 문의</h3>' +
          '<p class="legal-modal__p">개인정보 처리와 관련된 문의사항은 아래를 통해 문의하실 수 있습니다.\n브랜드명 : POPPi DONUTS\n이메일 : hello@poppi-donut.com</p>' +

          '<h3 class="legal-modal__h">9. 개인정보처리방침 변경</h3>' +
          '<p class="legal-modal__p">본 개인정보처리방침은 관련 법령 및 회사 정책에 따라 변경될 수 있으며, 변경 시 홈페이지를 통해 공지합니다.\n본 방침은 2026년 5월 20일부터 시행됩니다.</p>' +
        '</div>' +
        '<button type="button" class="legal-modal__close" data-modal-close aria-label="닫기">×</button>' +
      '</div>' +
    '</div>';

  function mountLegalModals() {
    if (document.getElementById("modal-terms") && document.getElementById("modal-privacy")) return;
    var holder = document.createElement("div");
    holder.setAttribute("data-legal-modals", "");
    holder.innerHTML = TERMS_HTML + PRIVACY_HTML;
    while (holder.firstChild) {
      document.body.appendChild(holder.firstChild);
    }
    bindOverlayTouchLock();
  }

  var _savedPaddingRight = "";
  var _scrollLockY = 0;
  var _usedFixedLock = false;
  var _usedIOSOverflowLock = false;
  var _iosTouchGuardBound = false;
  var _normalizeScrollPaused = false;
  var _lastLegalTrigger = null;

  function getScrollY() {
    return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
  }

  /* html { scroll-behavior: smooth } 를 우회 — 복원 시 애니메이션 없이 즉시 이동 */
  function instantScrollTo(y) {
    if (typeof y !== "number" || !isFinite(y) || y < 0) return;
    var html = document.documentElement;
    var body = document.body;
    var prevHtml = html.style.scrollBehavior;
    var prevBody = body.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    body.style.scrollBehavior = "auto";
    try {
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
    } catch (err) {
      window.scrollTo(0, y);
    }
    html.scrollTop = y;
    body.scrollTop = y;
    html.style.scrollBehavior = prevHtml;
    body.style.scrollBehavior = prevBody;
  }

  function getScrollbarWidth() {
    return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  }

  function isIOS() {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }

  function isTouchViewport() {
    return (
      window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
      window.matchMedia("(max-width: 768px)").matches
    );
  }

  /* PC·마우스 태블릿: overflow 잠금만 — body fixed 시 갤러리 슬라이드가 멈춤 */
  function needsFixedScrollLock() {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return false;
    }
    return isTouchViewport();
  }

  function canUseScrollNormalization() {
    return (
      ("ontouchstart" in window ||
        window.matchMedia("(hover: none) and (pointer: coarse)").matches) &&
      typeof ScrollTrigger !== "undefined" &&
      !!ScrollTrigger.normalizeScroll
    );
  }

  function emitLegalModalEvent(name) {
    try {
      document.dispatchEvent(new CustomEvent(name, { bubbles: true }));
    } catch (e) { /* noop */ }
  }

  /* GSAP normalizeScroll — 터치 기기에서만 일시 해제 (PC 호출 시 갤러리 등 부작용 방지) */
  function pausePageScrollNormalization() {
    if (!canUseScrollNormalization()) return;
    try {
      ScrollTrigger.normalizeScroll(false);
      _normalizeScrollPaused = true;
    } catch (e) { /* noop */ }
  }

  function resumePageScrollNormalization(savedY) {
    if (!_normalizeScrollPaused) return;
    _normalizeScrollPaused = false;
    if (typeof ScrollTrigger === "undefined" || !ScrollTrigger.normalizeScroll) return;
    if (!("ontouchstart" in window) && !window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
      return;
    }
    try {
      ScrollTrigger.normalizeScroll({
        allowNestedScroll: true,
        type: "touch,wheel,pointer",
      });
    } catch (e) {
      try { ScrollTrigger.normalizeScroll(true); } catch (e2) { /* noop */ }
    }
    if (typeof savedY === "number") {
      instantScrollTo(savedY);
    }
  }

  function bindOverlayTouchLock() {
    document.querySelectorAll(".legal-modal__overlay").forEach(function (overlay) {
      if (overlay._legalTouchBound) return;
      overlay._legalTouchBound = true;
      overlay.addEventListener(
        "touchmove",
        function (event) {
          event.preventDefault();
        },
        { passive: false }
      );
    });
  }

  function iosModalTouchGuard(event) {
    if (!document.body.classList.contains("is-modal-open")) return;

    var target = event.target;
    if (!target || !target.closest) {
      event.preventDefault();
      return;
    }

    var box = target.closest(".legal-modal__box");
    if (!box) {
      event.preventDefault();
      return;
    }

    var touch = event.touches && event.touches[0];
    if (!touch) return;

    var atTop = box.scrollTop <= 0;
    var atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 1;
    var lastY = box._legalTouchY;
    if (typeof lastY !== "number") return;

    var dy = touch.clientY - lastY;
    if ((atTop && dy > 0) || (atBottom && dy < 0)) {
      event.preventDefault();
    }
  }

  function bindIOSTouchGuard() {
    if (_iosTouchGuardBound) return;
    _iosTouchGuardBound = true;
    document.addEventListener(
      "touchstart",
      function (event) {
        var box = event.target && event.target.closest && event.target.closest(".legal-modal__box");
        if (box && event.touches && event.touches[0]) {
          box._legalTouchY = event.touches[0].clientY;
        }
      },
      { passive: true }
    );
    document.addEventListener("touchmove", iosModalTouchGuard, { passive: false });
  }

  function lockBackgroundScroll() {
    var body = document.body;
    var html = document.documentElement;
    if (body.classList.contains("is-modal-open")) return;

    _scrollLockY = getScrollY();
    _usedFixedLock = needsFixedScrollLock();
    _usedIOSOverflowLock = false;
    body.classList.add("is-modal-open");
    html.classList.add("is-modal-open");

    if (_usedFixedLock) {
      body.style.position = "fixed";
      body.style.top = "-" + _scrollLockY + "px";
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      bindOverlayTouchLock();
      if (isIOS()) bindIOSTouchGuard();
    } else {
      var scrollbarWidth = getScrollbarWidth();
      if (scrollbarWidth > 0) {
        _savedPaddingRight = body.style.paddingRight;
        body.style.paddingRight = scrollbarWidth + "px";
      }
    }
  }

  function unlockBackgroundScroll() {
    var body = document.body;
    var html = document.documentElement;
    if (!body.classList.contains("is-modal-open")) return;

    var savedY = _scrollLockY;

    body.classList.remove("is-modal-open");
    html.classList.remove("is-modal-open");

    if (_usedFixedLock) {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      _usedFixedLock = false;
      instantScrollTo(savedY);
    } else if (_usedIOSOverflowLock) {
      html.style.overflow = "";
      body.style.overflow = "";
      _usedIOSOverflowLock = false;
      instantScrollTo(savedY);
    } else {
      body.style.paddingRight = _savedPaddingRight;
      _savedPaddingRight = "";
    }
  }

  function openModal(id) {
    var modal = document.getElementById(id);
    if (!modal) return;
    if (!document.querySelector(".legal-modal.is-open")) {
      pausePageScrollNormalization();
      lockBackgroundScroll();
    }
    modal.removeAttribute("hidden");
    modal.classList.add("is-open");
    var box = modal.querySelector(".legal-modal__box");
    if (box) {
      box.scrollTop = 0;
      if (isIOS()) box.setAttribute("tabindex", "-1");
    }
    var closeBtn = modal.querySelector(".legal-modal__close");
    if (closeBtn) {
      try {
        closeBtn.focus({ preventScroll: true });
      } catch (err) {
        closeBtn.focus();
      }
    }
    emitLegalModalEvent("poppi:legal-modal-open");
  }

  function closeAllModals() {
    var anyOpen = false;
    document.querySelectorAll(".legal-modal.is-open").forEach(function (m) {
      m.classList.remove("is-open");
      m.setAttribute("hidden", "");
      anyOpen = true;
    });
    if (!anyOpen) return;

    var savedY = _scrollLockY;
    var triggerEl = _lastLegalTrigger;
    var activeEl = document.activeElement;

    if (activeEl && activeEl !== document.body && typeof activeEl.blur === "function") {
      activeEl.blur();
    }

    unlockBackgroundScroll();
    resumePageScrollNormalization(savedY);
    instantScrollTo(savedY);

    if (triggerEl && typeof triggerEl.focus === "function") {
      try {
        triggerEl.focus({ preventScroll: true });
      } catch (err) {
        /* noop */
      }
    }

    instantScrollTo(savedY);
    emitLegalModalEvent("poppi:legal-modal-close");
  }

  var _legalBound = false;
  function bindLegalTriggers() {
    if (_legalBound) return;            /* 중복 바인딩 방지 (스크립트가 두 번 로드돼도 OK) */
    _legalBound = true;

    /* ▶ 이벤트 위임 — 푸터가 언제 어디서 주입되든 항상 작동
       (main.js 가 별도로 푸터를 만들어도, 캐시된 구버전 푸터가 남아있어도 동일하게 동작) */
    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t) return;

      /* 1) 이용약관 / 개인정보처리방침 트리거 — .footer-legal__btn 또는 [data-open-modal] */
      var trigger =
        (t.closest && t.closest(".footer-legal__btn")) ||
        (t.closest && t.closest("[data-open-modal]"));
      if (trigger) {
        e.preventDefault();
        _lastLegalTrigger = trigger;
        var explicit = trigger.getAttribute("data-open-modal");
        if (explicit) {
          openModal(explicit);
        } else {
          var label = (trigger.textContent || "").trim();
          if (label.indexOf("개인정보") !== -1) openModal("modal-privacy");
          else openModal("modal-terms");
        }
        return;
      }

      /* 2) 닫기 버튼 / 오버레이 클릭 */
      if (t.closest && t.closest("[data-modal-close]")) {
        closeAllModals();
      }
    });

    /* ESC 키로 닫기 */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.keyCode === 27) closeAllModals();
    });
  }

  root.SiteFooter = { mount: mount };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})(window);
