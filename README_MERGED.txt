POPPI ORDERED + EVENT RECEIPT MERGED

합친 순서
01. poppi_donut_motion_html_v3
02. corn_marquee_hero
03. poppi_hero_662
04. poppi_event_receipt_black_slot_fix

작업 내용
- 두 zip 프로젝트를 하나의 index.html로 합침
- event receipt 이미지는 assets/images/event-receipt/ 폴더로 분리
- commons.css에 event receipt 변수 추가
- style.css에 event receipt 섹션 스타일 추가
- main.js에 영수증 스크롤 출력 스크립트 추가
- 전체 event receipt 섹션 높이 1793px 유지
- 검은 슬롯 부분에서 영수증이 나오는 구조 유지

추가 수정
- 슬롯 검은 입구에서 종이가 깨져 보이던 상단 나무/걸이 부분을 CSS/JS trim으로 숨김
- receipt-mask 위치를 검은 출력구 바로 아래로 재조정
- slot-mouth-cover z-index를 올려 검은 출력구가 종이 위에 자연스럽게 덮이도록 수정
