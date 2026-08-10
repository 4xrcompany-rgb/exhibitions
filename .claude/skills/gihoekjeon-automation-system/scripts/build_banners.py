# -*- coding: utf-8 -*-
"""
배너 7종 HTML 생성 — PC 배너(1870x462) 기준, 사이즈별 재배치.

  python3 build_banners.py config.json
  node shot.mjs                      ← 이어서 실행하면 JPG 로 캡처

폰트 준비 (한 번만)
  npm pack pretendard && tar xzf pretendard-*.tgz
  mkdir -p webfonts && cp package/dist/web/static/woff2/Pretendard-{Black,ExtraBold,Bold,SemiBold,Medium}.woff2 webfonts/
  ※ CDN 직접 다운로드는 리다이렉트 스텁(100바이트)만 받아지는 경우가 있다.

사이즈별 고정 규칙
  PC       기준. 가운데 타이틀 + 좌우 장식
  모바일    타이틀 위아래 스택
  썸네일    텍스트 최소화 (상단 카피·날짜 제거)
  카톡     하단 검정 박스 + 텍스트
  앱푸시    텍스트 가운데 고정, 아주 간결
"""
import sys, os, json, base64

CFG = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'config.json', encoding='utf-8'))
ST, B, WORK = CFG['style'], CFG['banner'], CFG['work']['folder']
CP = B['copy']

HERE = os.path.dirname(os.path.abspath(__file__))
FONTDIR = os.path.join(HERE, '..', 'webfonts')
WEIGHT = {'Black': 900, 'ExtraBold': 800, 'Bold': 700, 'SemiBold': 600, 'Medium': 500}

FACE = ''
for n, w in WEIGHT.items():
    p = os.path.join(FONTDIR, f'Pretendard-{n}.woff2')
    if not os.path.exists(p) or os.path.getsize(p) < 100000:
        continue
    v = base64.b64encode(open(p, 'rb').read()).decode()
    FACE += (f"@font-face{{font-family:'P';src:url(data:font/woff2;base64,{v}) format('woff2');"
             f"font-weight:{w};font-style:normal;font-display:block}}")
if not FACE:
    print('경고: webfonts/ 에 Pretendard woff2 가 없습니다. 시스템 폰트로 대체됩니다.')

OBJ = ''
op = os.path.join(WORK, B.get('object_png', ''))
if B.get('object_png') and os.path.exists(op):
    OBJ = 'data:image/png;base64,' + base64.b64encode(open(op, 'rb').read()).decode()

RED, CYAN, YEL, INK = ST['main_color'], ST['point_color'], ST['yellow'], ST['ink']

TORN_W = ("polygon(0% 7%,2% 2%,5% 6%,8% 1%,12% 5%,16% 0%,20% 5%,24% 1%,28% 6%,33% 1%,37% 5%,"
          "42% 0%,46% 5%,51% 1%,55% 6%,60% 1%,64% 5%,69% 0%,73% 5%,78% 1%,82% 6%,87% 1%,91% 5%,"
          "95% 0%,99% 5%,100% 11%,99% 20%,100% 29%,98% 38%,100% 48%,99% 57%,100% 66%,98% 76%,"
          "100% 85%,99% 94%,96% 100%,91% 95%,86% 100%,81% 96%,76% 100%,71% 95%,66% 100%,61% 96%,"
          "56% 100%,51% 95%,46% 100%,41% 96%,36% 100%,31% 95%,26% 100%,21% 96%,16% 100%,11% 95%,"
          "6% 100%,2% 97%,0% 91%,1% 82%,0% 73%,1% 63%,0% 54%,1% 44%,0% 35%,1% 25%,0% 16%)")
TORN_B = ("polygon(0% 6%,3% 1%,7% 5%,11% 0%,15% 6%,19% 1%,23% 5%,28% 0%,32% 6%,37% 1%,41% 5%,"
          "46% 0%,50% 6%,55% 1%,59% 5%,64% 0%,68% 6%,73% 1%,77% 5%,82% 0%,86% 6%,91% 1%,95% 5%,"
          "99% 1%,100% 10%,99% 19%,100% 28%,98% 38%,100% 47%,99% 57%,100% 66%,98% 76%,100% 86%,"
          "99% 95%,95% 100%,90% 95%,85% 100%,80% 96%,75% 100%,70% 95%,65% 100%,60% 96%,55% 100%,"
          "50% 95%,45% 100%,40% 96%,35% 100%,30% 95%,25% 100%,20% 96%,15% 100%,10% 95%,5% 100%,"
          "1% 97%,0% 90%,1% 80%,0% 70%,1% 60%,0% 50%,1% 40%,0% 30%,1% 20%)")

BASE = f"""
{FACE}
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{background:#fff}}
.stage{{position:relative;overflow:hidden;background:{RED};font-family:'P';
 -webkit-font-smoothing:antialiased;color:#fff}}
.vinyl{{position:absolute;inset:0;z-index:1;pointer-events:none;mix-blend-mode:screen;opacity:.85;
 background:
  repeating-linear-gradient(102deg, rgba(255,255,255,.10) 0px, rgba(255,255,255,0) 3px, rgba(0,0,0,.05) 7px, rgba(255,255,255,0) 12px),
  repeating-linear-gradient(-77deg, rgba(255,255,255,.07) 0px, rgba(255,255,255,0) 5px, rgba(0,0,0,.045) 11px, rgba(255,255,255,0) 19px),
  radial-gradient(120% 80% at 30% 12%, rgba(255,255,255,.20), rgba(255,255,255,0) 55%),
  radial-gradient(90% 70% at 82% 88%, rgba(0,0,0,.22), rgba(0,0,0,0) 60%)}}
.vinyl2{{position:absolute;inset:0;z-index:1;pointer-events:none;mix-blend-mode:multiply;opacity:.55;
 background:repeating-linear-gradient(63deg, rgba(0,0,0,.10) 0px, rgba(0,0,0,0) 6px, rgba(0,0,0,.06) 14px, rgba(0,0,0,0) 26px)}}
.pack{{position:absolute;z-index:2;pointer-events:none;border-radius:14px;
 background:linear-gradient(148deg, rgba(255,255,255,.17), rgba(255,255,255,.02) 36%, rgba(0,0,0,.12) 70%, rgba(255,255,255,.11));
 box-shadow:0 0 0 1px rgba(255,255,255,.12) inset, 0 24px 60px rgba(0,0,0,.20);
 -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 5%,#000 95%,transparent 100%),
                    linear-gradient(180deg,transparent 0,#000 6%,#000 94%,transparent 100%);
 -webkit-mask-composite:source-in;mask-composite:intersect}}
.torn{{position:relative;display:inline-block;padding:.10em .40em .16em;line-height:.92;z-index:5}}
.torn.white{{background:#F7F4EF;color:{INK};clip-path:{TORN_W};box-shadow:0 14px 34px rgba(0,0,0,.30)}}
.torn.black{{background:{INK};color:#fff;clip-path:{TORN_B};box-shadow:0 14px 34px rgba(0,0,0,.38)}}
.label{{display:inline-block;background:{INK};color:#fff;font-weight:800;position:relative;z-index:6;
 padding:.22em .70em .30em;letter-spacing:-.02em;
 clip-path:polygon(0% 10%,5% 2%,14% 8%,24% 1%,35% 7%,46% 1%,57% 8%,68% 2%,79% 8%,89% 2%,97% 7%,100% 16%,99% 30%,100% 46%,98% 62%,100% 78%,99% 90%,95% 98%,86% 93%,75% 99%,64% 93%,53% 99%,42% 93%,31% 99%,20% 93%,10% 98%,3% 94%,0% 86%,1% 68%,0% 52%,1% 36%,0% 22%)}}
.tape{{position:absolute;background:{YEL};opacity:.94;z-index:7;box-shadow:0 4px 12px rgba(0,0,0,.22);
 clip-path:polygon(0% 12%,100% 0%,100% 88%,0% 100%)}}
.sticker{{position:absolute;border-radius:50%;display:flex;flex-direction:column;z-index:7;
 align-items:center;justify-content:center;font-weight:900;text-align:center;
 box-shadow:0 12px 28px rgba(0,0,0,.30)}}
/* ⚠ padding 에 % 금지 — 부모 너비 기준으로 계산되어 폭발한다 */
.tri{{position:absolute;z-index:7;background:{YEL};color:{INK};font-weight:900;
 display:flex;flex-direction:column;align-items:center;justify-content:flex-end;
 clip-path:polygon(50% 0%, 100% 100%, 0% 100%);
 padding-bottom:.34em;text-align:center;line-height:1.06;
 filter:drop-shadow(0 10px 22px rgba(0,0,0,.28))}}
.barcode{{position:absolute;z-index:7;background:#fff;padding:6px 8px;
 box-shadow:0 6px 16px rgba(0,0,0,.22);background-size:100% 100%;
 background-image:repeating-linear-gradient(90deg,#111 0 2px,#fff 2px 4px,#111 4px 5px,#fff 5px 9px,#111 9px 12px,#fff 12px 14px)}}
.chip{{position:absolute;background:#F7F4EF;color:{INK};font-weight:900;z-index:7;
 display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.05;
 clip-path:polygon(0% 8%,6% 0%,18% 7%,32% 0%,48% 8%,63% 1%,78% 8%,90% 1%,100% 9%,99% 26%,100% 45%,98% 62%,100% 80%,97% 94%,88% 100%,74% 94%,60% 100%,45% 93%,31% 100%,17% 94%,6% 100%,0% 90%,1% 70%,0% 52%,1% 34%);
 box-shadow:0 10px 24px rgba(0,0,0,.26)}}
.obj{{position:absolute;z-index:4;filter:drop-shadow(0 22px 46px rgba(0,0,0,.35))}}
.obj img{{width:100%;display:block}}
.blackbar{{position:absolute;left:0;right:0;bottom:0;background:{INK};z-index:9;
 display:flex;align-items:center;justify-content:space-between}}
.top{{position:absolute;z-index:6;text-align:center;left:0;right:0}}
.date{{position:absolute;z-index:6;text-align:center;left:0;right:0;font-weight:700}}
.hl{{color:{CYAN}}}
"""


def stage(w, h, inner):
    return (f'<!doctype html><html><head><meta charset="utf-8"><style>{BASE}'
            f'.stage{{width:{w}px;height:{h}px}}</style></head><body>'
            f'<div class="stage"><div class="vinyl"></div><div class="vinyl2"></div>{inner}</div>'
            f'</body></html>')


def obj(style):
    return f'<div class="obj" style="{style}"><img src="{OBJ}"></div>' if OBJ else ''


def title_row(size, gap=-24):
    return (f'<span class="torn white" style="font-size:{size}px;font-weight:900;'
            f'transform:rotate(-3.2deg);margin-right:{gap}px">{CP["title_a"]}</span>'
            f'<span class="torn black" style="font-size:{size}px;font-weight:900;'
            f'transform:rotate(2.4deg)">{CP["title_b"]}</span>')


def title_stack(size):
    return (f'<div><span class="torn white" style="font-size:{size}px;font-weight:900;'
            f'transform:rotate(-3deg);display:inline-block">{CP["title_a"]}</span></div>'
            f'<div style="margin-top:-10px"><span class="torn black" style="font-size:{size}px;'
            f'font-weight:900;transform:rotate(2.6deg);display:inline-block">{CP["title_b"]}</span></div>')


def deco(k=1.0):
    s = lambda v: round(v * k)
    return f"""
    <div class="tape" style="left:{s(96)}px;top:{s(112)}px;width:{s(84)}px;height:{s(34)}px;transform:rotate(-14deg)"></div>
    <div class="chip" style="left:{s(62)}px;top:{s(132)}px;width:{s(148)}px;height:{s(104)}px;
         font-size:{s(23)}px;transform:rotate(-9deg)">SUMMER<br>SALE</div>
    <div class="barcode" style="left:{s(78)}px;top:{s(312)}px;width:{s(112)}px;height:{s(46)}px;transform:rotate(11deg)"></div>
    <div class="sticker" style="right:{s(58)}px;top:{s(38)}px;width:{s(140)}px;height:{s(140)}px;
         background:radial-gradient(circle at 34% 28%,#ff5a52,#c00b13);color:#fff;
         font-size:{s(23)}px;line-height:1.08;transform:rotate(13deg)">SUPER<br>SALE</div>
    <div class="tri" style="right:{s(74)}px;bottom:{s(40)}px;width:{s(158)}px;height:{s(132)}px;
         font-size:{s(17)}px">UP TO<br><span style="font-size:{s(28)}px">{ST.get('max_pct','70%')}</span></div>
    <div class="barcode" style="right:{s(248)}px;bottom:{s(70)}px;width:{s(96)}px;height:{s(40)}px;transform:rotate(-8deg)"></div>"""


def build(role, w, h, variant=None):
    if role == 'pc':
        inner = (f'<div class="pack" style="left:{int(w*.25)}px;top:-40px;width:{int(w*.50)}px;height:{h+80}px;transform:rotate(-1deg)"></div>'
                 + deco(1.0) + obj('right:262px;top:106px;width:224px')
                 + f'<div class="top" style="top:56px;font-size:25px;font-weight:800;line-height:1.5;letter-spacing:-.02em">{CP["top1"]}<br>{CP["top2"]}</div>'
                 + f'<div style="position:absolute;left:0;right:0;top:150px;text-align:center;z-index:6"><span class="label" style="font-size:28px">{CP["label"]}</span></div>'
                 + f'<div style="position:absolute;left:50%;top:292px;transform:translate(-50%,-50%);z-index:5;white-space:nowrap">{title_row(118)}</div>'
                 + f'<div class="date" style="bottom:38px;font-size:25px">{CP["date"]}</div>')
    elif role == 'mobile':
        inner = (f'<div class="pack" style="left:44px;top:118px;width:{w-88}px;height:530px;transform:rotate(-1deg)"></div>'
                 + deco(.86) + obj('left:50%;transform:translateX(-50%);top:126px;width:126px')
                 + f'<div class="top" style="top:44px;font-size:27px;font-weight:800;line-height:1.5">{CP["top1"]}<br>{CP["top2"]}</div>'
                 + f'<div style="position:absolute;left:0;right:0;top:272px;text-align:center;z-index:6"><span class="label" style="font-size:26px">{CP["label"]}</span></div>'
                 + f'<div style="position:absolute;left:0;right:0;top:330px;text-align:center;z-index:5">{title_stack(132)}</div>'
                 + f'<div class="date" style="bottom:44px;font-size:26px">{CP["date"]}</div>')
    elif role == 'thumb':
        # ★ 텍스트 최소화 — 상단 카피·날짜 제거
        inner = (f'<div class="pack" style="left:52px;top:70px;width:{w-104}px;height:470px;transform:rotate(-1deg)"></div>'
                 + deco(.80) + obj('left:50%;transform:translateX(-50%);top:52px;width:112px')
                 + f'<div style="position:absolute;left:0;right:0;top:196px;text-align:center;z-index:6"><span class="label" style="font-size:26px">{CP["label"]}</span></div>'
                 + f'<div style="position:absolute;left:0;right:0;top:252px;text-align:center;z-index:5">{title_stack(128)}</div>')
    elif role == 'kakao':
        # ★ 하단 검정 박스
        inner = (f'<div class="pack" style="left:36px;top:96px;width:{w-72}px;height:500px;transform:rotate(-1deg)"></div>'
                 + deco(.76) + obj('left:50%;transform:translateX(-50%);top:88px;width:112px')
                 + f'<div class="top" style="top:34px;font-size:24px;font-weight:800;line-height:1.5">{CP["top1"]}</div>'
                 + f'<div style="position:absolute;left:0;right:0;top:228px;text-align:center;z-index:6"><span class="label" style="font-size:24px">{CP["label"]}</span></div>'
                 + f'<div style="position:absolute;left:0;right:0;top:296px;text-align:center;z-index:5">{title_stack(126)}</div>'
                 + f'<div class="blackbar" style="height:92px;padding:0 34px">'
                   f'<span style="font-size:27px;font-weight:800">{CP["bar_left"]}</span>'
                   f'<span style="font-size:27px;font-weight:900">{CP["bar_right"]} <span style="color:{CYAN}">&nbsp;›</span></span></div>')
    else:  # app — ★ 가운데 고정, 간결
        if variant == 'A':
            inner = (f'<div class="pack" style="left:118px;top:-30px;width:{w-236}px;height:{h+60}px;transform:rotate(-1deg)"></div>'
                     + f'<div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;z-index:5;white-space:nowrap">{title_row(112,-22)}</div>'
                     + f'<div class="date" style="bottom:44px;font-size:26px">{CP["app_sub"]}</div>')
        elif variant == 'B':
            inner = (f'<div class="pack" style="left:96px;top:-30px;width:{w-192}px;height:{h+60}px;transform:rotate(-1deg)"></div>'
                     + obj('left:50%;transform:translateX(-50%);top:24px;width:118px')
                     + f'<div style="position:absolute;left:0;right:0;top:206px;text-align:center;z-index:6"><span class="label" style="font-size:26px">{CP["label"]}</span></div>'
                     + f'<div style="position:absolute;left:0;right:0;top:268px;text-align:center;z-index:5;white-space:nowrap">{title_row(104,-20)}</div>')
        else:
            inner = (f'<div class="pack" style="left:140px;top:-30px;width:{w-280}px;height:{h+60}px;transform:rotate(-1deg)"></div>'
                     + f'<div style="position:absolute;left:0;right:0;top:62px;text-align:center;z-index:6;font-size:29px;font-weight:800">{CP["app_sub"]}</div>'
                     + f'<div style="position:absolute;left:0;right:0;top:124px;text-align:center;z-index:5">{title_stack(86)}</div>'
                     + f'<div class="date" style="bottom:40px;font-size:25px">{CP["date"]}</div>')
    return stage(w, h, inner)


OUT = os.path.join(WORK, B['output_dir'])
os.makedirs(OUT, exist_ok=True)
jobs = []
for spec in B['sizes']:
    for i in range(spec['count']):
        nm = spec['name'] + ('_' + chr(65 + i) if spec['count'] > 1 else '')
        v = chr(65 + i) if spec['count'] > 1 else None
        open(os.path.join(OUT, nm + '.html'), 'w', encoding='utf-8').write(
            build(spec['role'], spec['w'], spec['h'], v))
        jobs.append({'name': nm, 'w': spec['w'], 'h': spec['h'], 'dir': OUT})

json.dump(jobs, open(os.path.join(OUT, '_jobs.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(f'HTML {len(jobs)}개 → {OUT}')
print('이어서:  node shot.mjs', os.path.join(OUT, '_jobs.json'))
