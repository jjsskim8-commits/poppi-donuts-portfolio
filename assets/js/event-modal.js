(function () {
  const modal = document.getElementById("eventModal");
  const modalImage = document.getElementById("eventModalImage");
  const grid = document.getElementById("eventCardGrid");

  if (!modal || !modalImage || !grid) return;

  let lastFocused = null;

  function openModal(src, alt) {
    modalImage.src = src;
    modalImage.alt = alt || "";
    modal.hidden = false;
    document.body.classList.add("event-modal-open");
    lastFocused = document.activeElement;

    const closeBtn = modal.querySelector(".event-modal__close");
    if (closeBtn) closeBtn.focus({ preventScroll: true });
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    modalImage.src = "";
    modalImage.alt = "";
    document.body.classList.remove("event-modal-open");
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
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
