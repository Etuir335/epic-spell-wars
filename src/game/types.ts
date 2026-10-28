// Состояние партии (турнира) и действия. Всё — простые данные (JSON), чтобы класть в один документ Firestore.
import type { School, SpellType } from '../data/cards.ts'

// Экземпляр карты заклинания: индекс*10 + копия (spellIndex = floor(id/10)). Сокровище — его индекс. Дохлый — индекс*10 + копия.
export type CardId = number
export const TRAP = -1 // «Протонная ловушка», выложенная в заклинание

export interface SpellCard {
  id: CardId // TRAP — ловушка (считается «Шальной магией», не сбрасывается)
  slot: Exclude<SpellType, 'wild'> // место в заклинании (тип, который заменяет «Шальная магия»)
  on?: boolean // карта объявлена (следующий шаг применит её эффект)
  done?: boolean // эффект применён
  from?: string // откуда пришла карта (для журнала): 'wild' | 'added' | 'stolen' | 'creature'
  stay?: boolean // тварь получила «СТОЯТЬ!» — останется в игре после хода
}

// Безумные правила испытания дня и боссы
export type Mod = 'wild' | 'reverse' | 'blood' | 'swap' | 'dice' | 'zombie' | 'greedy' | 'fever' | 'mirror'
export type BossKind = 'grandpa' | 'slime' | 'mirror'
// Наборы карт: база «Битва на горе Черепламени» и дополнения
export type CardSet = 'base' | 'swamp'

export interface PlayerState {
  id: number // место за столом по часовой стрелке; левый враг — следующий живой по возрастанию
  name: string
  portrait: number // 0..40 — планшет колдуна
  bot?: number // 1..3 — уровень бота
  uid?: string // сетевая игра: чьё это место (анонимный uid Firebase)
  away?: 'left' | 'afk' // сетевая игра: место занял бот — игрок ушёл или пропустил подряд 3 хода (afk может вернуться)
  skips?: number // сетевая игра: ходов подряд пропущено по таймеру
  boss?: BossKind // босс испытания дня
  slimes?: number // «Король Слизней»: сколько слизняков отпочковалось
  life: number
  alive: boolean
  hand: CardId[]
  treasures: number[]
  deadCards: CardId[] // карты дохлого колдуна, полученные в этой игре (применяются после игры)
  medals: number
  // раунд
  spell: SpellCard[] | null // выложенное заклинание (null — ещё не выложил)
  goLast?: boolean // сбросил «Ранец отрыва», чтобы ходить последним
  acted: boolean
  tieRoll?: number // бросок для ничьей по инициативе
  extraDice: number // «От Мордоеда» — +кубики к могучим броскам в этом раунде
  firstTurnDie?: boolean // «Шлакошангри-ла» — +1 кубик на первом ходу игры
  reservedWild?: CardId[] // «Пастбище шальных сердиторогов» — отложенные «Шальные магии»
  // «Мессиво на грибучем болоте»
  creatures?: CardId[] // твари в игре (остались после «СТОЯТЬ!»)
  deadSigns?: School[] // знаки с карт дохлых колдунов прошлой игры
  keep?: number[] // сокровища, которые не сбрасываются в конце этой игры («Дерьмо вопрос»)
  extraDraw?: number // «Текучий любимый кетчуп»: сколько лишних карт добрать
}

export interface TurnState {
  actor: number
  stage: 'start' | 'reveal' | 'cards' | 'end'
  hadWild: boolean // в заклинании была «Шальная магия» (для Ахалая и гульфика)
  deliveryAll: boolean // «Шерочка с Машерочкой»: жертвы прихода — все враги
  allStay?: boolean // «От Рюмкенштильцхена»: все твари в этот ход получают «СТОЯТЬ!»
  usedT?: number[] // сокровища «раз в свой ход», уже применённые
  sorcHand?: string // рука, при которой колдунство уже предлагали
  first?: boolean // ходит первым в раунде
  creaturesDone?: boolean // сокровища-твари уже сработали
}

export interface QOption { v: number | string; label: string; card?: { deck: 'spells' | 'treasures' | 'dead'; index: number }; player?: number }
export interface Question {
  player: number // кто отвечает
  prompt: string
  options: QOption[]
  optional?: boolean // можно отказаться (ответ null)
}
export interface Pending extends Question {
  answers: (number | string | null)[] // уже данные ответы в этом шаге
  base: string // JSON состояния до шага — шаг перезапускается с ответами
}

// События для анимаций (идут вперемешку со строками журнала, по порядку).
export type Ev =
  | { k: 'log'; t: string }
  | { k: 'game'; n: number }
  | { k: 'round'; n: number }
  | { k: 'built'; counts: number[] } // число карт в заклинании (−1 — мёртв)
  | { k: 'turn'; p: number; n: number }
  | { k: 'reveal'; p: number; cards: CardId[] }
  | { k: 'wild'; p: number; from: CardId; to: CardId | null }
  | { k: 'add'; p: number; id: CardId }
  | { k: 'card'; p: number; id: CardId }
  | { k: 'roll'; p: number; dice: number[]; bonus: number; total: number; label: string; card?: number }
  | { k: 'dmg'; p: number; n: number; from: number | null; before: number; after: number }
  | { k: 'heal'; p: number; n: number; before: number; after: number }
  | { k: 'death'; p: number }
  | { k: 'treasure'; p: number; t: number; from?: number }
  | { k: 'lose'; p: number; t: number }
  | { k: 'dead'; p: number; c: CardId }
  | { k: 'end'; p: number }
  | { k: 'over'; winner: number; champion: boolean; tr?: number[][] } // tr — сокровища до сброса в конце игры (для показа)

export interface TurnRecord { game: number; round: number; actor: number; cards: CardId[]; at: number }

export interface Roll { player: number; dice: number[]; bonus: number; total: number; label: string }

export interface GameState {
  rng: number
  mods?: Mod[] // безумные правила (испытание дня)
  hits?: number // «Отражающий щит»: счётчик ударов
  mirrorOf?: { index: number; slot: string }[] // «Зеркальный ты»: прошлое заклинание человека
  sets?: CardSet[] // наборы карт (нет — только база)
  tid?: number // номер турнира (начальный seed) — чтобы статистика не считала одни события дважды
  // start — подготовка новой игры (карты дохлых колдунов), build — выкладывают заклинания,
  // resolve — ходы, gameover — игра окончена (ждём nextGame), tournament — турнир окончен
  phase: 'start' | 'build' | 'resolve' | 'gameover' | 'tournament'
  game: number // номер игры в турнире
  round: number
  medalsToWin: number
  players: PlayerState[]
  deck: CardId[]
  discard: CardId[]
  treasureDeck: number[]
  treasureDiscard: number[]
  deadDeck: CardId[]
  deadDiscard: CardId[]
  turn: TurnState | null
  pending: Pending | null
  lastWinner: number | null // победитель последней игры (-1 — никто)
  lastRoll: Roll | null
  log: string[]
  logBase: number // сколько строк журнала уже выброшено (абсолютный номер строки = logBase + индекс)
  ev: Ev[] // последние события (абсолютный номер = evBase + индекс)
  evBase: number
  turns: TurnRecord[] // последние ходы: кто что открыл (для проигрывания в интерфейсе)
  seq: number // номер изменения (для сети)
}

export interface SetupPlayer { name: string; portrait: number; bot?: number; uid?: string; boss?: BossKind }

export type Action =
  | { type: 'submit'; player: number; cards: { id: CardId; slot: Exclude<SpellType, 'wild'> }[]; goLast?: boolean }
  | { type: 'choose'; player: number; value: number | string | null }
  | { type: 'nextGame' }
  // сетевая игра: время на ход вышло (хост) — заклинание не выложено / ответ выбран случайно
  | { type: 'skip'; player: number }
  // сетевая игра: место занимает бот (игрок ушёл / пропал) или игрок возвращается (bot: null)
  | { type: 'seat'; player: number; bot: number | null; away?: 'left' | 'afk' }

export type { School, SpellType }
