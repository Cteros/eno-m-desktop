const themeColorCache = new Map<string, string>()

function getAverageColor(data: Uint8ClampedArray) {
  let r = 0
  let g = 0
  let b = 0
  let count = 0

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]
    if (alpha < 128)
      continue

    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    count += 1
  }

  if (!count)
    return null

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count),
  }
}

async function extractThemeColor(imageUrl: string, fallback: string) {
  try {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.decoding = 'async'
    img.src = imageUrl

    if (img.decode) {
      await img.decode()
    } else {
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })
    }

    const width = img.naturalWidth || img.width
    const height = img.naturalHeight || img.height
    if (!width || !height)
      return fallback

    const maxSize = 64
    const scale = Math.min(1, maxSize / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx)
      return fallback

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const avg = getAverageColor(data)
    if (!avg)
      return fallback

    return `rgb(${avg.r}, ${avg.g}, ${avg.b})`
  } catch (error) {
    console.error('Failed to extract theme color:', error)
    return fallback
  }
}

export function useImageThemeColor() {
  let requestId = 0

  async function getColor(imageUrl: string | undefined | null, fallback = '#404040') {
    if (!imageUrl)
      return fallback

    if (themeColorCache.has(imageUrl))
      return themeColorCache.get(imageUrl)

    const currentId = ++requestId
    const color = await extractThemeColor(imageUrl, fallback)
    if (currentId !== requestId)
      return null

    themeColorCache.set(imageUrl, color)
    return color
  }

  return {
    getColor,
  }
}
