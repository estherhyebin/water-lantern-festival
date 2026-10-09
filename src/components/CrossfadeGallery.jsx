import { useEffect, useState } from 'react'
import './CrossfadeGallery.css'

export const LANTERN_GALLERY_IMAGES = [
  '/images/lantern-image-1.png',
  '/images/lantern-image-2.png',
  '/images/lantern-image-3.png',
]

// Change these two numbers to control the About Us photos.
// HOLD_MS = how long each photo stays still. FADE_MS = how long the crossfade takes.
const HOLD_MS = 3200
const FADE_MS = 1100

export default function CrossfadeGallery({
  images = LANTERN_GALLERY_IMAGES,
  alt = 'Water lanterns on the water at night',
}) {
  const [index, setIndex] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    function sync() {
      setReducedMotion(media.matches)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (reducedMotion || images.length < 2) return undefined
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % images.length)
    }, HOLD_MS + FADE_MS)
    return () => window.clearInterval(id)
  }, [images.length, reducedMotion])

  return (
    <div
      className="crossfade-gallery"
      style={{ '--crossfade-duration': `${FADE_MS}ms` }}
    >
      {images.map((src, imageIndex) => (
        <img
          key={src}
          src={src}
          alt={imageIndex === 0 ? alt : ''}
          className={imageIndex === index ? 'is-active' : undefined}
          aria-hidden={imageIndex === 0 ? undefined : true}
        />
      ))}
    </div>
  )
}
