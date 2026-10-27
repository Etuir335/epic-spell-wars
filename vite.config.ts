import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// base = имя репозитория на GitHub Pages: https://<user>.github.io/epic-spell-wars/
export default defineConfig({
  base: '/epic-spell-wars/',
  plugins: [
    react(),
    flexGapFallback(),
    buildVersion(),
    // Telegram Desktop без WebView2 открывает игру старым Edge 18 (EdgeHTML): он не знает import(), import.meta,
    // ?. и ?? и многих функций. Собираем один ES5-бандл с полифилами для всех — телефоны его тоже понимают.
    legacy({ targets: ['defaults', 'edge >= 18', 'safari >= 12', 'chrome >= 64'], renderModernChunks: false }),
  ],
  // поток бота (src/ai/worker.ts) собирается отдельно и мимо legacy — понижаем его синтаксис до ES2017 сами
  worker: { rolldownOptions: { transform: { target: 'es2017' } } },
  build: { target: ['es2017', 'edge18', 'safari12', 'chrome64'], cssTarget: ['edge18', 'safari12', 'chrome64'] },
  // свой порт, чтобы не путаться с max-apocalypse (5173)
  server: { port: 5180, strictPort: true },
})

// Edge 18 не знает gap во flex-контейнерах. Для каждого правила «display: flex + gap» дописываем запасное
// html.no-flexgap <селектор> > * + * { margin-left|top }. Класс no-flexgap ставит проверка в index.html.
function flexGapFallback(): Plugin {
  return {
    name: 'flex-gap-fallback',
    transform(code, id) {
      if (!id.endsWith('.css')) return null
      const extra: string[] = []
      for (const [, sel, body] of code.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!/display:\s*(inline-)?flex/.test(body)) continue
        const g = /(?:^|[;\s])gap:\s*([^;]+)/.exec(body)
        if (!g) continue
        const [row, col = row] = g[1].trim().split(/\s+/)
        if (!/^\d+(\.\d+)?px$/.test(row) || !/^\d+(\.\d+)?px$/.test(col)) continue
        const column = /flex-direction:\s*column/.test(body), wrap = /flex-wrap:\s*wrap/.test(body)
        const sels = sel.trim().split(',').map(s => s.trim()).filter(s => s && !s.startsWith('@') && !s.includes('::'))
        if (!sels.length) continue
        const half = (v: string) => `${parseFloat(v) / 2}px`
        const rule = wrap
          ? `{ margin: ${half(row)} ${half(col)}; }`
          : column ? `{ margin-top: ${row}; }` : `{ margin-left: ${col}; }`
        extra.push(sels.map(s => `html.no-flexgap ${s} > *${wrap ? '' : ' + *'}`).join(', ') + ' ' + rule)
      }
      return extra.length ? { code: code + '\n' + extra.join('\n') + '\n', map: null } : null
    },
  }
}

// Версия сборки: в index.html (%BUILD_ID%) и в version.json рядом — по ним страница из кэша Telegram узнаёт, что устарела.
function buildVersion(): Plugin {
  let id = 'dev'
  return {
    name: 'build-version',
    configResolved(c) { if (c.command === 'build') id = String(Date.now()) },
    transformIndexHtml: html => html.replace(/%BUILD_ID%/g, id),
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: id }) }) },
  }
}
