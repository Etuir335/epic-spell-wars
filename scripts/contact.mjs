// Лист-превью для чтения карт: node scripts/contact.mjs <колода> <индексы через запятую> <ширина карты> <колонок> <выход>
import sharp from 'sharp'
const [deck, idx, w, cols, out, suffix = ''] = process.argv.slice(2)
const ids = idx.split(',').flatMap(r => { const [a, b] = r.split('-').map(Number); return b === undefined ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i) })
const W = +w, C = +cols
const imgs = await Promise.all(ids.map(i => sharp(`public/assets/cards/${deck}/${i}${suffix}.webp`).resize({ width: W }).png().toBuffer({ resolveWithObject: true })))
const H = Math.max(...imgs.map(x => x.info.height))
const rows = Math.ceil(ids.length / C)
await sharp({ create: { width: W * C, height: H * rows, channels: 3, background: '#222' } })
  .composite(imgs.map((x, k) => ({ input: x.data, left: (k % C) * W, top: Math.floor(k / C) * H })))
  .jpeg({ quality: 85 }).toFile(out)
console.log(out, W * C, H * rows)
