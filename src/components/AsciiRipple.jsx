import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { drawRipple } from './rippleDraw.js'

const RIPPLE_SOURCES = [
  {
    selector: '.lantern--mid .lantern__glow img',
    lifetime: 4.6,
    scale: 0.75,
    fadeStart: 0.85,
    opacity: 60,
    flatten: 0.19,
    seed: 210,
    spawnInterval: 3400,
    spawnOffset: 1400,
    originY: -10,
  },
  {
    selector: '.lantern--right-back .lantern__glow img',
    lifetime: 4.6,
    scale: 0.75,
    fadeStart: 0.85,
    opacity: 60,
    flatten: 0.19,
    seed: 210,
    spawnInterval: 3400,
    spawnOffset: 1400,
    originY: -10,
  },
  {
    selector: '.lantern--right-front .lantern__glow img',
    lifetime: 4.8,
    scale: 0.82,
    fadeStart: 0.85,
    opacity: 90,
    flatten: 0.2,
    seed: 420,
    spawnInterval: 3100,
    spawnOffset: 900,
    originY: -10,
  },
  {
    selector: '.lantern--back .lantern__glow img',
    lifetime: 5.2,
    scale: 0.50,
    fadeStart: 0.85,
    opacity: 30,
    flatten: 0.19,
    seed: 640,
    spawnInterval: 4100,
    spawnOffset: 2700,
    originY: -5,
  },
  {
    selector: '.lantern--front .lantern__glow img',
    lifetime: 5,
    scale: 0.90,
    fadeStart: 0.85,
    opacity: 200,
    flatten: 0.21,
    seed: 980,
    spawnInterval: 2800,
    spawnOffset: 0,
    originY: -10,
  },
]

export default function AsciiRipple() {
  const containerRef = useRef(null)

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const sketch = (p) => {
      const lastSpawn = new Map()
      const waves = []

      p.setup = () => {
        const canvas = p.createCanvas(
          p.windowWidth,
          p.windowHeight,
        )

        canvas.style('background', 'transparent')

        p.colorMode(
          p.RGB,
          255,
          255,
          255,
          255,
        )

        p.textFont('serif')
        p.textSize(7)
        p.textAlign(p.CENTER, p.CENTER)
        p.noStroke()
        p.smooth()
      }

      p.draw = () => {
        p.clear()

        const lanterns = RIPPLE_SOURCES
          .map((source) => {
            const img = document.querySelector(
              source.selector,
            )

            if (!img) return null

            const rect = img.getBoundingClientRect()
            // Skip hidden bloom copies and unloaded images.
            if (rect.width < 8 || rect.height < 8) return null

            return {
              source,
              img,
              rect,
            }
          })
          .filter(Boolean)

        if (lanterns.length === 0) return

        const baseWidth =
          lanterns.find(
            (item) =>
              item.source.selector ===
              '.lantern--back .lantern__glow img',
          )?.rect.width ??
          lanterns[0].rect.width

        /*
         * Detect the bottom of each lantern's
         * floating movement.
         *
         * Each lantern gets its own ripple timing.
         */
        for (const {
          source,
          img,
          rect,
        } of lanterns) {
          const origin = {
            x: rect.left + rect.width / 2,
            y:
              rect.bottom -
              rect.height * 0.04 +
              (source.originY ?? 0),
          }

          if (reducedMotion) {
            drawRipple(
              p,
              {
                x: origin.x,
                y: origin.y,
                t: 0.55,
                maxRadius:
                  baseWidth *
                  2.6 *
                  source.scale,
                flatten: source.flatten,
                seed: source.seed,
                hold: true,
              },
              [],
            )

            continue
          }

          spawnScheduled(
            p,
            lastSpawn,
            waves,
            source,
            origin,
            baseWidth,
          )
        }

        /*
         * UPDATE ACTIVE RIPPLES
         *
         * The radius is completely linear.
         *
         * t = 0
         *   ripple starts
         *
         * t = 0.5
         *   ripple is exactly halfway
         *
         * t = 1
         *   ripple reaches its maximum size
         */
        const active = waves
          .map((wave) => {
            const age =
              (p.millis() - wave.birth) /
              1000

            if (age > wave.lifetime) {
              return null
            }

            const t =
              age / wave.lifetime

            return {
              ...wave,
              t,
              radius: Math.max(
                8,
                t * wave.maxRadius,
              ),
            }
          })
          .filter(Boolean)

        /*
         * Draw all active waves.
         *
         * Because all waves use the same
         * linear expansion model, overlapping
         * ripples can naturally cross each other.
         */
        for (const wave of active) {
          drawRipple(
            p,
            wave,
            active,
          )
        }

        /*
         * Remove expired ripples.
         */
        for (
          let i = waves.length - 1;
          i >= 0;
          i -= 1
        ) {
          const age =
            (p.millis() -
              waves[i].birth) /
            1000

          if (
            age >
            waves[i].lifetime
          ) {
            waves.splice(i, 1)
          }
        }
      }

      p.windowResized = () => {
        p.resizeCanvas(
          p.windowWidth,
          p.windowHeight,
        )
      }
    }

    const host = containerRef.current

    const instance = new p5(
      sketch,
      host,
    )

    return () => {
      instance.remove()

      if (host) {
        host.replaceChildren()
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="ascii-ripple"
      aria-hidden="true"
    />
  )
}

function spawnScheduled(
  p,
  lastSpawn,
  waves,
  source,
  origin,
  baseWidth,
) {
  const now = p.millis()
  const elapsed = now - source.spawnOffset
  if (elapsed < 0) return

  const cycle = Math.floor(elapsed / source.spawnInterval)
  if (lastSpawn.get(source.selector) === cycle) return

  waves.push({
    selector: source.selector,
    birth: now,
    lifetime: source.lifetime,
    x: origin.x,
    y: origin.y,
    flatten: source.flatten,
    seed: source.seed,
    fadeStart: source.fadeStart ?? 0.84,
    opacity: source.opacity ?? 165,
    maxRadius: baseWidth * 2.6 * source.scale,
  })

  lastSpawn.set(source.selector, cycle)
}
