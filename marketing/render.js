// Rend une vidéo MP4 (1080x1920, 30 i/s) image par image avec Chrome, puis l'encode avec ffmpeg.
//
//   node render.js videos/01-la-peur-de-parler.json   -> out/01-la-peur-de-parler.mp4
//   node render.js --all                              -> toutes les vidéos de videos/
//   node render.js templates/brand-film.html --duration 15   -> out/brand-film.mp4
//   node render.js videos/xx.json --still 2.5         -> out/xx_2.5.png (image seule, pour vérifier)
//
// Chrome : variable CHROME_PATH, sinon le Chrome de macOS. Les polices viennent de Google Fonts (réseau requis).
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const puppeteer = require('puppeteer-core')
const ffmpeg = require('ffmpeg-static')

const ROOT = __dirname
const FPS = 30
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

function arg(name) {
  const i = process.argv.indexOf(name)
  return i === -1 ? null : process.argv[i + 1]
}

async function renderOne(browser, input, { still, duration }) {
  const isSpec = input.endsWith('.json')
  const name = path.basename(input).replace(/\.(json|html)$/, '')
  let spec = null
  let page_file = path.join(ROOT, 'templates', isSpec ? 'engine.html' : path.basename(input))
  if (!isSpec) page_file = path.resolve(ROOT, input)
  if (isSpec) {
    spec = JSON.parse(fs.readFileSync(path.resolve(ROOT, input), 'utf8'))
    // Les images sont données depuis la racine du dépôt : on les rend absolues pour le navigateur.
    for (const sc of spec.scenes) {
      if (sc.image) sc.image = 'file://' + path.resolve(ROOT, '..', sc.image)
    }
    duration = spec.scenes[spec.scenes.length - 1].to
  }
  duration = duration || 15

  const page = await browser.newPage()
  await page.setViewport({ width: 1080, height: 1920 })
  await page.goto('file://' + page_file, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  if (spec) await page.evaluate((s) => window.setup(s), spec)
  // Google Fonts ne charge une police que quand du texte l'utilise : on la demande
  // explicitement (français et arabe), sinon les premières images sortent en police de secours.
  await page.evaluate(() => Promise.all([
    document.fonts.load('700 100px "Space Grotesk"', 'Takalam éàç'),
    document.fonts.load('600 100px "Space Grotesk"', 'Takalam éàç'),
    document.fonts.load('600 40px "Hanken Grotesk"', 'Takalam éàç'),
    document.fonts.load('500 40px "Hanken Grotesk"', 'Takalam éàç'),
    document.fonts.load('500 100px "Reem Kufi"', 'تكلّم'),
    document.fonts.load('400 100px "Noto Naskh Arabic"', 'أريد قهوة'),
  ]).then(() => document.fonts.ready))

  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true })
  if (still != null) {
    await page.evaluate((t) => window.render(t), Number(still))
    const file = path.join(ROOT, 'out', `${name}_${still}.png`)
    await page.screenshot({ path: file })
    console.log('image :', file)
    await page.close()
    return
  }

  const outFile = path.join(ROOT, 'out', `${name}.mp4`)
  const enc = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', outFile],
    { stdio: ['pipe', 'ignore', 'inherit'] })
  const done = new Promise((r) => enc.on('close', r))
  for (let f = 0; f < FPS * duration; f++) {
    await page.evaluate((t) => window.render(t), f / FPS)
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 })
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r))
  }
  enc.stdin.end()
  await done
  await page.close()
  console.log('vidéo :', outFile)
}

;(async () => {
  const args = process.argv.slice(2)
  const inputs = args.includes('--all')
    ? fs.readdirSync(path.join(ROOT, 'videos')).filter((f) => f.endsWith('.json')).sort().map((f) => path.join('videos', f))
    : args.filter((a, i) => !a.startsWith('--') && !['--still', '--duration'].includes(args[i - 1]))
  if (!inputs.length) {
    console.error('Usage : node render.js <videos/xx.json | templates/xx.html | --all> [--still <secondes>] [--duration <s>]')
    process.exit(1)
  }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] })
  try {
    for (const input of inputs) {
      await renderOne(browser, input, { still: arg('--still'), duration: arg('--duration') && Number(arg('--duration')) })
    }
  } finally {
    await browser.close()
  }
})()
