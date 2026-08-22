import { useApp } from "../context/AppContext";

export default function ReportIssue() {
  const {
    complaintType, setComplaintType,
    complaintLocation, setComplaintLocation,
    complaintDescription, setComplaintDescription,
    complaintPhoto, complaintPhotoPreview,
    complaintSubmitted, setComplaintSubmitted,
    complaintSubmitting, complaintError, setComplaintError,
    reportReference,
    handleComplaintPhotoChange, handleComplaintSubmit,
  } = useApp();

  return (
    <section className="section" id="complaints">

      <div className="section-label">
        PUBLIC REPORTING
      </div>

      <h2>
        Help make your road
        safer for everyone.
      </h2>

      <p>
        Report potholes, damaged traffic
        lights or accidents. Add a photo
        to make the issue easier to verify.
      </p>

      <div
        style={{
          maxWidth: "1200px",
          margin: "45px auto 0",
          padding: "clamp(20px, 4vw, 36px)",
          background: "#141822",
          border: "1px solid #292e3c",
          borderRadius: "18px",
          textAlign: "left",
        }}
      >
        {complaintSubmitted ? (
          <div
            role="status"
            style={{
              padding: "22px",
              borderRadius: "12px",
              background: "#143c35",
              border: "1px solid #2b9b82",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "40px" }}>✅</div>
            <h3 style={{ margin: "10px 0 8px" }}>
              Your report has been submitted
            </h3>
            <p style={{ margin: 0, color: "#c9e7dd" }}>
              Thank you for helping keep the community safer. Your report reference is <strong>{reportReference}</strong>.
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setComplaintSubmitted(false);
                setComplaintError("");
              }}
              style={{ marginTop: "22px", cursor: "pointer" }}
            >
              Submit another report
            </button>
          </div>
        ) : (
          <form onSubmit={handleComplaintSubmit}>
            {complaintError && (
              <div
                role="alert"
                style={{
                  marginBottom: "18px",
                  padding: "14px 16px",
                  background: "#452127",
                  border: "1px solid #bb5c68",
                  borderRadius: "9px",
                  color: "#ffd7dc",
                }}
              >
                {complaintError}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "18px",
              }}
            >
              <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                Issue type
                <select
                  value={complaintType}
                  onChange={(event) => setComplaintType(event.target.value)}
                  style={{ padding: "13px", borderRadius: "9px", border: "1px solid #3a4152", background: "#0e1118", color: "#fff", font: "inherit" }}
                >
                  <option>Pothole</option>
                  <option>Broken traffic light</option>
                  <option>Accident</option>
                  <option>Road damage</option>
                  <option>Other safety concern</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: "8px", fontWeight: 700 }}>
                Location or landmark
                <input
                  type="text"
                  value={complaintLocation}
                  onChange={(event) => setComplaintLocation(event.target.value)}
                  placeholder="e.g. Park Street, near Metro Gate 2"
                  required
                  style={{ padding: "13px", borderRadius: "9px", border: "1px solid #3a4152", background: "#0e1118", color: "#fff", font: "inherit" }}
                />
              </label>
            </div>

            <label style={{ display: "grid", gap: "8px", marginTop: "18px", fontWeight: 700 }}>
              Describe the issue
              <textarea
                value={complaintDescription}
                onChange={(event) => setComplaintDescription(event.target.value)}
                placeholder="Tell us what happened, how serious it is and anything that would help responders find it."
                required
                rows="5"
                style={{ padding: "13px", borderRadius: "9px", border: "1px solid #3a4152", background: "#0e1118", color: "#fff", font: "inherit", resize: "vertical" }}
              />
            </label>

            <div style={{ marginTop: "22px" }}>
              <label htmlFor="complaint-photo" style={{ display: "block", fontWeight: 700, marginBottom: "8px" }}>
                Add a photo <span style={{ color: "#9ea7b8", fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                id="complaint-photo"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleComplaintPhotoChange}
                style={{ color: "#c7cfdd", maxWidth: "100%" }}
              />
              <small style={{ display: "block", color: "#9ea7b8", marginTop: "8px" }}>
                Upload a clear image of the {complaintType.toLowerCase()}. Please avoid including people's faces or number plates where possible.
              </small>

              {complaintPhotoPreview && (
                <div style={{ marginTop: "16px" }}>
                  <img
                    src={complaintPhotoPreview}
                    alt={`Preview of uploaded ${complaintType.toLowerCase()}`}
                    style={{ width: "100%", maxWidth: "420px", maxHeight: "260px", objectFit: "cover", borderRadius: "10px", border: "1px solid #3a4152" }}
                  />
                  <small style={{ display: "block", color: "#9ea7b8", marginTop: "6px" }}>
                    Attached: {complaintPhoto?.name}
                  </small>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="primary-button"
              disabled={complaintSubmitting}
              style={{
                marginTop: "28px",
                border: 0,
                cursor: complaintSubmitting ? "wait" : "pointer",
                opacity: complaintSubmitting ? 0.7 : 1,
              }}
            >
              {complaintSubmitting
                ? "Submitting report..."
                : "Submit safety report →"}
            </button>
          </form>
        )}
      </div>

    </section>
  );
}
