// Заглушки картинок своих карт (src/data/extra.ts) в стиле коробки: жёлтая рамка, лента с названием, рисунок, текст.
// Настоящий рисунок можно сделать в Gemini (промпт — в NOTES.md) и положить поверх заглушки тем же именем.
// Запуск: node scripts/build-extra-cards.mjs
import sharp from 'sharp'
import { TREASURES } from '../src/data/cards.ts'
import { LOOT_BAG } from '../src/data/extra.ts'

const W = 455, H = 643
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
// разбить текст на строки по ~30 символов
const wrap = (t, n = 30) => t.split(' ').reduce((a, w) => ((a.at(-1) + ' ' + w).trim().length > n ? a.push(w) : (a[a.length - 1] = (a.at(-1) + ' ' + w).trim()), a), [''])

const rays = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * Math.PI * 2, b = a + Math.PI / 24, r = 400
  return `<path d="M227 330 L${227 + r * Math.cos(a)} ${330 + r * Math.sin(a)} L${227 + r * Math.cos(b)} ${330 + r * Math.sin(b)}Z"/>`
}).join('')

// мешок: тело, горловина с верёвкой, череп-нашивка, из мешка торчат сокровища
const bag = `
  <ellipse cx="227" cy="470" rx="150" ry="22" fill="#0006"/>
  <path d="M120 300 Q90 470 170 478 L290 478 Q370 470 335 300 Q300 255 227 262 Q150 255 120 300Z" fill="#8a5a2b" stroke="#1a0d05" stroke-width="7"/>
  <path d="M150 330 Q140 420 180 455" stroke="#b07a3f" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M175 262 Q170 215 195 205 L260 205 Q285 215 280 262Z" fill="#7a4d22" stroke="#1a0d05" stroke-width="7"/>
  <path d="M160 262 Q227 290 295 262" stroke="#d9a441" stroke-width="12" fill="none" stroke-linecap="round"/>
  <path d="M290 268 q30 20 18 50" stroke="#d9a441" stroke-width="9" fill="none" stroke-linecap="round"/>
  <circle cx="200" cy="200" r="20" fill="#ffd34a" stroke="#1a0d05" stroke-width="5"/>
  <rect x="222" y="160" width="22" height="55" rx="4" fill="#9fd8ff" stroke="#1a0d05" stroke-width="5" transform="rotate(14 233 188)"/>
  <path d="M245 205 l20 -45 l12 6 l-14 42Z" fill="#c0c6d0" stroke="#1a0d05" stroke-width="5"/>
  <g transform="translate(227 380)">
    <circle r="44" fill="#f2ead8" stroke="#1a0d05" stroke-width="6"/>
    <rect x="-24" y="26" width="48" height="26" rx="6" fill="#f2ead8" stroke="#1a0d05" stroke-width="6"/>
    <circle cx="-16" cy="-4" r="12" fill="#1a0d05"/><circle cx="16" cy="-4" r="12" fill="#1a0d05"/>
    <path d="M0 10 l-7 12 h14Z" fill="#1a0d05"/>
  </g>`

function card(t) {
  const lines = wrap(t.text)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="22" fill="#ffc21a"/>
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="12" fill="#1a0d05"/>
  <clipPath id="c"><rect x="24" y="24" width="${W - 48}" height="${H - 160}" rx="8"/></clipPath>
  <g clip-path="url(#c)"><rect x="0" y="0" width="${W}" height="${H}" fill="#7a1408"/><g fill="#d8361a">${rays}</g>
    <circle cx="227" cy="330" r="150" fill="#ff5a1f" opacity=".45"/>${bag}</g>
  <path d="M30 40 h395 l-18 26 l18 26 h-395 l18 -26Z" fill="#f2ead8" stroke="#1a0d05" stroke-width="5"/>
  <text x="227" y="76" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="24" letter-spacing="3" fill="#1a0d05">СОКРОВИЩЕ</text>
  <path d="M40 92 h375 v58 h-375Z" fill="#ffc21a" stroke="#1a0d05" stroke-width="6"/>
  <text x="227" y="136" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="36" fill="#1a0d05">${esc(t.name.toUpperCase())}</text>
  <rect x="24" y="${H - 136}" width="${W - 48}" height="112" rx="8" fill="#ffd94a"/>
  ${lines.map((l, i) => `<text x="227" y="${H - 136 + 56 - (lines.length - 1) * 14 + i * 28}" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#1a0d05">${esc(l)}</text>`).join('')}
</svg>`
}

const out = `public/assets/cards/treasures/${LOOT_BAG}.webp`
await sharp(Buffer.from(card(TREASURES[LOOT_BAG]))).webp({ quality: 88 }).toFile(out)
console.log('OK', out)
