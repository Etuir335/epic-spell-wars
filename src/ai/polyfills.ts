// Web Worker не получает общие полифилы сборки. Старый Edge 18 (Telegram Desktop без WebView2) не знает at() и flatMap().
/* eslint-disable no-extend-native */
const A = Array.prototype as unknown as Record<string, unknown>
if (!A.at) A.at = function (this: unknown[], i: number) { const n = Math.trunc(i) || 0; return this[n < 0 ? this.length + n : n] }
if (!A.flatMap) A.flatMap = function (this: unknown[], f: (x: unknown, i: number, a: unknown[]) => unknown) {
  const out: unknown[] = []
  this.forEach((x, i, a) => { const r = f(x, i, a); if (Array.isArray(r)) out.push(...r); else out.push(r) })
  return out
}
export {}
