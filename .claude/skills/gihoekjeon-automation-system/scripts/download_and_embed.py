# -*- coding: utf-8 -*-
"""
download_and_embed.py  —  참고사이트 1:1 재현 엔진 (범용, 재사용)

용도: 참고 기획전 사이트의 실제 이미지 URL들을 받아서 내려받고,
      base64 data-URI로 HTML 템플릿에 박아넣어 '자기완결형' HTML을 만든다.
      (Claude 아티팩트는 외부 이미지를 못 불러오므로, 이미지를 파일에 직접 심어야
       원본과 똑같이 렌더된다.)

사용법:
  python download_and_embed.py --manifest assets.json --template template.html --out out.html

  assets.json  : { "키이름": "https://.../image.jpg", ... }   (키=템플릿 토큰명)
  template.html: 이미지 자리에 @@키이름@@ 토큰을 넣은 HTML
                 예) <img src="@@w-s0-tit@@">  또는  background-image:url('@@hero1@@')
  out.html     : 토큰이 data-URI로 치환된 최종 자기완결형 HTML

옵션:
  --referer https://www.example.com/   (핫링크 차단 우회용, 기본: manifest 첫 URL의 origin)
  --max-mb 16                          (초과 시 경고. 아티팩트 한도 16MB)
"""
import json, base64, ssl, urllib.request, argparse, os, sys
from urllib.parse import urlparse

def fetch(url, referer):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": referer,
    })
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(req, context=ctx, timeout=40) as r:
        return r.read()

def datauri(url, referer):
    data = fetch(url, referer)
    ext = url.split("?")[0].split(".")[-1].lower()
    mime = {"png":"image/png","jpg":"image/jpeg","jpeg":"image/jpeg",
            "gif":"image/gif","webp":"image/webp","svg":"image/svg+xml"}.get(ext, "image/jpeg")
    return "data:%s;base64,%s" % (mime, base64.b64encode(data).decode()), len(data)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--template", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--referer", default=None)
    ap.add_argument("--max-mb", type=float, default=16.0)
    a = ap.parse_args()

    assets = json.load(open(a.manifest, encoding="utf-8"))
    html = open(a.template, encoding="utf-8").read()

    referer = a.referer
    if not referer and assets:
        first = next(iter(assets.values()))
        p = urlparse(first); referer = "%s://%s/" % (p.scheme, p.netloc)

    total = 0; ok = 0; fail = []
    for key, url in assets.items():
        token = "@@%s@@" % key
        if token not in html:
            print("skip (템플릿에 토큰 없음) %s" % key); continue
        try:
            uri, sz = datauri(url, referer)
            html = html.replace(token, uri)
            total += sz; ok += 1
            print("ok  %-26s %7.1f KB" % (key, sz/1024))
        except Exception as e:
            fail.append(key); print("ERR %-26s %s" % (key, e))

    open(a.out, "w", encoding="utf-8").write(html)
    mb = os.path.getsize(a.out)/1024/1024
    print("-"*50)
    print("성공 %d / 실패 %d | 원본이미지 %.2f MB | 최종 HTML %.2f MB" % (ok, len(fail), total/1024/1024, mb))
    if fail: print("실패 키:", ", ".join(fail))
    if mb > a.max_mb:
        print("⚠ 경고: 최종 HTML이 %.1fMB 한도를 초과. 이미지 수를 줄이거나 해상도를 낮추세요." % a.max_mb)
    # 남은 미치환 토큰 경고
    import re
    leftover = re.findall(r"@@[\w\-]+@@", html)
    if leftover:
        print("⚠ 미치환 토큰(assets.json에 없음):", ", ".join(sorted(set(leftover))))

if __name__ == "__main__":
    main()
