import { useEffect, useRef } from 'react'
import p5 from 'p5'
import { drawRipple } from './rippleDraw.js'

const RIPPLE_SOURCES = [
  {
    selector: '.lantern--mid img',
    lifetime: 4,
    scale: 0.75,
    fadeStart: 0.25,
    opacity: 190,
    flatten: 0.19,
    seed: 210,
    spawnInterval: 1300,
    spawnOffset: 600,
    originY: -10,
  },
  {
    selector: '.lantern--back img',
    lifetime: 4,
    scale: 0.50,
    fadeStart: 0.25,
    opacity: 125,
    flatten: 0.19,
    seed: 640,
    spawnInterval: 1200,
    spawnOffset: 800,
    originY: -5,
  },
  {
    selector: '.lantern--front img',
    lifetime: 3,
    scale: 0.90,
    fadeStart: 0.85,
    opacity: 220,
    flatten: 0.21,
    seed: 980,
    spawnInterval: 900,
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

            return {
              source,
              img,
              rect: img.getBoundingClientRect(),
            }
          })
          .filter(Boolean)

        if (lanterns.length === 0) return

        const baseWidth =
          lanterns.find(
            (item) =>
              item.source.selector ===
              '.lantern--back img',
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
