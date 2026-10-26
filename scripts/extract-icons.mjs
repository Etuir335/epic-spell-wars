// Значки знаков школ — вырезаются из левого нижнего угла карт-образцов ровно по кругу (прозрачный фон).
// Центры кругов измерены по увеличенным углам карт (после нарезки extract-cards.mjs).
// Результат: public/assets/ui/school-<знак>.webp
import sharp from 'sharp'
const ICONS = { // знак: [карта-образец, центр x, центр y]
  grass: [4, 26.3, 544.7], hex: [5, 42.5, 543.2], haze: [6, 42.5, 545], dark: [11, 41.3, 541.8], fire: [12, 42.3, 542.7],
}
const R = 20 // радиус вместе с тёмным ободком
const OUT = 128
const mask = Buffer.from(`<svg width="${OUT}" height="${OUT}"><circle cx="${OUT / 2}" cy="${OUT / 2}" r="${OUT / 2 - 1}" fill="#fff"/></svg>`)
const preview = []
for (const [k, [card, cx, cy]] of Object.entries(ICONS)) {
  const buf = await sharp(`public/assets/cards/spells/${card}.webp`)
    .extract({ left: Math.round(cx - R), top: Math.round(cy - R), width: R * 2, height: R * 2 })
    .resize(OUT, OUT, { kernel: 'lanczos3' }).ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer()
  await sharp(buf).webp({ quality: 95, alphaQuality: 100 }).toFile(`public/assets/ui/school-${k}.webp`)
  preview.push(buf)
}
if (process.argv[2]) {
  await sharp({ create: { width: OUT * 5, height: OUT, channels: 4, background: '#887' } })
    .composite(preview.map((b, i) => ({ input: b, left: i * OUT, top: 0 }))).png().toFile(process.argv[2])
}
console.log('ok')
