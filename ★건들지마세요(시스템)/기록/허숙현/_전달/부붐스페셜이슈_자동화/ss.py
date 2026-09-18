# -*- coding: utf-8 -*-
"""부붐 스페셜이슈 스타일 기획전 자동화

  python ss.py init   <회차폴더>          폴더 뼈대 + 설정.json + 레이아웃 PSD
  python ss.py make   <회차폴더>          설정.json → index.html + 붙여넣기.html
  python ss.py check  <회차폴더>          이미지(로컬·서버) · 상품번호 · 코드 규칙 점검
  python ss.py render <회차폴더> [게시글주소]   PC·모바일 화면 점검 (주소 없으면 임시 페이지)
  python ss.py all    <회차폴더> [게시글주소]   make → check → render
"""
import base64, html, json, os, re, shutil, subprocess, sys, tempfile, urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
KIT = Path(__file__).resolve().parent
MALL = "https://www.4xr.co.kr"
UA = {"User-Agent": "Mozilla/5.0"}

# ── 고정 레이아웃 : 자리 · 파일 · 규격 (순서 = 화면에 쌓이는 순서) ──
SLOTS = [
    ("visual",   "top/img_top.jpg",     (1922, 752)),
    ("pd_01",    "pd/img_pd01.jpg",     (1402, 822)),
    ("pd_02_l",  "pd/img_pd02_l.jpg",   (694, 902)),
    ("pd_02_r",  "pd/img_pd02_r.jpg",   (694, 902)),
    ("pd_03",    "pd/img_pd03.jpg",     (1402, 1002)),
    ("pd_04_01", "pd/img_pd04_01.jpg",  (445, 593)),
    ("pd_04_04", "pd/img_pd04_04.jpg",  (445, 593)),
    ("pd_04_02", "pd/img_pd04_02.jpg",  (445, 593)),
    ("pd_04_05", "pd/img_pd04_05.jpg",  (221, 294)),
    ("pd_04_03", "pd/img_pd04_03.jpg",  (270, 360)),
    ("close",    "close/img_close.jpg", (1402, 752)),
]
PRODUCT_SLOTS = [s for s, _, _ in SLOTS if s != "visual"]

SAMPLE = {
    "기획전명": "부붐_26FALL",
    "오픈일": "2026-09-18",
    "폴더코드": "HSH",
    "브랜드번호": 137,
    "비주얼": {"왼쪽": "SPECIAL ISSUE", "오른쪽": "2026. 09. 18 – 09. 27", "제목": ["THE NEW", "FALL, AGAIN"]},
    "브랜드소개": {"제목": "BOOVOOM", "문구": ["지난 시즌 많은 사랑을 받은 스테디 아이템부터 이번 시즌 새롭게 도착한 가을 신상까지.",
                                             "계절의 무드를 완성해 줄 부붐의 가을 컬렉션을 지금 만나보세요."], "배경색": "#181F35"},
    "엔딩제목": "BOOVOOM",
    "상품": {
        "pd_01": ["692558", "692568", "692562", "692569"],
        "pd_02_l": "692557", "pd_02_r": "692556", "pd_03": "692558",
        "pd_04_01": "692565", "pd_04_04": "692191", "pd_04_02": "692191",
        "pd_04_05": "692556", "pd_04_03": "692567", "close": "692570",
    },
    "상품명_직접": {},
}


def die(msg):
    print("✖", msg)
    sys.exit(1)


def load(folder):
    p = Path(folder) / "설정.json"
    if not p.exists():
        die(f"설정.json 이 없습니다 → python ss.py init \"{folder}\"")
    return json.loads(p.read_text(encoding="utf-8"))


def fetch(url, timeout=40):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "replace")


def cdn_base(cfg):
    y, m, d = cfg["오픈일"].split("-")
    return f"https://cdn-tgreen.bizhost.kr/phpskr/tgreen09/{y}/{m}/{d}/{cfg['폴더코드']}/img/"


def slide_files(folder, main_file):
    """img_pd01.jpg 옆에 img_pd01_02.jpg · _03 … 가 있으면 자동 스와이프 장으로 본다"""
    stem = main_file[:-4]
    out, n = [main_file], 2
    while (Path(folder) / "img" / f"{stem}_{n:02d}.jpg").exists():
        out.append(f"{stem}_{n:02d}.jpg")
        n += 1
    return out


def goods_name(no):
    t = fetch(f"{MALL}/shop/view.php?index_no={no}")
    m = re.search(r'og:title"\s+content="([^"]+)"', t)
    if not m:
        return None
    return html.unescape(m.group(1)).replace(" - 4XR", "").strip()


def js_str(v):
    return '"' + str(v).replace("\\", "\\\\").replace('"', '\\"') + '"'


# ───────────────────────── init ─────────────────────────
def cmd_init(folder):
    f = Path(folder)
    for d in ["img/top", "img/pd", "img/close", "fullpage", "_소재/_to_delete"]:
        (f / d).mkdir(parents=True, exist_ok=True)
    cfg = f / "설정.json"
    if cfg.exists():
        print("· 설정.json 이 이미 있어 그대로 둡니다")
    else:
        cfg.write_text(json.dumps(SAMPLE, ensure_ascii=False, indent=2), encoding="utf-8")
        print("✔ 설정.json 생성 (0918 부붐 값이 예시로 들어 있음 → 이번 회차 값으로 고치세요)")
    psd, src = f / "fullpage" / "fullpage.psd", KIT / "레이아웃" / "fullpage.psd"
    if not psd.exists():
        if src.exists():
            shutil.copy2(src, psd)
            print("✔ fullpage/fullpage.psd 복사 (이 PSD 에서 사진을 바꿔 이미지를 뽑습니다)")
        else:
            print("· 레이아웃 PSD 가 이 PC 에 없어 건너뜁니다 (이미지 규격표대로 만들면 됨 / PSD 는 담당자에게 받기)")
    lines = ["[ 이미지 규격 ]  파일명·크기 고정 / 자동 스와이프는 _02 · _03 … 을 옆에 두면 됨", ""]
    for slot, file, (w, h) in SLOTS:
        lines.append(f"img/{file:<22} {w} x {h}   ({slot})")
    (f / "_소재" / "이미지규격.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("✔ _소재/이미지규격.txt")
    print("\n다음: 설정.json 채우기 → img 폴더에 이미지 넣기 → python ss.py make \"%s\"" % folder)


# ───────────────────────── make ─────────────────────────
def cmd_make(folder):
    cfg, f = load(folder), Path(folder)
    esc = lambda t: html.escape(str(t), quote=False)
    tpl = (KIT / "template.html").read_text(encoding="utf-8")
    names_fixed = {str(k): v for k, v in (cfg.get("상품명_직접") or {}).items()}
    name_cache = {}

    def name_of(no):
        no = str(no)
        if no in names_fixed:
            return names_fixed[no]
        if no not in name_cache:
            nm = goods_name(no)
            if not nm:
                die(f"상품번호 {no} 를 몰에서 못 찾았습니다")
            name_cache[no] = nm
        return name_cache[no]

    rows = []
    for slot, file, _ in SLOTS:
        if slot == "visual":
            rows.append(f'    {{ slot: "visual",   file: {js_str(file)}, name: {js_str(cfg["기획전명"].replace("_", " ") + " 메인 비주얼")} }}')
            continue
        goods = cfg["상품"].get(slot)
        if not goods:
            die(f"설정.json 상품에 {slot} 번호가 없습니다")
        files = slide_files(folder, file)
        if len(files) > 1:
            gl = goods if isinstance(goods, list) else [goods] * len(files)
            if len(gl) != len(files):
                die(f"{slot}: 이미지 {len(files)}장인데 상품번호 {len(gl)}개 — 개수를 맞추거나 번호 하나만 적으세요")
            inner = ",\n".join(f'        {{ file: {js_str(fl)}, goods: {js_str(g)}, name: {js_str(name_of(g))} }}'
                               for fl, g in zip(files, gl))
            rows.append(f'    {{ slot: {js_str(slot)}, slides: [\n{inner}\n    ] }}')
        else:
            g = goods[0] if isinstance(goods, list) else goods
            rows.append(f'    {{ slot: {js_str(slot)}, file: {js_str(file)}, goods: {js_str(g)}, name: {js_str(name_of(g))} }}')
    items = "var ITEMS = [\n" + ",\n".join(rows) + "\n];"

    v, b = cfg["비주얼"], cfg["브랜드소개"]
    out = (tpl.replace("{{VISUAL_LEFT}}", esc(v["왼쪽"]))
              .replace("{{VISUAL_RIGHT}}", esc(v["오른쪽"]))
              .replace("{{VISUAL_TITLE}}", "<br>".join(esc(x) for x in v["제목"]))
              .replace("{{BRAND_TITLE}}", esc(b["제목"]))
              .replace("{{BRAND_TEXT}}", "<br>\n            ".join(esc(x) for x in b["문구"]))
              .replace("{{BRAND_BG}}", b.get("배경색") or "#181F35")
              .replace("{{CLOSE_TITLE}}", esc(cfg["엔딩제목"]))
              .replace("{{IMG_BASE}}", cdn_base(cfg))
              .replace("{{BRAND_ID}}", str(cfg["브랜드번호"]))
              .replace("{{ITEMS}}", items))
    left = re.findall(r"\{\{[A-Z_]+\}\}", out)
    if left:
        die(f"채워지지 않은 자리: {left}")
    (f / "index.html").write_text(out, encoding="utf-8", newline="")
    print(f"✔ index.html ({len(out.encode())} bytes)")

    b64 = base64.b64encode(out.encode("utf-8")).decode("ascii")
    title = cfg["기획전명"].replace("_", " ")
    page = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>{title} 스페셜이슈 · 비즈호스트 붙여넣기</title>
<style>body{{font-family:Pretendard,"Noto Sans KR",sans-serif;margin:0;padding:40px;background:#f4f4f4;color:#111}}h1{{font-size:22px;margin:0 0 6px}}p{{margin:6px 0;color:#444}}ol{{color:#333;line-height:1.8}}button{{font-size:18px;font-weight:700;padding:16px 34px;border:0;background:#111;color:#fff;border-radius:6px;cursor:pointer;margin:14px 0}}button.ok{{background:#1a7f37}}textarea{{width:100%;height:60vh;font:12px/1.5 Consolas,monospace;border:1px solid #ccc;padding:12px;box-sizing:border-box;background:#fff}}</style></head><body>
<h1>{title} 스페셜이슈 · 게시판 붙여넣기</h1>
<p>기획전 게시글 본문에 넣는 조각입니다. 이미지는 CDN <code>{cdn_base(cfg).split("tgreen09/")[1]}</code> 에 올라가 있어야 합니다.</p>
<ol><li>아래 <b>코드 복사</b> 버튼을 누릅니다. (안 되면 텍스트 상자 안을 클릭 → Ctrl+A → Ctrl+C)</li><li>해당 기획전 게시글 수정 → 본문 편집기를 <b>소스(HTML) 모드</b>로 바꾸고, <b>기존 내용을 모두 지운 뒤</b> 붙여넣습니다. (두 번 들어가면 이미지·상품 정보가 안 붙습니다)</li><li>저장합니다. 위지윅 모드에 붙이면 태그가 지워집니다.</li></ol>
<button id="b">코드 복사</button>
<textarea id="t" readonly></textarea>
<script>
var raw=atob("{b64}");var code=decodeURIComponent(escape(raw));
var t=document.getElementById("t");t.value=code;
document.getElementById("b").onclick=function(){{var b=this;function ok(){{b.textContent="복사됨 ✓";b.className="ok";}}
if(navigator.clipboard&&window.isSecureContext){{navigator.clipboard.writeText(code).then(ok,fb);}}else{{fb();}}
function fb(){{t.focus();t.select();try{{document.execCommand("copy");ok();}}catch(e){{alert("자동 복사가 안 됩니다. 상자 안을 클릭하고 Ctrl+A, Ctrl+C 로 복사하세요.");}}}}}};
</script></body></html>
'''
    pf = f / f'{cfg["기획전명"]}_비즈호스트_붙여넣기.html'
    pf.write_text(page, encoding="utf-8")
    print(f"✔ {pf.name}")
    code_rules(out)


# ───────────────────────── 점검 ─────────────────────────
def code_rules(code):
    bad = 0
    sc = [x for x in re.findall(r"<script\b[^>]*>(.*?)</script>", code, re.S) if x.strip()]
    ents = len(re.findall(r"&(amp|lt|gt|quot|#39);", sc[0])) if sc else -1
    print(f"  script {len(sc)}개 · script 안 엔티티 {ents}건", "✔" if len(sc) == 1 and ents == 0 else "✖")
    bad += not (len(sc) == 1 and ents == 0)
    for tag, src in [("저장 전", sc[0]), ("게시판 저장 후", html.unescape(sc[0]))]:
        with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as t:
            t.write(src)
        ok = subprocess.run(["node", "--check", t.name], capture_output=True, text=True).returncode == 0
        os.unlink(t.name)
        print(f"  문법({tag})", "✔" if ok else "✖")
        bad += not ok
    frag = not re.search(r"<!doctype|<html|<head|<body", code, re.I)
    print("  게시판 조각 형태(doctype/html/head/body 없음)", "✔" if frag else "✖")
    post = "read.php" not in code
    print("  게시글 번호 고정 없음", "✔" if post else "✖")
    return bad + (not frag) + (not post)


def http_ok(url):
    try:
        req = urllib.request.Request(url, headers={**UA, "Range": "bytes=0-0"})
        return urllib.request.urlopen(req, timeout=30).status in (200, 206)
    except Exception:
        return False


def cmd_check(folder):
    cfg, f, bad = load(folder), Path(folder), 0
    try:
        from PIL import Image
    except ImportError:
        Image = None
    base = cdn_base(cfg)
    print(f"■ 이미지 (서버 {base})")
    for slot, file, (w, h) in SLOTS:
        for fl in slide_files(folder, file):
            p = f / "img" / fl
            size = ""
            if p.exists() and Image:
                sw, sh = Image.open(p).size
                size = f"{sw}x{sh}" + ("" if (sw, sh) == (w, h) else f"  ⚠ 규격 {w}x{h}")
            srv = http_ok(base + fl)
            mark = "✔" if p.exists() and srv else "✖"
            bad += mark == "✖"
            print(f"  {mark} {fl:<24} 로컬 {'있음' if p.exists() else '없음'} {size:<22} 서버 {'있음' if srv else '없음'}")
    print("■ 상품번호")
    seen = set()
    for slot in PRODUCT_SLOTS:
        g = cfg["상품"].get(slot)
        for no in (g if isinstance(g, list) else [g]):
            if not no or no in seen:
                continue
            seen.add(no)
            try:
                t = fetch(f"{MALL}/shop/view.php?index_no={no}")
                nm = re.search(r'og:title"\s+content="([^"]+)"', t)
                pr = re.search(r'product:price:amount"\s+content="(\d+)"', t)
                print(f"  ✔ {no}  {html.unescape(nm.group(1)).replace(' - 4XR','') if nm else '?'}  {int(pr.group(1)):,}원" if pr else f"  ✖ {no} 가격 없음")
                bad += not pr
            except Exception as e:
                print(f"  ✖ {no} 조회 실패 {e}")
                bad += 1
    idx = f / "index.html"
    if idx.exists():
        print("■ index.html")
        bad += code_rules(idx.read_text(encoding="utf-8"))
    print("\n결과:", "문제 없음 ✔" if not bad else f"확인 필요 {bad}건 ✖")
    return bad


def find_playwright():
    """도구 폴더에서 위로 올라가며 node_modules/playwright 를 찾는다 (어느 PC·어느 위치든)"""
    cands = []
    for d in [KIT, *KIT.parents]:
        cands += [d / "node_modules/playwright",
                  d / ".claude/skills/gihoekjeon-automation-system/scripts/node_modules/playwright"]
    cands.append(Path.home() / "Documents/4XR_기획전/.claude/skills/gihoekjeon-automation-system/scripts/node_modules/playwright")
    for p in cands:
        if p.exists():
            return str(p).replace("\\", "/")
    die("Playwright 를 못 찾았습니다 → 4XR_기획전 스킬 scripts 폴더에서 npm install (또는 4XR_시작.bat)")


def cmd_render(folder, url=None):
    f = Path(folder)
    idx = f / "index.html"
    if not idx.exists():
        die("index.html 이 없습니다 → make 먼저")
    out = f / "_소재" / "_점검"
    out.mkdir(parents=True, exist_ok=True)
    args = ["node", str(KIT / "render.mjs"), find_playwright(), str(idx), str(out), url or ""]
    r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8")
    print(r.stdout.strip() or r.stderr.strip())
    return r.returncode


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(0)
    cmd, folder = sys.argv[1], sys.argv[2]
    url = sys.argv[3] if len(sys.argv) > 3 else None
    if cmd == "init":
        cmd_init(folder)
    elif cmd == "make":
        cmd_make(folder)
    elif cmd == "check":
        sys.exit(1 if cmd_check(folder) else 0)
    elif cmd == "render":
        sys.exit(cmd_render(folder, url))
    elif cmd == "all":
        cmd_make(folder)
        b = cmd_check(folder)
        r = cmd_render(folder, url)
        sys.exit(1 if (b or r) else 0)
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
