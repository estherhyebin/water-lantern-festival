import logoHome from '../assets/figma/water-lantern-logo.svg'
import './FestivalLogo.css'

function FestivalLogo() {
  return (
    <a className="festival-logo" href="/" aria-label="Water Lantern Festival home">
      <img
        src={logoHome}
        alt="Water Lantern Festival"
        width={110}
        height={81}
      />
    </a>
  )
}

export default FestivalLogo
