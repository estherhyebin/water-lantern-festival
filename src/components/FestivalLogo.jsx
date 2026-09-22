import logoHome from '../assets/figma/logo-home.svg'
import './FestivalLogo.css'

function FestivalLogo() {
  return (
    <div className="festival-logo">
      <img
        src={logoHome}
        alt="Water Lantern Festival"
        width={108.061}
        height={82.244}
      />
    </div>
  )
}

export default FestivalLogo
