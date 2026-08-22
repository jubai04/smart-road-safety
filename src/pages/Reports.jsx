import { useEffect, useState } from "react";
import { useApp, REPORTS_API_URL } from "../context/AppContext";

const issueTypeIcons = {
  Pothole: "\u{1F573}\uFE0F",
  "Broken traffic light": "\u{1F6A5}",
  Accident: "\u{1F4A5}",
  "Road damage": "\u{1F6E1}\uFE0F",
  "Other safety concern": "\u2139\uFE0F",
};

export default function Reports() {
  const {
    eventHistory,
    safetyScore,
    safeResponses,
    violations,
    reportStatus,
    fineApplicable,
  } = useApp();

  const [submittedReports, setSubmittedReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState("");

  useEffect(() => {
    const fetchReports = async () => {
      setReportsLoading(true);
      setReportsError("");
      try {
        const response = await fetch(REPORTS_API_URL);
        if (!response.ok) {
          throw new Error("Failed to load reports.");
        }
        const data = await response.json();
        setSubmittedReports(data.reports || []);
      } catch (error) {
        setReportsError(error.message || "Unable to load reports.");
      } finally {
        setReportsLoading(false);
      }
    };

    fetchReports();
  }, []);

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

      <section className="section" id="submitted-reports">
        <div className="section-label">SUBMITTED REPORTS</div>
        <h2>Public Road Reports</h2>
        <p>
          Road safety issues reported by the community. Each report is stored
          with a unique reference ID.
        </p>

        <div style={{ maxWidth: "1340px", margin: "50px auto 0" }}>
          {reportsLoading ? (
            <div className="solution-card">
              <div className="card-icon">⏳</div>
              <h3>Loading reports...</h3>
              <p>Fetching submitted reports from the server.</p>
            </div>
          ) : reportsError ? (
            <div className="solution-card">
              <div className="card-icon">⚠️</div>
              <h3>Unable to load reports</h3>
              <p>{reportsError}</p>
            </div>
          ) : submittedReports.length === 0 ? (
            <div className="solution-card">
              <div className="card-icon">📭</div>
              <h3>No reports submitted yet</h3>
              <p>
                Submit a road safety report from the Report Issue page and it
                will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {submittedReports.map((report) => (
                <div
                  key={report.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "45px 1fr auto",
                    alignItems: "start",
                    gap: "15px",
                    padding: "16px 20px",
                    background: "#141822",
                    border: "1px solid #292e3c",
                    borderRadius: "14px",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "22px" }}>
                    {issueTypeIcons[report.issueType] || "\u2139\uFE0F"}
                  </span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                      <strong>{report.issueType}</strong>
                      <small
                        style={{
                          color: "#7c5cff",
                          fontSize: "10px",
                          letterSpacing: "1px",
                          padding: "2px 8px",
                          background: "rgba(124,92,255,0.15)",
                          borderRadius: "6px",
                        }}
                      >
                        {report.reference}
                      </small>
                    </div>
                    <strong
                      style={{
                        display: "block",
                        marginTop: "6px",
                        fontSize: "14px",
                      }}
                    >
                      {report.location}
                    </strong>
                    <p
                      style={{
                        color: "#858da0",
                        marginTop: "4px",
                        fontSize: "13px",
                        lineHeight: "1.5",
                      }}
                    >
                      {report.description}
                    </p>
                    {report.photoUrl && (
                      <img
                        src={report.photoUrl}
                        alt="Reported issue"
                        style={{
                          marginTop: "8px",
                          maxWidth: "200px",
                          maxHeight: "120px",
                          borderRadius: "8px",
                          objectFit: "cover",
                        }}
                      />
                    )}
                  </div>
                  <small style={{ color: "#737b8e", whiteSpace: "nowrap" }}>
                    {new Date(report.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <div className="section-label">MONTHLY SAFETY REPORT</div>
        <h2 id="driver-performance">Driver Performance</h2>
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
