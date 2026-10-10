import { useEffect, useRef } from 'react'
import { opacityForProgress, overlapCover } from '../lib/wishPool.js'

let brandZone = null
let brandZoneFresh = false

function readBrandZone() {
  if (brandZoneFresh) return brandZone
  brandZoneFresh = true
  requestAnimationFrame(() => {
    brandZoneFresh = false
  })
  const brand = document.querySelector('.write-wish .brand')
  if (!brand) {
    brandZone = null
    return null
  }
  const box = brand.getBoundingClientRect()
  brandZone = {
    left: 0,
    right: box.right + 28,
    top: 0,
    bottom: box.bottom + 24,
  }
  return brandZone
}

export default function Wish({ slot, top, maxHeight, reducedMotion, onFinished }) {
  const nodeRef = useRef(null)
  const slotRef = useRef(slot)

  useEffect(() => {
    slotRef.current = slot
  }, [slot])

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return undefined

    function place(progress) {
      const width = window.innerWidth
      const travel = width + 288
      const x = progress * travel - 144
      node.style.transform = `translate3d(${x}px, 0, 0)`
      const cover = overlapCover(node.getBoundingClientRect(), readBrandZone())
      const opacity = opacityForProgress(progress) * (1 - cover * 0.72)
      node.style.setProperty('--wish-opacity', String(Math.max(0, opacity)))
      node.style.setProperty('--wish-blur', `${(cover * 7).toFixed(2)}px`)
    }

    if (reducedMotion) {
      place(slot.progress > 0 ? slot.progress : 0.2 + Math.random() * 0.45)
      return undefined
    }

    let frame = 0
    let finished = false
    function tick(now) {
      const current = slotRef.current
      const progress = Math.min(1, Math.max(0, (now - current.startedAt) / current.duration))
      place(progress)
      if (progress >= 1) {
        if (!finished) {
          finished = true
          onFinished(current.lane)
        }
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [slot.key, reducedMotion, onFinished, slot.lane])

  return (
    <p
      ref={nodeRef}
      className="wish"
      tabIndex={0}
      data-lane={slot.lane}
      style={{ top, maxHeight }}
    >
      {slot.wish.text}
    </p>
  )
}
