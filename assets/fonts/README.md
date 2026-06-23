# Fonts

이 폴더에는 폰트 파일을 직접 포함하지 않았습니다. 대신 `assets/css/commons.css`에서 다음 순서로 폰트를 불러오도록 수정했습니다.

1. 사용자 PC에 설치된 로컬 폰트
2. `assets/fonts/*.woff2`에 직접 넣은 로컬 웹폰트
3. jsDelivr CDN 웹폰트 폴백

따라서 현재 상태로도 인터넷이 연결되어 있으면 Paperlogy가 바로 적용됩니다.
완전 오프라인 배포가 필요하면 아래 파일을 직접 내려받아 이 폴더에 넣으면 됩니다.

## 필요한 파일명

| 파일명 | 용도 |
|---|---|
| `RiaSans-ExtraBold.woff2` | Ria Sans 제목용 |
| `Paperlogy-4Regular.woff2` | Paperlogy 400 |
| `Paperlogy-5Medium.woff2` | Paperlogy 500 |
| `Paperlogy-6SemiBold.woff2` | Paperlogy 600 |
| `Paperlogy-7Bold.woff2` | Paperlogy 700 |
| `Paperlogy-8ExtraBold.woff2` | Paperlogy 800 |
| `Paperlogy-9Black.woff2` | Paperlogy 900 |
| `Paperlogy-9Block.woff2` | 기존 프로젝트 별칭용. `Paperlogy-9Black.woff2`와 같은 파일을 복사해 이 이름으로 저장해도 됩니다. |

## 적용 위치

폰트 설정은 `assets/css/commons.css` 상단의 `@font-face`와 `:root` 폰트 변수에서 관리합니다.

- 제목/큰 타이틀: `var(--font-ria)`
- 본문/설명/푸터/버튼: `var(--font-body)` 또는 `var(--font-paperlogy)`
- 큰 마퀴/블록 텍스트: `var(--font-block)`

## 참고

폰트 파일 자체는 라이선스 확인 후 프로젝트에 직접 추가하세요.
