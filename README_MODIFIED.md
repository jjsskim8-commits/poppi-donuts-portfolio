# POPPI frontend refactor notes

## 변경 핵심

- `assets/js/main.js`에서 햄버거 메뉴와 푸터를 공통 UI로 자동 주입하도록 정리했습니다.
- index 및 서브페이지에 반복되던 footer HTML을 제거했습니다.
- `node_modules`에 직접 연결하던 GSAP 파일을 `assets/vendor/gsap`로 이동해 배포 구조를 단순화했습니다.
- `assets/css/commons.css`에 실무형 공통 레이아웃 토큰을 추가했습니다.
  - `--site-max`, `--site-gutter`
  - `--section-y-*`, `--section-gap-*`
  - `--content-gap-*`, `--radius-*`
  - `.site-container`, `.site-section`, `.section-head`, `.content-grid`, `.media-frame` 등
- `assets/css/style.css`와 `assets/css/responsive.css`에서 주요 index 섹션의 시작/끝 여백, 텍스트와 이미지 사이 간격, 태블릿/모바일 gutter를 재정리했습니다.
- 전체 섹션에 걸려 있던 전역 `max-height` 클리핑을 제거해 섹션 내부 콘텐츠가 잘리는 문제를 줄였습니다.

## 실무 사용 방법

새 섹션을 추가할 때는 아래 구조를 기준으로 잡으면 됩니다.

```html
<section class="site-section">
  <div class="site-container">
    <header class="section-head">
      <span class="section-kicker">KICKER</span>
      <h2 class="section-title">Section title</h2>
      <p class="section-desc">Section description</p>
    </header>

    <div class="content-grid">
      <!-- content -->
    </div>
  </div>
</section>
```

공통 간격을 바꾸고 싶으면 `assets/css/commons.css`의 `Production layout tokens` 영역만 수정하세요.

## 폰트 안내

이 전달용 ZIP에는 `.woff2` 폰트 파일을 포함하지 않았습니다. 기존 프로젝트의 `assets/fonts` 폴더에 있던 폰트 파일은 그대로 복사해서 사용하세요.
