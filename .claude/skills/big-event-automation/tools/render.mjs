// 대형 기획전 화면 검사 — 실제 기획전 게시글에 끼워 PC(1920)·모바일(750) 확인
// node render.mjs <playwright경로> <index.html> <settings_bigevent.js> <engine폴더> <img폴더> <결과폴더> [게시글주소]
//  · 게시글 주소가 없으면 기획전 게시판 최근 글에 끼운다 (글번호를 적어 두지 않음)
//  · 서버에 아직 없는 공통 파일·settings·이미지는 로컬 파일로 대신 준다(있으면 로컬 우선)
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path';
const [, , PW, IDX, SET, ENG, IMGDIR, OUT, URLARG] = process.argv;
const require = createRequire(import.meta.url);
const { chromium } = require(PW);
const frag = fs.readFileSync(IDX, 'utf8');
const TRACK = /(doubleclick\.net|google\.com\/ccm|googletagmanager|google-analytics|onetag\.co\.kr|kakaocdn\.net\/kas|daum\.net|facebook\.(net|com)|criteo|naver\.net\/wcslog|wcs\.naver)/i;
const imgBase = (frag.match(/<script src="([^"]+)settings_bigevent\.js/) || [])[1] + 'img/';
const type = f => /\.css$/.test(f) ? 'text/css' : /\.js$/.test(f) ? 'application/javascript' : /\.png$/i.test(f) ? 'image/png' : /\.gif$/i.test(f) ? 'image/gif' : 'image/jpeg';

async function latestPost(){
  const r = await fetch('https://www.4xr.co.kr/bbs/list.php?boardid=issue', {headers:{'User-Agent':'Mozilla/5.0'}});
  const h = await r.text();
  const ids = [...h.matchAll(/read\.php\?index_no=(\d+)[^"']*boardid=issue/g)].map(m => Number(m[1]));
  if(!ids.length) throw new Error('기획전 게시판에서 글을 못 찾음');
  return 'https://www.4xr.co.kr/bbs/read.php?index_no=' + Math.max(...ids) + '&boardid=issue';
}
function inject(h, mobile){
  const w = h.indexOf('id="wrapper_ey"');
  if(w > -1){                                   /* 이미 대형 기획전 코드가 있는 글 : 그 자리 교체 */
    const st = h.lastIndexOf('<style', w); let s0 = h.lastIndexOf('pretendard.css', st); s0 = h.lastIndexOf('<', s0);
    const c0 = h.lastIndexOf('<!--', s0); if(c0 > -1 && s0 - c0 < 60) s0 = c0;
    let e = h.indexOf('initLazyRanking();', w); e = e > -1 ? h.indexOf('</script>', e) + 9 : h.indexOf('big_event.js', w);
    if(h.slice(e - 40, e).indexOf('big_event.js') > -1 || h.indexOf('big_event.js', w) === e) e = h.indexOf('</script>', e) + 9;
    return h.slice(0, s0) + frag + h.slice(e);
  }
  let i;
  if(mobile){ const m = h.match(/<section[^>]*class="[^"]*page_cont[^"]*padding_01[^"]*"[^>]*>/); i = m ? h.indexOf(m[0]) + m[0].length : h.lastIndexOf('</body>'); }
  else { const a = h.indexOf('class="cont mb60"'); const p = a > -1 ? h.indexOf('<p><br></p>', a) : -1; i = p > -1 ? p + 11 : h.lastIndexOf('</body>'); }
  return h.slice(0, i) + frag + h.slice(i);
}

const base = URLARG || await latestPost();
fs.mkdirSync(OUT, {recursive:true});
console.log('끼울 글 :', base.replace(/^https:\/\/www\./, ''));
const b = await chromium.launch();
let bad = 0;
for(const [dev, opts] of [['PC', {viewport:{width:1920, height:1080}}], ['모바일', {viewport:{width:750, height:1334}, isMobile:true, hasTouch:true,
    userAgent:'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'}]]){
  const mobile = dev !== 'PC';
  const url = mobile ? base.replace('://www.', '://m.') : base;
  const ctx = await b.newContext(opts);
  await ctx.route(TRACK, r => r.abort());
  await ctx.route(/\/2026\/00\/bigevent\/(css|js)\//, r => { const f = path.join(ENG, new URL(r.request().url()).pathname.split('/').pop());
    return fs.existsSync(f) ? r.fulfill({status:200, contentType:type(f), body:fs.readFileSync(f)}) : r.continue(); });
  await ctx.route(/settings_bigevent\.js/, r => r.fulfill({status:200, contentType:'application/javascript', body:fs.readFileSync(SET)}));
  if(imgBase) await ctx.route(u => u.href.startsWith(imgBase), r => { const f = path.join(IMGDIR, decodeURIComponent(r.request().url().slice(imgBase.length).split('?')[0]));
    return fs.existsSync(f) ? r.fulfill({status:200, contentType:type(f), body:fs.readFileSync(f)}) : r.continue(); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  await p.route(u => u.href.split('#')[0] === url, async r => { const res = await r.fetch({timeout:90000}); await r.fulfill({response:res, body:inject(await res.text(), mobile)}); });
  await p.goto(url, {waitUntil:'domcontentloaded', timeout:150000}).catch(() => {});
  await p.waitForSelector('#wrapper_ey', {state:'attached', timeout:90000}).catch(() => {});
  await p.evaluate(async() => { for(let y = 0; y < document.body.scrollHeight; y += 700){ scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } scrollTo(0, 0); });
  await p.waitForTimeout(5000);
  const r = await p.evaluate(() => {
    const q = s => document.querySelectorAll(s).length;
    const secs = [...document.querySelectorAll('#wrapper_ey .section_ey')].map(s => s.id + ':' + Math.round(s.getBoundingClientRect().height));
    const broken = [...document.querySelectorAll('#wrapper_ey img')].filter(i => i.complete && i.naturalWidth === 0).map(i => (i.getAttribute('src') || '').split('/').slice(-2).join('/'));
    return {섹션: secs.join(' · '), 높이0: secs.filter(s => /:0$/.test(s)).join(','), 쿠폰: q('#black_fry_coupon_grid > *'), 상품권: q('#black_fry_gift_grid > *'),
      데일리: q('#daily_section .product_card') + '/' + q('#daily_section02 .product_card'), 랭킹: q('#black_fry_ranking_grid > *'), 퀵: q('#black_fry_quick_list > *'),
      스티키: q('#sticky_section .sticky_item'), 타이틀이미지: q('#wrapper_ey .title_con h1 img'), 모달: q('#black_fry_modal_root .bf_modal'),
      깨진이미지: broken, 가로넘침: Math.max(0, document.documentElement.scrollWidth - innerWidth)};
  });
  const errList = errs.filter(e => !(mobile && /Invalid or unexpected token/.test(e)));   /* 모바일 게시판 자체 오류는 원래부터 */
  console.log('[%s]', dev, JSON.stringify(r));
  console.log('   JS 오류 %d%s', errList.length, errList.length ? ' : ' + errList[0] : '');
  if(errList.length || r.깨진이미지.length || r.높이0) bad++;
  await p.screenshot({path:path.join(OUT, mobile ? 'render_mo.png' : 'render_pc.png'), fullPage:true, timeout:90000}).catch(() => {});
  await ctx.close();
}
await b.close();
console.log('결과 :', bad ? '★ 확인할 것 있음' : '문제 없음 ✔', '| 화면 :', OUT);
process.exit(bad ? 1 : 0);
