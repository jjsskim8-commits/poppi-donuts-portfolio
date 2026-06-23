# POPPI_Donut Cleanup Report

## 병합/정리 내용

- `assets/css/brand-kv-fix.css` → `assets/css/brand-story.css`로 병합
- `assets/css/pro-spacing.css` → `assets/css/responsive.css` 맨 아래로 병합
- `pages/menu.html` 내부 `<style>` → `assets/css/menu.css`로 분리
- `pages/menu.html` 내부 `<script>` → `assets/js/menu.js`로 분리
- `assets/js/review-slider.js` → `assets/js/main.js`로 병합
- Business JS 3개 → `assets/js/business.js`로 병합
- Event JS 2개 → `assets/js/event-news.js`로 병합
- Store JS 2개 → `assets/js/store.js`로 병합
- Brand Story inline JS → `assets/js/brand-story.js`로 분리
- Support inline JS → `assets/js/support.js`로 분리

## 수정 내용

- `index.html`의 `event.html` 링크를 `event-news.html`로 수정
- `pages/support.html`의 깨진 이미지 경로를 `../assets/...`로 수정
- 누락된 `assets/images/main-image/donut-grid-banner.png`는 기존 `poppi-bg.png`를 복사해 임시 대체

## 제거 내용

- `.git/`, `.vscode/`, 루트 README 계열 문서 제거
- 사용되지 않는 것으로 확인된 이미지 일부 제거
