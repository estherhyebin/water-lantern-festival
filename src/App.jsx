import { useEffect, useState } from 'react'
import FestivalLogo from './components/FestivalLogo.jsx'
import Navigation from './components/Navigation.jsx'
import HeroContent from './components/HeroContent.jsx'
import LanternIllustrations from './components/LanternIllustrations.jsx'
import CornerOrnaments from './components/CornerOrnaments.jsx'
import AsciiRipple from './components/AsciiRipple.jsx'
import CursorRipple from './components/CursorRipple.jsx'
import FindEventPage from './pages/FindEventPage.jsx'
import WriteWishPage from './pages/WriteWishPage.jsx'
import { parseFindRoute } from './pages/findRoute.js'
import './App.css'

function getPageFromHash() {
  const hash = window.location.hash
  if (hash === '#find-an-event' || hash.startsWith('#find-an-event/')) {
    return 'find'
  }
  if (hash === '#write-a-wish') {
    return 'wish'
  }
  return 'home'
}

function getLanternVariant() {
  const page = getPageFromHash()
  if (page === 'wish') return 'wish'
  if (page !== 'find') return 'home'
  const view = parseFindRoute().view
  if (view === 'tickets' || view === 'pay' || view === 'confirm') return 'checkout'
  return 'find'
}

function Brand({ activeHref }) {
  return (
    <div className="brand">
      <FestivalLogo />
      <Navigation activeHref={activeHref} />
    </div>
  )
}

function App() {
  const [page, setPage] = useState(getPageFromHash)
  const [lanternVariant, setLanternVariant] = useState(getLanternVariant)

  useEffect(() => {
    function onHashChange() {
      setPage(getPageFromHash())
      setLanternVariant(getLanternVariant())
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const isFindEvent = page === 'find'
  const isWish = page === 'wish'
  const pageClass = isFindEvent
    ? 'page page--find'
    : isWish
      ? 'page page--wish'
      : 'page'

  return (
    <main className={pageClass}>
      <CornerOrnaments />
      {isFindEvent ? (
        <FindEventPage brand={<Brand activeHref="#find-an-event" />} />
      ) : isWish ? (
        <WriteWishPage brand={<Brand activeHref="#write-a-wish" />} />
      ) : (
        <div className="home-content">
          <Brand />
          <HeroContent />
        </div>
      )}
      {page !== 'wish' ? <LanternIllustrations variant={lanternVariant} /> : null}
      <AsciiRipple />
      <CursorRipple />
    </main>
  )
}

export default App
