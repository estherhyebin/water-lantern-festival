import {
  cartTotalCents,
  formatMoney,
  selectedTicketLines,
} from '../data/ticketOffers.js'
import {
  detailHash,
  formatEventWhen,
  listHash,
  locationLabel,
} from './findRoute.js'
import './TicketCheckout.css'

export default function ConfirmationPage({ event, date, quantities }) {
  const selectedDate = (event.dates || []).find((item) => item.date === date)
  const when = formatEventWhen(date, selectedDate?.startTime)
  const place = locationLabel(event)
  const lines = selectedTicketLines(quantities)
  const total = formatMoney(cartTotalCents(quantities))

  return (
    <div className="ticket-confirm">
      <h1 className="ticket-checkout__when">You’re all set — prototype only</h1>
      <div className="ticket-confirm__copy">
        <p>
          This confirmation is a front-end demonstration. No card was charged
          and no ticket was issued.
        </p>
        <p>{place}</p>
        <p>{when}</p>
        {lines.map((line) => (
          <p key={line.id}>
            {line.quantity} × {line.name} — {line.total}
          </p>
        ))}
        <p>Total: {total}</p>
      </div>
      <div className="ticket-confirm__actions">
        <a className="ticket-confirm__link" href={detailHash(event.id)}>
          Back to event detail
        </a>
        <a className="ticket-confirm__link" href={listHash()}>
          Back to Find an event
        </a>
      </div>
    </div>
  )
}
