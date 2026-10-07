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
      {lanterns.map((lantern) => (
        <div key={lantern.className} className={lantern.className}>
          <img src={lanternFill} alt="" width={141} height={144} />
        </div>
      ))}
    </div>
  )
}

export default LanternIllustrations
