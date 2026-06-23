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
  const noticeItems = noticePanel
    ? Array.from(noticePanel.querySelectorAll(".event-notice-item"))
    : [];

  if (!grid && !noticePanel) return;

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
      noticeItems.forEach((item) => {
        item.classList.remove("is-open");
        const toggle = item.querySelector(".event-notice-item__toggle");
        const row = item.querySelector(".event-notice-item__row");
        const body = item.querySelector(".event-notice-item__body");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
        if (row) row.setAttribute("aria-expanded", "false");
        if (body) body.hidden = true;
      });
    }
  }

  function toggleNoticeItem(item) {
    const toggle = item.querySelector(".event-notice-item__toggle");
    const row = item.querySelector(".event-notice-item__row");
    const body = item.querySelector(".event-notice-item__body");
    if (!body) return;

    const willOpen = body.hidden;
    body.hidden = !willOpen;
    item.classList.toggle("is-open", willOpen);
    if (toggle) toggle.setAttribute("aria-expanded", String(willOpen));
    if (row) row.setAttribute("aria-expanded", String(willOpen));
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

  noticeItems.forEach((item) => {
    const row = item.querySelector(".event-notice-item__row");
    const toggle = item.querySelector(".event-notice-item__toggle");
    if (!row) return;

    if (toggle) toggle.tabIndex = -1;

    row.setAttribute("tabindex", "0");
    row.setAttribute("role", "button");
    row.setAttribute("aria-expanded", "false");

    const activate = () => toggleNoticeItem(item);

    row.addEventListener("click", activate);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate();
      }
    });
  });

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
