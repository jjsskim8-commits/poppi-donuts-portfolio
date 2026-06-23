(() => {
  const root = document.querySelector("[data-business-plan]");
  if (!root) return;

  const cards = [...root.querySelectorAll("[data-business-plan-card]")];
  const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function setCardState(card, isOpen) {
    card.classList.toggle("is-open", isOpen);

    const panel = card.querySelector(".business-plan__panel");
    const media = card.querySelector(".business-plan__media");

    card.setAttribute("aria-expanded", isOpen ? "true" : "false");
    panel?.setAttribute("aria-hidden", isOpen ? "false" : "true");
    media?.setAttribute("aria-hidden", isOpen ? "true" : "false");
  }

  function syncDetailHeight() {
    let max = 0;

    cards.forEach((card) => {
      const panel = card.querySelector(".business-plan__panel");
      if (!panel) return;

      const prev = {
        position: panel.style.position,
        visibility: panel.style.visibility,
        pointerEvents: panel.style.pointerEvents,
        opacity: panel.style.opacity,
        height: panel.style.height,
      };

      panel.style.position = "absolute";
      panel.style.visibility = "hidden";
      panel.style.pointerEvents = "none";
      panel.style.opacity = "1";
      panel.style.height = "auto";

      max = Math.max(max, panel.offsetHeight);

      panel.style.position = prev.position;
      panel.style.visibility = prev.visibility;
      panel.style.pointerEvents = prev.pointerEvents;
      panel.style.opacity = prev.opacity;
      panel.style.height = prev.height;
    });

    if (max > 0) {
      root.style.setProperty("--business-plan-detail-height", `${max}px`);
    }
  }

  function activateCard(target) {
    if (target.classList.contains("is-open")) return;
    cards.forEach((card) => setCardState(card, card === target));
  }

  cards.forEach((card) => {
    if (hoverCapable) {
      card.addEventListener("mouseenter", () => activateCard(card));
    }

    card.addEventListener("click", () => activateCard(card));
    card.addEventListener("focusin", () => activateCard(card));
  });

  const initial = cards.find((card) => card.classList.contains("is-open")) || cards[0];
  if (initial) {
    cards.forEach((card) => setCardState(card, card === initial));
  }

  syncDetailHeight();
  window.addEventListener("resize", syncDetailHeight);
})();
