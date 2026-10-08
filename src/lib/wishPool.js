export const ACTIVE_WISH_COUNT = 6
export const WISH_GAP = 16

export function durationForLane(lane, extra = 0) {
  return 28000 + lane * 3200 + extra
}

export function normalizeWishText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[.!?…]+$/g, '')
    .trim()
}

export function pickNextWish(pool, usedIds, usedTexts = new Set()) {
  if (!pool.length) return null
  const source = pool.filter((wish) => {
    if (usedIds.has(wish.id)) return false
    return !usedTexts.has(normalizeWishText(wish.text))
  })
  if (!source.length) return null
  return source[Math.floor(Math.random() * source.length)]
}

export function makeSlot(wish, lane, { progress = 0, extraDuration = 0 } = {}) {
  const duration = durationForLane(lane, extraDuration)
  return {
    key: `${wish.id}-${lane}-${Math.round(progress * 1000)}-${duration}`,
    wish,
    lane,
    duration,
    startedAt: performance.now() - progress * duration,
  }
}

export function seedSlots(pool) {
  const count = Math.min(ACTIVE_WISH_COUNT, Math.max(pool.length, 0))
  const slots = []
  const usedIds = new Set()
  const usedTexts = new Set()
  const preferred = [
    ...pool.filter((wish) => wish.sample),
    ...pool.filter((wish) => !wish.sample),
  ]
  for (let lane = 0; lane < count; lane += 1) {
    const wish =
      preferred.find(
        (item) =>
          !usedIds.has(item.id) && !usedTexts.has(normalizeWishText(item.text)),
      ) || pickNextWish(pool, usedIds, usedTexts)
    if (!wish) break
    usedIds.add(wish.id)
    usedTexts.add(normalizeWishText(wish.text))
    const progress = 0.08 + ((lane * 0.11) % 0.42)
    const extraDuration = (lane % 3) * 1800
    slots.push(makeSlot(wish, lane, { progress, extraDuration }))
  }
  return slots
}

export function mergeWish(pool, wish) {
  if (!wish?.id) return pool
  const without = pool.filter((item) => item.id !== wish.id)
  return [wish, ...without]
}

export function topsForLanes(fieldHeight, laneCount = ACTIVE_WISH_COUNT, gap = WISH_GAP) {
  const count = Math.max(1, laneCount)
  const usable = Math.max(0, fieldHeight - gap)
  const band = usable / count
  return Array.from({ length: count }, (_, lane) => gap + lane * band)
}

export const WISH_BASE_OPACITY = 0.62

export function opacityForProgress(progress) {
  const fade = progress <= 0.58 ? 1 : Math.max(0, 1 - (progress - 0.58) / 0.42)
  return fade * WISH_BASE_OPACITY
}

export function overlapCover(wish, zone) {
  if (!zone) return 0
  const overlapX = Math.min(wish.right, zone.right) - Math.max(wish.left, zone.left)
  const overlapY = Math.min(wish.bottom, zone.bottom) - Math.max(wish.top, zone.top)
  if (overlapX <= 0 || overlapY <= 0) return 0
  return Math.min(1, overlapX / Math.max(wish.width, 1))
}
