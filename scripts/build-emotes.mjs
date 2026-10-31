// Собирает эмоции для сайта: emotes-raw/ → public/assets/emotes/<id>.webp (128px, анимация) и <id>.ogg.
// Сначала скачать исходники: scripts/fetch-giphy.mjs и Clash-Royale-SFX (см. NOTES.md). Запуск: node scripts/build-emotes.mjs
import { mkdir, copyFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { EMOTES } from '../src/emotes.ts'

const RAW = 'emotes-raw', OUT = 'public/assets/emotes'
await mkdir(OUT, { recursive: true })
let size = 0
for (const e of EMOTES) {
  const img = join(OUT, e.id + '.webp'), snd = join(OUT, e.id + '.ogg')
  await sharp(join(RAW, 'giphy', e.src + '.webp'), { animated: true })
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 60, effort: 6 }).toFile(img)
  await copyFile(join(RAW, 'cr-sfx', 'Emotes', e.snd + '.ogg'), snd)
  size += (await stat(img)).size + (await stat(snd)).size
}
console.log(`Эмоций: ${EMOTES.length}, всего ${(size / 1024 / 1024).toFixed(1)} МБ → ${OUT}`)
