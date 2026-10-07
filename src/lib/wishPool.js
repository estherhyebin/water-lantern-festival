export const ACTIVE_WISH_COUNT = 6
export const WISH_GAP = 16

export function durationForLane(lane, extra = 0) {
  return 28000 + lane * 3200 + extra
}

export function pickNextWish(pool, activeIds, recentIds) {
  if (!pool.length) return null
  const unused = pool.filter(
    (wish) => !activeIds.has(wish.id) && !recentIds.includes(wish.id),
  )
  const fallback = pool.filter((wish) => !activeIds.has(wish.id))
  const source = unused.length ? unused : fallback.length ? fallback : pool
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
  const used = new Set()
  for (let lane = 0; lane < count; lane += 1) {
    const wish = pickNextWish(pool, used, [])
    if (!wish) break
    used.add(wish.id)
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

export function packWishTops(fieldHeight, heights, gap = WISH_GAP) {
  const count = heights.length
  if (!count) return []
  const sum = heights.reduce((total, height) => total + height, 0)
  const extra = Math.max(0, fieldHeight - sum - gap * (count + 1))
  const spread = extra / (count + 1)
  const tops = []
  let y = gap + spread
  for (let index = 0; index < count; index += 1) {
    if (index > 0) {
      y = Math.max(y, tops[index - 1] + heights[index - 1] + gap)
    }
    tops.push(y)
    y += heights[index] + gap + spread
  }
  return tops
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
