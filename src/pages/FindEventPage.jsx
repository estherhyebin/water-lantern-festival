import { useEffect, useMemo, useState } from 'react'
import events from '../data/events.json'
import {
  cartTotalCents,
  emptyQuantities,
} from '../data/ticketOffers.js'
import ConfirmationPage from './ConfirmationPage.jsx'
import EventDetail from './EventDetail.jsx'
import PaymentPage from './PaymentPage.jsx'
import TicketCheckout from './TicketCheckout.jsx'
import {
  detailHash,
  listHash,
  loadCart,
  parseFindRoute,
  ticketsHash,
} from './findRoute.js'
import './FindEventPage.css'

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function matchesQuery(value, query) {
  return clean(value).toLowerCase().includes(query)
}

function matchesCityQuery(value, query) {
  const text = clean(value).toLowerCase()
  if (!query) return true
  if (text.startsWith(query)) return true
  return text.split(/[^a-z0-9]+/).some((word) => word.startsWith(query))
}

function hasSetDate(event) {
  return (event.dates || []).some((item) => Boolean(item?.date))
}

function EventSearch({ id, value, onChange }) {
  return (
    <label className="event-search" htmlFor={id}>
      <span className="visually-hidden">Search for your city or state</span>
      <input
        id={id}
        className="event-search__input"
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search for your city or state"
        autoComplete="off"
      />
    </label>
  )
}

function TextRow({
  children,
  onClick,
  active = false,
  muted = false,
  country = false,
  city = false,
  expanded = false,
}) {
  const className = [
    'find-row',
    active ? 'find-row--active' : '',
    muted ? 'find-row--muted' : '',
    country ? 'find-row--country' : '',
    city ? 'find-row--city' : '',
    expanded ? 'find-row--expanded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-expanded={expanded ? true : undefined}
      >
        {children}
      </button>
    )
  }

  return <p className={className}>{children}</p>
}

function sameName(a, b) {
  return clean(a).toLowerCase() === clean(b).toLowerCase()
}

function uniqueCities(eventList) {
  const seen = new Set()
  const cities = []
  for (const event of eventList) {
    const city = clean(event.city)
    if (!city || seen.has(city.toLowerCase())) continue
    seen.add(city.toLowerCase())
    cities.push({ city, event })
  }
  return cities.sort((a, b) => a.city.localeCompare(b.city))
}

function groupStatesByCountry(eventList) {
  const map = new Map()
  for (const event of eventList) {
    const country = clean(event.country)
    const state = clean(event.state)
    if (!country || !state) continue
    if (!map.has(country)) {
      map.set(country, { states: new Set(), events: [] })
    }
    const group = map.get(country)
    group.states.add(state)
    group.events.push(event)
  }

  return [...map.entries()]
    .sort((a, b) => {
      if (a[0] === 'USA') return -1
      if (b[0] === 'USA') return 1
      return a[0].localeCompare(b[0])
    })
    .map(([country, group]) => {
      const eventsByState = new Map()
      for (const event of group.events) {
        const state = clean(event.state)
        if (!eventsByState.has(state)) eventsByState.set(state, [])
        eventsByState.get(state).push(event)
      }

      return {
        country,
        states: [...group.states].sort((a, b) => a.localeCompare(b)),
        cities: uniqueCities(group.events),
        citiesByState: Object.fromEntries(
          [...eventsByState.entries()].map(([state, list]) => [
            state,
            uniqueCities(list),
          ]),
        ),
      }
    })
}

function StateBlock({ state, cities, expanded, onToggle, onChooseEvent }) {
  return (
    <div className={expanded ? 'find-state find-state--expanded' : 'find-state'}>
      <TextRow active={expanded} expanded={expanded} onClick={() => onToggle(state)}>
        {state}
      </TextRow>
      <div className="find-state__cities" aria-hidden={!expanded}>
        <div className="find-state__cities-inner">
          {cities.map(({ city, event }) => (
            <TextRow
              key={city}
              city
              onClick={() => onChooseEvent(event)}
            >
              {city}
            </TextRow>
          ))}
        </div>
      </div>
    </div>
  )
}

function CountryGroup({
  group,
  expandedState,
  onToggleState,
  onChooseEvent,
  revealCities = false,
}) {
  const regions = group.states.filter((state) => !sameName(state, group.country))
  const countryCities = group.cities.filter((item) =>
    sameName(item.event.state, group.country),
  )

  const rows = []

  if (regions.length === 0) {
    for (const { city, event } of group.cities) {
      rows.push({
        key: `city-${city}`,
        type: 'city',
        label: city,
        event,
      })
    }
  } else {
    for (const state of regions) {
      rows.push({
        key: `state-${state}`,
        type: 'state',
        label: state,
      })
    }
    for (const { city, event } of countryCities) {
      rows.push({
        key: `city-${city}`,
        type: 'city',
        label: city,
        event,
      })
    }
  }

  rows.sort((a, b) => a.label.localeCompare(b.label))

  return (
    <div className="find-event__group">
      <TextRow country>{group.country}</TextRow>
      {rows.map((row) =>
        row.type === 'state' ? (
          <StateBlock
            key={row.key}
            state={row.label}
            cities={group.citiesByState[row.label] || []}
            expanded={revealCities || expandedState === row.label}
            onToggle={onToggleState}
            onChooseEvent={onChooseEvent}
          />
        ) : (
          <TextRow
            key={row.key}
            city
            onClick={() => onChooseEvent(row.event)}
          >
            {row.label}
          </TextRow>
        ),
      )}
    </div>
  )
}

export default function FindEventPage({ brand }) {
  const [query, setQuery] = useState('')
  const [expandedState, setExpandedState] = useState(null)
  const [route, setRoute] = useState(() => parseFindRoute())

  useEffect(() => {
    function syncFromHash() {
      setRoute(parseFindRoute())
    }

    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  const usableEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          clean(event.state) && clean(event.city) && hasSetDate(event),
      ),
    [],
  )

  const groupedLocations = useMemo(
    () => groupStatesByCountry(usableEvents),
    [usableEvents],
  )

  const selectedEvent =
    usableEvents.find((event) => event.id === route.eventId) || null
  const selectedDate = (selectedEvent?.dates || []).find(
    (item) => item.date === route.date,
  )
  const quantities = useMemo(() => {
    if (!selectedEvent || !route.date) return emptyQuantities()
    if (route.view === 'list' || route.view === 'detail') return emptyQuantities()
    return loadCart(selectedEvent.id, route.date) || emptyQuantities()
  }, [selectedEvent, route.date, route.view])
  const normalizedQuery = query.trim().toLowerCase()

  useEffect(() => {
    if (route.eventId && !selectedEvent) {
      window.location.hash = listHash()
    }
  }, [route.eventId, selectedEvent])

  useEffect(() => {
    if (!selectedEvent || !route.date) return
    if (!selectedDate) {
      window.location.hash = detailHash(selectedEvent.id)
      return
    }
    if (route.view !== 'pay' && route.view !== 'confirm') return
    const cart = loadCart(selectedEvent.id, route.date) || emptyQuantities()
    if (cartTotalCents(cart) <= 0) {
      window.location.hash = ticketsHash(selectedEvent.id, route.date)
    }
  }, [route.view, route.date, selectedEvent, selectedDate])

  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return groupedLocations
    return groupedLocations
      .map((group) => {
        const countryHits = matchesQuery(group.country, normalizedQuery)
        const citiesByState = Object.fromEntries(
          Object.entries(group.citiesByState)
            .map(([state, cities]) => {
              const keepAllCities =
                countryHits || matchesQuery(state, normalizedQuery)
              const filtered = keepAllCities
                ? cities
                : cities.filter(({ city }) => matchesCityQuery(city, normalizedQuery))
              return [state, filtered]
            })
            .filter(([, cities]) => cities.length > 0),
        )
        const states = group.states.filter((state) => citiesByState[state])
        const cities = group.cities.filter(({ city, event }) => {
          if (countryHits || matchesQuery(event.state, normalizedQuery)) {
            return true
          }
          return matchesCityQuery(city, normalizedQuery)
        })
        return {
          ...group,
          states,
          cities,
          citiesByState,
        }
      })
      .filter((group) => group.states.length > 0 || group.cities.length > 0)
  }, [groupedLocations, normalizedQuery])

  function toggleState(state) {
    setExpandedState((current) => (current === state ? null : state))
  }

  function chooseEvent(event) {
    setQuery('')
    setExpandedState(clean(event.state))
    window.location.hash = detailHash(event.id)
  }

  function goBackToList() {
    window.location.hash = listHash()
  }

  function goBackToDetail() {
    if (selectedEvent) window.location.hash = detailHash(selectedEvent.id)
  }

  function goBackToTickets() {
    if (selectedEvent && route.date) {
      window.location.hash = ticketsHash(selectedEvent.id, route.date)
    }
  }

  function handleSearch(value) {
    setQuery(value)
    const nextQuery = value.trim().toLowerCase()
    if (!nextQuery) {
      setExpandedState(null)
      return
    }

    const hitStates = new Set()
    for (const event of usableEvents) {
      if (
        matchesQuery(event.state, nextQuery) ||
        matchesQuery(event.city, nextQuery)
      ) {
        hitStates.add(clean(event.state))
      }
    }
    setExpandedState(hitStates.size === 1 ? [...hitStates][0] : null)
  }

  const showSearchResults = Boolean(normalizedQuery) && !selectedEvent
  const showLocations = !selectedEvent && !normalizedQuery

  return (
    <div className="find-event">
      <div className="find-event__main">
        {brand}
        <div
          className={
            selectedEvent
              ? route.view === 'detail'
                ? 'find-event__browser find-event__browser--detail'
                : 'find-event__browser find-event__browser--detail find-event__browser--checkout'
              : 'find-event__browser'
          }
        >
          {!selectedEvent && (
            <EventSearch
              id="event-search-main"
              value={query}
              onChange={handleSearch}
            />
          )}

          {selectedEvent && route.view === 'tickets' && selectedDate ? (
            <TicketCheckout
              event={selectedEvent}
              date={route.date}
              onBack={goBackToDetail}
            />
          ) : selectedEvent && route.view === 'pay' && selectedDate ? (
            <PaymentPage
              event={selectedEvent}
              date={route.date}
              quantities={quantities}
              onBack={goBackToTickets}
            />
          ) : selectedEvent && route.view === 'confirm' && selectedDate ? (
            <ConfirmationPage
              event={selectedEvent}
              date={route.date}
              quantities={quantities}
            />
          ) : selectedEvent ? (
            <EventDetail event={selectedEvent} onBack={goBackToList} />
          ) : (
          <div
            className={
              showSearchResults
                ? 'find-event__list find-event__list--searching'
                : 'find-event__list'
            }
          >
            {showSearchResults && (
              <>
                {visibleGroups.map((group) => (
                  <CountryGroup
                    key={group.country}
                    group={group}
                    expandedState={expandedState}
                    onToggleState={toggleState}
                    onChooseEvent={chooseEvent}
                    revealCities
                  />
                ))}
                {visibleGroups.length === 0 && (
                  <TextRow muted>No matching cities or states</TextRow>
                )}
              </>
            )}

            {showLocations &&
              visibleGroups.map((group) => (
                <CountryGroup
                  key={group.country}
                  group={group}
                  expandedState={expandedState}
                  onToggleState={toggleState}
                  onChooseEvent={chooseEvent}
                />
              ))}
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
