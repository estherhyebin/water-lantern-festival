import { useEffect, useMemo, useState } from 'react'
import backArrow from '../assets/figma/back-arrow.svg'
import QuantitySelect from '../components/QuantitySelect.jsx'
import {
  TICKET_OFFERS,
  cartTotalCents,
  emptyQuantities,
  formatMoney,
} from '../data/ticketOffers.js'
import {
  formatEventWhen,
  loadCart,
  locationLabel,
  payHash,
  saveCart,
} from './findRoute.js'
import './TicketCheckout.css'

export default function TicketCheckout({ event, date, onBack }) {
  const [quantities, setQuantities] = useState(() => {
    return loadCart(event.id, date) || emptyQuantities()
  })

  const selectedDate = (event.dates || []).find((item) => item.date === date)
  const when = formatEventWhen(date, selectedDate?.startTime)
  const place = locationLabel(event)
  const totalCents = useMemo(() => cartTotalCents(quantities), [quantities])
  const canCheckout = totalCents > 0

  useEffect(() => {
    saveCart(event.id, date, quantities)
  }, [event.id, date, quantities])

  function updateQuantity(id, value) {
    setQuantities((current) => ({ ...current, [id]: value }))
  }

  function goToPayment() {
    if (!canCheckout) return
    window.location.hash = payHash(event.id, date)
  }

  return (
    <div className="ticket-checkout">
      <button type="button" className="ticket-checkout__back" onClick={onBack}>
        <img
          src={backArrow}
          alt=""
          width={6.8003}
          height={22}
          className="ticket-checkout__back-arrow"
        />
        {place || 'Back'}
      </button>

      {when ? <h1 className="ticket-checkout__when">{when}</h1> : null}

      {TICKET_OFFERS.map((offer) => (
        <div key={offer.id} className="ticket-offer">
          <div className="ticket-offer__copy">
            <h2 className="ticket-offer__name">{offer.name}</h2>
            <p className="ticket-offer__description">
              {offer.descriptionLines.map((line, index) => (
                <span key={line}>
                  {line}
                  {index < offer.descriptionLines.length - 1 ? <br /> : null}
                </span>
              ))}
            </p>
          </div>
          <div className="ticket-offer__buy">
            <p className="ticket-offer__price">{offer.displayPrice}</p>
            <QuantitySelect
              id={`qty-${offer.id}`}
              label={`Quantity for ${offer.name}`}
              value={quantities[offer.id] || 0}
              increment={offer.increment}
              onChange={(value) => updateQuantity(offer.id, value)}
            />
          </div>
        </div>
      ))}

      <div className="ticket-checkout__footer">
        <p className="ticket-checkout__total">
          <span>Total:</span>
          <span>{formatMoney(totalCents)}</span>
        </p>
        <button
          type="button"
          className={
            canCheckout
              ? 'ticket-checkout__go'
              : 'ticket-checkout__go ticket-checkout__go--disabled'
          }
          onClick={goToPayment}
          aria-disabled={!canCheckout}
        >
          Checkout →
        </button>
        {!canCheckout ? (
          <p className="ticket-checkout__hint">Select at least one ticket</p>
        ) : null}
      </div>
    </div>
  )
}
