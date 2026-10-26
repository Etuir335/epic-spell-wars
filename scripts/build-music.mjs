// Музыка: materials/music/* (mp3, ogg, m4a, wav, flac, opus) → public/assets/music/NN.m4a (AAC 128 кбит/с) + playlist.json.
// Название песни — из тегов файла (артист — название), иначе из имени файла. Порядок — по имени файла.
// Запуск: node scripts/build-music.mjs
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const FFMPEG = [
  'C:/Users/Rober_ol/AppData/Local/CapCut/Apps/3.9.1.1489/ffmpeg.exe',
  'ffmpeg',
].find(p => { try { execFileSync(p, ['-version'], { stdio: 'ignore' }); return true } catch { return false } })
if (!FFMPEG) throw new Error('Не найден ffmpeg')

const SRC = process.env.MUSIC_SRC ?? 'materials/music', OUT = 'public/assets/music'
const files = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter(f => /\.(mp3|ogg|m4a|wav|flac|opus|aac)$/i.test(f)).sort((a, b) => a.localeCompare(b, 'ru')) : []
if (!files.length) { console.log(`Нет файлов в ${SRC}`); process.exit(0) }
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })

function tags(file) {
  // ffmpeg пишет метаданные в stderr: «title : …», «artist : …»
  let err = ''
  try { execFileSync(FFMPEG, ['-hide_banner', '-i', file], { stdio: ['ignore', 'ignore', 'pipe'] }) } catch (e) { err = String(e.stderr ?? '') }
  const get = k => (err.match(new RegExp(`^\\s*${k}\\s*:\\s*(.+)$`, 'mi')) || [])[1]?.trim()
  return { title: get('title'), artist: get('artist') }
}

const playlist = files.map((f, i) => {
  const src = path.join(SRC, f)
  const out = `${String(i + 1).padStart(2, '0')}.m4a`
  const { title, artist } = tags(src)
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vn', '-map_metadata', '-1', '-ac', '2', '-ar', '44100', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', path.join(OUT, out)])
  const name = title ? (artist ? `${artist} — ${title}` : title) : f.replace(/\.[^.]+$/, '').replace(/^\d+[\s._-]*/, '')
  console.log(`${out}  ${name}`)
  return { file: out, title: name }
})
fs.writeFileSync(path.join(OUT, 'playlist.json'), JSON.stringify(playlist, null, 1))
console.log(`Готово: ${playlist.length} песен`)
