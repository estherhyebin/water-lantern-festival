import './Navigation.css'

const items = [
  { label: 'Find an event', href: '#find-an-event' },
  { label: 'Write a wish', href: '#write-a-wish' },
  { label: 'About us', href: '#about-us' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
]

function Navigation() {
  return (
    <nav className="navigation" aria-label="Primary">
      <ul className="navigation__list">
        {items.map((item) => (
          <li key={item.href} className="navigation__item">
            <a href={item.href}>{item.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default Navigation
