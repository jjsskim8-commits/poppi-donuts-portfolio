/* ===== MERGED FROM assets/js/event-search.js ===== */
(function () {
  const form = document.getElementById("eventSearchForm");
  const input = document.getElementById("eventSearch");
  const grid = document.getElementById("eventCardGrid");
  const emptyMsg = document.getElementById("eventSearchEmpty");
  const eventPanel = document.getElementById("eventPanelEvent");
  const noticePanel = document.getElementById("eventPanelNotice");
  const statusFilters = document.getElementById("eventStatusFilters");
  const mainTabs = document.querySelectorAll("[data-main-tab]");
  const pageRoot = document.querySelector(".event-news-page");
  const noticeAccordion = noticePanel
    ? noticePanel.querySelector("[data-notice-accordion]")
    : null;
  const noticeItems = noticeAccordion
    ? Array.from(noticeAccordion.querySelectorAll(".support-faq__item"))
    : [];

  if (!grid && !noticePanel) return;

  function slideDown(el) {
    el.hidden = false;
    el.style.overflow = "hidden";
    el.style.height = "0";
    const h = el.scrollHeight;
    el.style.transition = "height 0.35s cubic-bezier(0.22,1,0.36,1)";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.height = h + "px";
      });
    });
    el.addEventListener("transitionend", function onEnd() {
      el.style.height = "";
      el.style.overflow = "";
      el.style.transition = "";
      el.removeEventListener("transitionend", onEnd);
    });
  }

  function slideUp(el) {
    el.style.overflow = "hidden";
    el.style.height = el.scrollHeight + "px";
    el.style.transition = "height 0.35s cubic-bezier(0.22,1,0.36,1)";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.height = "0";
      });
    });
    el.addEventListener("transitionend", function onEnd() {
      el.hidden = true;
      el.style.height = "";
      el.style.overflow = "";
      el.style.transition = "";
      el.removeEventListener("transitionend", onEnd);
    });
  }

  function resetNoticeAccordion() {
    noticeItems.forEach((item) => {
      const btn = item.querySelector(".support-faq__question");
      const answer = item.querySelector(".support-faq__answer");
      const icon = item.querySelector(".support-faq__icon");
      if (btn) btn.setAttribute("aria-expanded", "false");
      if (icon) icon.textContent = "+";
      if (answer) {
        answer.hidden = true;
        answer.style.height = "";
        answer.style.overflow = "";
        answer.style.transition = "";
      }
    });
  }

  const cards = grid ? Array.from(grid.querySelectorAll(".event-card")) : [];
  let activeStatusFilter = "all";
  let activeMainTab = "event";

  function normalize(text) {
    return (text || "").trim().toLowerCase().replace(/\s+/g, "");
  }

  function parseEventPeriod(periodStr) {
    if (!periodStr) return null;

    const [startStr, endStr] = periodStr.split("~");
    if (!startStr || !endStr) return null;

    const startParts = startStr.trim().split(".");
    if (startParts.length !== 3) return null;

    const year = Number(startParts[0]);
    const month = Number(startParts[1]);
    const day = Number(startParts[2]);
    const start = new Date(year, month - 1, day);

    const endParts = endStr.trim().split(".");
    let end;

    if (endParts.length === 3) {
      end = new Date(Number(endParts[0]), Number(endParts[1]) - 1, Number(endParts[2]));
    } else if (endParts.length === 1) {
      end = new Date(year, month - 1, Number(endParts[0]));
    } else {
      return null;
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  function getSearchText(card) {
    const keywords = card.dataset.keywords || "";
    const alt = card.querySelector("img")?.getAttribute("alt") || "";
    return normalize(`${keywords} ${alt}`);
  }

  function matchesQuery(card, queryNorm) {
    if (!queryNorm) return true;

    const haystack = getSearchText(card);
    const altNorm = normalize(card.querySelector("img")?.getAttribute("alt") || "");
    const keywordsNorm = normalize(card.dataset.keywords || "");

    if (haystack.includes(queryNorm)) return true;
    if (keywordsNorm.includes(queryNorm)) return true;
    if (altNorm.includes(queryNorm)) return true;

    const querySpaced = (input.value || "").trim().toLowerCase();
    if (querySpaced && altNorm.includes(normalize(querySpaced))) return true;

    return false;
  }

  function matchesStatusFilter(card) {
    const status = card.dataset.eventStatus || "ongoing";

    if (activeStatusFilter === "ended") {
      return status === "ended";
    }

    if (activeStatusFilter === "ongoing") {
      return status !== "ended";
    }

    return true;
  }

  function filterEvents() {
    if (activeMainTab !== "event" || !grid || !input) return;

    const queryNorm = normalize(input.value);
    const seenTypes = new Set();
    let visibleCount = 0;
    const hasFilter = Boolean(queryNorm) || activeStatusFilter !== "all";

    cards.forEach((card) => {
      const type = card.dataset.eventType || "";

      if (!matchesStatusFilter(card)) {
        card.hidden = true;
        return;
      }

      if (!queryNorm) {
        card.hidden = false;
        visibleCount += 1;
        return;
      }

      if (!matchesQuery(card, queryNorm)) {
        card.hidden = true;
        return;
      }

      if (seenTypes.has(type)) {
        card.hidden = true;
        return;
      }

      seenTypes.add(type);
      card.hidden = false;
      visibleCount += 1;
    });

    if (emptyMsg) {
      emptyMsg.hidden = visibleCount > 0 || !hasFilter;
    }

    grid.setAttribute("aria-busy", hasFilter ? "true" : "false");
  }

  function setMainTab(tabName) {
    activeMainTab = tabName;

    mainTabs.forEach((tab) => {
      const isActive = tab.dataset.mainTab === tabName;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    const isEvent = tabName === "event";

    if (eventPanel) eventPanel.hidden = !isEvent;
    if (noticePanel) noticePanel.hidden = isEvent;
    if (statusFilters) statusFilters.hidden = !isEvent;
    if (form) form.hidden = !isEvent;
    if (pageRoot) pageRoot.classList.toggle("is-notice-tab", !isEvent);

    if (isEvent) {
      filterEvents();
    } else {
      resetNoticeAccordion();
    }
  }

  function initNoticeAccordion() {
    if (!noticeAccordion) return;

    noticeItems.forEach((item) => {
      const btn = item.querySelector(".support-faq__question");
      const answer = item.querySelector(".support-faq__answer");
      const icon = item.querySelector(".support-faq__icon");
      if (!btn || !answer) return;

      btn.addEventListener("click", () => {
        const isOpen = btn.getAttribute("aria-expanded") === "true";

        noticeItems.forEach((other) => {
          const otherBtn = other.querySelector(".support-faq__question");
          const otherAnswer = other.querySelector(".support-faq__answer");
          const otherIcon = other.querySelector(".support-faq__icon");
          if (otherBtn !== btn && otherBtn.getAttribute("aria-expanded") === "true") {
            otherBtn.setAttribute("aria-expanded", "false");
            if (otherIcon) otherIcon.textContent = "+";
            slideUp(otherAnswer);
          }
        });

        if (isOpen) {
          btn.setAttribute("aria-expanded", "false");
          if (icon) icon.textContent = "+";
          slideUp(answer);
        } else {
          btn.setAttribute("aria-expanded", "true");
          if (icon) icon.textContent = "-";
          slideDown(answer);
        }
      });
    });
  }

  function setStatusFilter(filterName) {
    activeStatusFilter = filterName;

    if (!statusFilters) return;

    statusFilters.querySelectorAll("[data-status-filter]").forEach((btn) => {
      const isActive = btn.dataset.statusFilter === filterName;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });

    filterEvents();
  }

  if (form && input) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      filterEvents();
    });

    input.addEventListener("input", filterEvents);

    input.addEventListener("search", () => {
      if (!input.value) filterEvents();
    });
  }

  mainTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setMainTab(tab.dataset.mainTab || "event");
    });
  });

  if (statusFilters) {
    statusFilters.querySelectorAll("[data-status-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        setStatusFilter(btn.dataset.statusFilter || "all");
      });
    });
  }

  initNoticeAccordion();

  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!supportsHover && cards.length) {
    cards.forEach((card) => {
      const link = card.querySelector("a");
      if (!link) return;

      link.addEventListener(
        "click",
        (event) => {
          if (!card.classList.contains("is-active")) {
            event.preventDefault();
            cards.forEach((other) => other.classList.remove("is-active"));
            card.classList.add("is-active");
          }
        },
        { passive: false }
      );
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".event-card")) {
        cards.forEach((card) => card.classList.remove("is-active"));
      }
    });
  }

  setMainTab("event");
  setStatusFilter("all");
})();

/* ===== MERGED FROM assets/js/event-modal.js ===== */
(function () {
  const modal = document.getElementById("eventModal");
  const modalImage = document.getElementById("eventModalImage");
  const grid = document.getElementById("eventCardGrid");

  if (!modal || !modalImage || !grid) return;

  const scroller = modal.querySelector(".event-modal__scroller");

  function lockPageScroll() {
    document.documentElement.classList.add("event-modal-open");
    document.body.classList.add("event-modal-open");
  }

  function unlockPageScroll() {
    document.documentElement.classList.remove("event-modal-open");
    document.body.classList.remove("event-modal-open");
  }

  function openModal(src, alt) {
    lockPageScroll();
    modalImage.src = src;
    modalImage.alt = alt || "";
    modal.hidden = false;
    if (scroller) scroller.scrollTop = 0;

    const closeBtn = modal.querySelector(".event-modal__close");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    modalImage.src = "";
    modalImage.alt = "";
    unlockPageScroll();
  }

  grid.addEventListener("click", (event) => {
    const link = event.target.closest(".event-card a");
    if (!link) return;

    const card = link.closest(".event-card");
    const img = link.querySelector("img");
    const src =
      (card && card.dataset.eventImage) ||
      (img && img.getAttribute("src"));
    if (!src) return;

    event.preventDefault();
    openModal(src, img ? img.getAttribute("alt") : "");
  });

  modal.addEventListener("click", (event) => {
    if (event.target.closest(".event-modal__close")) {
      closeModal();
      return;
    }
    if (event.target.closest(".event-modal__content")) return;
    if (event.target.closest("[data-event-modal-close]")) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeModal();
    }
  });
})();
