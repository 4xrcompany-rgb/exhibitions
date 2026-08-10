# -*- coding: utf-8 -*-
"""
구성표 엑셀 → 기획전 HTML.

  python3 build_page.py config.json [_parsed.json] [mall_data.json]

핵심 규칙
  · 사용(B)=N  또는  내용 비어있음  →  마크업 자체를 만들지 않는다 (숨김 아님)
  · 상품코드 0개 → 섹션 전체 제거 / 칩 1개 → 칩 줄 제거 / 링크 없는 버튼 → 제거
  · 이미지 파일은 확장자 중복·대소문자를 무시하고 매칭
  · 처음 보이는 이미지는 base64 내장 (오프라인·샌드박스 렌더 보장)
  · 제거한 것은 report.json 에 기록하고 사용자에게 보고
"""
import sys, os, re, json, base64, html
from urllib.parse import quote

CFG      = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'config.json', encoding='utf-8'))
PARSED   = json.load(open(sys.argv[2] if len(sys.argv) > 2 else '_parsed.json', encoding='utf-8'))
MALL     = json.load(open(sys.argv[3])) if len(sys.argv) > 3 and os.path.exists(sys.argv[3]) else {'products': {}, 'brands': {}}

WORK  = CFG['work']['folder']
MAT   = os.path.join(WORK, CFG['work']['material_dir'])
ST    = CFG['style']
PROMO = CFG['promo']
VIEW  = CFG['mall']['product_view_url']
CDN_B = CFG['mall']['cdn_brand']

REMOVED, NOIMG, MATCHED = [], [], []
E = lambda s: html.escape(str(s), quote=True)

# ---------------------------------------------------------------- 시트 접근
SH = PARSED['sheets']
COL = ['No','사용','섹션ID','섹션명','구좌ID','구좌명','항목','유형','내용',
       '이미지파일명','이미지폴더','권장규격','가이드']
LETTER = 'ABCDEFGHIJKLM'


def sheet(prefix):
    for k in SH:
        if k.strip().startswith(prefix):
            return SH[k]
    return []


SECROWS = []
for r in sheet('③'):
    d = {COL[i]: r.get(LETTER[i], '') for i in range(len(COL))}
    if not str(d['No']).strip().isdigit():
        continue
    SECROWS.append(d)

COMMON = {}
for r in sheet('②'):
    a, b = r.get('A', ''), r.get('B', '')
    if a and a != '항목':
        COMMON[a.strip()] = b

PRODCFG = {}
for r in sheet('④'):
    sid = str(r.get('A', '')).strip()
    if not sid.startswith('S'):
        continue
    codes = [c.strip() for c in str(r.get('F', '')).replace('\n', ',').split(',') if c.strip()]
    PRODCFG[sid] = {'name': r.get('B', ''), 'use': str(r.get('C', '')).strip().upper(),
                    'show': int(float(r.get('D') or ST.get('default_show', 10))), 'codes': codes}

BRANDS = []
for r in sheet('⑤'):
    if not str(r.get('A', '')).strip().isdigit():
        continue
    BRANDS.append({'name': r.get('C', ''), 'use': str(r.get('B', '')).strip().upper(),
                   'mall': r.get('D', ''), 'eng': r.get('E', ''), 'id': r.get('G', ''),
                   'logo': r.get('H', ''), 'link': r.get('I', '')})

PDATA = MALL.get('products', {})


# ---------------------------------------------------------------- 조회
def rows(sid, gid=None, item=None):
    out = []
    for d in SECROWS:
        if d['섹션ID'] != sid: continue
        if str(d['사용']).strip().upper() != 'Y': continue
        if gid and d['구좌ID'] != gid: continue
        if item and d['항목'] != item: continue
        out.append(d)
    return out


def V(sid, gid, item):
    r = rows(sid, gid, item)
    if not r:
        REMOVED.append(f'{sid} · {gid} › {item}   (사용=N 또는 행 없음)')
        return ''
    v = r[0]['내용']
    if v in (None, '', 'None'):
        REMOVED.append(f"{sid} · {r[0]['구좌명']} › {item}   (내용 비어있음)")
        return ''
    return str(v).strip()


# ---------------------------------------------------------------- 이미지
def find_file(folder, name):
    d = os.path.join(MAT, folder)
    if not os.path.isdir(d) or not name:
        return None
    base = os.path.splitext(str(name))[0].lower()
    for f in os.listdir(d):
        if f.startswith('_'):
            continue
        fb = f.lower()
        while os.path.splitext(fb)[1] in ('.png', '.jpg', '.jpeg', '.gif', '.webp'):
            fb = os.path.splitext(fb)[0]
        if fb == base:
            if f.lower() != str(name).lower():
                MATCHED.append(f'{folder}/{f}  ←  엑셀 "{name}"')
            return os.path.join(d, f)
    return None


def data_uri(path, maxw=None):
    if maxw:
        try:
            from PIL import Image
            import io
            im = Image.open(path)
            if im.width > maxw:
                im.thumbnail((maxw, maxw * 4), Image.LANCZOS)
                buf = io.BytesIO()
                if im.mode in ('RGBA', 'LA', 'P'):
                    im.convert('RGBA').save(buf, 'PNG', optimize=True); m = 'png'
                else:
                    im.convert('RGB').save(buf, 'JPEG', quality=84, optimize=True); m = 'jpeg'
                return f'data:image/{m};base64,' + base64.b64encode(buf.getvalue()).decode()
        except ImportError:
            pass
    ext = os.path.splitext(path)[1].lower().lstrip('.')
    mime = 'jpeg' if ext in ('jpg', 'jpeg') else ext
    return f'data:image/{mime};base64,' + base64.b64encode(open(path, 'rb').read()).decode()


def IMG(sid, gid, item, folder, maxw=None):
    r = rows(sid, gid, item)
    if not r:
        return ''
    fn = r[0]['이미지파일명']
    if not fn:
        return ''
    p = find_file(folder, str(fn))
    if not p:
        NOIMG.append(f'{sid} · {r[0]["구좌명"]} › {item}   ({folder}/{fn})')
        return ''
    return data_uri(p, maxw)


CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'imgcache')


def cached(kind, key, fallback=''):
    p = os.path.join(CACHE, f'{kind}_{key}.jpg')
    if os.path.exists(p):
        return 'data:image/jpeg;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
    return fallback


# ---------------------------------------------------------------- 설정
C_MAIN  = COMMON.get('메인 컬러')       or ST['main_color']
C_PT    = COMMON.get('포인트 컬러')     or ST['point_color']
C_LIME  = COMMON.get('쿠폰바 컬러')     or ST['coupon_color']
C_CREAM = COMMON.get('섹션 교차 배경색') or ST['section_alt_bg']
WRAPW   = int(COMMON.get('컨텐츠 폭(px)') or ST['content_width'])
COLS    = int(COMMON.get('상품 그리드 칼럼') or ST['grid_cols'])
FONT    = f'"{ST["font_family"]} Variable",{ST["font_family"]},-apple-system,"Malgun Gothic",sans-serif'

SEC_IDS = sorted({d['섹션ID'] for d in SECROWS if d['섹션ID']})
NAV_SEC = next((s for s in SEC_IDS if rows(s, 'B01')), None)


# ---------------------------------------------------------------- 상품 카드
def rate(a, d):
    A = int(re.sub(r'\D', '', str(a) or '0') or 0)
    D = int(re.sub(r'\D', '', str(d) or '0') or 0)
    return 0 if (not A or not D or D >= A) else round((A - D) / A * 100)


def card(code, rank=None):
    p = PDATA.get(code)
    if not p:
        return ''
    r = rate(p.get('amt'), p.get('damt'))
    src = cached('p', code, p.get('img', ''))
    badge = f'<span class="rankno">{rank}</span>' if rank else ''
    price = (f'<em>{r}%</em>' if r else '') + \
            f'<b>{E(p.get("damt") or p.get("amt"))}</b>' + \
            (f'<s>{E(p.get("amt"))}</s>' if r else '')
    return (f'<a class="pcard" href="{VIEW.format(code=code)}" target="_blank">'
            f'<div class="pthumb">{badge}<img loading="lazy" src="{src}" alt="{E(p.get("n",""))}"></div>'
            f'<div class="pname">{E(p.get("n",""))}</div>'
            f'<div class="pprice">{price}</div>'
            f'<div class="pcode">NO. {code}</div></a>')


# ---------------------------------------------------------------- 섹션 조립
BLOCKS, NAV_ITEMS = [], []

for sid in SEC_IDS:
    if sid == NAV_SEC:
        continue
    body, title = [], ''

    # 헤더
    for gid in sorted({d['구좌ID'] for d in rows(sid)}):
        pass

    t = V(sid, next(iter(sorted({d['구좌ID'] for d in rows(sid)})), ''), '제목') if rows(sid) else ''
    # 제목/서브카피는 어느 구좌에 있든 첫 '제목' 항목을 쓴다
    for d in rows(sid):
        if d['항목'] == '제목' and str(d['내용']).strip():
            title = str(d['내용']).strip(); break
    sub = ''
    for d in rows(sid):
        if d['항목'] == '서브 카피' and str(d['내용']).strip():
            sub = str(d['내용']).strip(); break

    hd = (f'<h2>{E(title)}</h2>' if title else '') + \
         (f'<p class="secsub">{E(sub)}</p>' if sub else '')
    if hd:
        body.append(f'<div class="sechead"><div>{hd}</div></div>')

    # 상품 그리드
    pc = PRODCFG.get(sid)
    if pc and pc['use'] == 'Y' and pc['codes']:
        n = pc['show']
        cards = ''.join(card(c) for c in pc['codes'][:n])
        if cards:
            body.append(f'<div class="pgrid" data-codes="{",".join(pc["codes"])}">{cards}</div>')
    elif pc and not pc['codes']:
        REMOVED.append(f'{sid} 섹션 전체 (상품코드 없음)')
        continue

    # 자유 텍스트 구좌 (제목·서브카피 외 나머지)
    extras = [str(d['내용']).strip() for d in rows(sid)
              if d['항목'] not in ('제목', '서브 카피') and str(d['내용']).strip()
              and str(d['유형']).strip() in ('텍스트',)]
    if extras and not body:
        body.append('<ul class="freelist">' + ''.join(f'<li>{E(x)}</li>' for x in extras) + '</ul>')

    if not body:
        REMOVED.append(f'{sid} 섹션 전체 (내용 없음)')
        continue

    bg = C_CREAM if len(BLOCKS) % 2 == 0 else '#fff'
    BLOCKS.append(f'<section class="sec" id="{sid}" style="background:{bg}">'
                  f'<div class="wrap">{"".join(body)}</div></section>')
    if title:
        NAV_ITEMS.append((sid, title))

# ---------------------------------------------------------------- 네비게이션
NAV = ''
if NAV_SEC and (V(NAV_SEC, 'B01', '사용 여부') or 'N').upper() == 'Y':
    flag = {}
    for d in rows(NAV_SEC, 'B02'):
        m = re.search(r'\((S\d\d)\)', str(d['항목'] or ''))
        if m:
            flag[m.group(1)] = str(d['내용'] or 'Y').strip().upper() == 'Y'
    items = []
    for sid, t in NAV_ITEMS:
        if sid in flag and not flag[sid]:
            REMOVED.append(f'네비게이션 항목 : {sid} (네비 항목 = N)')
            continue
        items.append((sid, t))
    if items:
        sticky = (V(NAV_SEC, 'B01', '고정(sticky) 여부') or 'N').upper() == 'Y'
        links = ''.join(f'<a href="#{i}" class="navi{" on" if k==0 else ""}">{E(t)}</a>'
                        for k, (i, t) in enumerate(items))
        NAV = (f'<nav class="anav{" sticky" if sticky else ""}">'
               f'<div class="wrap">{links}</div></nav>')

# ---------------------------------------------------------------- 출력
CSS = f"""
:root{{--main:{C_MAIN};--pt:{C_PT};--lime:{C_LIME};--cream:{C_CREAM};--accent:#FF4800;
 --sub:#6B6B6B;--line:#E4E4E4;--wrap:{WRAPW}px;--cols:{COLS}}}
*{{box-sizing:border-box;margin:0;padding:0}} html{{scroll-behavior:smooth}}
body{{font-family:{FONT};color:#000;background:#fff;letter-spacing:-.01em;
 -webkit-font-smoothing:antialiased}}
a{{color:inherit;text-decoration:none}}
.wrap{{width:var(--wrap);max-width:calc(100% - 40px);margin:0 auto}}
.anav{{background:#fff;border-bottom:1px solid var(--line);z-index:50}}
.anav.sticky{{position:sticky;top:0}}
.anav .wrap{{display:flex;gap:26px;justify-content:center;height:46px;align-items:center;overflow-x:auto}}
.navi{{font-size:14px;color:#8A8A8A;font-weight:500;white-space:nowrap;padding:13px 0;position:relative}}
.navi.on{{color:#000;font-weight:700}}
.navi.on::after{{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:#000}}
.sec{{padding:80px 0}}
.sechead{{margin-bottom:22px}}
h2{{font-size:30px;font-weight:600;line-height:1.36;letter-spacing:-.02em}}
.secsub{{font-size:14px;color:var(--sub);margin-top:6px;line-height:1.6}}
.pgrid{{display:grid;grid-template-columns:repeat(var(--cols),1fr);gap:34px 16px}}
.pthumb{{position:relative;aspect-ratio:1/1.25;overflow:hidden;background:#F2F2F2;border-radius:2px}}
.pthumb img{{width:100%;height:100%;object-fit:cover;display:block}}
.rankno{{position:absolute;left:8px;top:8px;width:26px;height:26px;border-radius:50%;
 background:rgba(0,0,0,.78);color:#fff;font-size:12px;font-weight:800;
 display:flex;align-items:center;justify-content:center;z-index:2}}
.pname{{font-size:13px;margin-top:12px;line-height:1.45;min-height:38px;
 display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}
.pprice{{margin-top:7px}}
.pprice em{{font-style:normal;font-size:14px;font-weight:800;color:var(--accent);margin-right:6px}}
.pprice b{{font-size:14px;font-weight:700}}
.pprice s{{font-size:12px;color:#ABABAB;margin-left:6px}}
.pcode{{font-size:11px;color:#B4B4B4;margin-top:5px}}
.freelist li{{list-style:none;font-size:13px;line-height:1.9;color:#444}}
@media(max-width:1023px){{.pgrid{{grid-template-columns:repeat(3,1fr)}}}}
@media(max-width:640px){{.pgrid{{grid-template-columns:repeat(2,1fr)}}h2{{font-size:22px}}.sec{{padding:52px 0}}}}
"""

DOC = f"""<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(COMMON.get('기획전명') or PROMO.get('title',''))}</title>
<style>{CSS}</style></head><body>
{NAV}
{''.join(BLOCKS)}
<script>
const navs=[...document.querySelectorAll('.navi')];
addEventListener('scroll',()=>{{let c=0;navs.forEach((a,i)=>{{
 const e=document.getElementById(a.getAttribute('href').slice(1));
 if(e&&e.getBoundingClientRect().top<=140)c=i;}});
 navs.forEach((a,i)=>a.classList.toggle('on',i===c));}},{{passive:true}});
</script></body></html>"""

out = os.path.join(WORK, CFG['work']['page_name'])
open(out, 'w', encoding='utf-8').write(DOC)
json.dump({'removed': sorted(set(REMOVED)), 'noimg': sorted(set(NOIMG)),
           'matched': sorted(set(MATCHED))},
          open('report.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

print(f'{out}  {len(DOC):,} bytes')
print(f'섹션 {len(BLOCKS)} | 제거된 구좌 {len(set(REMOVED))} | 없는 이미지 {len(set(NOIMG))} | 파일명 자동매칭 {len(set(MATCHED))}')
print('-> report.json  (사용자에게 "빠진 것 + 살리는 법" 을 반드시 보고할 것)')
