# -*- coding: utf-8 -*-
"""화면 틀(markup) → 템플릿. 기획전마다 바뀌는 글자는 {{이름}} 자리로, 섹션은 <!--@섹션--> 표시로 감싼다(빈 섹션은 통째로 뺄 수 있게).
   · templates/markup.html : 자리가 있는 틀
   · samples/<이름>/texts.json : 그 기획전 글자(자리 값)
   확인 : 자리에 그 기획전 글자를 다시 넣으면 원래 틀과 글자 하나 다르지 않아야 한다.
   사용: python make_template.py <이름>   예) python make_template.py 추석"""
import io, os, re, sys, json
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NAME = sys.argv[1]
SRC = os.path.join(HERE, 'samples', NAME, 'markup.html')
m = io.open(SRC, encoding='utf-8', newline='').read()
orig = m
texts = {}

def slot(key, pattern, group=1, count=1):
    """pattern 의 group 부분을 {{key}} 로 바꾸고 원래 글자를 texts 에 남긴다"""
    global m
    found = list(re.finditer(pattern, m, re.S))
    assert len(found) == count, '%s : %d곳' % (key, len(found))
    f = found[0]
    texts[key] = f.group(group)
    m = m[:f.start(group)] + '{{' + key + '}}' + m[f.end(group):]

# 기간 · 퀵 띠
slot('period', r'<h3 class="time_period">(.*?)</h3>')
slot('band_title', r'<b class="quick_band_title">(.*?)</b>')
slot('band_desc', r'<em class="quick_band_desc">(.*?)</em>')
slot('band_btn', r'<span class="quick_band_btn">(.*?)</span>')
# 스티키 글자 (섹션별 표시로 감싸 빈 섹션이면 같이 빠지게)
STICKY = {'coupon_section':'coupon', 'gift_section':'gift', 'luckybag_section':'luckybag', 'daily_section':'daily01', 'daily_section02':'daily02',
          'review_section':'review', 'lotto_section':'lotto', 'ranking_section':'ranking', 'membership_section':'membership', 'link_sh_relation':'related'}
for sid, key in STICKY.items():
    pat = r'(    <div class="sticky_item"><a class="sticky_link" href="#%s">)(.*?)(</a></div>\n)' % sid
    f = re.search(pat, m)
    assert f, sid
    texts['sticky_' + key] = f.group(2)
    m = m[:f.start()] + '<!--@%s-->' % key + f.group(1) + '{{sticky_%s}}' % key + f.group(3).rstrip('\n') + '<!--@/%s-->\n' % key + m[f.end():]
# 섹션 제목 · 문구
for key, t in [('coupon', 'coupon'), ('gift', 'gift'), ('luckybag', 'luckybag'), ('review', 'review'), ('lotto', 'lotto')]:
    slot(key + '_title', r'<h1 data-title-img="%s">(.*?)</h1>' % t)
for key in ['coupon', 'gift', 'luckybag', 'review', 'lotto']:
    blk = r'<h1 data-title-img="%s">\{\{%s_title\}\}</h1>.*?<h3><span class="bf_copy_pc">(.*?)</span>\s*<span class="bf_copy_mo">(.*?)</span>' % (key, key)
    f = re.search(blk, m, re.S); assert f, key
    texts[key + '_pc'], texts[key + '_mo'] = f.group(1), f.group(2)
    m = m[:f.start(1)] + '{{%s_pc}}' % key + m[f.end(1):f.start(2)] + '{{%s_mo}}' % key + m[f.end(2):]
for key, t in [('daily01', 'daily01'), ('daily02', 'daily02'), ('ranking', 'ranking'), ('membership', 'membership')]:
    slot(key + '_title', r'<h1 data-title-img="%s">(.*?)</h1>' % t)
    slot(key + '_copy', r'<h1 data-title-img="%s">\{\{%s_title\}\}</h1>\s*<h3>(.*?)</h3>' % (t, key))
# 후기 숫자 · 날짜
slot('review_before', r'<p class="review_before">기존 <s>(.*?)</s></p>')
slot('review_amount', r'<strong class="bf_countup">(.*?)</strong>')
slot('review_sub', r'<p class="review_sub">(.*?)</p>')
slot('review_write_pc', r'<b>후기 작성</b><em><span class="bf_copy_pc">(.*?)</span>')
slot('review_write_mo', r'<b>후기 작성</b><em><span class="bf_copy_pc">\{\{review_write_pc\}\}</span><span class="bf_copy_mo">(.*?)</span>')
slot('review_pay_pc', r'<b>적립금 지급</b><em><span class="bf_copy_pc">(.*?)</span>')
slot('review_pay_mo', r'<b>적립금 지급</b><em><span class="bf_copy_pc">\{\{review_pay_pc\}\}</span><span class="bf_copy_mo">(.*?)</span>')
slot('review_past_pc', r'<span class="review_past_txt">\s*<span class="bf_copy_pc">(.*?)</span>\n')
slot('review_past_mo', r'<span class="bf_copy_pc">\{\{review_past_pc\}\}</span>\n\s*<span class="bf_copy_mo">(.*?)</span>\n')

# 퀵 메뉴 아래 로또 띠 : 로또가 없으면 같이 빠지게
qb = re.search(r'      <a class="quick_band"[^\n]*\n.*?      </a>\n', m, re.S)
assert qb, '퀵 로또 띠'
m = m[:qb.start()] + '<!--@lotto-->\n' + qb.group(0) + '<!--@/lotto-->\n' + m[qb.end():]

# 섹션 통째 표시 : '  <!-- xxx_section -->' 부터 다음 섹션 주석 앞까지
SECTIONS = [('coupon_section', 'coupon'), ('gift_section', 'gift'), ('luckybag_section', 'luckybag'), ('daily_section', 'daily01'), ('daily_section02', 'daily02'),
            ('review_section', 'review'), ('lotto_section', 'lotto'), ('ranking_section', 'ranking'), ('membership_section', 'membership')]
for sid, key in SECTIONS:
    a = m.index('  <!-- %s -->\n' % sid)
    nxt = [m.find('  <!-- %s -->\n' % s2, a + 5) for s2, _ in SECTIONS]
    nxt = [x for x in nxt if x > a]
    b = min(nxt) if nxt else m.index('\n</div>\n\n<!-- coupon_notice_modal -->', a) + 1
    m = m[:a] + '<!--@%s-->\n' % key + m[a:b] + '<!--@/%s-->\n' % key + m[b:]

def fill(tpl, tx, off=()):
    out = tpl
    for k in off:
        out = re.sub(r'<!--@%s-->.*?<!--@/%s-->\n' % (k, k), '', out, flags=re.S)
    out = re.sub(r'(?m)^<!--@/?[a-z0-9]+-->\n', '', out)      # 한 줄짜리 섹션 표시
    out = re.sub(r'<!--@/?[a-z0-9]+-->', '', out)              # 줄 안의 표시(스티키)
    return re.sub(r'\{\{([a-z0-9_]+)\}\}', lambda x: tx[x.group(1)], out)

back = fill(m, texts)
if back != orig:
    import difflib
    print(''.join(list(difflib.unified_diff(orig.splitlines(True), back.splitlines(True), n=1))[:40]))
    raise SystemExit('★ 되돌린 틀이 원래와 다름')
os.makedirs(os.path.join(HERE, 'templates'), exist_ok=True)
io.open(os.path.join(HERE, 'templates', 'markup.html'), 'w', encoding='utf-8', newline='').write(m)
io.open(os.path.join(HERE, 'samples', NAME, 'texts.json'), 'w', encoding='utf-8').write(json.dumps(texts, ensure_ascii=False, indent=1))
print('templates/markup.html · 자리 %d개 · 섹션 표시 %d개 · 되돌리면 원래와 같음 ✔' % (len(texts), len(re.findall(r'<!--@(?!/)', m))))
