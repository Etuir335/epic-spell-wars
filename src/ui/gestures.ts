// Свайпы с телефона: шторку снизу (.sheet) и увеличенную карту (.zoom) тянем вниз — закрываются;
// в шторке с кнопками data-swipe="prev|next" листаем влево/вправо.
import { uiSfx } from './sound'

let start: { x: number; y: number; t: number; el: HTMLElement; back: HTMLElement; axis: '' | 'x' | 'y' } | null = null

document.addEventListener('touchstart', e => {
  const tgt = e.target as HTMLElement
  const el = tgt.closest<HTMLElement>('.sheet, .zoom')
  if (!el || e.touches.length > 1) return
  const back = el.classList.contains('zoom') ? el : el.closest<HTMLElement>('.sheet-back')
  // обязательные вопросы (.q) и обучение не закрываем
  if (!back || back.matches('.q, .tut-back')) return
  // внутри прокрутки, которую ещё можно крутить вверх, — не мешаем
  const sc = tgt.closest<HTMLElement>('.sheet')
  if (sc && sc.scrollTop > 0) return
  start = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now(), el, back, axis: '' }
}, { passive: true })

document.addEventListener('touchmove', e => {
  if (!start) return
  const dx = e.touches[0].clientX - start.x, dy = e.touches[0].clientY - start.y
  if (!start.axis) {
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
    start.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x'
    if (start.axis === 'y' && dy < 0) { start = null; return } // вверх — обычная прокрутка
    if (start.axis === 'x' && !start.el.querySelector('[data-swipe]')) { start = null; return }
  }
  if (start.axis === 'y') { start.el.style.transition = 'none'; start.el.style.transform = `translateY(${Math.max(0, dy)}px)` }
  else start.el.style.transform = `translateX(${dx * 0.4}px)`
  if (e.cancelable) e.preventDefault()
}, { passive: false })

document.addEventListener('touchend', e => {
  if (!start) return
  const s = start; start = null
  const t = e.changedTouches[0], dx = t.clientX - s.x, dy = t.clientY - s.y
  const fast = (performance.now() - s.t) < 250
  const reset = () => { s.el.style.transition = 'transform .2s ease-out'; s.el.style.transform = '' }
  if (s.axis === 'y' && (dy > 120 || (fast && dy > 50))) {
    s.el.style.transition = 'transform .18s ease-in'; s.el.style.transform = 'translateY(100%)'
    setTimeout(() => s.back.click(), 160)
    setTimeout(() => { if (s.el.isConnected) reset() }, 400) // окно не закрылось — вернуть на место
  } else if (s.axis === 'x' && (Math.abs(dx) > 70 || (fast && Math.abs(dx) > 35))) {
    s.el.querySelector<HTMLElement>(`[data-swipe="${dx < 0 ? 'next' : 'prev'}"]`)?.click()
    uiSfx.swipe(); reset()
  } else reset()
})
