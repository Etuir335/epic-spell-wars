// СГЕНЕРИРОВАНО scripts/build-data.mjs из transcript/*.md — правьте расшифровку и перезапускайте.
// Картинка карты: assets/cards/<колода>/<index>.webp

export type School = 'grass' | 'hex' | 'haze' | 'dark' | 'fire'
export type SpellType = 'source' | 'quality' | 'delivery' | 'wild'
export interface MightyTier { from: number; to: number | null; text: string }
export interface SpellData {
  index: number; type: SpellType; name: string; school: School | null; initiative: number | null
  copies: number; promo: boolean
  text?: string; victim?: string; mighty?: MightyTier[]
  set?: 'swamp' | 'castle' // дополнение (нет — база)
  school2?: School // второй знак (приходы болота)
  creature?: boolean // тварь: «СТОЯТЬ!» оставляет её в игре
  sorcery?: 'source' | 'quality' | 'delivery' // колдунство: сбрось 2 карты этого типа — и карта с руки идёт в заклинание
  overdose?: boolean // пережор: при 4+ уникальных знаках эффект ещё раз
  surprise?: boolean // нежданчик: если подох до этой карты — колдунства с руки
}
export interface TreasureData {
  index: number; name: string; promo: boolean; text: string; school: School | null
  set?: 'swamp' | 'castle'; eternal?: boolean // вечное: не сбрасывается в конце игры и при смерти
  creature?: School; victim?: string; mighty?: MightyTier[] // сокровище-тварь
}
export interface DeadData { index: number; copies: number; name: string; text: string; set?: 'swamp' | 'castle'; school?: School | null }

export const SCHOOL_NAMES: Record<School, string> = { grass: 'Трава', hex: 'Порча', haze: 'Кумар', dark: 'Мрак', fire: 'Угар' }
export const TYPE_NAMES: Record<SpellType, string> = { source: 'Заводила', quality: 'Наворот', delivery: 'Приход', wild: 'Шальная магия' }

export const SPELLS: SpellData[] = [
 {
  "index": 0,
  "type": "wild",
  "name": "Шальная магия",
  "school": null,
  "initiative": null,
  "copies": 8,
  "promo": false,
  "text": "Используй вместо любой другой карты в заклинании. Перед тем как применять эффекты заклинания, открывай карты с верха колоды заклинаний, пока не найдёшь карту того типа, который заменил «Шальной магией». Выложи эту карту вместо «Шальной магии», а саму «Шальную магию» сбрось вместе с другими открывшимися картами из колоды."
 },
 {
  "index": 1,
  "type": "source",
  "name": "От Бомжьей Коровки",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": true,
  "text": "Нанеси левому врагу 1 урон за каждую карту в твоём заклинании."
 },
 {
  "index": 2,
  "type": "delivery",
  "name": "Праздник живота",
  "school": "grass",
  "initiative": 5,
  "copies": 2,
  "promo": true,
  "victim": "Жертвы: три правых врага.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон, а ты накручиваешь 1 жизнь."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "2 урона, а ты накручиваешь 2 жизни."
   }
  ]
 },
 {
  "index": 3,
  "type": "quality",
  "name": "Раскулаченный",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": true,
  "text": "Нанеси 2 урона каждому врагу хилее тебя."
 },
 {
  "index": 4,
  "type": "source",
  "name": "От короля Оберона",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Накрути 2 жизни."
 },
 {
  "index": 5,
  "type": "delivery",
  "name": "Шалтай-Разболтай",
  "school": "hex",
  "initiative": 7,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: самый хилый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "5 уронов, а ты берёшь 1 сокровище."
   }
  ]
 },
 {
  "index": 6,
  "type": "delivery",
  "name": "Отсос мозга",
  "school": "haze",
  "initiative": 15,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона, а ты можешь отжать у жертвы 1 сокровище по своему выбору."
   }
  ]
 },
 {
  "index": 7,
  "type": "delivery",
  "name": "Рубин в башке",
  "school": "haze",
  "initiative": 19,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "1 урон, а ты можешь добавить случайную карту с руки к твоему заклинанию."
   },
   {
    "from": 10,
    "to": null,
    "text": "то же, что и выше, но карта по твоему выбору."
   }
  ]
 },
 {
  "index": 8,
  "type": "delivery",
  "name": "Жмураган",
  "school": "grass",
  "initiative": 2,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: самый живучий враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "6 уронов."
   }
  ]
 },
 {
  "index": 9,
  "type": "delivery",
  "name": "Фонтан молодости",
  "school": "grass",
  "initiative": 12,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: ты сам.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "нет эффекта."
   },
   {
    "from": 5,
    "to": 9,
    "text": "накрути 2 жизни."
   },
   {
    "from": 10,
    "to": null,
    "text": "накрути 4 жизни."
   }
  ]
 },
 {
  "index": 10,
  "type": "delivery",
  "name": "Вихрь бодрости",
  "school": "hex",
  "initiative": 16,
  "copies": 2,
  "promo": false,
  "victim": "Жертвы: каждый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "ты сбрасываешь 1 карту."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона, а ты сбрасываешь 2 карты."
   },
   {
    "from": 10,
    "to": null,
    "text": "то же, что и выше, но ты ещё берёшь 1 сокровище."
   }
  ]
 },
 {
  "index": 11,
  "type": "delivery",
  "name": "Самовыпил",
  "school": "dark",
  "initiative": 8,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: правый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона, а ты отхватываешь 1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона, а ты отхватываешь 1 урон."
   },
   {
    "from": 10,
    "to": null,
    "text": "5 уронов, а ты отхватываешь 1 урон."
   }
  ]
 },
 {
  "index": 12,
  "type": "delivery",
  "name": "Мясной фарш",
  "school": "fire",
  "initiative": 20,
  "copies": 2,
  "promo": false,
  "victim": "Жертвы: каждый враг живучее тебя.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона."
   }
  ]
 },
 {
  "index": 13,
  "type": "delivery",
  "name": "Драконий сундук",
  "school": "hex",
  "initiative": 6,
  "copies": 2,
  "promo": false,
  "victim": "Жертвы: каждый враг без сокровищ.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона, а ты берёшь 1 сокровище."
   }
  ]
 },
 {
  "index": 14,
  "type": "delivery",
  "name": "Договор с дьяволом",
  "school": "dark",
  "initiative": 18,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: самый живучий враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "2 урона, а если в заклинании жертвы есть приход, отожми его и добавь к своему заклинанию."
   }
  ]
 },
 {
  "index": 15,
  "type": "delivery",
  "name": "Кислотный слив",
  "school": "hex",
  "initiative": 4,
  "copies": 2,
  "promo": false,
  "victim": "Жертвы: левый и правый враги.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона, а ты берёшь 1 сокровище."
   }
  ]
 },
 {
  "index": 16,
  "type": "delivery",
  "name": "Экзорцизм",
  "school": "dark",
  "initiative": 11,
  "copies": 2,
  "promo": false,
  "victim": "Жертвы: каждый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "ты отхватываешь 1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона (4 урона, если у врага медаль недобитого колдуна)."
   },
   {
    "from": 10,
    "to": null,
    "text": "то же, что и выше, но урон удваивается."
   }
  ]
 },
 {
  "index": 17,
  "type": "delivery",
  "name": "Петушок",
  "school": "fire",
  "initiative": 3,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: самый живучий враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "тоже 1 урон."
   },
   {
    "from": 10,
    "to": null,
    "text": "7 уронов."
   }
  ]
 },
 {
  "index": 18,
  "type": "delivery",
  "name": "Шарах молнии",
  "school": "fire",
  "initiative": 9,
  "copies": 2,
  "promo": false,
  "victim": "Жертвы: два левых врага.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона."
   }
  ]
 },
 {
  "index": 19,
  "type": "delivery",
  "name": "Химерический хохот",
  "school": "haze",
  "initiative": 17,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: правый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона."
   }
  ]
 },
 {
  "index": 20,
  "type": "delivery",
  "name": "Ядрёный синтез",
  "school": "fire",
  "initiative": 10,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: самый живучий враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона и 1 урон колдунам слева и справа от жертвы."
   },
   {
    "from": 10,
    "to": null,
    "text": "то же, что и выше, но 5 уронов вместо 3."
   }
  ]
 },
 {
  "index": 21,
  "type": "delivery",
  "name": "Раздвоитель личности",
  "school": "haze",
  "initiative": 13,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: левый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона, и жертва должна сбросить 1 своё сокровище по своему выбору либо отхватить 3 урона."
   }
  ]
 },
 {
  "index": 22,
  "type": "delivery",
  "name": "Кулак природы",
  "school": "grass",
  "initiative": 14,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: левый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона."
   }
  ]
 },
 {
  "index": 23,
  "type": "delivery",
  "name": "Удар милосердия",
  "school": "dark",
  "initiative": 5,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: самый хилый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона."
   }
  ]
 },
 {
  "index": 24,
  "type": "delivery",
  "name": "Змеиный жор",
  "school": "grass",
  "initiative": 1,
  "copies": 2,
  "promo": false,
  "victim": "Жертвы: левый и правый враги.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "нанеси жертвам 2 урона за каждый знак травы в твоём заклинании."
   }
  ]
 },
 {
  "index": 25,
  "type": "quality",
  "name": "Нетерпеливый",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Открой эту карту перед определением очерёдности хода. В этом раунде ты ходишь первым. Нанеси 1 урон каждому врагу."
 },
 {
  "index": 26,
  "type": "quality",
  "name": "Ритуальный",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "нет урона, а ты отхватываешь 3 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "5 уронов."
   }
  ]
 },
 {
  "index": 27,
  "type": "quality",
  "name": "Дьявольский",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "4 урона, а ты отхватываешь 1 урон."
   },
   {
    "from": 10,
    "to": null,
    "text": "5 уронов, а ты отхватываешь 2 урона."
   }
  ]
 },
 {
  "index": 28,
  "type": "quality",
  "name": "Дискотечный",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Эта карта копирует текст заводилы или прихода из твоего заклинания."
 },
 {
  "index": 29,
  "type": "quality",
  "name": "Двуличный",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Колдун по твоему выбору берёт 1 сокровище. Затем нанеси ему 2 урона за каждое его сокровище."
 },
 {
  "index": 30,
  "type": "quality",
  "name": "Опарышный",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Нанеси самому живучему врагу 2 урона за каждый знак мрака в твоём заклинании."
 },
 {
  "index": 31,
  "type": "quality",
  "name": "Котострофический",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Каждый игрок бросает кубик. Прибавь к своему результату 2. Игрок(и) с наибольшим результатом берёт(ут) 1 сокровище. Остальные отхватывают столько урона, сколько выпало на их кубиках."
 },
 {
  "index": 32,
  "type": "quality",
  "name": "Мозголомный",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Нанеси 3 урона случайному врагу. Вместе с этим врагом возьмите по 1 сокровищу."
 },
 {
  "index": 33,
  "type": "quality",
  "name": "Разрывной",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона, а ты отхватываешь 1 урон."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона, и жертва сбрасывает 1 сокровище по твоему выбору."
   }
  ]
 },
 {
  "index": 34,
  "type": "quality",
  "name": "Непонятный",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Нанеси правому врагу 1 урон за каждый уникальный знак в твоём заклинании и каждое твоё сокровище."
 },
 {
  "index": 35,
  "type": "quality",
  "name": "Шипастый",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: правый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "1 урон, а ты накручиваешь 1 жизнь."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона, а ты накручиваешь 3 жизни."
   }
  ]
 },
 {
  "index": 36,
  "type": "quality",
  "name": "Загнивающий",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Самый живучий враг из тех, кто ещё не сходил в этом раунде, сбрасывает наворот из своего заклинания (если есть)."
 },
 {
  "index": 37,
  "type": "quality",
  "name": "Каменючный",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Нанеси левому врагу 1 урон, его левому врагу — 2 урона, следующему левому врагу — 3 урона и так далее, пока все, кроме тебя, не отхватят урон."
 },
 {
  "index": 38,
  "type": "quality",
  "name": "Аппетитный",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Каждый враг с нечётным числом жизней отхватывает 1 урон за каждый уникальный знак в твоём заклинании."
 },
 {
  "index": 39,
  "type": "quality",
  "name": "Ядовый",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Нанеси каждому врагу 1 урон за каждый знак угара в твоём заклинании."
 },
 {
  "index": 40,
  "type": "source",
  "name": "От Старого Жгуна",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Брось кубик. Если выпадет 1–3, отхвати столько урона, сколько выпало. Если выпадет 4–6, накрути столько жизней, сколько выпало."
 },
 {
  "index": 41,
  "type": "source",
  "name": "От Драконьера",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Нанеси каждому врагу 1 урон за каждый уникальный знак в твоём заклинании."
 },
 {
  "index": 42,
  "type": "quality",
  "name": "Кубический",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Брось 2 кубика. Каждый враг бросает 1 кубик: те, у кого выпало то же, что на одном или нескольких твоих кубиках, отхватывают столько урона, сколько у них выпало."
 },
 {
  "index": 43,
  "type": "quality",
  "name": "Громобойный",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Нанеси 2 урона случайному врагу. Примени этот эффект один раз за каждый уникальный знак в твоём заклинании."
 },
 {
  "index": 44,
  "type": "quality",
  "name": "Отборный",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "victim": "Жертва: самый живучий враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона, а ты берёшь 1 сокровище."
   },
   {
    "from": 10,
    "to": null,
    "text": "5 уронов, а ты берёшь 1 сокровище."
   }
  ]
 },
 {
  "index": 45,
  "type": "quality",
  "name": "Качковый",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Накрути 2 жизни. Затем, если ты самый хилый колдун, добавь к своему заклинанию случайную карту с руки."
 },
 {
  "index": 46,
  "type": "quality",
  "name": "Мошоночный",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Левый и правый враги по отдельности выбирают: либо отдать тебе 1 сокровище по своему выбору, либо отхватить 3 урона."
 },
 {
  "index": 47,
  "type": "source",
  "name": "От Беня Вуду",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Каждый враг бросает 1 кубик и отхватывает столько урона, сколько выпало. Сбрось 1 своё сокровище (если есть)."
 },
 {
  "index": 48,
  "type": "source",
  "name": "От сэра Кладомота",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Возьми 1 сокровище. Каждый враг бросает кубик: те, у кого выпадет 6, берут по 1 сокровищу."
 },
 {
  "index": 49,
  "type": "source",
  "name": "От Магмуда Поджигая",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Либо нанеси 3 урона левому врагу, либо нанеси 1 урон каждому врагу."
 },
 {
  "index": 50,
  "type": "source",
  "name": "От Мордоеда",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "В этом раунде добавляй 1 кубик к своим могучим броскам."
 },
 {
  "index": 51,
  "type": "source",
  "name": "От Горячей Штучки",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Нанеси 3 урона самому живучему врагу."
 },
 {
  "index": 52,
  "type": "source",
  "name": "От Профессора Ахалая",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Нанеси 3 урона случайному врагу. Если в твоём заклинании была «Шальная магия», возьми 1 сокровище."
 },
 {
  "index": 53,
  "type": "source",
  "name": "От Шерочки с Машерочкой",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Жертвами твоего прихода становятся все враги."
 },
 {
  "index": 54,
  "type": "source",
  "name": "От Тай Тыфуна",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Нанеси 3 урона каждому врагу, уже сходившему в этом раунде."
 },
 {
  "index": 55,
  "type": "source",
  "name": "От Сфинксенона",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Отожми 1 сокровище по своему выбору у любого врага."
 },
 {
  "index": 56,
  "type": "source",
  "name": "От Бухого Хокера",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Каждый игрок бросает кубик. Прибавь к своему результату 1 за каждый уникальный знак в твоём заклинании. Игрок(и) с наименьшим результатом отхватывает(ют) 3 урона."
 },
 {
  "index": 57,
  "type": "source",
  "name": "От Розового Бутончика",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Накрути 1 жизнь за каждый уникальный знак в твоём заклинании."
 },
 {
  "index": 58,
  "type": "source",
  "name": "От Поганого Мерлина",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Нанеси самому живучему врагу 1 урон за каждого живого колдуна. Затем возьми 1 карту дохлого колдуна."
 },
 {
  "index": 59,
  "type": "source",
  "name": "От Брадостреля",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Эта карта копирует текст прихода из твоего заклинания."
 },
 {
  "index": 60,
  "type": "source",
  "name": "От Пыща с Тыдыщем",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Открой 4 карты с верха колоды заклинаний. Найди среди них заводил и добавь к заклинанию. Остальные сбрось."
 },
 {
  "index": 61,
  "type": "source",
  "name": "От Феечки смерти",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Нанеси 2 урона любому врагу. Если он подох, повтори этот эффект."
 },
 {
  "index": 62,
  "type": "source",
  "name": "От д-ра Корнея Дуболома",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Накрути 3 жизни. Каждый враг бросает кубик: те, у кого выпало 6, накручивают по 3 жизни."
 },
 {
  "index": 63,
  "type": "source",
  "name": "От Зачуханного Комбайна",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "text": "Открой 2 карты с верха колоды заклинаний. Найди среди них карты со знаками, которые уже есть в твоём заклинании, и добавь их к заклинанию. Остальные сбрось."
 },
 {
  "index": 64,
  "type": "delivery",
  "name": "Перегруз ответственности",
  "school": "dark",
  "school2": "hex",
  "initiative": 11,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "victim": "Жертва: самый живучий враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "6 уронов, а ты отхватываешь 2 урона."
   }
  ]
 },
 {
  "index": 65,
  "type": "delivery",
  "name": "Суши-повар",
  "school": "haze",
  "initiative": 1,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "creature": true,
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "5 уронов. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 66,
  "type": "quality",
  "name": "Многозначный",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Возьми 1 карту из колоды заклинаний за каждый уникальный знак в твоём заклинании."
 },
 {
  "index": 67,
  "type": "quality",
  "name": "Нефартовый",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "sorcery": "quality",
  "text": "Нанеси 2 урона правому врагу. Колдунство: сбрось 2 наворота, чтобы добавить эту карту с руки к твоему заклинанию."
 },
 {
  "index": 68,
  "type": "source",
  "name": "От Мага Олдфага",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Брось кубик. Нанеси врагу по твоему выбору столько урона, сколько выпало. Любой колдун может сбросить 1 своё сокровище, чтобы ты перебросил этот кубик."
 },
 {
  "index": 69,
  "type": "source",
  "name": "От Бэбимиксера",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "sorcery": "source",
  "text": "Нанеси 2 урона каждому колдуну, включая себя. Колдунство: сбрось 2 заводил, чтобы добавить эту карту с руки к твоему заклинанию."
 },
 {
  "index": 70,
  "type": "source",
  "name": "От Чумовой девки",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "overdose": true,
  "text": "Брось кубик. На чёт накрути столько жизней, сколько выпало. На нечёт ты и враг по твоему выбору отхватываете столько урона, сколько выпало. Пережор: если в твоём заклинании 4 уникальных знака или больше, примени эффект этой карты ещё раз."
 },
 {
  "index": 71,
  "type": "source",
  "name": "От Рюмкенштильцхена",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "surprise": true,
  "text": "Все твари, чей эффект ты применяешь в этот ход, получают команду «СТОЯТЬ!». Нежданчик: если ты подох до применения эффектов этой карты, можешь сыграть карты колдунств с руки, как если бы был твой ход."
 },
 {
  "index": 72,
  "type": "source",
  "name": "От Балбесов из Хрюгвартса",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "overdose": true,
  "text": "Нанеси 1 урон случайному врагу за каждое твоё сокровище. Пережор: если в твоём заклинании 4 уникальных знака или больше, примени эффект этой карты ещё раз."
 },
 {
  "index": 73,
  "type": "quality",
  "name": "Попкорновый",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Враг по твоему выбору может отдать тебе 1 свою тварь, находящуюся в игре. Если он этого не сделает, то должен сбросить всех закрытых заводил и все закрытые навороты из своего заклинания."
 },
 {
  "index": 74,
  "type": "quality",
  "name": "Травмоопасный",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Брось кубик. Каждый колдун (включая тебя) получает столько урона, сколько выпало. После броска любой колдун может сбросить 1 своё сокровище, чтобы не получать урон от этого эффекта."
 },
 {
  "index": 75,
  "type": "quality",
  "name": "Течный",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Возьми на руку карту из колоды заклинаний и покажи её всем. Нанеси 2 урона правому врагу за каждый знак в твоём заклинании, который совпадает со знаком взятой карты."
 },
 {
  "index": 76,
  "type": "quality",
  "name": "Призрачный",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "sorcery": "delivery",
  "text": "Враг по твоему выбору сбрасывает все карты с руки. Колдунство: сбрось 2 прихода, чтобы добавить эту карту с руки к твоему заклинанию."
 },
 {
  "index": 77,
  "type": "quality",
  "name": "Верблюжелапный",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Левый враг сбрасывает 2 карты с руки, его левый враг — 3 карты, следующий левый враг — 4 карты и так далее, пока все, кроме тебя, не сбросят карты."
 },
 {
  "index": 78,
  "type": "quality",
  "name": "Прожжённый",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "overdose": true,
  "text": "Нанеси 1 урон левому врагу за каждое его сокровище и 1 урон правому врагу за каждое его сокровище. Пережор: если в твоём заклинании 4 уникальных знака или больше, примени эффект этой карты ещё раз."
 },
 {
  "index": 79,
  "type": "quality",
  "name": "Психоделичный",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "overdose": true,
  "text": "Возьми на руку карту из колоды заклинаний и покажи её всем. Нанеси 1 урон самому хилому врагу за каждый знак в твоём заклинании, который совпадает со знаком взятой карты. Пережор: если в твоём заклинании 4 уникальных знака или больше, примени эффект этой карты ещё раз."
 },
 {
  "index": 80,
  "type": "quality",
  "name": "Чистилищный",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "sorcery": "delivery",
  "text": "Возьми 1 карту дохлого колдуна. Колдунство: сбрось 2 прихода, чтобы добавить эту карту с руки к твоему заклинанию."
 },
 {
  "index": 81,
  "type": "quality",
  "name": "Страдающий",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "sorcery": "quality",
  "text": "Нанеси 2 урона левому врагу. Колдунство: сбрось 2 наворота, чтобы добавить эту карту с руки к твоему заклинанию."
 },
 {
  "index": 82,
  "type": "quality",
  "name": "Скальпосъёмный",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "overdose": true,
  "text": "Нанеси 4 урона случайному колдуну (может, и тебе самому). Пережор: если в твоём заклинании 4 уникальных знака или больше, примени эффект этой карты ещё раз."
 },
 {
  "index": 83,
  "type": "quality",
  "name": "Тырящий",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Отожми 1 сокровище у врага по твоему выбору. Нанеси по 1 урону остальным врагам."
 },
 {
  "index": 84,
  "type": "quality",
  "name": "Волканический",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Нанеси 1 урон каждому врагу за каждый уникальный знак в твоём заклинании."
 },
 {
  "index": 85,
  "type": "quality",
  "name": "Ароматный",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Возьми на руку карту из колоды заклинаний и покажи её всем. Нанеси 2 урона левому врагу за каждый знак в твоём заклинании, который совпадает со знаком взятой карты."
 },
 {
  "index": 86,
  "type": "quality",
  "name": "Премиальный",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "overdose": true,
  "text": "Возьми 1 сокровище. Пережор: если в твоём заклинании 4 уникальных знака или больше, примени эффект этой карты ещё раз."
 },
 {
  "index": 87,
  "type": "quality",
  "name": "Людоедский",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Возьми 1, 2 или 3 карты из колоды заклинаний. Потеряй столько жизней, сколько взял карт. Затем накрути 2 жизни за каждую взятую карту со знаком мрака."
 },
 {
  "index": 88,
  "type": "quality",
  "name": "Бингональный",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Возьми на руку 2 карты из колоды заклинаний и покажи их всем. Нанеси 1 урон врагу по твоему выбору за каждый знак на взятых картах."
 },
 {
  "index": 89,
  "type": "delivery",
  "name": "Лобкоубийца",
  "school": "grass",
  "school2": "dark",
  "initiative": 5,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "victim": "Жертва: два левых врага.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "2 урона за каждый уникальный знак в твоём заклинании."
   }
  ]
 },
 {
  "index": 90,
  "type": "delivery",
  "name": "Глазной разбег",
  "school": "fire",
  "school2": "haze",
  "initiative": 6,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "victim": "Жертва: каждый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона, а ты берёшь 1 карту из колоды заклинаний."
   }
  ]
 },
 {
  "index": 91,
  "type": "delivery",
  "name": "Лютобомж",
  "school": "grass",
  "initiative": 3,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "creature": true,
  "victim": "Жертва: самый живучий враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 92,
  "type": "delivery",
  "name": "Вынос мозга",
  "school": "hex",
  "school2": "haze",
  "initiative": 8,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "victim": "Жертва: враг живучее тебя.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона, а ты берёшь 1 сокровище."
   },
   {
    "from": 10,
    "to": null,
    "text": "2 урона за каждый уникальный знак в твоём заклинании."
   }
  ]
 },
 {
  "index": 93,
  "type": "delivery",
  "name": "Летучий Синюшный Дельфин",
  "school": "hex",
  "initiative": 13,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "creature": true,
  "victim": "Жертва: самый хилый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 94,
  "type": "source",
  "name": "От Хипстерских хиппи",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Нанеси одному врагу живучее тебя 1 урон за каждую тварь и каждую закрытую карту перед ним."
 },
 {
  "index": 95,
  "type": "source",
  "name": "От Ручного диктатора",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "surprise": true,
  "text": "Можешь сбросить 4 или меньше своих сокровищ. Нанеси каждому врагу 2 урона за каждое сброшенное сокровище. Нежданчик: если ты подох до применения эффектов этой карты, можешь сыграть карты колдунств с руки, как если бы был твой ход."
 },
 {
  "index": 96,
  "type": "source",
  "name": "От Дерьмонстра",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "sorcery": "delivery",
  "text": "Накрути 3 жизни. Колдунство: сбрось 2 прихода, чтобы добавить эту карту с руки к твоему заклинанию."
 },
 {
  "index": 97,
  "type": "source",
  "name": "От Гномиков-шалунишек",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Нанеси 1 урон каждому врагу хилее тебя. Накрути 1 жизнь за каждого колдуна, который подох от этого эффекта. Если никто не подох, возьми карту из колоды заклинаний."
 },
 {
  "index": 98,
  "type": "source",
  "name": "От Академика Мухожука",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "overdose": true,
  "text": "Добавь к своему заклинанию карту с верха колоды заклинаний. Пережор: если в твоём заклинании 4 уникальных знака или больше, примени эффект этой карты ещё раз."
 },
 {
  "index": 99,
  "type": "source",
  "name": "От Леди Силиконии",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "sorcery": "source",
  "text": "Положи карту с руки на верх колоды заклинаний. Колдунство: сбрось 2 заводил, чтобы добавить эту карту с руки к твоему заклинанию."
 },
 {
  "index": 100,
  "type": "source",
  "name": "От Зажимничка",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Возьми на руку карту из колоды заклинаний и покажи её всем. Нанеси каждому врагу 1 урон за каждый знак в твоём заклинании, который совпадает со знаком взятой карты."
 },
 {
  "index": 101,
  "type": "source",
  "name": "От Гольфараона Клюшкомона",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "sorcery": "source",
  "text": "Возьми 1 сокровище. Колдунство: сбрось 2 заводил, чтобы добавить эту карту с руки к твоему заклинанию."
 },
 {
  "index": 102,
  "type": "source",
  "name": "От Копьенатирателя",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "surprise": true,
  "text": "Отожми 1 сокровище по твоему выбору у левого или правого врага. Нежданчик: если ты подох до применения эффектов этой карты, можешь сыграть колдунства с руки, как если бы был твой ход."
 },
 {
  "index": 103,
  "type": "source",
  "name": "От Горячей киски",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "overdose": true,
  "text": "Отожми 1 тварь у врага по твоему выбору. Пережор: если в твоём заклинании 4 уникальных знака или больше, примени эффект этой карты ещё раз."
 },
 {
  "index": 104,
  "type": "source",
  "name": "От Пучеглаза",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "text": "Возьми на руку карту из колоды заклинаний и покажи её всем. Нанеси самому живучему врагу 2 урона за каждый знак в твоём заклинании, который совпадает со знаком взятой карты."
 },
 {
  "index": 105,
  "type": "source",
  "name": "От Трансгендракона",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "sorcery": "delivery",
  "text": "Нанеси 3 урона самому живучему врагу. Колдунство: сбрось 2 прихода, чтобы добавить эту карту с руки к твоему заклинанию."
 },
 {
  "index": 106,
  "type": "source",
  "name": "От Горелого конкистадора",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "surprise": true,
  "text": "Можешь сбросить 1 своё сокровище. В этом случае каждый враг сбрасывает 1 свою тварь в игре. Нежданчик: если ты подох до применения эффектов этой карты, можешь сыграть карты колдунств с руки, как если бы был твой ход."
 },
 {
  "index": 107,
  "type": "source",
  "name": "От Развратино",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "overdose": true,
  "text": "В этом раунде добавляй 1 кубик к своим могучим броскам. Пережор: если в твоём заклинании 4 уникальных знака или больше, примени эффект этой карты ещё раз."
 },
 {
  "index": 108,
  "type": "source",
  "name": "От Самогонного деда",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "surprise": true,
  "text": "Нанеси 1 урон врагу по твоему выбору. Затем он наносит 2 урона врагу по своему выбору (кроме тебя). Нежданчик: если ты подох до применения эффектов этой карты, можешь сыграть карты колдунств с руки, как если бы был твой ход."
 },
 {
  "index": 109,
  "type": "quality",
  "name": "Окрыляющий",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "overdose": true,
  "text": "Накрути 5 жизней, затем отхвати 1 урон за каждую карту у тебя на руке. Пережор: если в твоём заклинании 4 уникальных знака или больше, примени эффект этой карты ещё раз."
 },
 {
  "index": 110,
  "type": "quality",
  "name": "Ссыкотный",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "sorcery": "quality",
  "text": "Нанеси 2 урона самому хилому врагу. Колдунство: сбрось 2 наворота, чтобы добавить эту карту с руки к твоему заклинанию."
 },
 {
  "index": 111,
  "type": "delivery",
  "name": "Смертный одр",
  "school": "dark",
  "initiative": 10,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "creature": true,
  "victim": "Жертва: левый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "ты берёшь 1 карту из колоды заклинаний."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 112,
  "type": "delivery",
  "name": "Байкер Драматург",
  "school": "dark",
  "initiative": 7,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "creature": true,
  "victim": "Жертва: каждый враг с 10 жизнями или больше.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона, а ты отхватываешь 1 урон. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 113,
  "type": "delivery",
  "name": "Шлюхобот",
  "school": "fire",
  "initiative": 17,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "creature": true,
  "victim": "Жертва: каждый враг, ещё не сходивший в этом раунде.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "1 урон, и жертвы сбрасывают по 2 карты с руки."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 114,
  "type": "delivery",
  "name": "Битриклоп",
  "school": "hex",
  "initiative": 9,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "creature": true,
  "victim": "Жертва: два правых врага.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "СТОЯТЬ!."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона. СТОЯТЬ!."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона."
   }
  ]
 },
 {
  "index": 115,
  "type": "delivery",
  "name": "Пах-бабах",
  "school": "fire",
  "school2": "grass",
  "initiative": 12,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "victim": "Жертва: левый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "нет эффекта."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "2 урона за каждый уникальный знак в твоём заклинании."
   }
  ]
 },
 {
  "index": 116,
  "type": "delivery",
  "name": "Рванувший пукан",
  "school": "hex",
  "school2": "fire",
  "initiative": 18,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "victim": "Жертва: каждый враг с сокровищем.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона, и каждая жертва сбрасывает случайную карту с руки."
   }
  ]
 },
 {
  "index": 117,
  "type": "delivery",
  "name": "Главный засранец",
  "school": "fire",
  "initiative": 19,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "creature": true,
  "victim": "Жертва: правый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона. СТОЯТЬ!."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона."
   }
  ]
 },
 {
  "index": 118,
  "type": "delivery",
  "name": "Адский фуршет",
  "school": "dark",
  "school2": "fire",
  "initiative": 15,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "victim": "Жертва: враг хилее тебя.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона, а ты отхватываешь 1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "2 урона за каждый уникальный знак в твоём заклинании."
   }
  ]
 },
 {
  "index": 119,
  "type": "delivery",
  "name": "Доктор Раптор",
  "school": "grass",
  "initiative": 4,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "creature": true,
  "victim": "Жертва: ты сам.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "накрути 1 жизнь."
   },
   {
    "from": 5,
    "to": 9,
    "text": "накрути 2 жизни."
   },
   {
    "from": 10,
    "to": null,
    "text": "накрути 3 жизни. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 120,
  "type": "delivery",
  "name": "Срыв покрова",
  "school": "haze",
  "school2": "dark",
  "initiative": 16,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона, а ты берёшь 1 карту из колоды заклинаний."
   },
   {
    "from": 10,
    "to": null,
    "text": "2 урона за каждый уникальный знак в твоём заклинании."
   }
  ]
 },
 {
  "index": 121,
  "type": "delivery",
  "name": "Могучий пердёж",
  "school": "grass",
  "school2": "hex",
  "initiative": 2,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "victim": "Жертва: два правых врага.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона, а ты накручиваешь 2 жизни."
   }
  ]
 },
 {
  "index": 122,
  "type": "delivery",
  "name": "Сосочный ниндзя",
  "school": "haze",
  "initiative": 14,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "creature": true,
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона, а ты берёшь 1 карту из колоды заклинаний. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 123,
  "type": "delivery",
  "name": "Сиськокрут",
  "school": "haze",
  "school2": "grass",
  "initiative": 20,
  "copies": 2,
  "promo": false,
  "set": "swamp",
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "ты сбрасываешь случайную карту с руки."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона."
   }
  ]
 },
 {
  "index": 124,
  "type": "delivery",
  "name": "Йог-Ниггатот",
  "school": "dark",
  "initiative": 6,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: враг, уже сходивший в этом раунде. Слей 1 литр крови: добавляй на этом ходу 1 кубик к могучему броску каждой твоей твари.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "нет эффекта."
   },
   {
    "from": 5,
    "to": 9,
    "text": "1 урон."
   },
   {
    "from": 10,
    "to": null,
    "text": "2 урона, а ты играешь ещё 1 тварь с руки. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 125,
  "type": "delivery",
  "name": "Герцог Белкингем",
  "school": "grass",
  "initiative": 18,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: враг, у которого больше всех крови.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "нет эффекта."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона, а ты накручиваешь 2 жизни. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 126,
  "type": "quality",
  "name": "Пузырьковый",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Враг без сокровищ по твоему выбору берёт 1 сокровище. Затем нанеси 2 урона каждому врагу с сокровищем."
 },
 {
  "index": 127,
  "type": "quality",
  "name": "Клоноубийственный",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Нанеси либо 2 урона каждому врагу с чётным числом жизней, либо 3 урона каждому врагу с нечётным числом жизней. Замок: сделай и то и другое. Сначала чётные, затем нечётные."
 },
 {
  "index": 128,
  "type": "quality",
  "name": "Завальный",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Нанеси правому врагу 1 урон, его правому врагу — 2 урона, следующему правому врагу — 3 урона и так далее, пока все, кроме тебя, не отхватят урон. Слей 2 литра крови: удвой наносимый урон."
 },
 {
  "index": 129,
  "type": "quality",
  "name": "Волчарный",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Враг по твоему выбору открывает руку и отхватывает вдвое больше урона, чем тварей у него на руке. Слей 3 литра крови: вместо этого то же самое делает каждый враг."
 },
 {
  "index": 130,
  "type": "quality",
  "name": "Кексуальный",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Захвати замок и отдай его любому врагу (но не тому, у которого забрал). Затем нанеси этому врагу 3 урона. Слей 3 литра крови: сначала убей всех тварей этого врага."
 },
 {
  "index": 131,
  "type": "quality",
  "name": "Сгубленный",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Левый враг отдаёт тебе либо 1 карту со знаком порчи с руки, либо 1 сокровище. Замок: повтори этот эффект для правого врага."
 },
 {
  "index": 132,
  "type": "quality",
  "name": "Душноватый",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Нанеси 1 урон каждому врагу. Слей 1 литр крови: выбери врага. Он отхватывает столько урона, сколько у тебя литров крови. А ты отхватываешь столько урона, сколько у него литров крови."
 },
 {
  "index": 133,
  "type": "quality",
  "name": "Надгробовой",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Сбрось с руки любое число карт одного типа (заводилы, навороты, приходы). Нанеси врагу по твоему выбору столько урона, сколько карт сбросил. Слей 4 литра крови: удвой наносимый урон."
 },
 {
  "index": 134,
  "type": "quality",
  "name": "Загребущий",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Возьми 2 сокровища. Каждый враг, ещё не сходивший в этом раунде, берёт 1 сокровище. Слей 2 литра крови: каждый враг, уже сходивший в этом раунде, сбрасывает 1 своё сокровище."
 },
 {
  "index": 135,
  "type": "delivery",
  "name": "Вятский цирк",
  "school": "dark",
  "initiative": 16,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: враг, у которого больше всех тварей в игре.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "ты отхватываешь 1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "убей 1 тварь жертвы, а затем нанеси ему 3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 136,
  "type": "delivery",
  "name": "Желатаздр",
  "school": "hex",
  "initiative": 12,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: левый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона, а ты берёшь 1 сокровище. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 137,
  "type": "quality",
  "name": "Искрюченный",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Нанеси 1 кубик урона случайному врагу. Замок: затем нанеси 2 урона другому врагу."
 },
 {
  "index": 138,
  "type": "quality",
  "name": "Люцифартовый",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Каждый враг бросает кубик. Колдун(ы) с наибольшим результатом получает(ют) 1 литр крови и отхватывает(ют) столько урона, сколько у него (них) выпало. Замок: каждый другой враг отхватывает столько урона, сколько у него выпало."
 },
 {
  "index": 139,
  "type": "quality",
  "name": "Продажношкурный",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Возьми 1 сокровище. Каждый враг без сокровищ берёт 1 сокровище. Слей 8 литров крови: затем нанеси 2 урона каждому врагу за каждое сокровище в игре."
 },
 {
  "index": 140,
  "type": "quality",
  "name": "Садистский",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Нанеси 3 урона самому живучему врагу. Если он прикрывается тварью, получи 1 литр крови."
 },
 {
  "index": 141,
  "type": "quality",
  "name": "Отжигающий",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Колдун с замком отхватывает 4 урона. Если ни у кого из живых колдунов нет замка, каждый колдун отхватывает 4 урона. Слей 6 литров крови: колдун с замком отхватывает 8 урона, а затем колдуны слева и справа от него отхватывают по 4 урона."
 },
 {
  "index": 142,
  "type": "quality",
  "name": "Гостинцевый",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Добавь к своему заклинанию приход с руки. Слей 4 литра крови: открывай карты из колоды заклинаний, пока не откроешь тварь. Добавь её к своему заклинанию."
 },
 {
  "index": 143,
  "type": "quality",
  "name": "Пополямный",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Брось 2 кубика. Враг по твоему выбору отхватывает столько урона, сколько выпало на кубике с меньшим результатом. Слей 2 литра крови: нанеси другому врагу столько урона, сколько выпало на оставшемся кубике."
 },
 {
  "index": 144,
  "type": "delivery",
  "name": "Трахангутан",
  "school": "grass",
  "initiative": 8,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: один враг, уже сходивший в этом раунде.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона, а каждый другой враг отхватывает 1 урон. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 145,
  "type": "delivery",
  "name": "Ведьминатор",
  "school": "hex",
  "initiative": 14,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: враг, у которого больше всех крови.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона, и жертва теряет 1 литр крови."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона, и жертва теряет 2 литра крови. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 146,
  "type": "delivery",
  "name": "Гамадрантул",
  "school": "hex",
  "initiative": 17,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: правый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона, а ты получаешь 1 литр крови. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 147,
  "type": "delivery",
  "name": "Маркиз Жиробас",
  "school": "dark",
  "initiative": 13,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Слей 1 литр крови: СТОЯТЬ! Жертва: самый живучий враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона."
   }
  ]
 },
 {
  "index": 148,
  "type": "delivery",
  "name": "Квартет бесов-сутенёров",
  "school": "haze",
  "initiative": 19,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: самый хилый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "каждый враг накручивает 1 жизнь."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "5 урона, а каждый другой враг накручивает 1 жизнь. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 149,
  "type": "delivery",
  "name": "Анус Запеканус",
  "school": "fire",
  "initiative": 9,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: враг, у которого больше всех крови.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 150,
  "type": "delivery",
  "name": "Змей Куриныч",
  "school": "grass",
  "initiative": 10,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: самый живучий враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "СТОЯТЬ!."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона."
   }
  ]
 },
 {
  "index": 151,
  "type": "delivery",
  "name": "Мехатана",
  "school": "dark",
  "initiative": 3,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: самый хилый враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона, а ты отхватываешь 1 урон."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона, а затем нанеси 2 урона самому живучему врагу. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 152,
  "type": "delivery",
  "name": "Пердорыцарь",
  "school": "haze",
  "initiative": 20,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Слей 2 литра крови: можешь по отдельности (и к разным врагам) применить результаты кубиков, брошенных в могучем броске. Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон. СТОЯТЬ!."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона."
   }
  ]
 },
 {
  "index": 153,
  "type": "source",
  "name": "От Яростного Школотрона",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Захвати замок. Если ты забрал его у живого врага, нанеси 3 урона другому врагу."
 },
 {
  "index": 154,
  "type": "source",
  "name": "От Мозгического космососа",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Левый враг либо сдаёт тебе 2 литра крови, либо отхватывает 3 урона. Выбор за ним."
 },
 {
  "index": 155,
  "type": "source",
  "name": "От Знатного Кидалы",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "surprise": true,
  "text": "Брось кубик. 1–2 — захвати замок. 3–4 — возьми 1 сокровище. 5+ — сделай и то и другое. Нежданчик: если ты подох до применения эффектов этой карты, возьми 1 сокровище и сыграй его в начале следующей игры."
 },
 {
  "index": 156,
  "type": "source",
  "name": "От Старика Похабыча",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Нанеси 3 урона левому врагу. Слей 2 литра крови: вместо этого нанеси 3 урона каждому врагу."
 },
 {
  "index": 157,
  "type": "source",
  "name": "От Залёта Нежданного",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Нанеси 2 урона самому живучему врагу. Слей 3 литра крови: добавь к своему заклинанию случайную карту с руки."
 },
 {
  "index": 158,
  "type": "source",
  "name": "От Поплошарки",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Каждый враг, уже сходивший в этом раунде, сдаёт тебе 1 литр крови. Каждый враг, который ещё не ходил, отхватывает 2 урона."
 },
 {
  "index": 159,
  "type": "source",
  "name": "От Полыхающего Принца",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Нанеси 1 урон каждому врагу. Слей 5 литров крови: вместо этого нанеси 5 урона."
 },
 {
  "index": 160,
  "type": "source",
  "name": "От Грибуля Дюка",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "surprise": true,
  "text": "Брось кубик и накрути столько жизней, сколько выпало. Нежданчик: если ты подох до применения эффектов этой карты, сбрось её. У тебя становится ровно 1 жизнь. (Ты не подыхаешь.)"
 },
 {
  "index": 161,
  "type": "source",
  "name": "От Секача с секачом",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Накрути 1 жизнь за каждую тварь в игре. Слей X литров крови: накрути ещё X жизней."
 },
 {
  "index": 162,
  "type": "source",
  "name": "От Братухи Миксухи",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Выбери тип карты (заводила, наворот, приход). Каждый колдун передаёт все карты этого типа с руки соседу слева, а затем отхватывает столько урона, сколько карт получил. Слей 4 литра крови: удвой наносимый урон."
 },
 {
  "index": 163,
  "type": "source",
  "name": "От Вшивы",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Добавь к своему заклинанию 1 карту с руки. Замок: вместо этого добавь 2 карты."
 },
 {
  "index": 164,
  "type": "source",
  "name": "От Ядрочиста",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "surprise": true,
  "text": "Нанеси 2 урона правому врагу. Нежданчик: если ты подох до применения эффектов этой карты, нанеси 1 кубик урона убившему тебя колдуну."
 },
 {
  "index": 165,
  "type": "source",
  "name": "От Демона Боли",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Брось 2 кубика. Результат одного кубика по твоему выбору наносит урон левому врагу. Результат оставшегося — тебе, если только ты не сольёшь 1 литр крови или у тебя нет замка."
 },
 {
  "index": 166,
  "type": "source",
  "name": "От Ацкого Ацтека",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Сдай 1 литр крови (если есть) самому живучему врагу, а затем нанеси ему 1 кубик урона. Замок: затем нанеси 1 кубик урона другому врагу."
 },
 {
  "index": 167,
  "type": "source",
  "name": "От Конницы в пальто",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Нанеси 3 урона самому живучему врагу. Слей 4 литра крови: нанеси 7 урона каждому врагу с медалью недобитого колдуна."
 },
 {
  "index": 168,
  "type": "quality",
  "name": "Урожайный",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Захвати замок и нанеси 1 урон каждому врагу за каждого дохлого колдуна. Если их нет, получи 2 литра крови."
 },
 {
  "index": 169,
  "type": "quality",
  "name": "Шлангующий",
  "school": "hex",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Брось кубик и получи столько литров крови, сколько выпало. Если результат 4 или меньше, самый хилый враг накручивает столько жизней, сколько выпало."
 },
 {
  "index": 170,
  "type": "quality",
  "name": "Фейханальный",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Сбрось с руки 3 или меньше карт без знака травы. Накрути 1 жизнь за каждую сброшенную карту."
 },
 {
  "index": 171,
  "type": "quality",
  "name": "Тычиночный",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Открывай карты из колоды заклинаний, пока не откроешь тварь. Добавь её к своему заклинанию. Замок: вместо этого добавь 2 твари."
 },
 {
  "index": 172,
  "type": "source",
  "name": "От Маши-Доминяши",
  "school": "grass",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Выбери врага. Если он отдаст тебе тварь с руки, добавь её к заклинанию. Если не отдаст, нанеси ему 1 кубик урона."
 },
 {
  "index": 173,
  "type": "source",
  "name": "От Дохлопатры",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "surprise": true,
  "text": "Нанеси 2 урона каждому врагу, уже сходившему в этом раунде. Нежданчик: если ты подох до применения эффектов этой карты, возьми ещё 2 карты дохлых колдунов."
 },
 {
  "index": 174,
  "type": "source",
  "name": "От Запальничка",
  "school": "fire",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Либо захвати замок и нанеси 1 урон каждому врагу, либо нанеси 3 урона врагу без замка. Слей 3 литра крови: сделай и то и другое."
 },
 {
  "index": 175,
  "type": "source",
  "name": "От Пендальфа Сизого",
  "school": "haze",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "surprise": true,
  "text": "Нанеси 1 урон любому врагу. Нежданчик: если ты подох до применения эффектов этой карты и в твоём заклинании есть тварь, открой эту тварь. Она принимает урон на себя. (Ты не подыхаешь.)"
 },
 {
  "index": 176,
  "type": "source",
  "name": "От Труполюба",
  "school": "dark",
  "initiative": null,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "text": "Захвати замок. Слей 1 литр крови: нанеси 2 урона каждому врагу за каждую медаль недобитого колдуна в игре."
 },
 {
  "index": 177,
  "type": "delivery",
  "name": "Кубодемон",
  "school": "fire",
  "initiative": 7,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: самый живучий враг.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "1 кубик урона. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 178,
  "type": "delivery",
  "name": "Мочальник",
  "school": "haze",
  "initiative": 5,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: враг, у которого больше всех крови.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "жертва сдаёт тебе 1 литр крови."
   },
   {
    "from": 5,
    "to": 9,
    "text": "1 урон, и жертва сдаёт тебе 1 литр крови."
   },
   {
    "from": 10,
    "to": null,
    "text": "4 урона, и жертва сдаёт тебе 1 литр крови. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 179,
  "type": "delivery",
  "name": "Жракула",
  "school": "grass",
  "initiative": 13,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: враг с замком.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона, а ты захватываешь замок."
   },
   {
    "from": 10,
    "to": null,
    "text": "5 урона, а ты захватываешь замок. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 180,
  "type": "delivery",
  "name": "Кулак БОГА",
  "school": "hex",
  "initiative": 1,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: враг, у которого больше всех сокровищ.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона, и жертва сбрасывает 1 своё сокровище."
   },
   {
    "from": 10,
    "to": null,
    "text": "7 урона."
   }
  ]
 },
 {
  "index": 181,
  "type": "delivery",
  "name": "Спрутобой",
  "school": "haze",
  "initiative": 16,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: один враг без тварей в игре.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона. СТОЯТЬ!."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона, а ты отжимаешь у жертвы 1 сокровище."
   }
  ]
 },
 {
  "index": 182,
  "type": "delivery",
  "name": "Беломор-Дракон",
  "school": "fire",
  "initiative": 2,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: враг, уже сходивший в этом раунде.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "3 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона. А потом ещё 3 урона каждому врагу с медалью недобитого колдуна. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 183,
  "type": "delivery",
  "name": "Архаровец",
  "school": "fire",
  "initiative": 11,
  "copies": 2,
  "promo": false,
  "set": "castle",
  "creature": true,
  "victim": "Жертва: один враг без замка.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "1 урон."
   },
   {
    "from": 5,
    "to": 9,
    "text": "2 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона (6 урона, если жертва — последний враг). СТОЯТЬ!."
   }
  ]
 }
]

export const TREASURES: TreasureData[] = [
 {
  "index": 0,
  "name": "Пушка-хохотушка",
  "promo": false,
  "text": "В начале своего хода наноси 1 урон левому врагу.",
  "school": null
 },
 {
  "index": 1,
  "name": "Охрен-ионный ранец отрыва",
  "promo": false,
  "text": "У твоих заклинаний +10 к инициативе. Можешь сбросить это сокровище, чтобы сходить в раунде последним.",
  "school": null
 },
 {
  "index": 2,
  "name": "Протонная ловушка",
  "promo": false,
  "text": "Можешь добавить это сокровище к своему заклинанию лицевой стороной вверх. Оно считается «Шальной магией», но не сбрасывается.",
  "school": null
 },
 {
  "index": 3,
  "name": "Сабо лесного властелина",
  "promo": false,
  "text": "Это сокровище считается картой со знаком травы в каждом твоём заклинании.",
  "school": "grass"
 },
 {
  "index": 4,
  "name": "Жгуфли",
  "promo": false,
  "text": "Это сокровище считается картой со знаком угара в каждом твоём заклинании.",
  "school": "fire"
 },
 {
  "index": 5,
  "name": "Зловещие шлепанцы",
  "promo": false,
  "text": "Это сокровище считается картой со знаком мрака в каждом твоём заклинании.",
  "school": "dark"
 },
 {
  "index": 6,
  "name": "Корона пай-мальчика",
  "promo": false,
  "text": "Каждая карта со знаком мрака в заклинании врага наносит этому врагу 1 урон перед применением её эффекта.",
  "school": null
 },
 {
  "index": 7,
  "name": "Труселя госпожи удачи",
  "promo": false,
  "text": "Всякий раз, когда ты бросаешь только один кубик, добавляй 2 к результату.",
  "school": null
 },
 {
  "index": 8,
  "name": "Лифчик госпожи удачи",
  "promo": false,
  "text": "Сбрось это сокровище и перебрось свой могучий бросок. Затем возьми 1 сокровище.",
  "school": null
 },
 {
  "index": 9,
  "name": "Пушка-колотушка",
  "promo": false,
  "text": "Добавляй 1 кубик, когда делаешь могучий бросок по карте прихода.",
  "school": null
 },
 {
  "index": 10,
  "name": "Венец обдолбанного короля",
  "promo": false,
  "text": "Добавляй 1 к результатам своих могучих бросков за каждый уникальный знак в твоём заклинании.",
  "school": null
 },
 {
  "index": 11,
  "name": "Подвязки госпожи удачи",
  "promo": false,
  "text": "Открыв заклинание, состоящее из 2 или менее карт, добавь к нему случайную карту с руки.",
  "school": null
 },
 {
  "index": 12,
  "name": "Руководство по крутизне",
  "promo": false,
  "text": "Ты получаешь +2 к результатам своих могучих бросков.",
  "school": null
 },
 {
  "index": 13,
  "name": "Золото дураков",
  "promo": false,
  "text": "Всякий раз, когда результат вражеского могучего броска — 4 или меньше, накручивай себе 2 жизни.",
  "school": null
 },
 {
  "index": 14,
  "name": "Шлем надмозга",
  "promo": false,
  "text": "Получив это сокровище, возьми 1 карту из колоды. Твой размер руки увеличен на 1.",
  "school": null
 },
 {
  "index": 15,
  "name": "Эмбрионный амулет",
  "promo": false,
  "text": "За каждую 6 (модификаторы не в счёт), выпавшую при твоём могучем броске, накрути себе 1 жизнь.",
  "school": null
 },
 {
  "index": 16,
  "name": "Башмаки скомороха",
  "promo": false,
  "text": "Это сокровище считается картой со знаком кумара в каждом твоём заклинании.",
  "school": "haze"
 },
 {
  "index": 17,
  "name": "Кольцо черепастия",
  "promo": false,
  "text": "Добавляй 2 кубика, когда делаешь могучий бросок по карте наворота.",
  "school": null
 },
 {
  "index": 18,
  "name": "Оно на палочке",
  "promo": false,
  "text": "Добавляй 2 к результатам своих могучих бросков за каждого дохлого колдуна.",
  "school": null
 },
 {
  "index": 19,
  "name": "Трон тормозуна",
  "promo": false,
  "text": "Если ты ходишь последним в раунде, добавляй 1 кубик к каждому своему могучему броску.",
  "school": null
 },
 {
  "index": 20,
  "name": "Справочник читера",
  "promo": false,
  "text": "Сделав могучий бросок, можешь перебросить 1 кубик.",
  "school": null
 },
 {
  "index": 21,
  "name": "50 оттенков свинофермы",
  "promo": false,
  "text": "Если враг играет такую же карту, как и у тебя на руке, можешь сбросить её с руки, чтобы нанести этому врагу 2 урона, а себе накрутить 2 жизни.",
  "school": null
 },
 {
  "index": 22,
  "name": "Булыжнички отчаяния",
  "promo": false,
  "text": "Если у тебя 9 или меньше жизней, добавляй 1 кубик к каждому своему могучему броску.",
  "school": null
 },
 {
  "index": 23,
  "name": "Некрасные мокасины",
  "promo": false,
  "text": "Это сокровище считается картой со знаком порчи в каждом твоём заклинании.",
  "school": "hex"
 },
 {
  "index": 24,
  "name": "Шальной шутовской гульфик",
  "promo": false,
  "text": "Открыв заклинание, состоящее из 1 или нескольких «Шальных магий», накрути 2 жизни и возьми 1 сокровище.",
  "school": null
 },
 {
  "index": 25,
  "name": "Пушка-гоготушка",
  "promo": true,
  "text": "В начале своего хода наноси 1 урон правому врагу.",
  "school": null
 },
 {
  "index": 26,
  "name": "Сатанинский музон",
  "promo": false,
  "text": "Это сокровище также считается тварью со знаком мрака. Жертва: враг по твоему выбору. Могучий бросок: 1–4 — 2 урона. 5–9 — 4 урона. 10+ — 6 уронов, а ты отхватываешь 2 урона. СТОЯТЬ!",
  "school": null,
  "set": "swamp",
  "creature": "dark",
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "4 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "6 уронов, а ты отхватываешь 2 урона. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 27,
  "name": "Руководство Тормозуна",
  "promo": false,
  "text": "Когда ты ходишь последним в раунде, нанеси 1 урон врагу по твоему выбору. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 28,
  "name": "Пушистик из шляпы",
  "promo": false,
  "text": "Это сокровище также считается тварью со знаком порчи. Жертва: враг по твоему выбору. Могучий бросок: 1–4 — 2 урона. 5–9 — 4 урона. 10+ — 3 урона, а ты берёшь 1 сокровище. СТОЯТЬ!",
  "school": null,
  "set": "swamp",
  "creature": "hex",
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "4 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона, а ты берёшь 1 сокровище. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 29,
  "name": "Священный череп Берроуза",
  "promo": false,
  "text": "Раз в свой ход можешь сбросить карту со знаком порчи и взять 1 сокровище, если у тебя не больше 3 сокровищ.",
  "school": null,
  "set": "swamp"
 },
 {
  "index": 30,
  "name": "Священный Черепушкин",
  "promo": false,
  "text": "Раз в свой ход можешь сбросить карту шальной магии и нанести 3 урона каждому врагу.",
  "school": null,
  "set": "swamp"
 },
 {
  "index": 31,
  "name": "Текучий любимый кетчуп",
  "promo": false,
  "text": "Если ты (и только ты) самый хилый колдун в конце раунда, возьми 2 дополнительные карты, когда пополняешь руку. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 32,
  "name": "Священный череп Фрейда",
  "promo": false,
  "text": "Раз в свой ход можешь сбросить карту со знаком угара и нанести 2 урона самому хилому врагу.",
  "school": null,
  "set": "swamp"
 },
 {
  "index": 33,
  "name": "Воображаемая говорящая собака",
  "promo": false,
  "text": "Открыв заклинание из 1 или 2 карт, возьми 1 карту. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 34,
  "name": "Шпанская мушка",
  "promo": false,
  "text": "В начале каждого раунда накрути 1 жизнь за каждую твою тварь в игре. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 35,
  "name": "Джинн-тоник",
  "promo": false,
  "text": "Это сокровище также считается тварью со знаком кумара. Жертва: враг по твоему выбору. Могучий бросок: 1–4 — 2 урона. 5–9 — 4 урона. 10+ — 3 урона, а ты берёшь 3 карты. СТОЯТЬ!",
  "school": null,
  "set": "swamp",
  "creature": "haze",
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "4 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона, а ты берёшь 3 карты. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 36,
  "name": "Пиньята с заначкой",
  "promo": false,
  "text": "Если ты (и только ты) самый хилый колдун в конце раунда, накрути 2 жизни. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 37,
  "name": "Сучковатая сосна",
  "promo": false,
  "text": "Это сокровище также считается тварью со знаком травы. Жертва: враг по твоему выбору. Могучий бросок: 1–4 — 2 урона. 5–9 — 4 урона. 10+ — 3 урона, а ты накручиваешь 3 жизни. СТОЯТЬ!",
  "school": null,
  "set": "swamp",
  "creature": "grass",
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "4 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "3 урона, а ты накручиваешь 3 жизни. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 38,
  "name": "Фекальный шлем",
  "promo": false,
  "text": "Сыграв с руки колдунство, возьми 1 карту. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 39,
  "name": "Голимый голем",
  "promo": false,
  "text": "Это сокровище также считается тварью со знаком угара. Жертва: враг по твоему выбору. Могучий бросок: 1–4 — 2 урона. 5–9 — 4 урона. 10+ — вместо этого 3 урона каждому врагу. СТОЯТЬ!",
  "school": null,
  "set": "swamp",
  "creature": "fire",
  "victim": "Жертва: враг по твоему выбору.",
  "mighty": [
   {
    "from": 1,
    "to": 4,
    "text": "2 урона."
   },
   {
    "from": 5,
    "to": 9,
    "text": "4 урона."
   },
   {
    "from": 10,
    "to": null,
    "text": "вместо этого 3 урона каждому врагу. СТОЯТЬ!."
   }
  ]
 },
 {
  "index": 40,
  "name": "Третий сосок",
  "promo": false,
  "text": "Раз в свой ход можешь взять 1 карту из колоды за каждые 3 одинаковых знака в твоём заклинании. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 41,
  "name": "Сказ об обсоске",
  "promo": false,
  "text": "Если ты (и только ты) самый хилый колдун в конце раунда, нанеси 1 урон каждому врагу. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 42,
  "name": "Нямка Пакмэна",
  "promo": false,
  "text": "Ты получаешь +1 к результатам своих могучих бросков (к общей сумме на кубиках). Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 43,
  "name": "Священный череп Шекспира",
  "promo": false,
  "text": "Раз в свой ход можешь сбросить карту со знаком кумара и нанести 3 урона самому живучему врагу.",
  "school": null,
  "set": "swamp"
 },
 {
  "index": 44,
  "name": "Три поросёнка в яблоках",
  "promo": false,
  "text": "Раз в свой ход можешь накрутить 1 жизнь за каждые 3 одинаковых знака в твоём заклинании. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 45,
  "name": "Проклятый однорукий бандит",
  "promo": false,
  "text": "Раз в свой ход можешь нанести 1 урон врагу по твоему выбору за каждые 3 одинаковых знака в твоём заклинании. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 46,
  "name": "Священный череп По",
  "promo": false,
  "text": "Раз в свой ход можешь сбросить карту со знаком мрака и нанести каждому колдуну 1 урон (включая себя).",
  "school": null,
  "set": "swamp"
 },
 {
  "index": 47,
  "name": "Мешонка",
  "promo": false,
  "text": "У твоих заклинаний +5 к инициативе. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 48,
  "name": "Священный череп Марли",
  "promo": false,
  "text": "Раз в свой ход можешь сбросить карту со знаком травы и накрутить 1 жизнь.",
  "school": null,
  "set": "swamp"
 },
 {
  "index": 49,
  "name": "Рыдван времени",
  "promo": false,
  "text": "Когда ты ходишь первым в раунде, нанеси 1 урон врагу по твоему выбору. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 50,
  "name": "Колода загробной жизни",
  "promo": false,
  "text": "В начале своего хода выбери колдуна (можешь и себя). Этот колдун сбрасывает 1 карту. Вечное.",
  "school": null,
  "set": "swamp",
  "eternal": true
 },
 {
  "index": 51,
  "name": "Волкейк",
  "promo": false,
  "text": "Каждый раз, когда твоя тварь наносит урон могучим броском, добавляй к нему ещё 1 урон.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 52,
  "name": "Список негодников",
  "promo": false,
  "text": "Убивая врага, получай на 1 литр крови больше.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 53,
  "name": "Аварийный тормоз",
  "promo": false,
  "text": "Если ты единственная жертва заклинания врага, можешь слить 3 литра крови и сменить жертву. (Ей не может стать атакующий колдун.)",
  "school": null,
  "set": "castle"
 },
 {
  "index": 54,
  "name": "Полный щит",
  "promo": false,
  "text": "Каждый раз, когда враг берёт карту дохлого колдуна, бросай кубик. Если выпало 5 или 6, накручивай 1 жизнь.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 55,
  "name": "Идол волшебной киски",
  "promo": false,
  "text": "Захвати замок. Получая кровь за замок в конце раунда, получай на 1 литр крови больше.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 56,
  "name": "«Их разыскивает милиция»",
  "promo": false,
  "text": "Выложи это сокровище на середину стола, а затем возьми другое сокровище. Первый колдун, который убьёт врага, получит 3 литра крови и сбросит эту карту.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 57,
  "name": "Демонический прицел",
  "promo": false,
  "text": "Получив это сокровище, нанеси 1 урон каждому колдуну, включая себя. Затем получи 2 литра крови за каждого колдуна с 5 и менее жизнями. Слей 4 литра крови: нанеси 2 урона любому врагу.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 58,
  "name": "Кулон задротного неистовства",
  "promo": false,
  "text": "Слей 3 литра крови: накрути 2 жизни.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 59,
  "name": "Нехреномикон",
  "promo": false,
  "text": "Один раз в каждый свой ход можешь перебросить результат могучего броска, сделанный по карте твари. Прими второй результат, даже если он хуже.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 60,
  "name": "Пятерня шестерней",
  "promo": false,
  "text": "Перебрасывай любые единицы, выпадающие на твоих могучих бросках.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 61,
  "name": "Рыгалия Живоглота",
  "promo": false,
  "text": "Получив это сокровище, выбери заводилу, наворот или приход с руки и подложи под эту карту. Учитывай знак подложенной карты в каждом твоём заклинании.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 62,
  "name": "Диван д-ра Ширинкина",
  "promo": false,
  "text": "Сыграв «Шальную магию», открывай карты, пока не найдёшь 2 карты того типа, который ищешь. Добавь их обе к заклинанию.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 63,
  "name": "Копейки судьбы",
  "promo": false,
  "text": "Получив это сокровище, предскажи, какой колдун подохнет следующим. Если угадаешь, получишь 2 литра крови, даже если предсказал собственную смерть.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 64,
  "name": "Двуглавый пустозвон",
  "promo": false,
  "text": "Если действие твоей карты или атаки направлено влево, можешь сменить направление на право, и наоборот. Если меняешь одно направление на карте, то меняешь их все.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 65,
  "name": "Смогинг",
  "promo": false,
  "text": "Если в конце раунда ты самый хилый колдун (или один из них), накрути 2 жизни и возьми 1 сокровище.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 66,
  "name": "Допинггангер",
  "promo": false,
  "text": "Применив эффекты твари из твоего заклинания, можешь слить 3 литра крови, чтобы не сбрасывать её, а дать ей команду «СТОЯТЬ!».",
  "school": null,
  "set": "castle"
 },
 {
  "index": 67,
  "name": "Гран-при мальчика для битья",
  "promo": false,
  "text": "Если игра закончилась твоей смертью, получи 3 литра крови. Слей 1 литр крови: накрути 1 жизнь (не чаще 1 раза в раунд).",
  "school": null,
  "set": "castle"
 },
 {
  "index": 68,
  "name": "Драгоценные кандалы",
  "promo": false,
  "text": "Если ты ходишь последним в раунде, бери 1 сокровище.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 69,
  "name": "Культовый кишкодав",
  "promo": false,
  "text": "В начале каждого твоего хода один враг по твоему выбору сдаёт тебе 1 литр крови.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 70,
  "name": "Сосиска-бурка",
  "promo": false,
  "text": "Каждый раз, когда ты выбрасываешь на могучем броске 13 или больше, получай 1 литр крови.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 71,
  "name": "Руки-окуни",
  "promo": false,
  "text": "Если ты ходишь первым в раунде, поменяй это сокровище на сокровище любого врага.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 72,
  "name": "Трёхстволка",
  "promo": false,
  "text": "Получи 1 литр крови за каждые 3 одинаковых знака в твоём заклинании.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 73,
  "name": "Пятиконечная глиста",
  "promo": false,
  "text": "Если у тебя ничья при определении инициативы, можешь слить 1 литр крови — ничья разрешается в твою пользу и ты ходишь раньше.",
  "school": null,
  "set": "castle"
 },
 {
  "index": 74,
  "name": "Групповой долбогонг",
  "promo": false,
  "text": "Слей 2 литра крови: нанеси любому врагу 1 урон за каждые 5 его жизней. (Например, если у него 14 жизней, он отхватывает 2 урона.)",
  "school": null,
  "set": "castle"
 },
 {
  "index": 75,
  "name": "Кусачая сфера",
  "promo": false,
  "text": "Слей 2 литра крови: перебрось 1 кубик.",
  "school": null,
  "set": "castle"
 }
]

export const DEAD: DeadData[] = [
 {
  "index": 0,
  "copies": 2,
  "name": "Нектар нирваны",
  "text": "Ты мёртв. Живи с этим."
 },
 {
  "index": 1,
  "copies": 2,
  "name": "Ответочка из преисподней",
  "text": "Нанеси 2 урона одному врагу на свой выбор."
 },
 {
  "index": 2,
  "copies": 3,
  "name": "Шлакошангри-ла",
  "text": "В начале следующей игры положи 1 кубик на свою карту героя. Добавляй его ко всем твоим могучим броскам, сделанным на первом ходу. После этого убери кубик."
 },
 {
  "index": 3,
  "copies": 3,
  "name": "Святарник",
  "text": "Начни следующую игру с 3 дополнительными жизнями."
 },
 {
  "index": 4,
  "copies": 3,
  "name": "Ма-аленькая страна",
  "text": "Набрав начальную руку в следующей игре, добавь на руку ещё 2 карты."
 },
 {
  "index": 5,
  "copies": 3,
  "name": "Пастбище шальных сердиторогов",
  "text": "В конце этой игры найди и отложи в сторону 1 карту «Шальная магия». Набрав начальную руку в следующей игре, добавь на руку «Шальную магию»."
 },
 {
  "index": 6,
  "copies": 4,
  "name": "Космическое мегакоролевство (где-то в небе)",
  "text": "Начинай следующую игру с 2 дополнительными жизнями."
 },
 {
  "index": 7,
  "copies": 5,
  "name": "Посмертный артефакт",
  "text": "В начале следующей игры возьми 1 сокровище."
 },
 {
  "index": 8,
  "copies": 3,
  "name": "Мозголом",
  "text": "Эта карта считается картой со знаком порчи в каждом твоём заклинании во время следующей игры.",
  "set": "swamp",
  "school": "hex"
 },
 {
  "index": 9,
  "copies": 3,
  "name": "Жертва аборта",
  "text": "Эта карта считается картой со знаком мрака в каждом твоём заклинании во время следующей игры.",
  "set": "swamp",
  "school": "dark"
 },
 {
  "index": 10,
  "copies": 3,
  "name": "Зубы на полке",
  "text": "Эта карта считается картой со знаком травы в каждом твоём заклинании во время следующей игры.",
  "set": "swamp",
  "school": "grass"
 },
 {
  "index": 11,
  "copies": 3,
  "name": "Дерьмо вопрос",
  "text": "Прямо сейчас: отожми 1 сокровище у живого колдуна по твоему выбору. Не сбрасывай это сокровище в конце текущей игры.",
  "set": "swamp",
  "school": null
 },
 {
  "index": 12,
  "copies": 3,
  "name": "Гробница абсолютного зла",
  "text": "Набрав начальную руку в следующей игре, открывай карты из колоды заклинаний, пока не найдёшь карту с колдунством. Возьми эту и следующую карты.",
  "set": "swamp",
  "school": null
 },
 {
  "index": 13,
  "copies": 3,
  "name": "Влажный морской волк",
  "text": "Эта карта считается картой со знаком кумара в каждом твоём заклинании во время следующей игры.",
  "set": "swamp",
  "school": "haze"
 },
 {
  "index": 14,
  "copies": 3,
  "name": "Полное дно",
  "text": "Эта карта считается картой со знаком угара в каждом твоём заклинании во время следующей игры.",
  "set": "swamp",
  "school": "fire"
 },
 {
  "index": 15,
  "copies": 4,
  "name": "Трогательные щупальца",
  "text": "Прямо сейчас: возьми 8 карт. Используй только эти 8 карт, чтобы немедленно сыграть все колдунства (если возможно) и применить их эффекты, после чего сбрось все оставшиеся.",
  "set": "swamp",
  "school": null
 },
 {
  "index": 16,
  "copies": 2,
  "name": "Каменный надгробик",
  "text": "Прямо сейчас: захвати замок. Если в конце раунда замок у тебя и ты мёртв, получи 4 литра крови вместо 1.",
  "set": "castle"
 },
 {
  "index": 17,
  "copies": 3,
  "name": "Зверёныш из преисподней",
  "text": "В начале следующей игры открывай карты из колоды заклинаний, пока не найдёшь тварь. Ты начинаешь игру с этой тварью в игре. Сбрось остальные открытые.",
  "set": "castle"
 },
 {
  "index": 18,
  "copies": 3,
  "name": "Простые радости",
  "text": "Прямо сейчас: получи 1 литр крови за каждую медаль недобитого колдуна в игре. Если у тебя нет медали, начни следующую игру с 1 сокровищем.",
  "set": "castle"
 },
 {
  "index": 19,
  "copies": 3,
  "name": "Оттянутое проклятие",
  "text": "В начале следующей игры на руке колдуна, который получит в текущей игре медаль недобитого колдуна, будет на 2 карты меньше.",
  "set": "castle"
 },
 {
  "index": 20,
  "copies": 3,
  "name": "Грозовой беспредел",
  "text": "Перед тем как применить эффекты своего первого заклинания в следующей игре, добавь к нему верхнюю карту из колоды заклинаний. Если это «Шальная магия», возьми её на руку и добавь следующую карту.",
  "set": "castle"
 },
 {
  "index": 21,
  "copies": 3,
  "name": "Отжимание крови",
  "text": "Прямо сейчас: каждый живой колдун сдаёт тебе 1 литр крови.",
  "set": "castle"
 },
 {
  "index": 22,
  "copies": 4,
  "name": "Эрозия металла",
  "text": "Прямо сейчас: получи 2 литра крови. Если ты был первый, кого убили в текущей игре, получи ещё 2 литра.",
  "set": "castle"
 },
 {
  "index": 23,
  "copies": 4,
  "name": "Плётка госпожи",
  "text": "Держи эту карту перед собой, пока не сделаешь могучий бросок по карте твари. Добавь к этому броску 1 кубик.",
  "set": "castle"
 }
]
