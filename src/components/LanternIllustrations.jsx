import lanternFill from '../assets/figma/lantern-fill3.png'
import './LanternIllustrations.css'

const homeLanterns = [
  { className: 'lantern lantern--back' },
  { className: 'lantern lantern--mid' },
  { className: 'lantern lantern--front' },
]

const findLanterns = [
  { className: 'lantern lantern--back' },
  { className: 'lantern lantern--front' },
]

function LanternIllustrations({ variant = 'home' }) {
  const lanterns = variant === 'home' ? homeLanterns : findLanterns
  const className =
    variant === 'checkout'
      ? 'lanterns lanterns--find lanterns--checkout'
      : variant === 'wish'
        ? 'lanterns lanterns--find lanterns--wish'
        : variant === 'find'
          ? 'lanterns lanterns--find'
          : 'lanterns'

  return (
    <div className={className} aria-hidden="true">
      <svg className="lantern-filters" width="0" height="0" aria-hidden="true">
        <filter
          id="lantern-hover-glow"
          x="-180%"
          y="-180%"
          width="460%"
          height="460%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="8" result="tight" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="22" result="mid" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="46" result="wide" />
          <feFlood floodColor="#fff6d5" floodOpacity="1" result="cream" />
          <feFlood floodColor="#ffc86e" floodOpacity="0.8" result="gold" />
          <feComposite in="cream" in2="tight" operator="in" result="tightGlow" />
          <feComposite in="cream" in2="mid" operator="in" result="midGlow" />
          <feComposite in="gold" in2="wide" operator="in" result="wideGlow" />
          <feMerge>
            <feMergeNode in="wideGlow" />
            <feMergeNode in="midGlow" />
            <feMergeNode in="tightGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter
          id="lantern-hover-glow-front"
          x="-180%"
          y="-180%"
          width="460%"
          height="460%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="10" result="tight" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="28" result="mid" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="54" result="wide" />
          <feFlood floodColor="#fffaf0" floodOpacity="1" result="cream" />
          <feFlood floodColor="#ffb450" floodOpacity="0.9" result="gold" />
          <feComposite in="cream" in2="tight" operator="in" result="tightGlow" />
          <feComposite in="cream" in2="mid" operator="in" result="midGlow" />
          <feComposite in="gold" in2="wide" operator="in" result="wideGlow" />
          <feMerge>
            <feMergeNode in="wideGlow" />
            <feMergeNode in="midGlow" />
            <feMergeNode in="tightGlow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </svg>
      {lanterns.map((lantern) => (
        <div key={lantern.className} className={lantern.className}>
          <span className="lantern__glow">
            <img src={lanternFill} alt="" width={141} height={144} />
          </span>
        </div>
      ))}
    </div>
  )
}

export default LanternIllustrations
