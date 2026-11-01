// Нарезка карт дополнения «Переполох в хоромах страсти» из сохранённого объекта TTS.
// Листы скачаны в materials/passion/ (spells.jpg, dead.jpg, treasures.jpg — по ссылкам FaceURL из .json).
// Результат: public/assets/cards/<колода>/<OFFSET + номер на листе>.webp (нумерация продолжает базу) + materials/passion/copies.json
import sharp from 'sharp'
import fs from 'node:fs'

const SRC = 'C:/Users/Rober_ol/Documents/My Games/Tabletop Simulator/Saves/Saved Objects/Эпичные битвы боевых магов/Переполох в хоромах страсти.json'
const OUT = 'public/assets/cards'
const j = JSON.parse(fs.readFileSync(SRC, 'utf8'))
const SHEETS = { 4: "spells", 6: "dead", 14: "treasures" }
export const OFFSET = { spells: 229, treasures: 101, dead: 33 }
const copies = {}
for (const o of j.ObjectStates) {
  for (const [id, d] of Object.entries(o.CustomDeck ?? {})) {
    const deck = SHEETS[id]
    if (!deck) continue
    const ids = o.DeckIDs.filter(x => Math.floor(x / 100) === +id).map(x => x % 100)
    const cnt = {}
    for (const k of ids) cnt[k] = (cnt[k] ?? 0) + 1
    copies[deck] = cnt
    const file = `materials/passion/${deck}.jpg`
    const { width, height } = await sharp(file).metadata()
    const cw = Math.floor(width / d.NumWidth), ch = Math.floor(height / d.NumHeight)
    for (const k of Object.keys(cnt)) {
      const left = (k % d.NumWidth) * cw, top = Math.floor(k / d.NumWidth) * ch
      await sharp(file).extract({ left, top, width: cw, height: ch }).resize(400).webp({ quality: 85 }).toFile(`${OUT}/${deck}/${OFFSET[deck] + +k}.webp`)
    }
    console.log(deck, Object.keys(cnt).length, 'карт,', ids.length, 'всего', `${d.NumWidth}×${d.NumHeight}`, `${cw}×${ch}`)
  }
}
fs.writeFileSync('materials/passion/copies.json', JSON.stringify(copies, null, 1))
