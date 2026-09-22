import lanternFill from '../assets/figma/lantern-fill3.png'
import './LanternIllustrations.css'

const lanterns = [
  { className: 'lantern lantern--back', alt: '' },
  { className: 'lantern lantern--mid', alt: '' },
  { className: 'lantern lantern--front', alt: '' },
]

function LanternIllustrations() {
  return (
    <div className="lanterns" aria-hidden="true">
      {lanterns.map((lantern) => (
        <div key={lantern.className} className={lantern.className}>
          <img src={lanternFill} alt="" width={141} height={144} />
        </div>
      ))}
    </div>
  )
}

export default LanternIllustrations
