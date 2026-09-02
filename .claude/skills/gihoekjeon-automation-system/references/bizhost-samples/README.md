# 비즈호스트 완성본 정답 예시 (2026-08 매거진)

실제 사내 완성본 index.html 사본. 「기획전 디자인 끝」→ 게시판 조각 변환의 목표 형태.
출처: \\192.168.4.200\기획팀\2026\2.매거진\콘텐츠\콘텐츠\8월\

- 0812_HALF_DAY_직접진열_goodsList.html
  = (A)직접진열: 게시판 네이티브 .img_memo_wrap 탭 + .discount_view .goods_list #goodsList1~4 카테고리 + .base_slider_list 상품에 CSS 스킨만.
- 0804_4xrday_직접진열.html = 같은 직접진열 계열.
- 0818_FALL_커스텀그리드_fetch.html
  = (B)커스텀: .archive-product-grid 직접 만들고 상품페이지 fetch.

공통 구조: <link>폰트(CDN KEY 날짜경로) → <style>(게시판 틀 초기화 → 네이티브 스타일 → 리셋 → 커스텀) → <section> → <script>.
자세한 규칙 = SKILL.md §5-A-2 ③-d.