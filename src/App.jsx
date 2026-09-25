import FestivalLogo from './components/FestivalLogo.jsx'
import Navigation from './components/Navigation.jsx'
import HeroContent from './components/HeroContent.jsx'
import LanternIllustrations from './components/LanternIllustrations.jsx'
import CornerOrnaments from './components/CornerOrnaments.jsx'
import AsciiRipple from './components/AsciiRipple.jsx'
import CursorRipple from './components/CursorRipple.jsx'
import './App.css'

function App() {
  return (
    <main className="page">
      <CornerOrnaments />
      <div className="home-content">
        <div className="brand">
          <FestivalLogo />
          <Navigation />
        </div>
        <HeroContent />
      </div>
      <LanternIllustrations />
      <AsciiRipple />
      <CursorRipple />
    </main>
  )
}

export default App
