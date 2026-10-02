import { useEffect, useState } from 'react'
import FestivalLogo from './components/FestivalLogo.jsx'
import Navigation from './components/Navigation.jsx'
import HeroContent from './components/HeroContent.jsx'
import LanternIllustrations from './components/LanternIllustrations.jsx'
import CornerOrnaments from './components/CornerOrnaments.jsx'
import AsciiRipple from './components/AsciiRipple.jsx'
import CursorRipple from './components/CursorRipple.jsx'
import FindEventPage from './pages/FindEventPage.jsx'
import './App.css'

function getPageFromHash() {
  return window.location.hash === '#find-an-event' ? 'find' : 'home'
}

function App() {
  const [page, setPage] = useState(getPageFromHash)

  useEffect(() => {
    function onHashChange() {
      setPage(getPageFromHash())
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const isFindEvent = page === 'find'

  return (
    <main className={isFindEvent ? 'page page--find' : 'page'}>
      <CornerOrnaments />
      {isFindEvent ? (
        <FindEventPage
          brand={
            <div className="brand">
              <FestivalLogo />
              <Navigation activeHref="#find-an-event" />
            </div>
          }
        />
      ) : (
        <div className="home-content">
          <div className="brand">
            <FestivalLogo />
            <Navigation />
          </div>
          <HeroContent />
        </div>
      )}
      <LanternIllustrations variant={isFindEvent ? 'find' : 'home'} />
      <AsciiRipple />
      <CursorRipple />
    </main>
  )
}

export default App
