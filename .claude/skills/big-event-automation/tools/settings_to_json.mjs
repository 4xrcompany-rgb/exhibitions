// settings 파일(window.BF_EVENT) → JSON. 사용: node settings_to_json.mjs <settings.js> [출력.json]
import fs from 'fs'; import vm from 'vm';
const [, , SRC, OUT] = process.argv;
const ctx = {window:{}, Date}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(SRC, 'utf8'), ctx);
const text = JSON.stringify(ctx.window.BF_EVENT, (k, v) => v, 2);
if(OUT) fs.writeFileSync(OUT, text); else process.stdout.write(text);
if(OUT) console.log(OUT, Buffer.byteLength(text), 'bytes · 설정', Object.keys(ctx.window.BF_EVENT).length, '묶음');
