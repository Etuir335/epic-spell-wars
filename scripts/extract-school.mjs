// Нарезка карт дополнения «Лютый дебош в адской школе» из сохранённого объекта TTS.
// Листы скачаны в materials/school/ (spells.jpg, dead.jpg, treasures.jpg — по ссылкам FaceURL из .json).
// Результат: public/assets/cards/<колода>/<OFFSET + номер на листе>.webp (нумерация продолжает базу) + materials/school/copies.json
import sharp from 'sharp'
import fs from 'node:fs'

const SRC = 'C:/Users/Rober_ol/Documents/My Games/Tabletop Simulator/Saves/Saved Objects/Эпичные битвы боевых магов/Лютый дебош в адской школе.json'
const OUT = 'public/assets/cards'
const j = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const SHEETS = { 239: 'spells', 7: 'dead', 15: 'treasures' }
export const OFFSET = { spells: 184, treasures: 76, dead: 24 }
const copies = {}
for (const o of j.ObjectStates) {
  for (const [id, d] of Object.entries(o.CustomDeck ?? {})) {
    const deck = SHEETS[id]
    if (!deck) continue
    const ids = o.DeckIDs.filter(x => Math.floor(x / 100) === +id).map(x => x % 100)
    const cnt = {}
    for (const k of ids) cnt[k] = (cnt[k] ?? 0) + 1
    copies[deck] = cnt
    const file = `materials/school/${deck}.jpg`
    const { width, height } = await sharp(file).metadata()
    const cw = Math.floor(width / d.NumWidth), ch = Math.floor(height / d.NumHeight)
    for (const k of Object.keys(cnt)) {
      const left = (k % d.NumWidth) * cw, top = Math.floor(k / d.NumWidth) * ch
      await sharp(file).extract({ left, top, width: cw, height: ch }).resize(400).webp({ quality: 85 }).toFile(`${OUT}/${deck}/${OFFSET[deck] + +k}.webp`)
    }
    console.log(deck, Object.keys(cnt).length, 'карт,', ids.length, 'всего', `${d.NumWidth}×${d.NumHeight}`, `${cw}×${ch}`)
  }
}
fs.writeFileSync('materials/school/copies.json', JSON.stringify(copies, null, 1))
