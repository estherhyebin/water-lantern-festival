import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { drawRipple } from './rippleDraw.js'

const NAV_PADDING = 56
const DRAG_SPACING = 38
const LISTENER_OPTS = { capture: true }

const CURSOR_WAVE = {
  lifetime: 4,
  scale: 0.75,
  fadeStart: 0.25,
  opacity: 190,
  flatten: 0.19,
}

export default function CursorRipple() {
  const containerRef = useRef(null)

  useEffect(() => {
    const host = containerRef.current
    if (!host) return undefined

    const ripples = []
    let dragging = false
    let lastPos = null
    let p5Instance = null
    let pointerHandled = false
    let lastDownAt = 0

    const sketch = (p) => {
      p5Instance = p

      p.setup = () => {
        const canvas = p.createCanvas(p.windowWidth, p.windowHeight)
        canvas.style('background', 'transparent')
        p.colorMode(p.RGB, 255, 255, 255, 255)
        p.textFont('serif')
        p.textSize(7)
        p.textAlign(p.CENTER, p.CENTER)
        p.noStroke()
        p.smooth()
      }

      p.draw = () => {
        p.clear()
        const now = p.millis()
        const active = []

        for (let i = ripples.length - 1; i >= 0; i -= 1) {
          const ripple = ripples[i]
          const age = (now - ripple.birth) / 1000
          if (age > ripple.lifetime) {
            ripples.splice(i, 1)
            continue
          }
          const t = age / ripple.lifetime
          active.push({
            ...ripple,
            t,
            radius: Math.max(8, t * ripple.maxRadius),
          })
        }

        for (const wave of active) {
          drawRipple(p, wave, active)
        }
      }

      p.windowResized = () => {
        p.resizeCanvas(p.windowWidth, p.windowHeight)
      }
    }

    const instance = new p5(sketch, host)

    function lanternBaseWidth() {
      const img = document.querySelector('.lantern--back img')
      if (!img) return 160
      return img.getBoundingClientRect().width || 160
    }

    function spawnAt(x, y, fromDrag) {
      if (isNearNavigation(x, y)) return

      if (fromDrag && lastPos) {
        const dx = x - lastPos.x
        const dy = y - lastPos.y
        if (Math.hypot(dx, dy) < DRAG_SPACING) return
      }

      const p = p5Instance
      const now =
        p && typeof p.millis === 'function'
          ? p.millis()
          : performance.now()

      ripples.push({
        x,
        y,
        birth: now,
        lifetime: CURSOR_WAVE.lifetime,
        maxRadius: lanternBaseWidth() * 2.6 * CURSOR_WAVE.scale,
        flatten: CURSOR_WAVE.flatten,
        fadeStart: CURSOR_WAVE.fadeStart,
        opacity: CURSOR_WAVE.opacity,
        seed: Math.random() * 1000,
      })

      lastPos = { x, y }
    }

    function onDown(event) {
      if (event.button != null && event.button !== 0) return
      if (event.target?.closest?.('a, button, nav, .navigation')) {
        dragging = false
        lastPos = null
        return
      }
      const { x, y } = pointFromEvent(event)
      if (isNearNavigation(x, y)) {
        dragging = false
        lastPos = null
        return
      }
      const now = performance.now()
      if (now - lastDownAt < 40) {
        dragging = true
        return
      }
      lastDownAt = now
      dragging = true
      lastPos = null
      spawnAt(x, y, false)
    }

    function onPointerDown(event) {
      pointerHandled = true
      onDown(event)
    }

    function onMouseDown(event) {
      if (pointerHandled) return
      onDown(event)
    }

    function onMove(event) {
      if (!dragging) return
      const { x, y } = pointFromEvent(event)
      spawnAt(x, y, true)
    }

    function onMouseMove(event) {
      if (pointerHandled) return
      onMove(event)
    }

    function onUp() {
      dragging = false
      lastPos = null
      pointerHandled = false
    }

    window.addEventListener('pointerdown', onPointerDown, LISTENER_OPTS)
    window.addEventListener('pointermove', onMove, LISTENER_OPTS)
    window.addEventListener('pointerup', onUp, LISTENER_OPTS)
    window.addEventListener('pointercancel', onUp, LISTENER_OPTS)
    window.addEventListener('mousedown', onMouseDown, LISTENER_OPTS)
    window.addEventListener('mousemove', onMouseMove, LISTENER_OPTS)
    window.addEventListener('mouseup', onUp, LISTENER_OPTS)
    window.addEventListener('click', onMouseDown, LISTENER_OPTS)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, LISTENER_OPTS)
      window.removeEventListener('pointermove', onMove, LISTENER_OPTS)
      window.removeEventListener('pointerup', onUp, LISTENER_OPTS)
      window.removeEventListener('pointercancel', onUp, LISTENER_OPTS)
      window.removeEventListener('mousedown', onMouseDown, LISTENER_OPTS)
      window.removeEventListener('mousemove', onMouseMove, LISTENER_OPTS)
      window.removeEventListener('mouseup', onUp, LISTENER_OPTS)
      window.removeEventListener('click', onMouseDown, LISTENER_OPTS)
      instance.remove()
      host.replaceChildren()
    }
  }, [])

  return <div ref={containerRef} className="cursor-ripple" aria-hidden="true" />
}

function pointFromEvent(event) {
  return { x: event.clientX, y: event.clientY }
}

function isNearNavigation(x, y) {
  const nav = document.querySelector('.navigation')
  if (!nav) return false
  const r = nav.getBoundingClientRect()
  return (
    x >= r.left - NAV_PADDING &&
    x <= r.right + NAV_PADDING &&
    y >= r.top - NAV_PADDING &&
    y <= r.bottom + NAV_PADDING
  )
}
