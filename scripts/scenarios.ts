// Точечные проверки правил на подготовленных ситуациях. Запуск: node scripts/scenarios.ts
import { create, reduce, waitingFor } from '../src/game/engine.ts'
import { T } from '../src/game/core.ts'
import { legalActions } from '../src/game/legal.ts'
import type { Action, CardId, GameState } from '../src/game/types.ts'
import { addCups, applyEvents, emptyStats, newTrack } from '../src/stats.ts'
import { cupsFor } from '../src/arenas.ts'

type Slot = 'source' | 'quality' | 'delivery'
let fails = 0
function ok(cond: boolean, name: string, s?: GameState) {
  if (cond) return console.log('  ✓ ' + name)
  fails++
  console.log('  ✗ ' + name)
  if (s) console.log(s.log.slice(-12).map(l => '      ' + l).join('\n'))
}
const game = (n: number) => create(Array.from({ length: n }, (_, i) => ({ name: 'И' + i, portrait: i })), 7)

// Найти экземпляр карты с индексом idx (где угодно, кроме рук игроков из except) и вынуть его.
function take(s: GameState, idx: number): CardId {
  for (const pile of [s.deck, s.discard, ...s.players.map(p => p.hand)]) {
    const i = pile.findIndex(c => Math.floor(c / 10) === idx)
    if (i >= 0) return pile.splice(i, 1)[0]
  }
  throw new Error('нет карты ' + idx)
}
function hand(s: GameState, pid: number, idxs: number[]) {
  const p = s.players[pid]
  s.deck.unshift(...p.hand)
  p.hand = []
  for (const i of idxs) p.hand.push(take(s, i))
}
// Положить карты на верх колоды (первая — самая верхняя).
function top(s: GameState, idxs: number[]) {
  const ids = idxs.map(i => take(s, i))
  s.deck.push(...ids.reverse())
}
const card = (s: GameState, pid: number, idx: number) => s.players[pid].hand.find(c => Math.floor(c / 10) === idx)!
function submit(s: GameState, pid: number, cards: [number, Slot][], extra: Partial<Extract<Action, { type: 'submit' }>> = {}) {
  return reduce(s, { type: 'submit', player: pid, cards: cards.map(([i, slot]) => ({ id: i < 0 ? i : card(s, pid, i), slot })), ...extra })
}
const choose = (s: GameState, v: number | string | null) => reduce(s, { type: 'choose', player: s.pending!.player, value: v })
const turns = (s: GameState) => s.log.filter(l => l.startsWith('▶')).map(l => l.split(' ')[2])

console.log('Очерёдность хода')
{
  let s = game(3)
  hand(s, 0, [4, 35, 7]); hand(s, 1, [51, 23]); hand(s, 2, [62, 3, 12])
  for (const p of s.players) p.life = 25 // чтобы никто не умер
  s = submit(s, 0, [[4, 'source'], [35, 'quality'], [7, 'delivery']])
  s = submit(s, 1, [[51, 'source'], [23, 'delivery']])
  s = submit(s, 2, [[62, 'source'], [3, 'quality'], [12, 'delivery']])
  while (s.pending) s = choose(s, s.pending.options[0].v)
  ok(turns(s).join(',') === 'И1,И2,И0', '2 карты раньше 3; среди 3 — инициатива 20 раньше 19: ' + turns(s).join(','), s)
}
{
  let s = game(2)
  hand(s, 0, [4, 25, 7]); hand(s, 1, [51])
  for (const p of s.players) p.life = 25
  s = submit(s, 0, [[4, 'source'], [25, 'quality'], [7, 'delivery']])
  s = submit(s, 1, [[51, 'source']])
  while (s.pending) s = choose(s, s.pending.options[0].v)
  ok(turns(s)[0] === 'И0', '«Нетерпеливый» ходит первым даже с 3 картами', s)
}

console.log('Могучий бросок')
{
  let s = game(2)
  hand(s, 0, [4, 35, 8]); hand(s, 1, [51])
  s.players[1].life = 25
  s.players[0].treasures.push(s.treasureDeck.splice(s.treasureDeck.indexOf(3), 1)[0]) // Сабо: +знак травы
  s = submit(s, 1, [[51, 'source']])
  s = submit(s, 0, [[4, 'source'], [35, 'quality'], [8, 'delivery']])
  const r = s.log.filter(l => l.includes('«Жмураган»:'))
  ok(r.length === 1 && r[0].split(':')[1].split('=')[0].split('+').length === 4, '3 карты травы + «Сабо» = 4 кубика: ' + r[0], s)
}

console.log('Шальная магия')
{
  let s = game(2)
  hand(s, 0, [0]); hand(s, 1, [51])
  s.players[1].life = 25
  s = submit(s, 1, [[51, 'source']])
  top(s, [30, 9]) // сверху наворот «Опарышный», потом приход «Фонтан молодости»
  s = submit(s, 0, [[0, 'delivery']])
  ok(s.log.some(l => l.includes('превращается в «Фонтан молодости»')), '«Шальная магия» как приход пропускает наворот', s)
  ok(s.discard.some(c => Math.floor(c / 10) === 30) && s.discard.some(c => Math.floor(c / 10) === 0), 'наворот и «Шальная магия» — в сбросе')
  ok(turns(s)[0] === 'И0', 'одна карта ходит раньше (у «Шальной магии» инициатива 0)', s)
}

console.log('Шерочка с Машерочкой')
{
  let s = game(4)
  hand(s, 0, [53, 22]); hand(s, 1, [4]); hand(s, 2, [57]); hand(s, 3, [62])
  for (const i of [1, 2, 3]) { s.players[i].life = 20; s = submit(s, i, [[[4, 57, 62][i - 1], 'source']]) }
  s = submit(s, 0, [[53, 'source'], [22, 'delivery']])
  while (s.pending) s = choose(s, s.pending.options[0].v)
  const hit = [1, 2, 3].filter(i => s.log.some(l => l.startsWith(`И${i} отхватывает`)))
  ok(hit.length === 3, '«Кулак природы» бьёт всех врагов: ' + hit.join(','), s)
}

console.log('Вопросы и ответы')
{
  let s = game(3)
  hand(s, 0, [61]); hand(s, 1, [4]); hand(s, 2, [4])
  s.players[1].life = 25; s.players[2].life = 25
  s = submit(s, 1, [[4, 'source']]); s = submit(s, 2, [[4, 'source']])
  s = submit(s, 0, [[61, 'source']])
  ok(!!s.pending && s.pending.player === 0 && s.pending.options.length === 2, 'Феечка спрашивает цель (2 варианта)', s)
  const before = JSON.stringify(s)
  const a = choose(s, 2), b = choose(JSON.parse(before), 2)
  ok(JSON.stringify(a) === JSON.stringify(b), 'ответ детерминирован (одинаковый результат)')
  ok(a.log.includes('И2 отхватывает 2 ур. (25→23).'), 'урон получил выбранный враг', a)
}

console.log('Смерть, медаль, следующая игра')
{
  let s = game(2)
  hand(s, 0, [51]); hand(s, 1, [4, 35, 9])
  s.players[1].life = 3
  s.players[1].deadCards.push(s.deadDeck.splice(s.deadDeck.findIndex(c => Math.floor(c / 10) === 3), 1)[0]) // Святарник
  s = submit(s, 1, [[4, 'source'], [35, 'quality'], [9, 'delivery']])
  s = submit(s, 0, [[51, 'source']])
  ok(s.phase === 'gameover' && s.players[0].medals === 1 && s.lastWinner === 0, 'И0 убивает И1 и получает медаль', s)
  ok(s.players[1].deadCards.length === 2, 'погибший взял карту дохлого колдуна')
  ok(s.players.every(p => !p.hand.length && !p.treasures.length && !p.spell), 'руки, сокровища и заклинания сброшены')
  s = reduce(s, { type: 'nextGame' })
  ok(s.game === 2 && s.players[1].life >= 23, 'Святарник: +3 жизни в следующей игре: ' + s.players[1].life, s)
  ok(s.players.every(p => p.hand.length >= 8 && !p.deadCards.length), 'новые руки, карты дохлых применены и сброшены')
  ok(s.phase === 'build', 'новая игра ждёт заклинаний')
}
{
  let s = game(2)
  s.players[0].medals = 1
  hand(s, 0, [51]); hand(s, 1, [4, 35, 9]); s.players[1].life = 3
  s = submit(s, 1, [[4, 'source'], [35, 'quality'], [9, 'delivery']])
  s = submit(s, 0, [[51, 'source']])
  ok(s.phase === 'tournament', 'вторая медаль — победа в турнире', s)
}
{
  let s = game(2)
  hand(s, 0, [11]); hand(s, 1, [4, 35, 9])
  s.players[0].life = 1; s.players[1].life = 2
  s = submit(s, 1, [[4, 'source'], [35, 'quality'], [9, 'delivery']])
  s = submit(s, 0, [[11, 'delivery']]) // Самовыпил: ≥2 урона правому, 1 себе
  ok(s.phase === 'gameover' && s.lastWinner === 0, 'убил последнего врага — побеждает, даже если сам при смерти', s)
}

console.log('Сокровища')
{
  let s = game(2)
  hand(s, 0, [51, 23]); hand(s, 1, [4])
  s.players[1].life = 25
  s.players[0].treasures.push(s.treasureDeck.splice(s.treasureDeck.indexOf(T.jetpack), 1)[0])
  s = submit(s, 1, [[4, 'source']])
  s = submit(s, 0, [[51, 'source'], [23, 'delivery']], { goLast: true })
  ok(turns(s).join(',') === 'И1,И0', '«Ранец отрыва»: сбросить и ходить последним', s)
  ok(s.treasureDiscard.includes(T.jetpack), 'ранец в сбросе сокровищ')
}

console.log('Сеть: пропуск хода, бот вместо игрока')
{
  // все, кроме pid, ходят первым допустимым действием, пока не придёт черёд pid (выкладка или вопрос ему)
  const others = (st: GameState, pid: number) => {
    for (let g = 0; g < 500; g++) {
      if (st.phase !== 'build' && !st.pending) return st
      if (st.pending?.player === pid) return st
      const who = st.pending ? st.pending.player : st.players.find(p => p.id !== pid && p.alive && !p.spell)?.id
      if (who == null) return st
      st = reduce(st, legalActions(st, who)[0])
    }
    return st
  }
  const skip = (st: GameState, pid: number) => reduce(st, { type: 'skip', player: pid })
  let s = game(3)
  for (const p of s.players) p.life = 50
  s = others(s, 2)
  s = skip(s, 2)
  ok(s.players[2].skips === 1 && !s.players[2].bot && s.log.some(l => l.includes('ход пропущен')), 'пропуск по таймеру: счётчик 1, в журнале', s)
  ok(!s.log.some(l => l.startsWith('▶ Ходит И2')), 'пропустивший не ходит в этом раунде', s)
  let threw = false
  try { skip(s, 2) } catch { threw = true }
  ok(threw || s.pending?.player === 2, 'дважды за раунд выкладку не пропустить')
  for (let r = 0; r < 6 && !s.players[2].bot; r++) {
    while (s.pending && s.pending.player !== 2) s = reduce(s, legalActions(s, s.pending.player)[0])
    s = others(s, 2)
    if (s.phase === 'build' || s.pending?.player === 2) s = skip(s, 2)
  }
  ok(s.players[2].bot === 2 && s.players[2].away === 'afk', 'после 3 пропусков подряд за игрока играет бот', s)
  s = reduce(s, { type: 'seat', player: 2, bot: null })
  ok(!s.players[2].bot && !s.players[2].away && !s.players[2].skips, 'игрок вернулся — место снова его', s)
  const l = reduce(s, { type: 'seat', player: 1, bot: 2, away: 'left' })
  ok(l.players[1].bot === 2 && l.players[1].away === 'left', 'ушёл — место занял бот', l)
  threw = false
  try { reduce(l, { type: 'seat', player: 1, bot: null }) } catch { threw = true }
  ok(threw, 'ушедший не возвращается')
}
{
  // свой ход сбрасывает счётчик; пропуск вопроса отвечает за игрока и не теряет счётчик при перезапуске шага
  let s = game(3)
  for (const p of s.players) p.life = 50
  s = reduce(s, { type: 'skip', player: 0 })
  let asked = false, reset = false
  for (let g = 0; g < 400 && s.phase !== 'gameover'; g++) {
    if (s.pending) {
      if (s.pending.player === 0 && !asked) {
        const before = s.players[0].skips ?? 0, seq = s.seq
        const t = reduce(s, { type: 'skip', player: 0 })
        ok(t.seq > seq && t.pending?.base !== s.pending.base && (t.players[0].skips ?? 0) === before + 1, 'пропуск вопроса: ответ дан, счётчик +1', t)
        asked = true; s = t; continue
      }
      s = reduce(s, legalActions(s, s.pending.player)[0]); continue
    }
    if (s.phase !== 'build') break
    const who = s.players.find(p => p.alive && !p.spell)!.id
    s = reduce(s, legalActions(s, who)[0])
    if (who === 0 && !reset) { reset = true; ok(!s.players[0].skips, 'свой ход сбрасывает счётчик пропусков', s) }
    if (asked && reset) break
  }
  if (!asked) ok(true, '(вопрос игроку не попался — пропуск вопроса не проверен)')
}

console.log('\nСтатистика: подсчёт по событиям целых турниров')
{
  let r = 777
  const rnd = (n: number) => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r % n }
  let games = 0, wins = 0, champ = 0, deaths = 0, kills = 0, bad = ''
  for (let t = 0; t < 30; t++) {
    const np = 2 + (t % 4)
    let s = create(Array.from({ length: np }, (_, i) => ({ name: 'И' + i, portrait: i })), 500 + t)
    const st = emptyStats(), tr = newTrack(s.tid!, s.evBase)
    const feed = () => { applyEvents(st, tr, s.ev.slice(Math.max(tr.pos, s.evBase) - s.evBase), s, { me: 0, vsHumans: false, strongBots: false }); tr.pos = s.evBase + s.ev.length }
    feed()
    let myWins = 0, myDeaths = 0, othersDead = 0, n = 0
    while (s.phase !== 'tournament' && n++ < 30000) {
      if (s.phase === 'gameover') { if (s.lastWinner === 0) myWins++; s = reduce(s, { type: 'nextGame' }); feed(); continue }
      const pre = s.players.map(p => p.alive)
      const who = waitingFor(s), p = who[rnd(who.length)], acts = legalActions(s, p)
      s = reduce(s, acts[rnd(acts.length)])
      s.players.forEach((q, i) => { if (pre[i] && !q.alive) { if (i === 0) myDeaths++; else othersDead++ } })
      feed()
    }
    if (s.lastWinner === 0) myWins++
    games += st.games; wins += st.wins; champ += st.champion; deaths += st.deaths; kills += st.kills
    if (st.wins !== myWins) bad = `турнир ${t}: медалей ${st.wins}, а побед ${myWins}`
    if (st.deaths !== myDeaths) bad = `турнир ${t}: смертей ${st.deaths}, а на деле ${myDeaths}`
    if (st.kills > othersDead) bad = `турнир ${t}: убийств ${st.kills} больше смертей врагов ${othersDead}`
    if (st.tournaments !== 1) bad = `турнир ${t}: турниров ${st.tournaments}`
  }
  ok(!bad, `медали, смерти, убийства и турниры сходятся с исходом ${bad}`)
  ok(games > 30 && kills > 0, `схваток ${games}, медалей ${wins}, турниров выиграно ${champ}, убийств ${kills}, смертей ${deaths}`)
}

console.log('\nКубки и арены')
{
  ok(cupsFor(1, 2, false) === 40 && cupsFor(2, 2, false) === -5, '1 на 1: победа +40, поражение −5')
  ok(cupsFor(2, 4, false) === 25 && cupsFor(4, 4, false) === -5, 'бой на четверых: 2-е место +25, последнее −5')
  ok(cupsFor(1, 2, true) === 60 && cupsFor(2, 2, true) === -5, 'против живых плюс ×1,5, минус без множителя')
  const st = emptyStats()
  const got = addCups(st, 110)
  ok(st.arena === 1 && got.includes('arena:1'), '110 кубков — вторая арена открылась')
  addCups(st, -50)
  ok(st.cups === 100, 'кубки не падают ниже порога достигнутой арены (100)')
}

console.log(fails ? `\nОШИБОК: ${fails}` : '\nВсё OK')
process.exit(fails ? 1 : 0)
