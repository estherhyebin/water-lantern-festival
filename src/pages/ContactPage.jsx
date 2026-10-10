import { useId, useState } from 'react'
import { submitContact } from '../lib/contactApi.js'
import './ContactPage.css'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  location: '',
  date: '',
  message: '',
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseFestivalDate(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d{2})\s*-\s*(\d{2})\s*-\s*(\d{4})$/)
  if (!match) return null
  const month = Number(match[1])
  const day = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

function validate(form) {
  const errors = {}
  if (!form.firstName.trim()) errors.firstName = 'Please enter your first name.'
  if (!form.lastName.trim()) errors.lastName = 'Please enter your last name.'
  if (!form.email.trim()) {
    errors.email = 'Please enter your email address.'
  } else if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = 'Please enter a valid email address.'
  }
  if (form.date.trim() && !parseFestivalDate(form.date)) {
    errors.date = 'Please use a real date in the form MM - DD - YYYY.'
  }
  if (!form.message.trim()) errors.message = 'Please enter a message.'
  return errors
}

export default function ContactPage({ brand }) {
  const formId = useId()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    if (status) setStatus('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy || sent) return
    const nextErrors = validate(form)
    setErrors(nextErrors)
    const firstError = Object.keys(nextErrors)[0]
    if (firstError) {
      setStatus('Please fill in the required fields before submitting.')
      document.getElementById(`${formId}-${firstError}`)?.focus()
      return
    }

    setBusy(true)
    setStatus('')
    const result = await submitContact({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
      date: form.date.trim(),
      message: form.message.trim(),
    })
    setBusy(false)

    if (result.ok) {
      setSent(true)
      setStatus('Your message was sent.')
      return
    }
    if (result.reason === 'unconfigured') {
      setStatus(
        'This form is not connected to an inbox yet, so your message was not sent. Your answers are still here.',
      )
      return
    }
    setStatus('Your message could not be sent. Please try again. Your answers are still here.')
  }

  function field(name, label, control) {
    const errorId = `${formId}-${name}-error`
    return (
      <div className="contact-field">
        <label htmlFor={`${formId}-${name}`}>{label}</label>
        {control(errorId)}
        {errors[name] ? (
          <p className="contact-field__error" id={errorId}>
            {errors[name]}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="contact">
      <div className="contact__main">
        {brand}
        <form className="contact__content" onSubmit={handleSubmit} noValidate>
          <h1 className="contact__heading">Get in touch with us</h1>
          <div className="contact__fields">
            <div className="contact__row">
              {field('firstName', 'First name', (errorId) => (
                <input
                  id={`${formId}-firstName`}
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  placeholder="ex: John"
                  value={form.firstName}
                  aria-invalid={errors.firstName ? 'true' : undefined}
                  aria-describedby={errors.firstName ? errorId : undefined}
                  onChange={(event) => update('firstName', event.target.value)}
                />
              ))}
              {field('lastName', 'Last name', (errorId) => (
                <input
                  id={`${formId}-lastName`}
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  placeholder="ex: Doe"
                  value={form.lastName}
                  aria-invalid={errors.lastName ? 'true' : undefined}
                  aria-describedby={errors.lastName ? errorId : undefined}
                  onChange={(event) => update('lastName', event.target.value)}
                />
              ))}
            </div>

            <div className="contact__row">
              {field('email', 'Email', (errorId) => (
                <input
                  id={`${formId}-email`}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="ex: myname@example.com"
                  value={form.email}
                  aria-invalid={errors.email ? 'true' : undefined}
                  aria-describedby={errors.email ? errorId : undefined}
                  onChange={(event) => update('email', event.target.value)}
                />
              ))}
              {field('phone', 'Phone number', () => (
                <input
                  id={`${formId}-phone`}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="(000) - 000 - 000"
                  value={form.phone}
                  onChange={(event) => update('phone', event.target.value)}
                />
              ))}
            </div>

            <div className="contact__row">
              {field('location', 'What event location are you attending?', (errorId) => (
                <input
                  id={`${formId}-location`}
                  name="location"
                  type="text"
                  value={form.location}
                  aria-invalid={errors.location ? 'true' : undefined}
                  aria-describedby={errors.location ? errorId : undefined}
                  onChange={(event) => update('location', event.target.value)}
                />
              ))}
              {field('date', 'When is the festival?', (errorId) => (
                <input
                  id={`${formId}-date`}
                  name="date"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="MM - DD - YYYY"
                  value={form.date}
                  aria-invalid={errors.date ? 'true' : undefined}
                  aria-describedby={errors.date ? errorId : undefined}
                  onChange={(event) => update('date', event.target.value)}
                />
              ))}
            </div>

            {field('message', 'Your message:', (errorId) => (
              <textarea
                id={`${formId}-message`}
                name="message"
                required
                value={form.message}
                aria-invalid={errors.message ? 'true' : undefined}
                aria-describedby={errors.message ? errorId : undefined}
                onChange={(event) => update('message', event.target.value)}
              />
            ))}

            {status ? (
              <p className="contact__status" role={sent ? 'status' : 'alert'}>
                {status}
              </p>
            ) : null}

            <button className="contact__submit" type="submit" disabled={busy || sent}>
              {busy ? 'Sending…' : 'Submit →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
