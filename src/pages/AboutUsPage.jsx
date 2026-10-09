import CrossfadeGallery from '../components/CrossfadeGallery.jsx'
import './AboutUsPage.css'

export default function AboutUsPage({ brand }) {
  return (
    <div className="about-us">
      <div className="about-us__main">
        {brand}
        <div className="about-us__content">
          <div className="about-us__copy">
            <h1 className="about-us__heading">About the event</h1>
            <p className="about-us__body">
              The Water Lantern Festival is a quiet sanctuary of light to honor
              the life you’ve lived and the love you’ve shared. Write down your
              dreams, let go of your worries, or remember a loved one, and
              release your lantern among hundreds of others in an unforgettable
              evening of human connection.
            </p>
          </div>

          <dl className="about-us__stats">
            <div>
              <dt className="visually-hidden">Years running</dt>
              <dd>8+ Years running</dd>
            </div>
            <div>
              <dt className="visually-hidden">Cities worldwide</dt>
              <dd>175+ Cities worldwide</dd>
            </div>
            <div>
              <dt className="visually-hidden">Lanterns launched</dt>
              <dd>2m+ Lanterns launched</dd>
            </div>
          </dl>

          <CrossfadeGallery />

          <a className="about-us__cta" href="#find-an-event">
            Find an event near you →
          </a>
        </div>
      </div>
    </div>
  )
}
