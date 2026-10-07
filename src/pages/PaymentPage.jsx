import { useState } from 'react'
import backArrow from '../assets/figma/back-arrow.svg'
import {
  cartTotalCents,
  formatMoney,
  selectedTicketLines,
} from '../data/ticketOffers.js'
import {
  confirmHash,
  formatEventWhen,
  locationLabel,
} from './findRoute.js'
import './TicketCheckout.css'

export default function PaymentPage({ event, date, quantities, onBack }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    cardNumber: '',
    expiration: '',
    cvc: '',
  })
  const [error, setError] = useState('')

  const selectedDate = (event.dates || []).find((item) => item.date === date)
  const when = formatEventWhen(date, selectedDate?.startTime)
  const place = locationLabel(event)
  const lines = selectedTicketLines(quantities)
  const total = formatMoney(cartTotalCents(quantities))

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
  }

  function submit(eventObject) {
    eventObject.preventDefault()
    const missing = Object.entries(form).find(([, value]) => !String(value).trim())
    if (missing) {
      setError('Please fill in every field to continue this prototype checkout.')
      return
    }
    setError('')
    window.location.hash = confirmHash(event.id, date)
  }

  return (
    <div className="ticket-pay">
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

      <div className="ticket-pay__summary">
        <p>{place}</p>
        {lines.map((line) => (
          <p key={line.id}>
            {line.quantity} × {line.name} — {line.total}
          </p>
        ))}
        <p>Total: {total}</p>
        <p>This is a prototype. No real payment is processed.</p>
      </div>

      <form className="ticket-pay__form" onSubmit={submit} autoComplete="off">
        <label className="ticket-pay__field">
          <span className="ticket-pay__label">First name</span>
          <input
            className="ticket-pay__input"
            name="firstName"
            required
            value={form.firstName}
            onChange={(event) => updateField('firstName', event.target.value)}
          />
        </label>
        <label className="ticket-pay__field">
          <span className="ticket-pay__label">Last name</span>
          <input
            className="ticket-pay__input"
            name="lastName"
            required
            value={form.lastName}
            onChange={(event) => updateField('lastName', event.target.value)}
          />
        </label>
        <label className="ticket-pay__field">
          <span className="ticket-pay__label">Email</span>
          <input
            className="ticket-pay__input"
            type="email"
            name="email"
            required
            value={form.email}
            onChange={(event) => updateField('email', event.target.value)}
          />
        </label>
        <label className="ticket-pay__field">
          <span className="ticket-pay__label">Card number</span>
          <input
            className="ticket-pay__input"
            name="cardNumber"
            inputMode="numeric"
            autoComplete="off"
            required
            value={form.cardNumber}
            onChange={(event) => updateField('cardNumber', event.target.value)}
          />
        </label>
        <div className="ticket-pay__row">
          <label className="ticket-pay__field">
            <span className="ticket-pay__label">Expiration date</span>
            <input
              className="ticket-pay__input"
              name="expiration"
              placeholder="MM/YY"
              autoComplete="off"
              required
              value={form.expiration}
              onChange={(event) => updateField('expiration', event.target.value)}
            />
          </label>
          <label className="ticket-pay__field">
            <span className="ticket-pay__label">CVC</span>
            <input
              className="ticket-pay__input"
              name="cvc"
              inputMode="numeric"
              autoComplete="off"
              required
              value={form.cvc}
              onChange={(event) => updateField('cvc', event.target.value)}
            />
          </label>
        </div>
        {error ? <p className="ticket-checkout__hint">{error}</p> : null}
        <button type="submit" className="ticket-pay__submit">
          Complete prototype payment →
        </button>
      </form>
    </div>
  )
}
