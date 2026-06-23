# POPPI 실무형 섹션 간격/높이 정리

이번 수정은 기존 디자인과 애니메이션을 최대한 유지하면서, 유지보수가 쉬운 공통 간격 시스템을 추가한 버전입니다.

## 추가된 파일

- `assets/css/pro-spacing.css`

HTML에서는 이 파일을 `responsive.css` 다음에 로드합니다. 그래서 기존 CSS를 크게 지우지 않고도 최종 간격 기준을 한 곳에서 관리할 수 있습니다.

## 기준 그리드

- PC 최대 콘텐츠 폭: `1440px`
- PC 기준: `12 columns / gutter 24px`
- 1920px 화면 기준 좌우 여백: 약 `240px`
- 태블릿/모바일에서는 `--pro-gutter` 값으로 자동 축소

## 주요 토큰

```css
--pro-section-y-lg      /* 섹션 위/아래 기본 여백 */
--pro-title-desc-gap    /* 제목과 설명 사이 */
--pro-head-content-gap  /* 제목/설명 묶음과 이미지·콘텐츠 사이 */
--pro-text-image-gap    /* 텍스트 영역과 이미지 영역 사이 */
--pro-block-gap         /* 큰 콘텐츠 블록 사이 */
--pro-component-gap     /* 카드·필터·도트 같은 컴포넌트 사이 */
--pro-footer-h          /* 공통 푸터 기준 높이 */
```

## 수정된 영역

- Brand Story 페이지
  - 상단 BRAND 비주얼 섹션 높이 정리
  - `HI, I'M POPPI` 텍스트/설명 간격을 12컬럼 기준으로 정리
  - `BRAND STORY` 제목과 타임라인 사이 간격 정리
  - `BRAND IDENTITY` 제목, 로고/타이포그래피, 컬러가이드 간격 정리
  - `BRAND APPLICATION` 제목과 이미지 사이 간격 정리

- Store 페이지
  - 상단 STORE 비주얼 섹션 높이 정리
  - `INTERIOR` 제목, 설명, 캐러셀, 도트 간격 정리
  - `STORE SEARCH` 제목, 필터, 지도, 매장 리스트 간격 정리

- Main 페이지
  - Event, Business Banner, Main Choice, Review 섹션의 시작/끝 여백 정리

- Footer
  - 음수 margin 제거
  - 공통 섹션 높이와 내부 3컬럼 간격 재정리
  - 모바일에서는 1열 구조로 자연스럽게 쌓이도록 정리

## 수정 방법

앞으로 섹션 간격을 수정할 때는 기존 CSS 여러 곳을 건드리지 말고 `assets/css/pro-spacing.css`의 토큰만 먼저 조정하세요.

예시:

```css
:root {
  --pro-section-y-lg: clamp(104px, 7.29vw, 140px);
  --pro-head-content-gap: clamp(40px, 3.33vw, 64px);
}
```
