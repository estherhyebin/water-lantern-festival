const CHARS = '古池や蛙飛び込む水の音'
const CREAM = { r: 255, g: 241, b: 206 }

export { CHARS, CREAM }

export function drawRipple(p, ripple, others) {
  const radius =
    ripple.radius ??
    Math.max(8, ripple.t * ripple.maxRadius)

  const fadeStart = ripple.fadeStart ?? 0.84
  const fadeSpan = Math.max(0.04, 1 - fadeStart)
  const fadeIn = Math.min(ripple.t * 5, 1)
  const fadeOut =
    ripple.t < fadeStart
      ? 1
      : 1 - (ripple.t - fadeStart) / fadeSpan
  const opacity = ripple.hold
    ? 90
    : (ripple.opacity ?? 165) * fadeIn * fadeOut

  const ringCount = 5
  const ringSpacing = Math.max(5, radius * 0.5)

  for (let ring = 0; ring < ringCount; ring += 1) {
    const r = radius - ring * ringSpacing
    if (r <= 7) continue

    const ringOpacity =
      opacity * [1, 0.58, 0.28][ring]

    drawWaterRing(
      p,
      ripple,
      r,
      r * ripple.flatten,
      ringOpacity,
      ring,
      others,
    )
  }
}

function interfere(p, x, y, ripple, others) {
  let ox = 0
  let oy = 0
  let glow = 1

  for (const other of others) {
    if (other === ripple) continue

    const dx = x - other.x
    const dy =
      (y - other.y) / Math.max(other.flatten, 0.08)
    const dist = Math.hypot(dx, dy)
    if (dist < 1) continue

    const band = Math.abs(dist - other.radius)
    const width = 30
    if (band >= width) continue

    const crest = 1 - band / width
    const push =
      crest *
      crest *
      8 *
      p.sin(dist * 0.08 + p.frameCount * 0.035)

    ox += (dx / dist) * push
    oy += (dy / dist) * push * other.flatten
    glow += crest * 0.25
  }

  return { x: x + ox, y: y + oy, glow }
}

function drawWaterRing(p, ripple, rx, ry, opacity, ring, others) {
  const detail = 22

  for (let i = 0; i < detail; i += 1) {
    const angle = (p.TWO_PI * i) / detail
    const distortion =
      p.sin(
        angle * 3 +
          p.frameCount * 0.01 +
          ring * 0.8 +
          ripple.seed,
      ) *
        0.9 +
      p.sin(
        angle * 5 -
          p.frameCount * 0.007 +
          ripple.seed * 0.15,
      ) *
        0.45

    const baseX = ripple.x + p.cos(angle) * (rx + distortion)
    const baseY =
      ripple.y + p.sin(angle) * (ry + distortion * 0.12)

    const point = interfere(p, baseX, baseY, ripple, others || [])
    const char = CHARS[(i + ring * 3) % CHARS.length]
    const shimmer = p.sin(
      p.frameCount * 0.025 - i * 0.28 + ring + ripple.seed,
    )
    const shimmerBrightness = p.map(shimmer, -1, 1, 0.7, 1)
    const positionFade = p.map(Math.abs(p.sin(angle)), 0, 1, 0.95, 0.55)
    const brightness =
      shimmerBrightness * positionFade * Math.min(point.glow, 1.25)

    p.fill(CREAM.r, CREAM.g, CREAM.b, opacity * brightness)
    p.text(char, point.x, point.y)
  }
}
