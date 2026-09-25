import edgeTl from '../assets/figma/edge-tl.svg'
import edgeTr from '../assets/figma/edge-tr.svg'
import edgeBl from '../assets/figma/edge-bl.svg'
import edgeBr from '../assets/figma/edge-br.svg'
import './CornerOrnaments.css'

function CornerMark({ src, name }) {
  return (
    <div className={`corner-ornaments__mark corner-ornaments__mark--${name}`}>
      <img src={src} alt="" width={24} height={24} />
    </div>
  )
}

function CornerOrnaments() {
  return (
    <div className="corner-ornaments" aria-hidden="true">
      <CornerMark src={edgeTl} name="tl" />
      <CornerMark src={edgeTr} name="tr" />
      <CornerMark src={edgeBl} name="bl" />
      <CornerMark src={edgeBr} name="br" />
    </div>
  )
}

export default CornerOrnaments
