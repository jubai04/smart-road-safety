import { useApp } from "../context/AppContext";

export default function Reports() {
  const {
    eventHistory,
    safetyScore,
    safeResponses,
    violations,
    reportStatus,
    fineApplicable,
  } = useApp();

  return (
    <>
      <section className="section" id="history">
        <div className="section-label">EVENT HISTORY</div>
        <h2>Recent Safety Events</h2>
        <p>
          Every meaningful road and driver event is recorded by the safety
          system.
        </p>

        <div style={{ maxWidth: "1340px", margin: "50px auto 0" }}>
          {eventHistory.length === 0 ? (
            <div className="solution-card">
              <div className="card-icon">📋</div>
              <h3>No events yet</h3>
              <p>
                Start monitoring to begin recording safety events.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {eventHistory.map((event) => (
                <div
                  key={event.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "45px 150px 1fr auto",
                    alignItems: "center",
                    gap: "15px",
                    padding: "16px 20px",
                    background: "#141822",
                    border: "1px solid #292e3c",
                    borderRadius: "14px",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "22px" }}>{event.icon}</span>
                  <strong style={{ fontSize: "11px", letterSpacing: "1px" }}>
                    {event.type}
                  </strong>
                  <div>
                    <strong>{event.message}</strong>
                    <small
                      style={{
                        display: "block",
                        color: "#858da0",
                        marginTop: "4px",
                      }}
                    >
                      {event.detail}
                    </small>
                  </div>
                  <small style={{ color: "#737b8e" }}>{event.time}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-section" id="report">
        <div className="section-label">MONTHLY SAFETY REPORT</div>
        <h2>Driver Performance</h2>
        <p className="dashboard-intro">
          A monthly-style summary of driver behaviour and safety performance.
        </p>

        <div
          style={{
            maxWidth: "1340px",
            margin: "40px auto",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "18px",
          }}
        >
          <div className="stat-card">
            <span>🛡️ SAFETY SCORE</span>
            <strong>{safetyScore}</strong>
            <small>/ 100</small>
          </div>

          <div className="stat-card">
            <span>⚠️ VIOLATIONS</span>
            <strong>{violations}</strong>
            <small>recorded</small>
          </div>

          <div className="stat-card">
            <span>✅ SAFE RESPONSES</span>
            <strong>{safeResponses}</strong>
            <small>successful responses</small>
          </div>

          <div className="stat-card">
            <span>📄 STATUS</span>
            <strong style={{ fontSize: "25px" }}>{reportStatus}</strong>
            <small>current assessment</small>
          </div>
        </div>

        <div
          className={`safety-banner ${fineApplicable ? "danger" : "safe"}`}
          style={{ maxWidth: "1340px" }}
        >
          <div>
            <span className="status-label">MONTH-END ASSESSMENT</span>
            <h3>
              {fineApplicable
                ? "⚠️ Fine Applicable"
                : "✅ No Fine Applicable"}
            </h3>
            <p>
              {fineApplicable
                ? "One or more safety violations were recorded during the monitoring period."
                : "No violations have been recorded during the monitoring period."}
            </p>
          </div>
          <div className="risk-value">{safetyScore}/100</div>
        </div>
      </section>
    </>
  );
}
