import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  fetchApprovedWishes,
  subscribeToApprovedWishes,
} from '../lib/wishesApi.js'
import {
  ACTIVE_WISH_COUNT,
  makeSlot,
  mergeWish,
  packWishTops,
  pickNextWish,
  seedSlots,
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
  const recentRef = useRef([])
  const pendingRef = useRef([])
  const ignoreRealtimeRef = useRef(new Set())

  const packWishes = useCallback(() => {
    const field = fieldRef.current
    if (!field) return
    const nodes = [...field.querySelectorAll('.wish')].sort(
      (left, right) => Number(left.dataset.lane) - Number(right.dataset.lane),
    )
    if (!nodes.length) return
    const heights = nodes.map((node) => node.offsetHeight)
    const tops = packWishTops(field.clientHeight, heights)
    nodes.forEach((node, index) => {
      node.style.top = `${tops[index]}px`
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
      packWishes()
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
  }, [packWishes])

  useLayoutEffect(() => {
    packWishes()
  }, [slots, packWishes])

  useEffect(() => {
    slotsRef.current = slots
  }, [slots])

  const recycleLane = useCallback((lane) => {
    setSlots((current) => {
      const leaving = current.find((slot) => slot.lane === lane)
      if (leaving) {
        recentRef.current = [...recentRef.current, leaving.wish.id].slice(-12)
      }

      const nextWish = pendingRef.current.shift() ||
        pickNextWish(
          poolRef.current,
          new Set(
            current
              .filter((slot) => slot.lane !== lane)
              .map((slot) => slot.wish.id),
          ),
          recentRef.current,
        )

      if (!nextWish) {
        return current.filter((slot) => slot.lane !== lane)
      }

      const extraDuration = Math.round(Math.random() * 5000)
      const nextSlot = makeSlot(nextWish, lane, { extraDuration })
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
      setSlots(seedSlots(result.wishes))
      onStatus?.(result)
    })

    const unsubscribe = subscribeToApprovedWishes((wish) => {
      if (ignoreRealtimeRef.current.has(wish.id)) return
      poolRef.current = mergeWish(poolRef.current, wish)
      const showing = new Set(slotsRef.current.map((slot) => slot.wish.id))
      if (showing.has(wish.id) || pendingRef.current.some((item) => item.id === wish.id)) {
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

      if (current.length < ACTIVE_WISH_COUNT) {
        const usedLanes = new Set(current.map((slot) => slot.lane))
        const lane = [...Array(ACTIVE_WISH_COUNT).keys()].find((index) => !usedLanes.has(index)) ?? 0
        return current.concat(makeSlot(incomingWish, lane))
      }

      const replace = current.reduce((oldest, slot) =>
        slot.startedAt < oldest.startedAt ? slot : oldest,
      )
      recentRef.current = [...recentRef.current, replace.wish.id].slice(-12)
      return current
        .filter((slot) => slot.lane !== replace.lane)
        .concat(makeSlot(incomingWish, replace.lane))
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
          reducedMotion={reducedMotion}
          onFinished={recycleLane}
        />
      ))}
    </div>
  )
}
