(() => {
  const form = document.querySelector("[data-business-submit-form]");
  const modal = document.querySelector("[data-business-submit-modal]");
  if (!form || !modal) return;

  const closeTargets = modal.querySelectorAll("[data-business-submit-modal-close]");
  const confirmBtn = modal.querySelector(".business-submit-modal__confirm");
  let lastFocused = null;

  function openModal() {
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("is-business-submit-modal-open");
    requestAnimationFrame(() => modal.classList.add("is-open"));
    confirmBtn?.focus();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.classList.remove("is-business-submit-modal-open");

    window.setTimeout(() => {
      if (modal.classList.contains("is-open")) return;
      modal.hidden = true;
      form.reset();
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }, 300);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    openModal();
  });

  closeTargets.forEach((el) => {
    el.addEventListener("click", () => closeModal());
  });

  modal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
    }
  });
})();
