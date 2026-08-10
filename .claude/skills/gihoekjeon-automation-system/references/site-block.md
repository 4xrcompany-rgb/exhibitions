# 부록 — 기획전 HTML 고정 블록 (§5-A 상세)

기획전 HTML 은 **몰 게시판 본문 안**에 들어간다. 위에 사이트 메뉴바가 있고 그 아래에 놓인다.
그래서 `<head>` 맨 위에 아래 **고정 블록**을 넣는다. 기획전이 바뀌어도 이 블록은 그대로다.

**★ 고정 블록만 얹는다. 디자인은 손대지 않는다.**
섹션 구성·색·타이포·문구를 임의로 바꾸거나, 요소를 지우거나, 새로 짜지 않는다.

게시판이 「관련상품」 기능으로 만드는 영역도 있다. 그쪽은 마크업을 우리가 만들지 않고
**CSS 만 씌운다.**

```
section.magazine_view
 ├ div.cont              ← 우리 기획전 HTML
 ├ ul.img_memo_wrap      ← 상단 탭. 게시판이 만든다
 └ section.discount_view × N   ← 카테고리 + 상품. 게시판이 만든다
```

---

## 파일 구조

```html
<link rel="stylesheet" href="<몰 폰트 CSS>">
<style>
  /* ═══ 고정 · 기획전이 바뀌어도 그대로 ═══ */
  ... 아래 「고정 블록」 그대로 ...

  /* ═══ 기획전마다 교체 ═══ */
  ... KV · 소개 영역 스타일 ...

  @media screen and (min-width:1940px){ ... 고정 ... }
  @media (max-width:768px){ ... 고정 + KV 모바일 ... }
  @media (prefers-reduced-motion:reduce){ ... }
</style>

<section class="…-hero"> … 메인 비주얼 … </section>
<section class="content_box"> … 소개 … </section>

<script> … 히어로 시작 · 카테고리 컬러 전환 · 소개 등장 … </script>
```

경계에 **`/* ═══ 고정 ═══ */` 주석을 반드시 남긴다.** 다음 사람이 어디를 고쳐야 하는지
바로 알 수 있어야 한다.

---

## 고정 블록 (그대로 복사)

`<몰 CDN>/<기획전 경로>/` 부분만 그 기획전 경로로 바꾼다.

```css
/* 콘텐츠 틀 초기화 */
.magazine_view{ width: auto; margin-bottom: 0 !important;}
.cont img{ width: 100%;}
.magazine_view .cont{ margin-bottom: 0 !important;}
#contents .page_info,
.magazine_view .cont .title,
.magazine_view .cont .txt_03,
.magazine_view .cont .txt_info,
.magazine_view .cont .txt_01,
.magazine_view .cont .txt_02,
.magazine_view .line_01,
.magazine_view .relate_link,
.magazine_view .hashtag_box{ display: none;}
.base_slider_list{ margin-top: 0 !important;}
/* 관련상품 상단_TAB */
.img_memo_wrap{ position: sticky; position: -webkit-sticky; top: -1px; flex-wrap: wrap; gap: 80px; margin: 0 0 0; background-color: <탭 배경색>; z-index: 99;}
.img_memo_wrap li.on a{ font-weight: 700; color: <활성 글자색>;}
.img_memo_wrap li{ padding: 18px 20px; box-sizing: border-box; text-align: center; border-radius: 0; background-color: inherit;}
.img_memo_wrap li:last-child{ border-right: none;}
.img_memo_wrap li a{ font-size: 22px; transition: font-weight .05s;}
/* 카테고리 */
.discount_view .goods_list > div{ margin-bottom: 0; padding-top: 90px;}
.discount_view .goods_list > div .btn_top{ display: none;}
.discount_view .goods_list > div .tit_40{ padding-top: 250px; font-size: 0; filter: grayscale(1); transition: filter 1.2s ease;}
.discount_view .goods_list > div .tit_40.is-saturated{ filter: grayscale(0);}
#goodsList1.discount_view .goods_list > div .tit_40{ background: url(<CDN>/cate/img_cate_pc01.jpg) no-repeat center; background-size: cover;}
#goodsList2.discount_view .goods_list > div .tit_40{ background: url(<CDN>/cate/img_cate_pc02.jpg) no-repeat center; background-size: cover;}
#goodsList3.discount_view .goods_list > div .tit_40{ background: url(<CDN>/cate/img_cate_pc03.jpg) no-repeat center; background-size: cover;}
#goodsList4.discount_view .goods_list > div .tit_40{ background: url(<CDN>/cate/img_cate_pc04.jpg) no-repeat center; background-size: cover;}
/* 관련상품 */
* { box-sizing: border-box; }
html, body { margin: 0; -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
```

### 1940 이상

```css
@media screen and (min-width: 1940px){
  /* 콘텐츠 틀 초기화 1940 */
  #container{ padding-top: 180px;}
  .magazine_view_wrap{ width: 100%;}
}
```

### 768 이하 — **PC 와 클래스 이름이 다르다**

모바일 스킨은 카테고리 제목이 `.tit_40` 이 아니라 **`.txt_46`** 이다. 반드시 따로 쓴다.

```css
@media(max-width: 768px){
  /* 콘텐츠 틀 초기화 768 */
  .page_cont.padding_01{ padding:0; margin-bottom: 0 !important;}
  .page_view_top > *{ display: none;}
  /* 모바일 sticky 활성화 */
  #wrap { overflow: initial;}
  /* 관련상품 상단_TAB 768 */
  .img_memo_wrap{ top: 100px; gap: 0;}
  .img_memo_wrap li { width: 25%;/* 탭 개수에 맞춰서 조정 */ padding: 23px 0;}
  .img_memo_wrap li a{ font-size: 28px;}
  /* 카테고리 768 */
  .discount_view .goods_list > div{ padding-top: 100px;}
  .discount_view .goods_list > div#goodsList1{ padding-top: 0;}
  .discount_view .goods_list > div:last-child{ margin-bottom: 100px; padding-bottom: 70px;}
  .discount_view .goods_list > div:before{ display: none;}
  .discount_view .goods_list > div .txt_46{ padding-top: 300px; font-size: 0; filter: grayscale(1); transition: filter 1.2s ease;}
  .discount_view .goods_list > div .txt_46.is-saturated{ filter: grayscale(0);}
  .discount_view .goods_list > #goodsList1 .txt_46{ background: url(<CDN>/cate/img_cate_m01.jpg) no-repeat center; background-size: cover;}
  .discount_view .goods_list > #goodsList2 .txt_46{ background: url(<CDN>/cate/img_cate_m02.jpg) no-repeat center; background-size: cover;}
  .discount_view .goods_list > #goodsList3 .txt_46{ background: url(<CDN>/cate/img_cate_m03.jpg) no-repeat center; background-size: cover;}
  .discount_view .goods_list > #goodsList4 .txt_46{ background: url(<CDN>/cate/img_cate_m04.jpg) no-repeat center; background-size: cover;}
  .base_slider_list .product .infor_box .p_conts{ font-size: 26px;}
}
```

`.img_memo_wrap li{ width:25% }` 는 **탭 개수에 맞춰 바꾼다.** 3개면 33.33%.
카테고리 CSS 도 카테고리 수만큼 늘리거나 줄인다.

---

## 붙는 JS 세 덩어리 (형태 고정)

```
① 히어로 시작        .…-hero 에 .is-ready 를 붙여 애니메이션을 생성
                     — 초기 상태 확정 후 다음 프레임에 붙인다 (iOS 복구 오류 회피)
                     — pageshow 에서도 복구 (iOS 뒤로가기 캐시)
② 카테고리 컬러 전환  .tit_40 / .txt_46 이 화면에 들어오면 .is-saturated
                     — 모바일은 섹션이 AJAX 로 들어오므로 MutationObserver 필수
                     — IntersectionObserver 없으면 전부 즉시 컬러로
③ 소개 영역 등장      PC 는 IntersectionObserver, 모바일은 히어로가 끝난 뒤
```

②의 MutationObserver 를 빠뜨리면 **모바일에서 두 번째 카테고리부터 흑백으로 남는다.**
모바일은 로드 직후 섹션이 1개뿐이고 나머지는 스크롤할 때 들어온다.

---

## 스크롤 등장 — 이미지·텍스트가 촤르르

기획전에는 스크롤에 맞춰 요소가 순서대로 올라오는 연출을 기본으로 넣는다.

```css
.rv{opacity:0;transform:translateY(32px);
    transition:opacity .6s ease,transform .6s cubic-bezier(.2,.75,.25,1);
    will-change:transform,opacity}
.rv.is-in{opacity:1;transform:none}
.rv.is-done{will-change:auto}
```

```js
const io=new IntersectionObserver((es,ob)=>{es.forEach(e=>{
  if(!e.isIntersecting)return;
  e.target.classList.add('is-in'); ob.unobserve(e.target);
  setTimeout(()=>e.target.classList.add('is-done'),1400);
});},{threshold:.12,rootMargin:'0px 0px -8% 0px'});

// 지연은 행 단위로 리셋한다
el.style.transitionDelay = ((i % 열수) * 55) + 'ms';
```

| 대상 | 연출 |
|---|---|
| KV | 로드 직후 타이포 → 오브젝트 → 뱃지 → 하단 카피 순 상승 |
| 섹션 제목 | 화면 진입 시 상승 + 페이드 |
| 상품 카드 | 같은 행 안에서 왼쪽부터 **55ms** 간격 |
| 브랜드 로고 | **45ms** 간격 |
| 카테고리 제목 이미지 | 흑백 → 컬러 (`.is-saturated`) |

**주의**

- 지연을 인덱스 전체에 곱하면 마지막 카드가 **수십 초 뒤에** 나온다. 반드시 행 단위로 리셋
- 「더보기」로 늦게 들어오는 카드는 `MutationObserver` 로 다시 잡는다
- 발동한 요소는 `unobserve`, 끝난 요소는 `will-change` 해제
- ★ `transform:translate(-50%,-50%)` 로 **위치를 잡아둔 요소**에 등장용 `transform:translateY()`
  를 덮어쓰면 **가운데 정렬이 깨진다.** 그 요소는 `translate(-50%,calc(-50% + 46px))` →
  `translate(-50%,-50%)` 로 가는 **별도 키프레임**을 쓴다

---

## 납품 전 확인

- [ ] 고정 블록을 **한 줄도 빼먹지 않았는가**
- [ ] **디자인을 임의로 바꾸지 않았는가** (섹션·색·타이포·문구 그대로)
- [ ] 모바일 `.txt_46` 선택자를 **따로 썼는가**
- [ ] `.img_memo_wrap li` 폭이 **탭 개수와 맞는가**
- [ ] 카테고리 CSS 개수가 **실제 카테고리 수와 같은가**
- [ ] 등장 지연이 **행 단위로 리셋**되는가
- [ ] `translate(-50%,-50%)` 요소의 정렬이 **안 깨졌는가**
- [ ] PC·모바일 두 폭으로 **렌더 테스트**했는가 (스크롤 중간 프레임도 확인)
