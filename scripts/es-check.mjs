// Проверка сборки: в dist/ нет синтаксиса новее ES2017 (старый Edge 18 в Telegram Desktop без WebView2).
// Запуск после npm run build: node scripts/es-check.mjs
import { readdirSync, readFileSync } from 'node:fs'
import { parse } from 'acorn'

const dir = 'dist/assets'
let bad = 0
for (const f of readdirSync(dir).filter(f => f.endsWith('.js'))) {
  try {
    parse(readFileSync(`${dir}/${f}`, 'utf8'), { ecmaVersion: 2017, sourceType: 'script' })
    console.log(`OK   ${f}`)
  } catch (e) {
    bad++
    console.log(`FAIL ${f}: ${e.message}`)
  }
}
// и встроенные скрипты в index.html
const html = readFileSync('dist/index.html', 'utf8')
for (const [, js] of html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)) {
  try { parse(js, { ecmaVersion: 2017, sourceType: 'script' }) } catch (e) { bad++; console.log(`FAIL inline script: ${e.message}`) }
}
console.log(bad ? `\nНовее ES2017: ${bad}` : '\nВсё в пределах ES2017')
process.exit(bad ? 1 : 0)
