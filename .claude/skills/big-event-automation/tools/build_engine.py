# -*- coding: utf-8 -*-
"""대형 기획전 공통 파일 만들기 — 완성된 기획전 index.html(추석)을 나눈다.
   · engine/big_event.css  : <style> 전부 (모양)
   · engine/big_event.js   : 스크립트 (기능). 맨 위 설정 블록 대신 window.BF_EVENT 를 읽는다
   · samples/<이름>/settings.js : 설정 블록 그대로 (window.BF_EVENT 로 내보냄)
   · templates/markup.html : 화면 틀 (섹션·문구)
   사용: python build_engine.py <완성 index.html> <이름>   예) python build_engine.py "E:\\작업\\콘텐츠\\0914_추석 기획전\\index.html" 추석"""
import io, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, NAME = sys.argv[1], sys.argv[2]
s = io.open(SRC, encoding='utf-8', newline='').read()
nl = '\r\n' if '\r\n' in s else '\n'
s = s.replace('\r\n', '\n')

def wr(rel, text):
    p = os.path.join(HERE, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    io.open(p, 'w', encoding='utf-8', newline='').write(text)
    print('  %-34s %7d bytes' % (rel, len(text.encode('utf-8'))))

# ── 모양 : 첫 <style> ~ </style>
st = s.index('\n<style>\n') + 1
se = s.index('\n</style>\n', st)
css = s[st + len('<style>\n'):se + 1]
# ── 화면 틀 : </style> 뒤 ~ 기능 <script> 앞
body_start = se + len('\n</style>\n')
js_open = s.index('\n<script>\n(function(){', body_start) + 1
markup = s[body_start:js_open].strip('\n') + '\n'
# ── 기능
js_close = s.index('\n</script>', js_open)
js = s[js_open + len('<script>\n'):js_close + 1]

# 설정 블록 : '/* 이미지 기본 경로 */' ~ '/* 공통 */' 앞
c0 = js.index('  /* 이미지 기본 경로 */')
c1 = js.index('  /* 공통 */', c0)
config = js[c0:c1]
names = re.findall(r'^  const (BF_[A-Z_]+)\s*=', config, re.M)
KEYS = {'BF_IMG':'img', 'BF_CONFIG':'config', 'BF_RELATED_GOODS_BUTTON':'relatedButton', 'BF_COUPON':'coupon', 'BF_GIFT_ITEMS':'gift',
        'BF_LUCKYBAG':'luckybag', 'BF_NOTICE_MODALS':'noticeModals', 'BF_PRIZE_MODAL':'prizeModal', 'BF_WINNER_MODAL':'winnerModal',
        'BF_LOTTO_UI':'lottoUi', 'BF_COMMENT':'comment', 'BF_MEMBERSHIP':'membership', 'BF_QUICK':'quick', 'BF_TITLE_IMG':'titleImg',
        'BF_DAILY_VISUAL':'dailyVisual', 'BF_DAILY_DATA':'dailyData'}
missing = [n for n in names if n not in KEYS]
assert not missing, '모르는 설정 : %s' % missing
assert set(KEYS) == set(names), '설정 블록이 예상과 다름 : 없음 %s' % (set(KEYS) - set(names))

adapter = ("  /* 설정 : 게시글이 먼저 불러온 settings 파일(window.BF_EVENT). 날짜는 글자로 와도 된다 */\n"
           "  const BF_EVENT = window.BF_EVENT || {};\n"
           + ''.join("  const %s = BF_EVENT.%s%s;\n" % (n, KEYS[n], {'BF_IMG':" || ''", 'BF_GIFT_ITEMS':' || []', 'BF_NOTICE_MODALS':' || []'}.get(n, ' || {}')) for n in names)
           + "  BF_CONFIG.eventStart = new Date(BF_CONFIG.eventStart);\n"
           "  BF_CONFIG.eventEnd = new Date(BF_CONFIG.eventEnd);\n\n")
engine_js = ("/* 4XR 대형 기획전 (공통 기능) — 게시글에서 settings 파일(window.BF_EVENT)을 먼저 불러온 뒤 이 파일을 불러온다.\n"
             "   섹션 틀(HTML)이 없는 섹션은 그냥 건너뛴다(빈 구좌는 만들지 않는다). */\n"
             + js[:c0] + adapter + js[c1:])
settings_js = ("/* 4XR 대형 기획전 설정 — %s. 이 파일만 기획전마다 바뀐다 (공통 기능 big_event.js 가 읽음) */\n" % NAME
               + "(function(){\n" + config.rstrip('\n') + "\n\n  window.BF_EVENT = {\n"
               + ',\n'.join("    %s: %s" % (KEYS[n], n) for n in names) + "\n  };\n})();\n")
engine_css = "/* 4XR 대형 기획전 (공통 모양) */\n" + css

print('나눈 결과 (%s) :' % NAME)
wr('engine/big_event.css', engine_css)
wr('engine/big_event.js', engine_js)
wr('samples/%s/settings.js' % NAME, settings_js)
wr('samples/%s/markup.html' % NAME, markup)
# 머리(폰트·검색 블록) 도 따로 — 새 기획전 틀에 그대로 쓴다
head = s[:st].rstrip('\n') + '\n'
wr('samples/%s/head.html' % NAME, head)
print('설정 이름 %d개 : %s' % (len(names), ', '.join(names)))
