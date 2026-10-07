import backArrow from '../assets/figma/back-arrow.svg'
import { ticketsHash } from './findRoute.js'
import './EventDetail.css'

function clean(value) {
  return String(value || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatDateParts(iso) {
  const [year, month, day] = String(iso).split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  return {
    weekday: date.toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'UTC',
    }),
    monthDay: date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }),
  }
}

function eventDates(event) {
  const seen = new Set()
  const dates = []
  for (const item of event.dates || []) {
    if (!item?.date || seen.has(item.date)) continue
    seen.add(item.date)
    dates.push(item)
  }
  return dates
}

function uniqueSchedule(event) {
  const seen = new Set()
  const items = []
  for (const item of event.schedule || []) {
    const time = clean(item?.time)
    const activity = clean(item?.activity)
    if (!time || !activity) continue
    const key = `${time.toLowerCase()}|${activity.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      time: time.replace(/\s*[-–—]\s*/g, ' – '),
      activity,
    })
  }
  return items
}

function addressLines(address) {
  const parts = clean(address)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length >= 3) {
    return [`${parts.slice(0, -2).join(', ')},`, parts.slice(-2).join(', ')]
  }
  return parts.length ? [parts.join(', ')] : []
}

function mapsQuery(event) {
  return [clean(event.venue), clean(event.address)].filter(Boolean).join(', ')
}

function locationLabel(event) {
  return [clean(event.city), clean(event.state)].filter(Boolean).join(', ')
}

export default function EventDetail({ event, onBack }) {
  const dates = eventDates(event)
  const schedule = uniqueSchedule(event)
  const venue = clean(event.venue)
  const address = clean(event.address)
  const lines = addressLines(address)
  const query = mapsQuery(event)
  const mapsUrl = query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null
  const hasLocation = Boolean(venue || address)
  const place = locationLabel(event)

  return (
    <div className="event-detail">
      <button type="button" className="event-detail__back" onClick={onBack}>
        <img
          src={backArrow}
          alt=""
          width={6.8003}
          height={22}
          className="event-detail__back-arrow"
        />
        Back to locations list
      </button>

      {place ? <h1 className="event-detail__place">{place}</h1> : null}

      <section className="event-detail__section event-detail__section--tickets" aria-labelledby="event-tickets-heading">
        <h2 id="event-tickets-heading" className="event-detail__heading">
          Tickets :
        </h2>
        <p className="event-detail__lede">Select a date to buy ticket(s)</p>
        {dates.length ? (
          <div className="event-detail__dates">
            {dates.map((item) => {
              const parts = formatDateParts(item.date)
              if (!parts) return null
              const label = [parts.weekday, parts.monthDay, item.startTime]
                .filter(Boolean)
                .join(', ')
              return (
                <button
                  key={item.date}
                  type="button"
                  className="event-detail__date"
                  onClick={() => {
                    window.location.hash = ticketsHash(event.id, item.date)
                  }}
                  aria-label={`Buy tickets for ${label}`}
                >
                  <span className="event-detail__date-day">{parts.weekday}</span>
                  <span>{parts.monthDay}</span>
                  {item.startTime ? <span>{item.startTime}</span> : null}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="event-detail__fallback">Dates coming soon</p>
        )}
      </section>

      {hasLocation ? (
        <section className="event-detail__section" aria-labelledby="event-location-heading">
          <h2 id="event-location-heading" className="event-detail__heading">
            Location :
          </h2>
          <p className="event-detail__address">
            {venue ? (
              <>
                {venue}
                {lines.length ? <br /> : null}
              </>
            ) : null}
            {lines.map((line, index) => (
              <span key={`${line}-${index}`}>
                {line}
                {index < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
          {mapsUrl ? (
            <a
              className="event-detail__maps"
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open in maps →
            </a>
          ) : null}
        </section>
      ) : null}

      <section className="event-detail__section" aria-labelledby="event-schedule-heading">
        <h2 id="event-schedule-heading" className="event-detail__heading">
          Event schedule :
        </h2>
        {schedule.length ? (
          <ul className="event-detail__schedule">
            {schedule.map((item) => (
              <li key={`${item.time}|${item.activity}`}>
                {item.time} | {item.activity}
              </li>
            ))}
          </ul>
        ) : (
          <p className="event-detail__fallback">Schedule coming soon</p>
        )}
      </section>
    </div>
  )
}
