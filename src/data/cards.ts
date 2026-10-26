// СГЕНЕРИРОВАНО scripts/build-data.mjs из transcript/*.md — правьте расшифровку и перезапускайте.
// Картинка карты: assets/cards/<колода>/<index>.webp

export type School = 'grass' | 'hex' | 'haze' | 'dark' | 'fire'
export type SpellType = 'source' | 'quality' | 'delivery' | 'wild'
export interface MightyTier { from: number; to: number | null; text: string }
export interface SpellData {
  index: number; type: SpellType; name: string; school: School | null; initiative: number | null
  copies: number; promo: boolean
  text?: string; victim?: string; mighty?: MightyTier[]
}
export interface TreasureData { index: number; name: string; promo: boolean; text: string; school: School | null }
export interface DeadData { index: number; copies: number; name: string; text: string }

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
 }
]
