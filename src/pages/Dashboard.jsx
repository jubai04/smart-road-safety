import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const createMapIcon = (emoji, background = "#111827") =>
  L.divIcon({
    className: "custom-map-icon",
    html: `
      <div style="
        width:38px;
        height:38px;
        border-radius:50%;
        background:${background};
        border:2px solid rgba(255,255,255,0.9);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:20px;
        box-shadow:0 4px 14px rgba(0,0,0,0.35);
      ">
        ${emoji}
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });

const driverIcon = createMapIcon("🚗", "#2563eb");
const schoolIcon = createMapIcon("🏫", "#7c3aed");
const hospitalIcon = createMapIcon("🏥", "#dc2626");
const constructionIcon = createMapIcon("🚧", "#d97706");

function MapCenter({ position }) {
  const map = useMap();

  useEffect(() => {
    if (position) {
      map.setView(position, 15, {
        animate: true,
      });
    }
  }, [position, map]);

  return null;
}

export default function Dashboard() {
  const {
    monitoring,
    speed,
    setSpeed,
    wetRoad,
    setWetRoad,
    hazard,
    setHazard,
    toggleMonitoring,
    vehicles,
    roadZones,
    roadMessage,
    safetyScore,
    safeResponses,
    violations,
    recommendedSpeed,
    risk,
    riskClass,
    safetyMessage,
    speechSupported,
    userLocation,
    driverHeading,
    mapPlaces,
    mapLoading,
    mapError,
    locationPermission,
    fetchNearbyPlaces,
    nearestVehicle,
    closingSpeed,
    ttc,
    mapPosition,
  } = useApp();

  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [hash]);

  return (
    <section className="dashboard-section" id="dashboard">

      <div className="section-label">LIVE SAFETY SYSTEM</div>

      <h2>Driver Safety Dashboard</h2>

      <p className="dashboard-intro">
        Start monitoring and allow
        the autonomous road environment
        to generate events around your
        vehicle.
      </p>

      <div
        style={{
          maxWidth: "1340px",
          margin: "0 auto 20px",
          padding: "12px 18px",
          borderRadius: "12px",
          background: speechSupported ? "#111722" : "#2a1717",
          border: speechSupported ? "1px solid #293141" : "1px solid #5b2929",
          color: speechSupported ? "#aeb7c9" : "#ff8f8f",
          fontSize: "13px",
          textAlign: "center",
        }}
      >
        {speechSupported
          ? "🔊 Voice safety alerts enabled — warning messages only"
          : "⚠️ Voice alerts are not supported by this browser"}
      </div>

      <div className={`safety-banner ${riskClass}`}>

        <div>

          <span className="status-label">CURRENT SAFETY STATUS</span>

          <h3>
            {risk === "LOW" && "🟢 ROAD STATUS: SAFE"}
            {risk === "MEDIUM" && "🟠 CAUTION: DRIVE CAREFULLY"}
            {risk === "HIGH" && "🔴 WARNING: DANGER DETECTED"}
          </h3>

          <p>{safetyMessage}</p>

        </div>

        <div className="risk-value">{risk}</div>

      </div>

      <div className="stats-grid">

        <div className="stat-card">
          <span>🚗 YOUR SPEED</span>
          <strong>{speed}</strong>
          <small>km/h</small>
        </div>

        <div className="stat-card">
          <span>🎯 RECOMMENDED</span>
          <strong>{recommendedSpeed}</strong>
          <small>km/h</small>
        </div>

        <div className="stat-card">
          <span>📏 NEAREST VEHICLE</span>
          <strong>
            {nearestVehicle ? Math.round(nearestVehicle.distance) : "--"}
          </strong>
          <small>{nearestVehicle ? "meters" : "no vehicle"}</small>
        </div>

        <div className="stat-card">
          <span>📉 CLOSING SPEED</span>
          <strong>{nearestVehicle ? closingSpeed : "--"}</strong>
          <small>km/h</small>
        </div>

        <div className="stat-card">
          <span>⏱️ TIME TO COLLISION</span>
          <strong>{ttc !== null ? ttc : "--"}</strong>
          <small>seconds</small>
        </div>

        <div className="stat-card">
          <span>🛡️ SAFETY SCORE</span>
          <strong>{safetyScore}</strong>
          <small>/ 100</small>
        </div>

        <div className="stat-card">
          <span>✅ SAFE RESPONSES</span>
          <strong>{safeResponses}</strong>
          <small>events</small>
        </div>

        <div className="stat-card">
          <span>⚠️ VIOLATIONS</span>
          <strong>{violations}</strong>
          <small>events</small>
        </div>

      </div>

      <div className="control-panel">

        <div className="control-header">

          <div>
            <h3>Driving Simulation</h3>
            <p>Control the driver's behaviour and road conditions.</p>
          </div>

          <button
            className={monitoring ? "stop-button" : "start-button"}
            onClick={toggleMonitoring}
          >
            {monitoring ? "⏹ Stop Monitoring" : "▶ Start Monitoring"}
          </button>

        </div>

        <div className="controls">

          <div className="control">
            <label>
              Your speed: <strong> {speed} km/h</strong>
            </label>
            <input
              type="range"
              min="0"
              max="120"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            />
          </div>

          <div className="control">
            <label>
              Road condition: <strong> {wetRoad ? "Wet" : "Dry"}</strong>
            </label>
            <button
              className={wetRoad ? "toggle active" : "toggle"}
              onClick={() => setWetRoad((current) => !current)}
            >
              🌧️ {wetRoad ? "Wet Road: ON" : "Wet Road: OFF"}
            </button>
          </div>

        </div>

        <div className="toggle-controls">
          <button
            className={hazard ? "toggle danger-toggle" : "toggle"}
            onClick={() => setHazard((current) => !current)}
          >
            ⚠️ {hazard ? "Hazard Detected" : "Simulate Road Hazard"}
          </button>
        </div>

      </div>

      <div className="road-monitor" id="map" style={{ marginTop: "30px" }}>

        <div className="road-header">

          <div>
            <h3>🗺️ Live Road Intelligence Map</h3>
            <p style={{ margin: "5px 0 0", color: "#858da0", fontSize: "13px" }}>
              Real-world safety locations detected from OpenStreetMap
            </p>
          </div>

          <span className={userLocation ? "live-dot" : "offline-dot"}>
            ● {userLocation ? "LOCATION ACTIVE" : "LOCATION WAITING"}
          </span>

        </div>

        <div
          style={{
            padding: "15px 20px",
            background: "#111722",
            borderBottom: "1px solid #293141",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "15px",
            flexWrap: "wrap",
          }}
        >

          <div>
            {locationPermission === "granted" && <span>📍 GPS location active</span>}
            {locationPermission === "requesting" && <span>📍 Requesting your location...</span>}
            {locationPermission === "denied" && (
              <span style={{ color: "#ff8f8f" }}>⚠️ Location access denied</span>
            )}
            {locationPermission === "unsupported" && <span>⚠️ Geolocation unavailable</span>}
          </div>

          <div style={{ color: "#858da0", fontSize: "13px" }}>
            {typeof driverHeading === "number"
              ? `🧭 Heading ${Math.round(driverHeading)}°`
              : "🧭 Heading unavailable — nearby places still shown"}
          </div>

          <button
            className="toggle"
            onClick={() => {
              if (userLocation) {
                fetchNearbyPlaces(userLocation.lat, userLocation.lng);
              }
            }}
            disabled={mapLoading || !userLocation}
          >
            {mapLoading ? "🔄 Loading..." : "🔄 Refresh Map Data"}
          </button>

        </div>

        <div style={{ width: "100%", height: "500px" }}>

          <MapContainer
            center={mapPosition}
            zoom={15}
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom={true}
          >

            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url={import.meta.env.VITE_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"}
            />

            <MapCenter
              position={
                userLocation ? [userLocation.lat, userLocation.lng] : null
              }
            />

            {userLocation && (
              <>
                <Marker
                  position={[userLocation.lat, userLocation.lng]}
                  icon={driverIcon}
                >
                  <Popup>
                    <strong>🚗 You are here</strong>
                    <br />
                    Smart Road Safety vehicle location
                  </Popup>
                </Marker>

                <Circle
                  center={[userLocation.lat, userLocation.lng]}
                  radius={3000}
                  pathOptions={{ fillOpacity: 0.04, weight: 1 }}
                />
              </>
            )}

            {mapPlaces.map((place) => {
              let icon = schoolIcon;
              if (place.type === "hospital") icon = hospitalIcon;
              if (place.type === "construction") icon = constructionIcon;

              return (
                <Marker key={place.id} position={[place.lat, place.lng]} icon={icon}>
                  <Popup>
                    <strong>{place.icon} {place.name}</strong>
                    <br />
                    Type: {place.type}
                    <br />
                    Distance: {Math.round(place.distance)} m
                    <br />
                    Recommended: {place.speedLimit} km/h
                  </Popup>
                </Marker>
              );
            })}

          </MapContainer>

        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "15px",
            padding: "15px 20px",
            background: "#111722",
            borderTop: "1px solid #293141",
          }}
        >
          <span>🚗 Your Location</span>
          <span>🏫 Schools</span>
          <span>🏥 Hospitals</span>
          <span>🚧 Construction</span>
        </div>

        <div
          style={{
            padding: "18px 20px",
            background: "#0e121a",
            borderTop: "1px solid #293141",
          }}
        >
          {mapError && (
            <p style={{ color: "#ff8f8f", margin: "0 0 10px" }}>{mapError}</p>
          )}
          <p style={{ margin: "0", color: "#858da0", fontSize: "13px" }}>
            {mapPlaces.length > 0
              ? `📡 ${mapPlaces.length} mapped safety locations detected within approximately 3 km.`
              : "📡 No mapped safety locations detected yet."}
          </p>
        </div>

      </div>

      <div className="road-monitor">

        <div className="road-header">
          <h3>Live Road View</h3>
          <span className={monitoring ? "live-dot" : "offline-dot"}>
            ● {monitoring ? "LIVE MONITORING" : "MONITORING OFF"}
          </span>
        </div>

        <div className="road-scene">

          <div className="road-center-line"></div>

          {vehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="vehicle-ahead"
              style={{ bottom: `${Math.min(vehicle.distance * 1.2, 78)}%` }}
            >
              <div>{vehicle.emoji}</div>
              <span>{Math.round(vehicle.distance)}m</span>
              <small>{vehicle.speed} km/h</small>
            </div>
          ))}

          {roadZones.map((zone) => {
            const laneOffset = zone.lane * 65;
            return (
              <div
                key={zone.id}
                className={`road-zone-marker ${zone.color}-marker`}
                style={{
                  bottom: `${Math.min(Math.max(zone.distance * 1.2, 8), 78)}%`,
                  left: `calc(50% + ${laneOffset}px)`,
                }}
              >
                <div className={`zone-sign ${zone.status}`}>
                  <div className="zone-icon">{zone.icon}</div>
                  <strong>{zone.name}</strong>
                  <small>
                    {zone.status === "detected" && "● DETECTED"}
                    {zone.status === "approaching" && "● APPROACHING"}
                    {zone.status === "active" && "● ACTIVE ZONE"}
                  </small>
                  <small>SPEED LIMIT {zone.speedLimit} km/h</small>
                  {zone.ambulance && zone.type === "hospital" && (
                    <small>🚑 AMBULANCE</small>
                  )}
                  <span className="zone-distance">
                    {Math.max(1, Math.round(zone.distance))} m
                  </span>
                </div>
              </div>
            );
          })}

          {hazard && (
            <div className="road-hazard">
              ⚠️
              <span>HAZARD</span>
            </div>
          )}

          <div className="your-car">
            🚗
            <span>YOU</span>
          </div>

        </div>

        <div className="road-message">
          <span>SYSTEM</span>
          <strong>{roadMessage}</strong>
        </div>

      </div>

    </section>
  );
}
