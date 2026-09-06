const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas')
const path = require('path')
const fs   = require('fs')

const ASSETS_DIR  = path.join(process.cwd(), 'public', 'asset')
const FONT_PATH   = path.join(ASSETS_DIR, 'fonts', 'TeutonNormal.otf')
const LOBBY_COUNT = 30

const CONFIG = {
  canvas:   { width: 1920, height: 3416 },
  username: {
    a: 2650, b: 2790, c: 727, d: 1319,
    centerX: 1009, fontSize: 85, maxChars: 20,
  },
}

let fontRegistered = false
function loadFont() {
  if (fontRegistered) return
  if (!fs.existsSync(FONT_PATH)) throw new Error('Font TeutonNormal.otf tidak ditemukan')
  GlobalFonts.registerFromPath(FONT_PATH, 'TeutonNormal')
  fontRegistered = true
}

function drawGradientUsername(ctx, username, cfg) {
  const { a, b, c, d, fontSize, maxChars, centerX } = cfg
  const name = String(username || 'Player').slice(0, maxChars)
  const boxW = d - c
  const boxH = b - a
  const cx   = centerX ?? (c + boxW / 2)

  let size = fontSize
  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'

  while (size > 12) {
    ctx.font = `${size}px TeutonNormal`
    if (ctx.measureText(name).width <= boxW) break
    size -= 1
  }

  ctx.font = `${size}px TeutonNormal`
  const centerY = a + boxH / 2
  const textW   = ctx.measureText(name).width
  const gradX1  = cx - textW / 2
  const gradX2  = cx + textW / 2

  const grad = ctx.createLinearGradient(gradX1, centerY, gradX2, centerY)
  grad.addColorStop(0.00, '#FFFDE7')
  grad.addColorStop(0.35, '#FFE57F')
  grad.addColorStop(0.70, '#FFB300')
  grad.addColorStop(1.00, '#FF8F00')

  ctx.save()
  ctx.shadowColor   = 'rgba(0,0,0,0.7)'
  ctx.shadowBlur    = 8
  ctx.shadowOffsetX = 3
  ctx.shadowOffsetY = 4
  ctx.fillStyle = grad
  ctx.fillText(name, cx, centerY)
  ctx.restore()
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { username, lobby } = req.body || {}
  if (!username || !String(username).trim())
    return res.status(400).json({ error: 'Username wajib diisi!' })

  try {
    loadFont()

    const lobbyNum = lobby
      ? Math.max(1, Math.min(Number(lobby), LOBBY_COUNT))
      : Math.floor(Math.random() * LOBBY_COUNT) + 1

    const lobbyPath = path.join(ASSETS_DIR, 'lobby', `${lobbyNum}.jpg`)
    if (!fs.existsSync(lobbyPath))
      return res.status(404).json({ error: `Lobby ${lobbyNum} tidak ditemukan.` })

    const { width, height } = CONFIG.canvas
    const canvas = createCanvas(width, height)
    const ctx    = canvas.getContext('2d')

    const lobbyImg = await loadImage(lobbyPath)
    ctx.drawImage(lobbyImg, 0, 0, width, height)
    drawGradientUsername(ctx, String(username).trim(), CONFIG.username)

    const buffer = await canvas.encode('jpeg', 92)
    const base64 = buffer.toString('base64')

    return res.status(200).json({
      status:   'success',
      username: String(username).trim(),
      lobby:    lobbyNum,
      image:    `data:image/jpeg;base64,${base64}`,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Generate gagal: ' + err.message })
  }
}
