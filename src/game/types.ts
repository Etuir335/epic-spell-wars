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
  from?: string // откуда пришла карта (для журнала): 'wild' | 'added' | 'stolen'
}

export interface PlayerState {
  id: number // место за столом по часовой стрелке; левый враг — следующий живой по возрастанию
  name: string
  portrait: number // 0..40 — планшет колдуна
  bot?: number // 1..3 — уровень бота
  uid?: string // сетевая игра: чьё это место (анонимный uid Firebase)
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
}

export interface TurnState {
  actor: number
  stage: 'start' | 'reveal' | 'cards' | 'end'
  hadWild: boolean // в заклинании была «Шальная магия» (для Ахалая и гульфика)
  deliveryAll: boolean // «Шерочка с Машерочкой»: жертвы прихода — все враги
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
  | { k: 'over'; winner: number; champion: boolean }

export interface TurnRecord { game: number; round: number; actor: number; cards: CardId[]; at: number }

export interface Roll { player: number; dice: number[]; bonus: number; total: number; label: string }

export interface GameState {
  rng: number
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

export interface SetupPlayer { name: string; portrait: number; bot?: number; uid?: string }

export type Action =
  | { type: 'submit'; player: number; cards: { id: CardId; slot: Exclude<SpellType, 'wild'> }[]; goLast?: boolean }
  | { type: 'choose'; player: number; value: number | string | null }
  | { type: 'nextGame' }

export type { School, SpellType }
