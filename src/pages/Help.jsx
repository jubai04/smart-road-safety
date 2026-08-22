import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { helpTopics } from "../context/AppContext";

export default function Help() {
  const { openHelpTopic, setOpenHelpTopic } = useApp();

  return (
    <section className="section" id="help">
      <div className="section-label">HELP CENTRE</div>

      <h2>
        Need a hand?
        We are here to help.
      </h2>

      <p>
        Get started quickly, understand
        the safety tools and find answers
        to common questions.
      </p>

      <div
        style={{
          maxWidth: "1340px",
          margin: "45px auto 0",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "18px",
        }}
      >
        {[
          ["▶", "Start monitoring", "Begin from the Dashboard and allow location access when prompted.", "/dashboard"],
          ["🗺️", "Check the Live Map", "See your position, nearby places and detected road zones.", "/dashboard#map"],
          ["📋", "Review your activity", "Open History to see the safety events recorded in this session.", "/reports"],
        ].map(([icon, title, description, link]) => (
          <Link
            key={title}
            to={link}
            className="solution-card"
            style={{
              textDecoration: "none",
              color: "inherit",
              textAlign: "left",
            }}
          >
            <div className="card-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{description}</p>
            <span style={{ color: "#4fd1c5", fontWeight: 700, fontSize: "14px" }}>
              Open section →
            </span>
          </Link>
        ))}
      </div>

      <div
        style={{
          maxWidth: "1100px",
          margin: "42px auto 0",
          textAlign: "left",
        }}
      >
        <h3 style={{ marginBottom: "14px", fontSize: "22px" }}>
          Frequently asked questions
        </h3>

        {helpTopics.map((topic, index) => {
          const isOpen = openHelpTopic === index;

          return (
            <div
              key={topic.question}
              style={{
                marginBottom: "10px",
                background: "#141822",
                border: isOpen ? "1px solid #4fd1c5" : "1px solid #292e3c",
                borderRadius: "12px",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() => setOpenHelpTopic(isOpen ? -1 : index)}
                aria-expanded={isOpen}
                style={{
                  width: "100%",
                  padding: "18px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "16px",
                  border: 0,
                  background: "transparent",
                  color: "#fff",
                  textAlign: "left",
                  font: "inherit",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {topic.question}
                <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <p
                  style={{
                    margin: "0",
                    padding: "0 20px 20px",
                    color: "#aeb6c7",
                    lineHeight: 1.7,
                  }}
                >
                  {topic.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          maxWidth: "1100px",
          margin: "28px auto 0",
          padding: "22px 24px",
          borderRadius: "14px",
          background: "linear-gradient(135deg, #173b43, #1d2638)",
          border: "1px solid #2f6570",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "18px",
          flexWrap: "wrap",
          textAlign: "left",
        }}
      >
        <div>
          <strong>Still need help?</strong>
          <p style={{ margin: "6px 0 0", color: "#c7d5dd" }}>
            Review your session report and share it with your project team.
          </p>
        </div>
        <Link to="/reports" className="primary-button">
          View my report →
        </Link>
      </div>
    </section>
  );
}
