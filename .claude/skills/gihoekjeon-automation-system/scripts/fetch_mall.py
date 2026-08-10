# -*- coding: utf-8 -*-
"""
몰 상품·브랜드 데이터 수집.

  python3 fetch_mall.py config.json [상품코드파일.txt] [브랜드명파일.txt]

출력: mall_data.json
  { "products": { "<코드>": {"n":상품명,"amt":정가,"damt":판매가,"img":이미지URL} },
    "brands":   { "<브랜드명>": {"id":..,"logo":..,"banner":..,"eng":..,"title":몰등록명} } }

셀렉터·URL 패턴은 config.json 의 mall 블록에서 읽는다.
각 사용자는 자기 몰에 맞게 config 를 한 번만 맞추면 된다.
"""
import sys, os, re, json, urllib.request, urllib.parse
import concurrent.futures as cf

CFG = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'config.json', encoding='utf-8'))
M = CFG['mall']
SEL = M['selectors']
UA = M.get('user_agent', 'Mozilla/5.0')


def get(url, timeout=25):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return urllib.request.urlopen(req, timeout=timeout).read().decode('utf-8', 'ignore')


def norm(x):
    """공백 전부 제거 — 브랜드명 매칭용. 몰 등록명과 엑셀 표기의 띄어쓰기 차이를 흡수."""
    return ''.join(str(x).split())


def enc(path):
    """CDN 경로에 [ ] 같은 문자가 있으면 브라우저에서 깨진다. 반드시 인코딩."""
    return urllib.parse.quote(str(path), safe='/._-')


# ---------------------------------------------------------------- 브랜드
def brand_index():
    """브랜드 목록 페이지에서 {brandId: 표시명} 을 만든다."""
    try:
        t = get(M['brand_list_url'])
    except Exception as e:
        print('brand_list 실패:', e)
        return {}
    idx = {}
    for bid, inner in re.findall(SEL['brand_link_in_list'], t, re.S):
        txt = re.sub(r'<[^>]+>', ' ', inner)
        txt = re.sub(r'\s+', ' ', txt).strip()
        if txt:
            idx.setdefault(bid, txt)
    return idx


def find_brand_id(name, idx):
    key = norm(name)
    for bid, disp in idx.items():
        if key and key in norm(disp):
            return bid
    return None


def fetch_brand(args):
    name, bid = args
    if not bid:
        return name, {'id': None, 'logo': None, 'banner': None, 'eng': '', 'title': ''}
    try:
        t = get(M['brand_page_url'].format(id=bid))
        g = lambda k: (re.search(SEL[k], t).group(1).strip() if re.search(SEL[k], t) else '')
        return name, {
            'id': bid,
            'logo': g('brand_logo') or None,
            'banner': g('brand_banner') or None,
            'eng': g('brand_title_en'),
            'title': g('brand_title'),
        }
    except Exception as e:
        return name, {'id': bid, 'logo': None, 'banner': None, 'eng': '', 'title': '',
                      'error': str(e)[:60]}


# ---------------------------------------------------------------- 상품
def fetch_product(code):
    """상품 상세에서 이름·가격·이미지를 뽑는다.
    몰마다 마크업이 다르므로 og 태그를 1차, 정규식을 2차로 쓴다."""
    try:
        t = get(M['product_view_url'].format(code=code))
    except Exception:
        return code, None
    def og(prop):
        m = re.search(rf'property=["\']og:{prop}["\'][^>]*content=["\']([^"\']+)', t)
        return m.group(1).strip() if m else ''
    name = og('title')
    img = og('image')
    nums = re.findall(r'([0-9]{1,3}(?:,[0-9]{3})+)\s*원', t)
    amt = nums[0] if nums else ''
    damt = nums[1] if len(nums) > 1 else ''
    if not (name or img):
        return code, None
    return code, {'n': name, 'amt': amt, 'damt': damt, 'img': img}


# ---------------------------------------------------------------- main
def main():
    codes, names = [], []
    if len(sys.argv) > 2 and os.path.exists(sys.argv[2]):
        codes = [l.strip() for l in open(sys.argv[2], encoding='utf-8') if l.strip()]
    if len(sys.argv) > 3 and os.path.exists(sys.argv[3]):
        names = [l.strip() for l in open(sys.argv[3], encoding='utf-8') if l.strip()]

    out = {'products': {}, 'brands': {}}

    if names:
        idx = brand_index()
        pairs = [(n, find_brand_id(n, idx)) for n in names]
        with cf.ThreadPoolExecutor(10) as ex:
            for n, d in ex.map(fetch_brand, pairs):
                if d.get('logo'):
                    d['logo_url'] = M['cdn_brand'].rstrip('/') + '/' + enc(
                        d['logo'].replace(M['cdn_brand'], ''))
                out['brands'][n] = d
        ok = sum(1 for d in out['brands'].values() if d.get('logo'))
        print(f'브랜드 로고 {ok}/{len(names)}')
        for n, d in out['brands'].items():
            if not d.get('logo'):
                print('  못 찾음:', n, '← 몰 등록명을 확인하세요 (띄어쓰기는 무시하고 찾습니다)')
            elif d.get('title') and norm(d['title']) != norm(n):
                print('  표기 다름:', n, '→', d['title'])

    if codes:
        with cf.ThreadPoolExecutor(12) as ex:
            for c, d in ex.map(fetch_product, codes):
                if d:
                    out['products'][c] = d
        print(f'상품 {len(out["products"])}/{len(codes)}')

    json.dump(out, open('mall_data.json', 'w', encoding='utf-8'), ensure_ascii=False)
    print('-> mall_data.json')


if __name__ == '__main__':
    main()
