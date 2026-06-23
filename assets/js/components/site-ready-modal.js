/* =========================================================
   site-ready-modal.js — 서비스 준비 중(COMING SOON) 공통 모달
   ---------------------------------------------------------
   트리거:
     • .js-ready-trigger + data-ready-variant="online-order|shop|kakao"
     • 헤더 SHOP — site-header.js 에서 SiteReadyModal.open('shop') 호출

   support.html 에 #modal-ready 가 이미 있으면 재사용, 없으면 자동 주입.
   ========================================================= */
(function (root) {
  "use strict";

  var INSTA_URL = "https://www.instagram.com/poppidonuts";
  var INSTA_LINK =
    '<a href="' + INSTA_URL + '" target="_blank" rel="noopener noreferrer" class="modal-insta-link">@poppidonuts</a>';

  var VARIANTS = {
    kakao: {
      title: "COMING SOON",
      body:
        "현재는 오프라인 매장 운영에 집중하고 있어,<br>" +
        "온라인 상담 채널은 잠시 쉬어갑니다.<br>" +
        "공식 인스타그램 " + INSTA_LINK + " 에서<br>만나요!"
    },
    "online-order": {
      title: "COMING SOON",
      body:
        "아직 준비 중인 서비스입니다.<br>" +
        "온라인 주문은 곧 만나보실 수 있어요.<br>" +
        "공식 인스타그램 " + INSTA_LINK + " 에서<br>소식을 확인해 주세요!"
    },
    shop: {
      title: "COMING SOON",
      body:
        "아직 준비 중인 서비스입니다.<br>" +
        "온라인 SHOP은 열심히 준비하고 있어요.<br>" +
        "공식 인스타그램 " + INSTA_LINK + " 에서<br>먼저 만나요!"
    }
  };

  var bound = false;

  function assetPrefix() {
    return /\/pages\//i.test(location.pathname) ? "../assets" : "./assets";
  }

  function ensureStyles() {
    if (document.querySelector("[data-ready-modal-styles]")) return;
    /* CSS 로드 전 FOUC 방지 — 인라인 핵심 규칙을 동기 주입 */
    var critical = document.createElement("style");
    critical.setAttribute("data-ready-modal-styles", "");
    critical.textContent =
      "#modal-ready.support-modal-overlay:not(.is-active){" +
        "opacity:0!important;visibility:hidden!important;pointer-events:none!important" +
      "}";
    document.head.appendChild(critical);
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = assetPrefix() + "/css/ready-modal.css?v=ready-modal-v2";
    link.setAttribute("data-ready-modal-styles", "link");
    document.head.appendChild(link);
  }

  function modalTemplate() {
    var icon = assetPrefix() + "/images/support/support-notice.svg";
    return (
      '<div class="support-modal-overlay" id="modal-ready" role="dialog" aria-modal="true" aria-labelledby="modal-ready-title" hidden>' +
        '<div class="support-modal-dim" data-ready-modal-close aria-hidden="true"></div>' +
        '<div class="support-modal-panel">' +
          '<button type="button" class="support-modal-close" data-ready-modal-close aria-label="닫기">' +
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">' +
              '<line x1="2" y1="2" x2="18" y2="18" stroke="white" stroke-width="2.5" stroke-linecap="round"></line>' +
              '<line x1="18" y1="2" x2="2" y2="18" stroke="white" stroke-width="2.5" stroke-linecap="round"></line>' +
            "</svg>" +
          "</button>" +
          '<img src="' + icon + '" alt="" class="support-modal-icon" width="144" height="144" aria-hidden="true">' +
          '<p id="modal-ready-title" class="support-modal-title" data-ready-modal-title>COMING SOON</p>' +
          '<p class="support-modal-body" data-ready-modal-body></p>' +
          '<button type="button" class="support-modal-confirm" data-ready-modal-close>확인</button>' +
        "</div>" +
      "</div>"
    );
  }

  function ensureModal() {
    var overlay = document.getElementById("modal-ready");
    if (!overlay) {
      var wrap = document.createElement("div");
      wrap.innerHTML = modalTemplate();
      overlay = wrap.firstElementChild;
      document.body.appendChild(overlay);
    }

    if (!overlay.querySelector("[data-ready-modal-title]")) {
      var title = overlay.querySelector("#modal-ready-title, .support-modal-title");
      if (title) title.setAttribute("data-ready-modal-title", "");
    }
    if (!overlay.querySelector("[data-ready-modal-body]")) {
      var body = overlay.querySelector(".support-modal-body");
      if (body) body.setAttribute("data-ready-modal-body", "");
    }

    return overlay;
  }

  function setContent(overlay, variant) {
    var data = VARIANTS[variant] || VARIANTS.kakao;
    var titleEl = overlay.querySelector("[data-ready-modal-title]");
    var bodyEl = overlay.querySelector("[data-ready-modal-body]");
    if (titleEl) titleEl.textContent = data.title;
    if (bodyEl) bodyEl.innerHTML = data.body;
  }

  function open(variant) {
    ensureStyles();
    var overlay = ensureModal();
    setContent(overlay, variant || "kakao");
    overlay.hidden = false;
    overlay.classList.add("is-active");
    document.body.style.overflow = "hidden";
    var focusTarget = overlay.querySelector(".support-modal-close, .support-modal-confirm");
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  function close() {
    var overlay = document.getElementById("modal-ready");
    if (!overlay) return;
    overlay.classList.remove("is-active");
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  function bindEvents() {
    if (bound) return;
    bound = true;

    document.addEventListener("click", function (e) {
      var trigger = e.target.closest(".js-ready-trigger");
      if (trigger) {
        e.preventDefault();
        open(trigger.getAttribute("data-ready-variant") || "kakao");
        return;
      }

      if (e.target.closest("[data-ready-modal-close]")) {
        var overlay = document.getElementById("modal-ready");
        if (overlay && overlay.classList.contains("is-active")) {
          e.preventDefault();
          close();
        }
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var overlay = document.getElementById("modal-ready");
      if (overlay && overlay.classList.contains("is-active")) close();
    });
  }

  function mount() {
    /* 페이지 로드 시 DOM 주입하지 않음 — 헤더 이동 시 모달 깜빡임(FOUC) 방지 */
    var existing = document.getElementById("modal-ready");
    if (existing) existing.hidden = true;
    bindEvents();
  }

  root.SiteReadyModal = { open: open, close: close, mount: mount };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }
})(window);
