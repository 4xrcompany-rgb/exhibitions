// 배너 HTML → 정확한 픽셀 크기의 JPG 캡처
//
//   node shot.mjs <_jobs.json 경로>
//
// 주의
//  · deviceScaleFactor:1 + clip 으로 정확히 W×H 를 보장한다 (리사이즈 금지)
//  · document.fonts.ready 를 반드시 기다린다. 안 그러면 폰트가 대체된 채로 찍힌다
//  · 외부 CDN 이미지는 샌드박스에서 막힐 수 있다 → HTML 에 base64 로 내장해 둘 것
//
// 캡처 후 검증
//  · 요소 박스를 측정해 프레임 밖으로 나간 게 없는지 확인한다 (measure 출력 참고)

import fs from 'fs';
import path from 'path';

const jobsPath = process.argv[2] || '_jobs.json';
const jobs = JSON.parse(fs.readFileSync(jobsPath, 'utf8'));

let chromium;
try {
  ({ chromium } = await import('playwright'));
} catch {
  ({ chromium } = await import(
    '/home/claude/.npm-global/lib/node_modules/playwright/index.js'
  ));
}

const browser = await chromium.launch();

for (const j of jobs) {
  const dir = j.dir || path.dirname(jobsPath);
  const page = await browser.newPage({
    viewport: { width: j.w, height: j.h },
    deviceScaleFactor: 1,
  });

  const file = 'file://' + path.join(dir, j.name + '.html');
  await page.goto(file, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);

  // 프레임 밖으로 나간 요소 검사
  const overflow = await page.evaluate((W, H) =>
    [...document.querySelectorAll('.tri,.sticker,.obj,.chip,.barcode,.label,.torn')]
      .map((e) => {
        const b = e.getBoundingClientRect();
        return { cls: e.className, x: Math.round(b.x), y: Math.round(b.y),
                 w: Math.round(b.width), h: Math.round(b.height) };
      })
      .filter((b) => b.x < -20 || b.y < -20 || b.x + b.w > W + 20 || b.y + b.h > H + 20),
    j.w, j.h);

  await page.screenshot({
    path: path.join(dir, j.name + '.jpg'),
    type: 'jpeg',
    quality: 92,
    clip: { x: 0, y: 0, width: j.w, height: j.h },
  });

  console.log('OK', j.name, `${j.w}x${j.h}`,
    overflow.length ? `⚠ 프레임 초과 ${overflow.length}건: ${JSON.stringify(overflow)}` : '');
  await page.close();
}

await browser.close();
console.log('완료 — 결과 JPG 를 확인하고 사용자에게 전달하세요.');
