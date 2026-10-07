export function parseFindRoute(hash = window.location.hash) {
  if (hash !== '#find-an-event' && !hash.startsWith('#find-an-event/')) {
    return { view: 'list' }
  }

  const rest = hash.slice('#find-an-event'.length).replace(/^\//, '')
  if (!rest) return { view: 'list' }

  const parts = rest.split('/').map((part) => decodeURIComponent(part))
  const eventId = parts[0] || null
  const date = /^\d{4}-\d{2}-\d{2}$/.test(parts[1] || '') ? parts[1] : null
  const step = date ? parts[2] || 'tickets' : null

  if (!eventId) return { view: 'list' }
  if (!date) return { view: 'detail', eventId }
  if (step === 'pay') return { view: 'pay', eventId, date }
  if (step === 'confirm') return { view: 'confirm', eventId, date }
  return { view: 'tickets', eventId, date }
}

export function listHash() {
  return '#find-an-event'
}

export function detailHash(eventId) {
  return `#find-an-event/${encodeURIComponent(eventId)}`
}

export function ticketsHash(eventId, date) {
  return `#find-an-event/${encodeURIComponent(eventId)}/${date}`
}

export function payHash(eventId, date) {
  return `${ticketsHash(eventId, date)}/pay`
}

export function confirmHash(eventId, date) {
  return `${ticketsHash(eventId, date)}/confirm`
}

export function formatEventWhen(iso, startTime) {
  const [year, month, day] = String(iso || '').split('-').map(Number)
  if (!year || !month || !day) return ''
  const date = new Date(Date.UTC(year, month - 1, day))
  const weekday = date.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'UTC',
  })
  const monthDay = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const stamp = `${weekday}, ${monthDay}, ${year}`
  return startTime ? `${stamp} - ${startTime}` : stamp
}

export function locationLabel(event) {
  return [String(event?.city || '').trim(), String(event?.state || '').trim()]
    .filter(Boolean)
    .join(', ')
}

const CART_KEY = 'wlf-prototype-cart'

export function loadCart(eventId, date) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(CART_KEY) || 'null')
    if (stored?.eventId === eventId && stored?.date === date && stored.quantities) {
      return stored.quantities
    }
  } catch {
    /* ignore broken storage */
  }
  return null
}

export function saveCart(eventId, date, quantities) {
  sessionStorage.setItem(
    CART_KEY,
    JSON.stringify({ eventId, date, quantities }),
  )
}
