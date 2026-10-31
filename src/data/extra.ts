// Свои карты (не из коробки): добавляются к сгенерированным колодам. Картинка — assets/cards/<колода>/<index>.webp.
import { TREASURES } from './cards.ts'

// «Мешок мародёра»: пока лежит у тебя, добив колдуна, забираешь одно его сокровище на выбор (ab.death)
export const LOOT_BAG = TREASURES.length
TREASURES.push({ index: LOOT_BAG, name: 'Мешок мародёра', promo: false, school: null, text: 'Пока лежит у тебя: добив колдуна, забираешь одно его сокровище на выбор.' })
