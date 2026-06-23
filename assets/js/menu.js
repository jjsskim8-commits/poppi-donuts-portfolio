/* Extracted from pages/menu.html */
const hasGsap = typeof window !== 'undefined' && typeof window.gsap !== 'undefined';
const MENU_MODAL_OPEN_CLASS = 'menu-modal-open';

function lockBodyScroll() {
  if (document.body.classList.contains(MENU_MODAL_OPEN_CLASS)) return;
  document.documentElement.classList.add(MENU_MODAL_OPEN_CLASS);
  document.body.classList.add(MENU_MODAL_OPEN_CLASS);
}

function unlockBodyScroll() {
  if (!document.body.classList.contains(MENU_MODAL_OPEN_CLASS)) return;
  document.documentElement.classList.remove(MENU_MODAL_OPEN_CLASS);
  document.body.classList.remove(MENU_MODAL_OPEN_CLASS);
}

function openPoppiModal(koName, enName, imgPath, description, origin, allergy) {
      const overlay = document.getElementById('poppiModalOverlay');
      document.getElementById('modalTitle').innerText = koName;
      document.getElementById('modalSubTitle').innerText = enName;
      document.getElementById('modalImg').src = imgPath;
      document.getElementById('modalDesc').innerText = description;
      document.getElementById('modalOrigin').innerText = origin;
      document.getElementById('modalAllergy').innerText = allergy;

      overlay.style.display = 'flex';
      lockBodyScroll();

      if (hasGsap) {
        gsap.fromTo('#poppiModalOverlay', { opacity: 0 }, { opacity: 1, duration: 0.2 });
        gsap.fromTo('.poppi-modal-content',
          { scale: 0.85, opacity: 0, y: 30 },
          { scale: 1, opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.5)' }
        );
      }
    }

    function closePoppiModal() {
      if (hasGsap) {
        gsap.to('.poppi-modal-content', {
          scale: 0.85, opacity: 0, y: 20, duration: 0.2, ease: 'power2.in',
          onComplete: () => {
            document.getElementById('poppiModalOverlay').style.display = 'none';
            unlockBodyScroll();
          }
        });
        gsap.to('#poppiModalOverlay', { opacity: 0, duration: 0.2 });
        return;
      }
      document.getElementById('poppiModalOverlay').style.display = 'none';
      unlockBodyScroll();
    }

    function closePoppiModalViaOverlay(e) {
      if (e.target.id === 'poppiModalOverlay') closePoppiModal();
    }

    document.querySelectorAll('.poppi-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        if (card.classList.contains('is-hidden')) return;
        const img = card.querySelector('.card-img-wrap img');
        if (img && hasGsap) gsap.to(img, { scale: 1.08, duration: 0.3, ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', () => {
        const img = card.querySelector('.card-img-wrap img');
        if (img && hasGsap) gsap.to(img, { scale: 1, duration: 0.3, ease: 'power2.out' });
      });
    });

    const tabButtons = document.querySelectorAll('.poppi-tabs button');
    const allCards = document.querySelectorAll('.poppi-card');
    const searchInput = document.querySelector('.poppi-search-input');
    let activeFilter = 'all';
    let searchKeyword = '';

    function getCardCategories(card) {
      return (card.getAttribute('data-category') || '').trim().split(/\s+/).filter(Boolean);
    }

    function cardMatchesFilter(card) {
      if (activeFilter === 'all') return true;
      return getCardCategories(card).includes(activeFilter);
    }

    function cardMatchesSearch(card) {
      if (!searchKeyword) return true;
      const ko = card.querySelector('.card-title').innerText.toLowerCase();
      const en = card.querySelector('.card-sub').innerText.toLowerCase();
      return ko.includes(searchKeyword) || en.includes(searchKeyword);
    }

    function shouldShowCard(card) {
      return cardMatchesFilter(card) && cardMatchesSearch(card);
    }

    function applyCardVisibility() {
      allCards.forEach(card => {
        if (shouldShowCard(card)) {
          card.classList.remove('is-hidden');
        } else {
          card.classList.add('is-hidden');
        }
      });
    }

    function applyTabFilter(btn) {
        tabButtons.forEach(b => {
          b.classList.remove('poppi-btn-primary');
          b.classList.add('poppi-btn-outline');
        });
        btn.classList.remove('poppi-btn-outline');
        btn.classList.add('poppi-btn-primary');
        activeFilter = btn.getAttribute('data-filter');
        applyCardVisibility();
    }

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => applyTabFilter(btn));
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        applyTabFilter(btn);
      }, { passive: false });
    });

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchKeyword = e.target.value.trim().toLowerCase();
        applyCardVisibility();
      });
    }
