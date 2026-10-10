import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  fetchApprovedWishes,
  subscribeToApprovedWishes,
} from '../lib/wishesApi.js'
import {
  ACTIVE_WISH_COUNT,
  WISH_GAP,
  makeSlot,
  mergeWish,
  normalizeWishText,
  pickNextWish,
  seedSlots,
  topsForLanes,
} from '../lib/wishPool.js'
import Wish from './Wish.jsx'
import './WishField.css'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function WishField({ incomingWish = null, onStatus }) {
  const [slots, setSlots] = useState([])
  const [reducedMotion, setReducedMotion] = useState(false)
  const fieldRef = useRef(null)
  const poolRef = useRef([])
  const slotsRef = useRef([])
  const pendingRef = useRef([])
  const ignoreRealtimeRef = useRef(new Set())
  const shownIdsRef = useRef(new Set())
  const shownTextsRef = useRef(new Set())
  const [laneLayout, setLaneLayout] = useState({
    tops: topsForLanes(480),
    maxHeight: 64,
  })

  function markShown(wish) {
    if (!wish) return
    shownIdsRef.current.add(wish.id)
    shownTextsRef.current.add(normalizeWishText(wish.text))
  }

  const updateLaneLayout = useCallback(() => {
    const field = fieldRef.current
    if (!field) return
    const height = field.clientHeight
    if (height <= 0) return
    setLaneLayout({
      tops: topsForLanes(height),
      maxHeight: Math.max(36, height / ACTIVE_WISH_COUNT - WISH_GAP),
    })
  }, [])

  useEffect(() => {
    const field = fieldRef.current
    const label = document.getElementById('wish-label')
    if (!field || !label) return undefined

    function keepWishesAboveLabel() {
      const host = field.offsetParent
      if (!host) return
      const hostBox = host.getBoundingClientRect()
      const labelBox = label.getBoundingClientRect()
      const gap = 20
      field.style.bottom = `${Math.max(0, hostBox.bottom - labelBox.top + gap)}px`
      updateLaneLayout()
    }

    keepWishesAboveLabel()
    const observer = new ResizeObserver(keepWishesAboveLabel)
    observer.observe(label)
    observer.observe(field)
    window.addEventListener('resize', keepWishesAboveLabel)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', keepWishesAboveLabel)
    }
  }, [updateLaneLayout])

  useLayoutEffect(() => {
    updateLaneLayout()
  }, [slots.length, updateLaneLayout])

  useEffect(() => {
    slotsRef.current = slots
  }, [slots])

  const recycleLane = useCallback((lane) => {
    setSlots((current) => {
      let nextWish = null
      while (!nextWish && pendingRef.current.length) {
        const candidate = pendingRef.current.shift()
        if (
          candidate &&
          !shownIdsRef.current.has(candidate.id) &&
          !shownTextsRef.current.has(normalizeWishText(candidate.text))
        ) {
          nextWish = candidate
        }
      }
      if (!nextWish) {
        nextWish = pickNextWish(
          poolRef.current,
          shownIdsRef.current,
          shownTextsRef.current,
        )
      }
      if (!nextWish) {
        const showingTexts = new Set(
          current.map((slot) => normalizeWishText(slot.wish.text)),
        )
        const reusable = poolRef.current.filter(
          (wish) => !showingTexts.has(normalizeWishText(wish.text)),
        )
        if (reusable.length) {
          nextWish = reusable[Math.floor(Math.random() * reusable.length)]
        }
      }

      if (!nextWish) {
        return current.filter((slot) => slot.lane !== lane)
      }

      markShown(nextWish)
      const extraDuration = Math.round(Math.random() * 16000)
      const nextSlot = makeSlot(nextWish, lane, { extraDuration, delay: Math.round(Math.random() * 900) })
      return current
        .filter((slot) => slot.lane !== lane)
        .concat(nextSlot)
    })
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    function syncMotion() {
      setReducedMotion(media.matches)
    }
    syncMotion()
    media.addEventListener('change', syncMotion)
    return () => media.removeEventListener('change', syncMotion)
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchApprovedWishes().then((result) => {
      if (cancelled) return
      poolRef.current = result.wishes
      const nextSlots = seedSlots(result.wishes)
      shownIdsRef.current = new Set(nextSlots.map((slot) => slot.wish.id))
      shownTextsRef.current = new Set(
        nextSlots.map((slot) => normalizeWishText(slot.wish.text)),
      )
      setSlots(nextSlots)
      onStatus?.(result)
    })

    const unsubscribe = subscribeToApprovedWishes((wish) => {
      if (ignoreRealtimeRef.current.has(wish.id)) return
      poolRef.current = mergeWish(poolRef.current, wish)
      const showing = new Set(slotsRef.current.map((slot) => slot.wish.id))
      if (
        showing.has(wish.id) ||
        shownIdsRef.current.has(wish.id) ||
        pendingRef.current.some((item) => item.id === wish.id)
      ) {
        return
      }
      pendingRef.current.push(wish)
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [onStatus])

  useEffect(() => {
    if (!incomingWish) return
    ignoreRealtimeRef.current.add(incomingWish.id)
    poolRef.current = mergeWish(poolRef.current, incomingWish)
    pendingRef.current = pendingRef.current.filter((item) => item.id !== incomingWish.id)

    setSlots((current) => {
      const showing = current.some((slot) => slot.wish.id === incomingWish.id)
      if (showing) return current
      if (shownIdsRef.current.has(incomingWish.id)) return current
      if (pendingRef.current.some((item) => item.id === incomingWish.id)) return current

      if (current.length < ACTIVE_WISH_COUNT) {
        markShown(incomingWish)
        const usedLanes = new Set(current.map((slot) => slot.lane))
        const lane = [...Array(ACTIVE_WISH_COUNT).keys()].find((index) => !usedLanes.has(index)) ?? 0
        return current.concat(makeSlot(incomingWish, lane))
      }

      pendingRef.current.push(incomingWish)
      return current
    })
  }, [incomingWish])

  return (
    <div
      ref={fieldRef}
      className="wish-field"
      aria-hidden={prefersReducedMotion() ? undefined : true}
    >
      {slots.map((slot) => (
        <Wish
          key={slot.key}
          slot={slot}
          top={laneLayout.tops[slot.lane] ?? 0}
          maxHeight={laneLayout.maxHeight}
          reducedMotion={reducedMotion}
          onFinished={recycleLane}
        />
      ))}
    </div>
  )
}
