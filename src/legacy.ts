// Заглушки для старого Edge 18 (Telegram Desktop без WebView2). Синтаксис и стандартные функции закрывает сборка
// (@vitejs/plugin-legacy), а здесь — то, чего полифилы сборки не дают.

// Web Animations (el.animate) нет: эффекты не анимируем, но onfinish вызываем вовремя — чтобы вспышки убирались.
if (typeof Element !== 'undefined' && !Element.prototype.animate) {
  Element.prototype.animate = function (_frames: unknown, opts?: number | KeyframeAnimationOptions) {
    const ms = typeof opts === 'number' ? opts : Number(opts?.duration) || 0
    const a = { onfinish: null as null | (() => void), cancel() { clearTimeout(t) }, finished: null as unknown }
    const t = setTimeout(() => a.onfinish?.(), ms)
    a.finished = new Promise(r => setTimeout(r, ms))
    return a as unknown as Animation
  }
}
export {}
