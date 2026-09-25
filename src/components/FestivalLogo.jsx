import logoHome from '../assets/figma/logo-home.svg'
import './FestivalLogo.css'

function FestivalLogo() {
  return (
    <a className="festival-logo" href="/" aria-label="Water Lantern Festival home">
      <img
        src={logoHome}
        alt="Water Lantern Festival"
        width={100}
        height={76}
      />
    </a>
  )
}

export default FestivalLogo
