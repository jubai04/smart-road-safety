import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
    <section className="hero" id="home">

      <div className="hero-content">

        <div className="badge">
          🛡️ Technology for Safer Roads
        </div>

        <h1>
          Making roads
          <span>
            smarter and safer.
          </span>
        </h1>

        <p>
          Smart Road Safety uses
          intelligent monitoring to
          detect road environments,
          understand driver behaviour
          and provide timely safety
          warnings.
        </p>

        <div className="hero-buttons">

          <Link
            to="/dashboard"
            className="primary-button"
          >
            Explore Dashboard →
          </Link>

          <a
            href="#solution"
            className="secondary-button"
          >
            Learn More
          </a>

        </div>

      </div>

      <div className="road-visual">

        <div className="traffic-light">

          <div className="light red"></div>

          <div className="light yellow"></div>

          <div className="light green"></div>

        </div>

        <div className="road">

          <div className="road-lines"></div>

          <div className="car">
            🚗
          </div>

        </div>

      </div>

    </section>

    <section
      className="section problem"
      id="problem"
    >

      <div className="section-label">
        THE PROBLEM
      </div>

      <h2>
        Every second matters
        on the road.
      </h2>

      <p>
        Drivers may not receive
        enough warning about unsafe
        speeds, road hazards,
        emergency vehicles and
        changing road environments.
      </p>

    </section>

    <section
      className="section"
      id="solution"
    >

      <div className="section-label">
        OUR SOLUTION
      </div>

      <h2>
        Smart technology.
        Real-world safety.
      </h2>

      <div className="solution-grid">

        <Link
          to="/dashboard#map"
          className="solution-card"
        >

          <div className="card-icon">
            📡
          </div>

          <h3>
            Autonomous Detection
          </h3>

          <p>
            Automatically detect
            schools, hospitals,
            construction zones,
            accidents and important
            road environments.
          </p>

        </Link>

        <Link
          to="/dashboard#dashboard"
          className="solution-card"
        >

          <div className="card-icon">
            🧠
          </div>

          <h3>
            Driver Intelligence
          </h3>

          <p>
            Compare driver speed,
            recommended speed and
            distance to determine
            whether the driver reacts
            safely.
          </p>

        </Link>

        <Link
          to="/reports#driver-performance"
          className="solution-card"
        >

          <div className="card-icon">
            🛡️
          </div>

          <h3>
            Safety Scoring
          </h3>

          <p>
            Safe responses increase
            the safety score while
            violations reduce it.
          </p>

        </Link>

      </div>

    </section>

    <section className="section">

      <div className="section-label">
        FUTURE CLOUD SYSTEM
      </div>

      <h2>
        From dashboard to connected
        safety platform.
      </h2>

      <p>
        The current prototype performs
        the intelligence locally in the
        browser. The next stage can
        connect this system to a backend
        database, vehicle hardware and
        an automated monthly email
        service.
      </p>

    </section>
    </>
  );
}
