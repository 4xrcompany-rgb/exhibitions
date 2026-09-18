// node render.mjs <playwright경로> <index.html> <결과폴더> [게시글주소]
import { createRequire } from 'module';
import fs from 'fs';
const [, , PW, IDX, OUT, URL] = process.argv;
const require = createRequire(import.meta.url);
const { chromium } = require(PW);
const frag = fs.readFileSync(IDX, 'utf8');
const AOS_LINK = '<link rel="stylesheet" href="https://unpkg.com/aos@2.3.1/dist/aos.css">';
const MUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/* 게시글 주소가 있으면 그 글에 넣어서(기존 조각은 같은 자리 교체), 없으면 몰 주소의 임시 페이지로 */
function inject(html, mobile) {
  const s0 = html.indexOf(AOS_LINK);
  if (s0 >= 0) {
    const e0 = html.indexOf('</script>', html.indexOf('AOS.init', s0)) + 9;
    return html.slice(0, s0) + frag + html.slice(e0);
  }
  const mk = html.indexOf(mobile ? '<section class="page_cont padding_01' : '<div class="line_01 mb80"></div>');
  const ph = html.indexOf('<p><br></p>', mk);
  if (mk < 0 || ph < 0) return null;
  return html.slice(0, ph) + frag + html.slice(ph + 11);
}
const blank = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0">' + frag + '</body></html>';

const b = await chromium.launch();
let fail = 0;
const targets = URL
  ? [['PC', URL.replace('//m.', '//www.'), 1920, null], ['모바일', URL.replace('//www.', '//m.'), 768, MUA]]
  : [['PC', 'https://www.4xr.co.kr/__pv', 1920, null], ['모바일', 'https://m.4xr.co.kr/__pv', 768, MUA]];
if (!URL) console.log('※ 게시글 주소 없이 임시 페이지로 점검합니다 (게시판 스킨·상품 탭 없음). 올린 뒤에는 주소를 붙여 다시 점검하세요.');

for (const [name, url, w, ua] of targets) {
  const ctx = await b.newContext({ viewport: { width: w, height: 1000 }, ...(ua ? { userAgent: ua, isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route('**/*', async route => {
    const u = route.request().url();
    if (!URL && u.endsWith('/__pv')) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: blank });
    if (URL && u.includes('/bbs/read.php')) {
      const r = await route.fetch();
      const h = inject(await r.text(), name !== 'PC');
      if (!h) return route.fulfill({ response: r });
      return route.fulfill({ response: r, body: h, headers: { ...r.headers(), 'content-type': 'text/html; charset=utf-8' } });
    }
    return route.continue();
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  } catch (e) {
    console.log(`${name} ✖ 페이지 열기 실패 (${e.message.split('\n')[0]}) — 다시 실행해 보세요`);
    fail++; await ctx.close(); continue;
  }
  await page.waitForTimeout(3000);
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); } window.scrollTo(0, 0); });
  await page.waitForTimeout(4500);
  /* 상품 목록이 없는 페이지는 가격을 상품 페이지에서 받아 와서 늦을 수 있다 → 최대 25초 기다린다 */
  const t0 = Date.now();
  await page.waitForFunction(() => {
    const t = [...document.querySelectorAll('#wrap_ey .tip')];
    return t.length && t.every(x => /[0-9],[0-9]{3}원/.test(x.textContent));
  }, null, { timeout: 25000, polling: 500 }).catch(() => {});
  const waited = Math.round((Date.now() - t0) / 1000);
  const r = await page.evaluate(() => {
    const bx = e => { const b = e.getBoundingClientRect(); return { t: Math.round(b.top + scrollY), b: Math.round(b.bottom + scrollY) }; };
    const wrap = document.querySelector('#wrap_ey');
    if (!wrap) return null;
    const tabs = document.querySelector('.img_memo_wrap');
    const tips = [...document.querySelectorAll('#wrap_ey .tip')];
    const imgs = [...wrap.querySelectorAll('img')];
    return {
      wrap: document.querySelectorAll('#wrap_ey').length, slot: wrap.querySelectorAll('[data-slot]').length,
      img: imgs.length, broken: imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src.split('/').slice(-2).join('/')),
      tip: tips.length, price: tips.filter(t => /[0-9],[0-9]{3}원/.test(t.textContent)).length,
      open: tips.filter(t => getComputedStyle(t).opacity > .5).length,
      over: [...wrap.querySelectorAll('*')].filter(e => bx(e).b > bx(wrap).b + 2).length,
      bottom: bx(wrap).b, tab: tabs ? bx(tabs).t : null
    };
  });
  await page.screenshot({ path: `${OUT}/화면_${name}.jpg`, type: 'jpeg', quality: 60, fullPage: true });
  const e2 = errs.filter(e => !/Invalid or unexpected token/.test(e));
  if (!r) { console.log(`${name} ✖ 기획전(#wrap_ey)을 못 찾음`); fail++; await ctx.close(); continue; }
  /* 임시 페이지는 상품 목록이 없어 가격을 상품 페이지에서 받는다 — 몰이 느리면 못 받으므로 경고만 (게시글 주소 점검은 엄격) */
  const priceOk = r.price === r.tip;
  const ok = r.wrap === 1 && r.slot === 11 && r.broken.length === 0 && r.tip > 0 && (priceOk || !URL) && r.open === 0 && r.over === 0 && e2.length === 0;
  fail += !ok;
  const mark = !ok ? '✖' : (priceOk ? '✔' : '⚠');
  console.log(`${name} ${mark}  이미지 ${r.img}장 깨짐 ${r.broken.length}${r.broken.length ? ' ' + r.broken.join(',') : ''} · 상품정보 ${r.tip}개 중 가격 ${r.price} · 3초뒤 열린 채 ${r.open} · 넘침 ${r.over}` +
    (r.tab !== null ? ` · 기획전 끝 ${r.bottom} / 탭 ${r.tab}` : '') + ` · 에러 ${e2.length}${e2.length ? ' ' + e2[0] : ''}` + (waited > 1 ? ` (가격 대기 ${waited}초)` : '') + (!priceOk && !URL ? '\n   ⚠ 가격 미수신 — 임시 페이지라 몰 상품 페이지 응답이 늦으면 생김. 게시글에 올린 뒤 주소를 붙여 다시 점검하세요' : ''));
  await ctx.close();
}
await b.close();
console.log(`화면 캡처: ${OUT}`);
process.exit(fail ? 1 : 0);
