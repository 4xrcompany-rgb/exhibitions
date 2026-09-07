# -*- coding: utf-8 -*-
"""
구성표 엑셀 직접 파서 — 스테일 캐시 회피용.

사용자 기기에서 실행한다 (device_bash). xlsx 는 zip 이므로 표준 라이브러리만으로
sharedStrings.xml + sheetN.xml 을 직접 읽는다. openpyxl 불필요.
구형 .xls(BIFF8) 는 zip 이 아니므로 xlrd 로 폴백한다(허숙현 2026-09-07 요청).

  python3 read_workbook.py <엑셀경로> [출력json경로]

출력 JSON:
  { "sheets": { "<시트명>": [ {"A":"값","B":"값",...}, ... ] } }

빌더는 이 JSON 만 읽는다. 스테이징 사본을 믿지 않는다.
"""
import sys, os, re, json, zipfile
import html as H


def col_letter(idx):
    """0-based 열 인덱스 → A, B, ... AA 형식."""
    s = ''
    idx += 1
    while idx > 0:
        idx, r = divmod(idx - 1, 26)
        s = chr(65 + r) + s
    return s


def parse_xls(path):
    """구형 .xls(BIFF8). xlrd 필요(2.0+ 는 .xls 미지원 → 1.2.0)."""
    try:
        import xlrd
    except ImportError:
        raise SystemExit(
            "[안내] 구형 .xls 파일입니다. 다음 중 하나로 해결하세요:\n"
            "  1) 엑셀에서 '다른 이름으로 저장' → .xlsx 로 저장 후 다시 실행 (권장)\n"
            "  2) pip install \"xlrd==1.2.0\"  설치 후 다시 실행"
        )
    book = xlrd.open_workbook(path)
    out = {}
    for sh in book.sheets():
        rows = []
        for r in range(sh.nrows):
            cells = {}
            for c in range(sh.ncols):
                v = sh.cell_value(r, c)
                if v is None or v == '':
                    continue
                if isinstance(v, float) and v == int(v):
                    v = str(int(v))       # 엑셀 정수는 float 로 오므로 정수화
                else:
                    v = str(v)
                cells[col_letter(c)] = v
            if cells:
                cells['_row'] = str(r + 1)
                rows.append(cells)
        out[sh.name] = rows
    return out


def parse(path):
    # 구형 .xls 는 zip 이 아님 → xlrd 폴백
    if not zipfile.is_zipfile(path):
        return parse_xls(path)

    z = zipfile.ZipFile(path)

    # 공유 문자열
    ss = []
    if 'xl/sharedStrings.xml' in z.namelist():
        raw = z.read('xl/sharedStrings.xml').decode('utf-8', 'ignore')
        for si in re.findall(r'<si>(.*?)</si>', raw, re.S):
            ss.append(H.unescape(''.join(re.findall(r'<t[^>]*>(.*?)</t>', si, re.S))))

    # 시트명 → 파일 매핑
    wb = z.read('xl/workbook.xml').decode('utf-8', 'ignore')
    names = re.findall(r'<sheet[^>]*name="([^"]+)"[^>]*r:id="rId(\d+)"', wb)

    out = {}
    for name, rid in names:
        cand = f'xl/worksheets/sheet{rid}.xml'
        if cand not in z.namelist():
            continue
        sh = z.read(cand).decode('utf-8', 'ignore')
        rows = []
        for rn, body in re.findall(r'<row r="(\d+)"[^>]*>(.*?)</row>', sh, re.S):
            cells = {}
            pat = r'<c r="([A-Z]+)\d+"([^>]*)>(?:<v>(.*?)</v>)?(?:<is><t[^>]*>(.*?)</t></is>)?'
            for m in re.finditer(pat, body):
                col, attr, v, inline = m.group(1), m.group(2), m.group(3), m.group(4)
                if inline is not None:
                    cells[col] = H.unescape(inline)
                elif v is None:
                    cells[col] = ''
                elif 't="s"' in attr:
                    i = int(v)
                    cells[col] = ss[i] if i < len(ss) else ''
                else:
                    cells[col] = v
            if cells:
                cells['_row'] = rn
                rows.append(cells)
        out[H.unescape(name)] = rows
    return out


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    src = sys.argv[1]
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(src) or '.', '_parsed.json')

    data = {'sheets': parse(src)}
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)

    for k, v in data['sheets'].items():
        print(f'{k}: {len(v)} rows')
    print('->', dst)
    print('※ 작업이 끝나면 이 임시 JSON 을 _to_delete/ 로 옮기세요.')


if __name__ == '__main__':
    main()
