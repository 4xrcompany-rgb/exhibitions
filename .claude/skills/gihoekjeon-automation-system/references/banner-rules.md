# 배너 제작 규칙

## 규격 (5사이즈 · 총 7장)

| 파일명 | 크기 | 용도 | 장수 |
|---|---|---|---|
| `01_PC배너_1870x462` | 1870 × 462 | PC 배너 — **기준 원본** | 1 |
| `02_모바일배너_750x750` | 750 × 750 | 모바일 배너 | 1 |
| `03_썸네일_750x610` | 750 × 610 | 썸네일 | 1 |
| `04_카톡앱푸시_600x800` | 600 × 800 | 카카오톡 앱푸시 | 1 |
| `05_앱푸시_800x464_A/B/C` | 800 × 464 | 앱 푸시 | 3 |

---

## 사이즈별 고정 규칙

### 1870×462 — PC (기준)
- 가운데에 타이틀, 좌우 여백에 장식 요소
- 상단 카피 2줄 → 라벨 → 타이틀 → 하단 날짜
- **이것을 먼저 완성한다.** 나머지는 전부 이 구도의 재배치

### 750×750 — 모바일
- 타이틀 2덩어리를 **좌우가 아니라 위아래로 쌓는다**
- 상단 카피 유지 (2줄 가능)
- 장식 요소는 4~5개로 정리

### 750×610 — 썸네일
- **텍스트 최소화.** 목록에서 작게 보이므로 긴 문장은 읽히지 않는다
- 상단 카피·날짜 **제거**
- 남기는 텍스트: 타이틀 + 짧은 라벨 한 줄 (`최대 70%` 수준)

### 600×800 — 카카오톡 앱푸시
- 세로로 길다. 타이틀을 위아래로 쌓고 화면의 절반 이상 차지하게
- 상단 카피는 짧게 (1~2줄)
- **★ 하단에 검정 박스 + 텍스트**
  ```
  ┌──────────────────────────────┐
  │  MM.DD - MM.DD    혜택 문구 › │   ← 검정 배경, 흰 글씨
  └──────────────────────────────┘
  ```
  좌: 기간 / 우: 혜택 + `›` 화살표. 높이 90px 내외
- 장식 요소는 3개 이하

### 800×464 — 앱 푸시 (3장)
- **★ 텍스트는 가운데 고정**
- **★ 아주 간결한 폰트만.** 장식·질감 최소
- 3장은 서로 다른 구성으로:
  - **A** — 타이틀만 + 하단 한 줄
  - **B** — 오브젝트 + 라벨 + 타이틀
  - **C** — 짧은 카피 + 타이틀 세로 스택 + 날짜

---

## 예시 이미지 우선 규칙

`_소재/10_배너/` 에 사용자가 넣은 **예시 이미지가 있으면 그것이 기준**이다.
없으면 사용자가 알려준 과거 배너 폴더에서 하우스 스타일을 학습한다.
둘 다 없으면 사용자에게 예시를 요청한다. **임의로 스타일을 정하지 않는다.**

과거 배너 폴더를 참고할 때 확인할 것:
- PC 배너의 타이틀 위치 (좌/우/가운데)
- 600×800 하단 박스 유무와 문구 형식
- 썸네일의 텍스트 양
- 앱푸시의 텍스트 정렬

---

## 생성 파이프라인 (HTML → JPG)

피그마 대신 HTML을 그려 Playwright로 캡처한다.
이유: 정확한 픽셀 크기, 한글 폰트 제어, 반복 수정이 빠름, seat 제약 없음.

```
1. 웹폰트 확보
     npm pack pretendard
     tar xzf pretendard-*.tgz
     package/dist/web/static/woff2/Pretendard-{Black,ExtraBold,Bold,SemiBold,Medium}.woff2
   ※ CDN 직접 다운로드는 리다이렉트 스텁만 받아지는 경우가 있다. npm pack 을 쓴다.

2. base64 로 @font-face 내장 (외부 폰트 로드 실패 방지)

3. 사이즈별 HTML 생성 → build_banners.py

4. Playwright 캡처 → shot.mjs
     viewport = {width:W, height:H}
     deviceScaleFactor = 1
     clip = {x:0, y:0, width:W, height:H}
     type='jpeg', quality=92
     await page.evaluate(() => document.fonts.ready)  ← 폰트 로드 대기 필수

5. _소재/10_배너/ 에 저장
```

---

## CSS 레시피

### 비닐 포장 질감
```css
.vinyl{position:absolute;inset:0;z-index:1;mix-blend-mode:screen;opacity:.85;
 background:
  repeating-linear-gradient(102deg, rgba(255,255,255,.10) 0, rgba(255,255,255,0) 3px, rgba(0,0,0,.05) 7px, rgba(255,255,255,0) 12px),
  repeating-linear-gradient(-77deg, rgba(255,255,255,.07) 0, rgba(255,255,255,0) 5px, rgba(0,0,0,.045) 11px, rgba(255,255,255,0) 19px),
  radial-gradient(120% 80% at 30% 12%, rgba(255,255,255,.20), transparent 55%),
  radial-gradient(90% 70% at 82% 88%, rgba(0,0,0,.22), transparent 60%)}
```

### 포장지 사각형 (가장자리 부드럽게)
```css
.pack{position:absolute;z-index:2;border-radius:14px;
 background:linear-gradient(148deg, rgba(255,255,255,.17), rgba(255,255,255,.02) 36%, rgba(0,0,0,.12) 70%, rgba(255,255,255,.11));
 box-shadow:0 0 0 1px rgba(255,255,255,.12) inset, 0 24px 60px rgba(0,0,0,.20);
 -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 5%,#000 95%,transparent 100%),
                    linear-gradient(180deg,transparent 0,#000 6%,#000 94%,transparent 100%);
 -webkit-mask-composite:source-in;mask-composite:intersect}
```
마스크가 없으면 좌우에 **하드한 세로 이음선**이 보인다.

### 찢어진 종이
`clip-path: polygon(...)` 으로 잘게 톱니를 만든다. 톱니 간격은 **3~5%** 가 자연스럽다.
간격이 7% 이상이면 찢김이 아니라 지그재그로 보인다.

```css
.torn{display:inline-block;padding:.10em .40em .16em;line-height:.92}
.torn.white{background:#F7F4EF;color:#111;box-shadow:0 14px 34px rgba(0,0,0,.30)}
.torn.black{background:#111;color:#fff;box-shadow:0 14px 34px rgba(0,0,0,.38)}
/* 두 덩어리를 서로 다른 각도로 살짝 회전시켜 겹친다 */
```

### 삼각형 스티커 — ⚠️ 퍼센트 패딩 금지
```css
.tri{clip-path:polygon(50% 0%, 100% 100%, 0% 100%);
 display:flex;flex-direction:column;align-items:center;justify-content:flex-end;
 padding-bottom:.34em;          /* ← px 또는 em. % 를 쓰면 부모 너비 기준이 된다 */
 line-height:1.06;text-align:center}
```
`padding-top:22%` 는 부모가 1870px일 때 **411px**이 된다. 반드시 px/em.

### 바코드
```css
.barcode{background:#fff;padding:6px 8px;
 background-image:repeating-linear-gradient(90deg,#111 0 2px,#fff 2px 4px,#111 4px 5px,#fff 5px 9px,#111 9px 12px,#fff 12px 14px)}
```

---

## 검증 체크리스트

캡처 전에 반드시 요소 박스를 측정한다.

```js
[...document.querySelectorAll('.tri,.sticker,.tube,.chip,.pack,.barcode')]
  .map(e => { const b = e.getBoundingClientRect();
    return {cls:e.className, x:b.x|0, y:b.y|0, w:b.width|0, h:b.height|0}; })
```

확인 항목:
- [ ] 모든 요소가 프레임 안에 있는가 (음수 좌표·초과 없음)
- [ ] 텍스트가 다른 요소에 가려지지 않는가
- [ ] 하단 텍스트와 타이틀이 겹치지 않는가
- [ ] 출력 파일 크기가 지정 규격과 정확히 일치하는가
- [ ] 한글이 깨지지 않고 의도한 굵기로 나오는가
