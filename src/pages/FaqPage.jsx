import { useId, useState } from 'react'
import minusIcon from '../assets/figma/faq-minus.svg'
import plusIcon from '../assets/figma/faq-plus.svg'
import { FAQ_ITEMS } from '../data/faqItems.js'
import './FaqPage.css'

function AnswerText({ parts }) {
  if (typeof parts === 'string') return parts
  return parts.map((part, index) => {
    if (typeof part === 'string') return <span key={index}>{part}</span>
    if (part.email) {
      return (
        <a key={part.email} href={`mailto:${part.email}`}>
          {part.email}
        </a>
      )
    }
    return null
  })
}

export default function FaqPage({ brand }) {
  const baseId = useId()
  const [openId, setOpenId] = useState(null)

  function toggle(id) {
    setOpenId((current) => (current === id ? null : id))
  }

  return (
    <div className="faq">
      <div className="faq__main">
        {brand}
        <div className="faq__content">
          <h1 className="faq__heading">Your questions answered</h1>
          <div className="faq__list">
            {FAQ_ITEMS.map((item) => {
              const open = openId === item.id
              const panelId = `${baseId}-${item.id}`
              return (
                <div
                  key={item.id}
                  className={open ? 'faq-item faq-item--open' : 'faq-item'}
                >
                  <button
                    type="button"
                    className="faq-item__button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => toggle(item.id)}
                  >
                    <span className="faq-item__label">
                      <span className="faq-item__prefix">Q :</span>
                      <span>{item.question}</span>
                    </span>
                    <img
                      className="faq-item__icon"
                      src={open ? minusIcon : plusIcon}
                      alt=""
                      width={16}
                      height={16}
                    />
                  </button>
                  <div
                    className="faq-item__answer"
                    id={panelId}
                    inert={open ? undefined : true}
                  >
                    <div className="faq-item__answer-inner">
                      {item.paragraphs.map((paragraph, index) => (
                        <p key={index}>
                          <AnswerText parts={paragraph} />
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
