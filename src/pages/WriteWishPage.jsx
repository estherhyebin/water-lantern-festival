import { useCallback, useEffect, useId, useRef, useState } from 'react'
import WishField from '../components/WishField.jsx'
import { WISH_MAX_LENGTH, submitWish } from '../lib/wishesApi.js'
import './WriteWishPage.css'

const MESSAGES = {
  empty: 'Please write a wish before submitting.',
  'too-long': `Please keep your wish under ${WISH_MAX_LENGTH} characters.`,
  offline: 'The wish lanterns are not connected yet. Your wish was not saved.',
  unavailable:
    'Your wish could not be checked right now. Please try again in a moment.',
  'submit-failed': 'Your wish could not be submitted. Please try again.',
  load: 'The wish lanterns could not be loaded right now.',
}

export default function WriteWishPage({ brand }) {
  const inputId = useId()
  const titleId = useId()
  const inputRef = useRef(null)
  const closeRef = useRef(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [incomingWish, setIncomingWish] = useState(null)
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null)

  const handleStatus = useCallback((result) => {
    if (result.error) setNotice(MESSAGES.load)
  }, [])

  function closeModal() {
    setModal(null)
    inputRef.current?.focus()
  }

  useEffect(() => {
    if (!modal) return undefined
    closeRef.current?.focus()
    function onKey(event) {
      if (event.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal])

  async function handleSubmit(event) {
    event.preventDefault()
    if (busy) return
    const text = draft.replace(/\s+/g, ' ').trim()
    if (!text) {
      setNotice(MESSAGES.empty)
      return
    }

    setBusy(true)
    setNotice('')
    const result = await submitWish(text)
    setBusy(false)

    if (result.reason === 'moderation') {
      setModal({
        title: 'Please rewrite your wish',
        body: 'Please rewrite your wish without inappropriate or hateful language.',
      })
      return
    }
    if (!result.ok) {
      setNotice(MESSAGES[result.reason] || MESSAGES['submit-failed'])
      return
    }

    setDraft('')
    setIncomingWish(result.wish)
    setNotice('')
  }

  return (
    <div className="write-wish">
      <WishField incomingWish={incomingWish} onStatus={handleStatus} />
      <div className="write-wish__chrome">
        {brand}
        <form className="wish-composer" onSubmit={handleSubmit}>
          <label className="wish-composer__label" htmlFor={inputId} id="wish-label">
            Write a wish :
          </label>
          <div className="wish-composer__row">
            <input
              ref={inputRef}
              id={inputId}
              className="wish-composer__input"
              type="text"
              value={draft}
              maxLength={WISH_MAX_LENGTH}
              autoComplete="off"
              onChange={(event) => {
                setDraft(event.target.value)
                if (notice) setNotice('')
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSubmit(event)
              }}
            />
            <button className="wish-composer__submit" type="submit" disabled={busy}>
              Submit →
            </button>
          </div>
          {notice ? (
            <p className="wish-composer__notice" role="status">
              {notice}
            </p>
          ) : null}
        </form>
      </div>

      {modal ? (
        <div
          className="wish-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="wish-modal__panel">
            <h2 id={titleId} className="wish-modal__title">
              {modal.title}
            </h2>
            <p className="wish-modal__body">{modal.body}</p>
            <button
              ref={closeRef}
              type="button"
              className="wish-modal__close"
              onClick={closeModal}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
