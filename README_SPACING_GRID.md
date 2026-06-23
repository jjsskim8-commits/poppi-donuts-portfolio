# POPPI spacing/grid refactor

수정 내용
- PC 기준 12 column / gutter 24px / max 1440px 레이아웃 토큰을 `assets/css/commons.css`에 정리했습니다.
- Brand Story / Store 페이지의 섹션 상단·하단 여백, 제목과 콘텐츠 간격, 텍스트와 이미지 간격을 공통 토큰 기반으로 재정리했습니다.
- `height`, `max-height`로 고정되어 잘릴 수 있던 Brand Identity, Brand Application, Store Interior, Store Search 섹션을 자연 높이 기반으로 변경했습니다.
- 본문, 설명, 버튼, 검색 폼, 매장 리스트의 폰트 우선순위를 Paperlogy로 정리했습니다.
- 새 섹션 추가 시에는 `--site-max`, `--site-gutter`, `--grid-gutter`, `--section-y-*`, `--heading-media-gap` 토큰을 기준으로 작업하면 됩니다.
