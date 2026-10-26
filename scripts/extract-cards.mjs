// Нарезка карт базы «Битва на горе Черепламени» из мода TTS (materials/tts/mod-1-5.json).
// Листы берутся из кэша TTS. Результат: public/assets/cards/<колода>/<индекс>.webp + cards.json.
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const CACHE = [
  'C:/Users/Rober_ol/OneDrive/Документы/My Games/Tabletop Simulator/Mods/Images',
  'C:/Users/Rober_ol/Documents/My Games/Tabletop Simulator/Mods/Images',
]
const OUT = 'public/assets/cards'
const mod = JSON.parse(fs.readFileSync('materials/tts/mod-1-5.json', 'utf8'))

// колода → номер объекта в моде (столбец базы, x ≈ −56)
const DECKS = { spells: 39, treasures: 44, dead: 34, wizards: 33 }

const cached = CACHE.flatMap(d => (fs.existsSync(d) ? fs.readdirSync(d).map(f => path.join(d, f)) : []))
function local(url) {
  const key = url.replace(/[^A-Za-z0-9]/g, '').slice(-40)
  const f = cached.find(x => x.includes(key))
  if (!f) throw new Error('нет в кэше TTS: ' + url)
  return f
}

// На листе заклинаний карты стоят неровно: между ними чёрная кайма, а у края клетки иногда торчит кусок соседней
// карты. По горизонтали режем за чёрной полосой (сплошной по высоте карты) у каждого края клетки, если она есть
// в пределах EDGE px; иначе — по краю клетки. Верх ищем по резкой смене яркости, высота карты — FIT.h.
const FIT = { spells: { h: 556 } }
const EDGE = 32
async function edgeFinder(file) {
  const { data, info } = await sharp(file).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, px = (x, y) => data[y * W + x]
  const colMean = (x, y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y += 2) { s += px(x, y); n++ } return s / n }
  const rowGrad = (y, x0, x1) => { if (y < 1 || y >= H) return 0; let s = 0; for (let x = x0; x < x1; x += 2) s += Math.abs(px(x, y) - px(x, y - 1)); return s }
  return { W, H, colMean, rowGrad }
}
function fitRect(ed, cx, cy, cw, ch, h) {
  // верх карты
  let top = Math.round(cy), best = -1
  for (let dy = 0; dy <= Math.floor(ch - h); dy++) {
    const T = Math.round(cy + dy), sc = ed.rowGrad(T, Math.round(cx + cw * 0.15), Math.round(cx + cw * 0.85))
    if (sc > best) { best = sc; top = T }
  }
  const y0 = Math.round(top + h * 0.12), y1 = Math.round(top + h * 0.8)
  const dark = x => x >= 0 && x < ed.W && ed.colMean(x, y0, y1) < 45
  const L0 = Math.round(cx), R0 = Math.min(ed.W, Math.round(cx + cw))
  // нет чёрной полосы (карты на листе сходятся встык) — срезаем 4px, чтобы убрать волосок соседней карты
  let left = L0 + 4, right = R0 - 4
  for (let x = L0; x < L0 + EDGE; x++) if (dark(x) && dark(x + 1) && dark(x + 2)) { let e = x; while (e < L0 + EDGE + 8 && dark(e)) e++; left = e; break }
  for (let x = R0 - 1; x > R0 - EDGE; x--) if (dark(x) && dark(x - 1) && dark(x - 2)) { let e = x; while (e > R0 - EDGE - 8 && dark(e)) e--; right = e + 1; break }
  return { left, top, width: right - left, height: Math.min(h, ed.H - top) }
}

const list = []
for (const [deck, n] of Object.entries(DECKS)) {
  const o = mod.ObjectStates[n - 1]
  fs.mkdirSync(path.join(OUT, deck), { recursive: true })
  const ids = [...new Set(o.DeckIDs)].sort((a, b) => a - b)
  const copies = {}
  for (const id of o.DeckIDs) copies[id] = (copies[id] || 0) + 1
  for (const [sheetId, s] of Object.entries(o.CustomDeck)) {
    const face = sharp(local(s.FaceURL))
    const { width, height } = await face.metadata()
    const cw = Math.floor(width / s.NumWidth), ch = Math.floor(height / s.NumHeight)
    const fit = FIT[deck], ed = fit ? await edgeFinder(local(s.FaceURL)) : null
    const back = s.UniqueBack ? sharp(local(s.BackURL)) : null
    const bm = back ? await back.metadata() : null
    if (!s.UniqueBack) {
      await sharp(local(s.BackURL)).webp({ quality: 85 }).toFile(path.join(OUT, deck, '_back.webp'))
    }
    const offsets = []
    for (const id of ids.filter(i => Math.floor(i / 100) === +sheetId)) {
      const i = id % 100, x = (i % s.NumWidth) * cw, y = Math.floor(i / s.NumWidth) * ch
      const file = `${deck}/${i}.webp`
      const rect = fit ? fitRect(ed, (i % s.NumWidth) * (width / s.NumWidth), Math.floor(i / s.NumWidth) * (height / s.NumHeight), width / s.NumWidth, height / s.NumHeight, fit.h)
        : { left: x, top: y, width: cw, height: ch }
      if (fit) { rect.left = Math.max(0, Math.min(width - rect.width, rect.left)); rect.top = Math.max(0, Math.min(height - rect.height, rect.top)) }
      if (fit) offsets.push(`${i}:${rect.left - x}+${rect.width}`)
      await sharp(local(s.FaceURL)).extract(rect).resize(cw, ch, { fit: 'fill' }).webp({ quality: 88 }).toFile(path.join(OUT, file))
      const item = { id: `${deck}:${i}`, deck, index: i, copies: copies[id], image: `assets/cards/${file}` }
      if (back) {
        const bw = Math.floor(bm.width / s.NumWidth), bh = Math.floor(bm.height / s.NumHeight)
        const bx = (i % s.NumWidth) * bw, by = Math.floor(i / s.NumWidth) * bh
        await sharp(local(s.BackURL)).extract({ left: bx, top: by, width: bw, height: bh }).webp({ quality: 88 }).toFile(path.join(OUT, `${deck}/${i}_back.webp`))
        item.back = `assets/cards/${deck}/${i}_back.webp`
      }
      list.push(item)
    }
    if (offsets.length) console.log('  сдвиги (№:dx,dy):', offsets.join(' '))
  }
  console.log(deck, ids.length, 'шт.')
}
fs.writeFileSync(path.join(OUT, 'cards.json'), JSON.stringify(list, null, 1))
