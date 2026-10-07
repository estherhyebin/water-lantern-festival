import backArrow from '../assets/figma/back-arrow.svg'
import { quantityOptions } from '../data/ticketOffers.js'
import './QuantitySelect.css'

export default function QuantitySelect({
  id,
  label,
  value,
  increment,
  onChange,
}) {
  const options = quantityOptions(increment)

  return (
    <label className="qty-select" htmlFor={id}>
      <span className="visually-hidden">{label}</span>
      <select
        id={id}
        className="qty-select__control"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <img
        src={backArrow}
        alt=""
        width={6.8003}
        height={22}
        className="qty-select__arrow"
      />
    </label>
  )
}
