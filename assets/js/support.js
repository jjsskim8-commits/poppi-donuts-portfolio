/* ===== MERGED FROM inline script in pages/support.html  ===== */
/* ── FAQ 아코디언 ── */
(() => {
  const accordion = document.querySelector('[data-faq-accordion]');
  if (!accordion) return;

  const items = accordion.querySelectorAll('.support-faq__item');

  items.forEach((item) => {
    const btn    = item.querySelector('.support-faq__question');
    const answer = item.querySelector('.support-faq__answer');
    const icon   = item.querySelector('.support-faq__icon');

    btn.addEventListener('click', () => {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      /* 다른 열린 항목 모두 닫기 */
      items.forEach((other) => {
        const ob = other.querySelector('.support-faq__question');
        const oa = other.querySelector('.support-faq__answer');
        const oi = other.querySelector('.support-faq__icon');
        if (ob !== btn && ob.getAttribute('aria-expanded') === 'true') {
          ob.setAttribute('aria-expanded', 'false');
          oi.textContent = '+';
          slideUp(oa);
        }
      });

      /* 현재 항목 토글 */
      if (isOpen) {
        btn.setAttribute('aria-expanded', 'false');
        icon.textContent = '+';
        slideUp(answer);
      } else {
        btn.setAttribute('aria-expanded', 'true');
        icon.textContent = '-';
        slideDown(answer);
      }
    });
  });

  function slideDown(el) {
    el.hidden = false;
    el.style.overflow = 'hidden';
    el.style.height   = '0';
    /* scrollHeight 는 hidden=false 직후 바로 읽어야 정확 */
    const h = el.scrollHeight;
    el.style.transition = 'height 0.35s cubic-bezier(0.22,1,0.36,1)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.height = h + 'px';
      });
    });
    el.addEventListener('transitionend', function onEnd() {
      el.style.height    = '';
      el.style.overflow  = '';
      el.style.transition = '';
      el.removeEventListener('transitionend', onEnd);
    });
  }

  function slideUp(el) {
    el.style.overflow   = 'hidden';
    el.style.height     = el.scrollHeight + 'px';
    el.style.transition = 'height 0.35s cubic-bezier(0.22,1,0.36,1)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.height = '0';
      });
    });
    el.addEventListener('transitionend', function onEnd() {
      el.hidden          = true;
      el.style.height    = '';
      el.style.overflow  = '';
      el.style.transition = '';
      el.removeEventListener('transitionend', onEnd);
    });
  }
})();

/* ── 연락처 자동 포커스 ── */
(() => {
const mid  = document.getElementById('voice-phone-mid');
const last = document.getElementById('voice-phone-last');
if (!mid || !last) return;

mid.addEventListener('input', () => {
mid.value = mid.value.replace(/\D/g, '');   /* 숫자 외 문자 즉시 제거 */
if (mid.value.length >= 4) last.focus();
});

last.addEventListener('input', () => {
last.value = last.value.replace(/\D/g, '');
});
})();

/* ── 모달 공통 유틸 — is-active 클래스 토글 방식 ── */
const modalUtils = {
open(overlay) {
overlay.classList.add('is-active');
document.body.style.overflow = 'hidden';
/* 패널 첫 번째 포커스 가능 요소로 접근성 포커스 이동 */
const focusTarget = overlay.querySelector('button, [href]');
if (focusTarget) focusTarget.focus();
},
close(overlay) {
overlay.classList.remove('is-active');
document.body.style.overflow = '';
}
};

/* ── 고객의 소리 폼 submit → 접수 완료 모달 (#supportModalOverlay) ── */
(() => {
const form    = document.querySelector('.support-voice__card');
const overlay = document.getElementById('supportModalOverlay');
if (!form || !overlay) return;

/* 폼 submit */
form.addEventListener('submit', (e) => {
e.preventDefault();
modalUtils.open(overlay);
form.reset();
});

/* 닫기 트리거 — [data-support-modal-close] */
overlay.addEventListener('click', (e) => {
if (e.target.closest('[data-support-modal-close]')) {
  modalUtils.close(overlay);
}
});

/* ESC 키 닫기 */
document.addEventListener('keydown', (e) => {
if (e.key === 'Escape' && overlay.classList.contains('is-active')) {
  modalUtils.close(overlay);
}
});
})();

/* 서비스 준비 중 모달 — site-ready-modal.js 에서 전역 처리 */
