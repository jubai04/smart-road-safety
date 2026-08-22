import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  auth,
  firebaseIsConfigured,
  googleProvider,
} from "./firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* =========================================================
   MAP ICONS
========================================================= */

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

/* =========================================================
   MAP AUTO-CENTER COMPONENT
========================================================= */

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

/* =========================================================
   DISTANCE CALCULATION
========================================================= */

const calculateDistance = (
  lat1,
  lon1,
  lat2,
  lon2
) => {
  const R = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
};

/* =========================================================
   BEARING / DIRECTION HELPER
========================================================= */

const calculateBearing = (
  lat1,
  lon1,
  lat2,
  lon2
) => {
  const toRad = (value) =>
    (value * Math.PI) / 180;

  const toDeg = (value) =>
    (value * 180) / Math.PI;

  const y =
    Math.sin(toRad(lon2 - lon1)) *
    Math.cos(toRad(lat2));

  const x =
    Math.cos(toRad(lat1)) *
      Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(toRad(lon2 - lon1));

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const smallestAngleDifference = (a, b) => {
  const difference = Math.abs(a - b) % 360;
  return difference > 180
    ? 360 - difference
    : difference;
};

const helpTopics = [
  {
    question: "How do I start safety monitoring?",
    answer:
      "Open the Dashboard and select Start Monitoring. Allow location access when your browser asks so the Live Map can show nearby places and road zones.",
  },
  {
    question: "What does the safety score mean?",
    answer:
      "Your score starts at 100 and changes as the prototype records safety-related events. It is a learning aid, not a legal driving assessment or a substitute for road awareness.",
  },
  {
    question: "Why is my location or heading unavailable?",
    answer:
      "Location features need browser permission, a device with location services, and usually a secure (HTTPS) website. You can still explore the dashboard if permission is unavailable.",
  },
  {
    question: "How do I report an issue?",
    answer:
      "Use the Report section to review the recorded results. For a technical issue, share the steps you took, your browser, and a screenshot with your project team.",
  },
];

// Change this URL after deploying the API. In local development, run the
// included Express server on port 4000.
const REPORTS_API_URL = "http://localhost:4000/api/reports";

/* =========================================================
   MAIN APP
========================================================= */

function App() {
  /* =========================================================
     BASIC STATE
  ========================================================= */

  const [monitoring, setMonitoring] =
    useState(false);

  const [speed, setSpeed] =
    useState(42);

  const [wetRoad, setWetRoad] =
    useState(false);

  const [hazard, setHazard] =
    useState(false);

  const [vehicles, setVehicles] =
    useState([]);

  const [roadZones, setRoadZones] =
    useState([]);

  const [roadMessage, setRoadMessage] =
    useState(
      "Waiting to begin monitoring..."
    );

  const [openHelpTopic, setOpenHelpTopic] =
    useState(0);

  const [complaintType, setComplaintType] =
    useState("Pothole");

  const [complaintLocation, setComplaintLocation] =
    useState("");

  const [complaintDescription, setComplaintDescription] =
    useState("");

  const [complaintPhoto, setComplaintPhoto] =
    useState(null);

  const [complaintPhotoPreview, setComplaintPhotoPreview] =
    useState("");

  const [complaintSubmitted, setComplaintSubmitted] =
    useState(false);

  const [complaintSubmitting, setComplaintSubmitting] =
    useState(false);

  const [complaintError, setComplaintError] =
    useState("");

  const [reportReference, setReportReference] =
    useState("");

  const [currentUser, setCurrentUser] =
    useState(null);

  const [authModalOpen, setAuthModalOpen] =
    useState(false);

  const [authMode, setAuthMode] =
    useState("signin");

  const [authEmail, setAuthEmail] =
    useState("");

  const [authPassword, setAuthPassword] =
    useState("");

  const [authLoading, setAuthLoading] =
    useState(false);

  const [authError, setAuthError] =
    useState("");

  const complaintPreviewUrlRef =
    useRef("");

  /* =========================================================
     SAFETY SCORE
  ========================================================= */

  const [safetyScore, setSafetyScore] =
    useState(100);

  const [eventHistory, setEventHistory] =
    useState([]);

  const [safeResponses, setSafeResponses] =
    useState(0);

  const [violations, setViolations] =
    useState(0);

  // Prevent the same road-zone response from being counted twice.
  // React may re-run a state updater in development, so this ref makes
  // each zone evaluation idempotent.
  const evaluatedZoneIdsRef = useRef(new Set());

  const speedRef =
    useRef(speed);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    if (!auth) return undefined;

    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
  }, []);

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setAuthError("");
    setAuthModalOpen(true);
  };

  const getAuthErrorMessage = (error) => {
    const messages = {
      "auth/invalid-email": "Enter a valid email address.",
      "auth/invalid-credential": "That email address or password is incorrect.",
      "auth/email-already-in-use": "An account already exists with this email address.",
      "auth/weak-password": "Use a password with at least 6 characters.",
      "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    };

    return messages[error.code] || "We could not complete sign-in. Please try again.";
  };

  const handleGoogleSignIn = async () => {
    if (!firebaseIsConfigured || !auth) {
      setAuthError("Firebase has not been configured yet.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");

    try {
      await signInWithPopup(auth, googleProvider);
      setAuthModalOpen(false);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();

    if (!firebaseIsConfigured || !auth) {
      setAuthError("Firebase has not been configured yet.");
      return;
    }

    setAuthLoading(true);
    setAuthError("");

    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(
          auth,
          authEmail.trim(),
          authPassword
        );
      } else {
        await signInWithEmailAndPassword(
          auth,
          authEmail.trim(),
          authPassword
        );
      }

      setAuthPassword("");
      setAuthModalOpen(false);
    } catch (error) {
      setAuthError(getAuthErrorMessage(error));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  useEffect(() => {
    return () => {
      if (complaintPreviewUrlRef.current) {
        URL.revokeObjectURL(
          complaintPreviewUrlRef.current
        );
      }
    };
  }, []);

  const handleComplaintPhotoChange = (event) => {
    const selectedPhoto = event.target.files?.[0] || null;

    if (complaintPreviewUrlRef.current) {
      URL.revokeObjectURL(
        complaintPreviewUrlRef.current
      );
      complaintPreviewUrlRef.current = "";
    }

    setComplaintPhoto(selectedPhoto);

    if (selectedPhoto) {
      const previewUrl = URL.createObjectURL(selectedPhoto);
      complaintPreviewUrlRef.current = previewUrl;
      setComplaintPhotoPreview(previewUrl);
    } else {
      setComplaintPhotoPreview("");
    }
  };

  const handleComplaintSubmit = async (event) => {
    event.preventDefault();
    setComplaintSubmitting(true);
    setComplaintError("");

    const reportData = new FormData();
    reportData.append("issueType", complaintType);
    reportData.append("location", complaintLocation.trim());
    reportData.append(
      "description",
      complaintDescription.trim()
    );

    if (userLocation) {
      reportData.append("latitude", userLocation.lat);
      reportData.append("longitude", userLocation.lng);
    }

    if (complaintPhoto) {
      reportData.append("photo", complaintPhoto);
    }

    try {
      const response = await fetch(REPORTS_API_URL, {
        method: "POST",
        body: reportData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.message || "Unable to submit the report."
        );
      }

      setReportReference(payload.reference);
      setComplaintSubmitted(true);
      setComplaintLocation("");
      setComplaintDescription("");
    } catch (error) {
      setComplaintError(
        error.message ||
          "Unable to reach the reporting service."
      );
    } finally {
      setComplaintSubmitting(false);
    }
  };

  /* =========================================================
     REAL MAP STATE
  ========================================================= */

  const [userLocation, setUserLocation] =
    useState(null);

  const [driverHeading, setDriverHeading] =
    useState(null);

  const [mapPlaces, setMapPlaces] =
    useState([]);

  const [mapLoading, setMapLoading] =
    useState(false);

  const [mapError, setMapError] =
    useState("");

  const [locationPermission, setLocationPermission] =
    useState("waiting");

  const locationWatchRef =
    useRef(null);

  /* =========================================================
     VOICE SYSTEM
  ========================================================= */

  const speechSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window;

  const spokenEventsRef =
    useRef(new Set());

  const lastCriticalSpeechRef =
    useRef(0);

  const lastHazardSpeechRef =
    useRef(0);

  const speechQueueRef =
    useRef([]);

  const speakingRef =
    useRef(false);

  /* =========================================================
     VOICE QUEUE
  ========================================================= */

  const processSpeechQueue = () => {
    if (!speechSupported) return;

    if (speakingRef.current) return;

    if (
      speechQueueRef.current.length === 0
    ) {
      return;
    }

    const nextMessage =
      speechQueueRef.current.shift();

    speakingRef.current = true;

    const utterance =
      new SpeechSynthesisUtterance(
        nextMessage.text
      );

    utterance.rate =
      nextMessage.priority === "critical"
        ? 1.0
        : 0.9;

    utterance.pitch = 1;

    utterance.volume = 1;

    utterance.onend = () => {
      speakingRef.current = false;

      setTimeout(() => {
        processSpeechQueue();
      }, 700);
    };

    utterance.onerror = () => {
      speakingRef.current = false;

      setTimeout(() => {
        processSpeechQueue();
      }, 400);
    };

    window.speechSynthesis.speak(
      utterance
    );
  };

  /* =========================================================
     WARNING-ONLY VOICE
     
     IMPORTANT:
     We deliberately DO NOT speak:
     - safe response
     - vehicle detected
     - road clear
     - speed exceeded
     - recommended speed
     - approaching repeatedly
     
     Only actual safety warnings are spoken.
  ========================================================= */

  const speakWarning = (
    message,
    priority = "normal"
  ) => {
    if (!speechSupported || !message) {
      return;
    }

    const now = Date.now();

    if (
      priority === "critical" &&
      now -
        lastCriticalSpeechRef.current <
        5000
    ) {
      return;
    }

    if (
      priority === "hazard" &&
      now -
        lastHazardSpeechRef.current <
        7000
    ) {
      return;
    }

    if (
      priority === "critical"
    ) {
      lastCriticalSpeechRef.current =
        now;
    }

    if (
      priority === "hazard"
    ) {
      lastHazardSpeechRef.current =
        now;
    }

    /*
      Do not add duplicate warning
      while it is already waiting.
    */

    const alreadyQueued =
      speechQueueRef.current.some(
        (item) =>
          item.text === message
      );

    if (
      alreadyQueued ||
      speakingRef.current &&
      window.speechSynthesis
        .speaking
    ) {
      return;
    }

    /*
      Critical warnings go first.
    */

    if (
      priority === "critical"
    ) {
      speechQueueRef.current.unshift({
        text: message,
        priority,
      });
    } else {
      speechQueueRef.current.push({
        text: message,
        priority,
      });
    }

    processSpeechQueue();
  };

  /* =========================================================
     STOP VOICE
  ========================================================= */

  const stopVoiceSystem = () => {
    if (!speechSupported) return;

    window.speechSynthesis.cancel();

    speechQueueRef.current = [];

    speakingRef.current = false;
  };

  /* =========================================================
     ADD EVENT
  ========================================================= */

  const addEvent = (event) => {
    setEventHistory(
      (current) =>
        [
          {
            id:
              Date.now() +
              Math.random(),

            time:
              new Date().toLocaleTimeString(
                [],
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }
              ),

            ...event,
          },

          ...current,
        ].slice(0, 20)
    );
  };

  /* =========================================================
     REAL MAP: GET DRIVER LOCATION
  ========================================================= */

  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation
    ) {
      setLocationPermission("unsupported");

      setMapError(
        "Geolocation is not supported by this browser."
      );

      return;
    }

    setLocationPermission(
      "requesting"
    );

    locationWatchRef.current =
      navigator.geolocation.watchPosition(
        (position) => {
          const {
            latitude,
            longitude,
            heading,
          } = position.coords;

          setUserLocation({
            lat: latitude,
            lng: longitude,
          });

          if (
            typeof heading === "number" &&
            heading >= 0
          ) {
            setDriverHeading(heading);
          }

          setLocationPermission(
            "granted"
          );
        },

        (error) => {
          console.error(
            "Location error:",
            error
          );

          setLocationPermission(
            "denied"
          );

          setMapError(
            "Location access was denied. Please allow location access to use the live road map."
          );
        },

        {
          enableHighAccuracy: true,

          maximumAge: 5000,

          timeout: 15000,
        }
      );

    return () => {
      if (
        locationWatchRef.current !==
        null
      ) {
        navigator.geolocation.clearWatch(
          locationWatchRef.current
        );
      }
    };
  }, []);

  /* =========================================================
     REAL MAP: FETCH NEARBY PLACES
     
     OpenStreetMap / Overpass API
  ========================================================= */

  const fetchNearbyPlaces =
    async (
      latitude,
      longitude
    ) => {
      setMapLoading(true);
      setMapError("");

      try {
        /*
          Search approximately 3 km around
          the driver's current location.

          We search for:
          - schools
          - hospitals
          - road construction
        */

        const radius = 3000;

        const query = `
          [out:json][timeout:25];

          (
            node["amenity"="school"]
              (around:${radius},${latitude},${longitude});

            way["amenity"="school"]
              (around:${radius},${latitude},${longitude});

            relation["amenity"="school"]
              (around:${radius},${latitude},${longitude});

            node["amenity"="hospital"]
              (around:${radius},${latitude},${longitude});

            way["amenity"="hospital"]
              (around:${radius},${latitude},${longitude});

            relation["amenity"="hospital"]
              (around:${radius},${latitude},${longitude});

            node["highway"="construction"]
              (around:${radius},${latitude},${longitude});

            way["highway"="construction"]
              (around:${radius},${latitude},${longitude});

            node["construction"]
              (around:${radius},${latitude},${longitude});

            way["construction"]
              (around:${radius},${latitude},${longitude});

            way["landuse"="construction"]
              (around:${radius},${latitude},${longitude});
          );

          out center tags;
        `;

        const response =
          await fetch(
            "https://overpass-api.de/api/interpreter",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/x-www-form-urlencoded",
              },

              body:
                "data=" +
                encodeURIComponent(
                  query
                ),
            }
          );

        if (!response.ok) {
          throw new Error(
            "Map data request failed."
          );
        }

        const data =
          await response.json();

        const places =
          (data.elements || [])
            .map((element) => {
              const lat =
                element.lat ??
                element.center?.lat;

              const lng =
                element.lon ??
                element.center?.lon;

              if (
                typeof lat !==
                  "number" ||
                typeof lng !==
                  "number"
              ) {
                return null;
              }

              const tags =
                element.tags || {};

              let type =
                "unknown";

              let icon = "📍";

              let name =
                tags.name ||
                tags["name:en"] ||
                "Unnamed location";

              let speedLimit = 40;

              if (
                tags.amenity ===
                "school"
              ) {
                type = "school";

                icon = "🏫";

                speedLimit = 30;
              } else if (
                tags.amenity ===
                "hospital"
              ) {
                type = "hospital";

                icon = "🏥";

                speedLimit = 40;
              } else if (
                tags.highway ===
                  "construction" ||
                tags.construction ||
                tags.landuse ===
                  "construction"
              ) {
                type =
                  "construction";

                icon = "🚧";

                speedLimit = 30;
              }

              const distance =
                calculateDistance(
                  latitude,
                  longitude,
                  lat,
                  lng
                ) * 1000;

              return {
                id:
                  `${element.type}-${element.id}`,

                osmId:
                  element.id,

                type,

                icon,

                name,

                lat,

                lng,

                distance,

                speedLimit,

                tags,
              };
            })

            .filter(
              Boolean
            )
            .filter(
              (place) =>
                place.type !==
                "unknown"
            );

        /*
          Remove duplicates.
        */

        const uniquePlaces =
          Array.from(
            new Map(
              places.map(
                (place) => [
                  `${place.type}-${place.lat.toFixed(
                    5
                  )}-${place.lng.toFixed(
                    5
                  )}`,
                  place,
                ]
              )
            ).values()
          );

        uniquePlaces.sort(
          (a, b) =>
            a.distance -
            b.distance
        );

        setMapPlaces(
          uniquePlaces
        );

        setMapLoading(false);

        return uniquePlaces;
      } catch (error) {
        console.error(
          error
        );

        setMapLoading(false);

        setMapError(
          "Unable to load nearby map data. Please try again."
        );

        return [];
      }
    };

  /* =========================================================
     FETCH MAP DATA WHEN LOCATION CHANGES
  ========================================================= */

  const lastMapFetchRef =
    useRef(null);

  useEffect(() => {
    if (!userLocation) {
      return;
    }

    const now =
      Date.now();

    /*
      Don't query Overpass on every GPS
      update.

      Only refresh approximately every
      30 seconds.
    */

    if (
      lastMapFetchRef.current &&
      now -
        lastMapFetchRef.current <
        30000
    ) {
      return;
    }

    lastMapFetchRef.current =
      now;

    fetchNearbyPlaces(
      userLocation.lat,
      userLocation.lng
    );
  }, [userLocation]);

  /* =========================================================
     REAL MAP WARNING SYSTEM

     IMPORTANT:
     - The map shows all detected places around the vehicle.
     - Voice warnings are only for places reasonably in front
       of the vehicle.
     - Each real-world location is announced only once.
  ========================================================= */

  useEffect(() => {
    if (
      !monitoring ||
      !userLocation ||
      mapPlaces.length === 0
    ) {
      return;
    }

    const warningDistance = 300;

    const nearbyPlaces =
      mapPlaces.filter(
        (place) =>
          place.distance <= warningDistance
      );

    if (nearbyPlaces.length === 0) {
      return;
    }

    const warningPlace =
      nearbyPlaces.find((place) => {
        if (
          driverHeading === null ||
          typeof driverHeading !== "number"
        ) {
          return true;
        }

        const bearingToPlace =
          calculateBearing(
            userLocation.lat,
            userLocation.lng,
            place.lat,
            place.lng
          );

        /*
          120 degree forward cone.
          This prevents a school/hospital behind the
          vehicle from immediately triggering a warning.
        */
        return (
          smallestAngleDifference(
            driverHeading,
            bearingToPlace
          ) <= 60
        );
      });

    if (!warningPlace) {
      return;
    }

    const voiceKey =
      `map-${warningPlace.id}`;

    if (
      spokenEventsRef.current.has(voiceKey)
    ) {
      return;
    }

    spokenEventsRef.current.add(voiceKey);

    const roundedDistance =
      Math.max(
        1,
        Math.round(warningPlace.distance)
      );

    if (warningPlace.type === "school") {
      speakWarning(
        `Caution. School ahead. ${roundedDistance} meters.`,
        "normal"
      );
    }

    if (warningPlace.type === "hospital") {
      speakWarning(
        `Caution. Hospital ahead. ${roundedDistance} meters.`,
        "normal"
      );
    }

    if (
      warningPlace.type === "construction"
    ) {
      speakWarning(
        `Warning. Construction ahead. ${roundedDistance} meters.`,
        "critical"
      );
    }

    addEvent({
      type: "MAP WARNING",

      icon: warningPlace.icon,

      message:
        `${warningPlace.name} — ahead`,

      detail:
        `${roundedDistance} m from current location`,

      severity:
        warningPlace.type === "construction"
          ? "danger"
          : "warning",
    });

    setRoadMessage(
      `${warningPlace.icon} ${warningPlace.name} detected ahead.`
    );
  }, [
    mapPlaces,
    userLocation,
    driverHeading,
    monitoring,
  ]);

  /* =========================================================
     RESET MAP VOICE WARNINGS AFTER TRAVELLING FAR ENOUGH
  ========================================================= */

  useEffect(() => {
    if (!userLocation) return;

    setMapPlaces(
      (current) =>
        current.map(
          (place) => ({
            ...place,

            distance:
              calculateDistance(
                userLocation.lat,
                userLocation.lng,
                place.lat,
                place.lng
              ) * 1000,
          })
        )
    );
  }, [userLocation]);

  /* =========================================================
     DRIVER REACTION
  ========================================================= */

  const evaluateZone = (
    zone
  ) => {
    const currentSpeed =
      speedRef.current;

    let limit =
      zone.speedLimit;

    if (wetRoad) {
      limit = Math.min(
        limit,
        40
      );
    }

    if (
      zone.type ===
        "accident" ||
      hazard
    ) {
      limit = Math.min(
        limit,
        25
      );
    }

    const complied =
      currentSpeed <=
      limit + 5;

    if (complied) {
      setSafeResponses(
        (current) =>
          current + 1
      );

      setSafetyScore(
        (current) =>
          Math.min(
            100,
            current + 2
          )
      );

      addEvent({
        type:
          "SAFE RESPONSE",

        icon:
          "✅",

        message:
          `${zone.name} — driver responded safely`,

        detail:
          `Speed ${currentSpeed} km/h`,

        severity:
          "safe",
      });

      setRoadMessage(
        `Safe response recorded for ${zone.name}.`
      );

      /*
        NO VOICE HERE.
      */
    } else {
      setViolations(
        (current) =>
          current + 1
      );

      setSafetyScore(
        (current) =>
          Math.max(
            0,
            current - 8
          )
      );

      addEvent({
        type:
          "VIOLATION",

        icon:
          "⚠️",

        message:
          `${zone.name} — speed violation`,

        detail:
          `${currentSpeed} km/h • Recommended ${limit} km/h`,

        severity:
          "danger",
      });

      setRoadMessage(
        `Violation detected in ${zone.name}.`
      );

      /*
        IMPORTANT:
        No voice about the numerical
        speed violation.
      */
    }

    setRoadZones(
      (current) =>
        current.map(
          (item) =>
            item.id === zone.id
              ? {
                  ...item,
                  evaluated:
                    true,
                }
              : item
        )
    );
  };

  /* =========================================================
     AUTONOMOUS SIMULATED ROAD ENVIRONMENT
  ========================================================= */

  useEffect(() => {
    if (!monitoring) {
      setRoadZones([]);
      evaluatedZoneIdsRef.current.clear();

      /*
        Don't clear the map warning history
        here because otherwise the same map
        warning can repeat immediately.
      */

      return;
    }

    let timeoutId;

    let cancelled =
      false;

    const scheduleZone =
      () => {
        /*
          18–30 seconds between events.
        */

        const delay =
          Math.floor(
            Math.random() *
              12000
          ) + 18000;

        timeoutId =
          setTimeout(
            () => {
              if (
                cancelled
              ) {
                return;
              }

              const zoneTypes = [
                {
                  type:
                    "school",

                  icon:
                    "🏫",

                  name:
                    "SCHOOL AHEAD",

                  speedLimit:
                    30,

                  color:
                    "school",
                },

                {
                  type:
                    "hospital",

                  icon:
                    "🏥",

                  name:
                    "HOSPITAL AHEAD",

                  speedLimit:
                    40,

                  color:
                    "hospital",

                  ambulance:
                    Math.random() >
                    0.45,
                },

                {
                  type:
                    "construction",

                  icon:
                    "🚧",

                  name:
                    "CONSTRUCTION AHEAD",

                  speedLimit:
                    30,

                  color:
                    "construction",
                },

                {
                  type:
                    "accident",

                  icon:
                    "⚠️",

                  name:
                    "ACCIDENT AHEAD",

                  speedLimit:
                    25,

                  color:
                    "accident",
                },
              ];

              const selected =
                zoneTypes[
                  Math.floor(
                    Math.random() *
                      zoneTypes.length
                  )
                ];

              const lanes =
                [-1, 0, 1];

              const newZone = {
                id:
                  Date.now() +
                  Math.random(),

                type:
                  selected.type,

                icon:
                  selected.icon,

                name:
                  selected.name,

                speedLimit:
                  selected.speedLimit,

                color:
                  selected.color,

                distance:
                  Math.floor(
                    Math.random() *
                      41
                  ) + 100,

                lane:
                  lanes[
                    Math.floor(
                      Math.random() *
                        lanes.length
                    )
                  ],

                ambulance:
                  selected.ambulance ||
                  false,

                status:
                  "detected",

                evaluated:
                  false,

                interactionDone:
                  false,
              };

              setRoadZones(
                (current) => [
                  ...current,
                  newZone,
                ]
              );

              addEvent({
                type:
                  "ROAD DETECTION",

                icon:
                  selected.icon,

                message:
                  selected.name,

                detail:
                  `Detected at approximately ${Math.round(
                    newZone.distance
                  )} m`,

                severity:
                  "info",
              });

              setRoadMessage(
                `${selected.icon} ${selected.name} detected ahead.`
              );

              /*
                ONLY ONE VOICE WARNING.
                
                No repeated "approaching"
                and no repeated "active".
              */

              const speechKey =
                `sim-${newZone.id}`;

              if (
                !spokenEventsRef.current.has(
                  speechKey
                )
              ) {
                spokenEventsRef.current.add(
                  speechKey
                );

                if (
                  selected.type ===
                  "school"
                ) {
                  speakWarning(
                    `Caution. School ahead. ${Math.round(
                      newZone.distance
                    )} meters.`,
                    "normal"
                  );
                }

                if (
                  selected.type ===
                  "hospital"
                ) {
                  speakWarning(
                    `Caution. Hospital ahead. ${Math.round(
                      newZone.distance
                    )} meters.`,
                    "normal"
                  );
                }

                if (
                  selected.type ===
                  "construction"
                ) {
                  speakWarning(
                    `Warning. Construction ahead. ${Math.round(
                      newZone.distance
                    )} meters. Reduce speed.`,
                    "critical"
                  );
                }

                if (
                  selected.type ===
                  "accident"
                ) {
                  speakWarning(
                    `Warning. Accident ahead. ${Math.round(
                      newZone.distance
                    )} meters. Reduce speed.`,
                    "critical"
                  );
                }
              }

              scheduleZone();
            },

            delay
          );
      };

    scheduleZone();

    return () => {
      cancelled = true;

      clearTimeout(
        timeoutId
      );
    };
  }, [monitoring]);

  /* =========================================================
     VEHICLE GENERATOR
     
     Vehicles are visual only.
     NO VOICE.
  ========================================================= */

  useEffect(() => {
    if (!monitoring) {
      setVehicles([]);
      return;
    }

    let timeoutId;

    let cancelled =
      false;

    const scheduleVehicle =
      () => {
        const delay =
          Math.floor(
            Math.random() *
              6000
          ) + 8000;

        timeoutId =
          setTimeout(
            () => {
              if (
                cancelled
              ) {
                return;
              }

              const vehicleTypes = [
                {
                  emoji:
                    "🚙",
                  type:
                    "SUV",
                },

                {
                  emoji:
                    "🚕",
                  type:
                    "Taxi",
                },

                {
                  emoji:
                    "🚐",
                  type:
                    "Van",
                },

                {
                  emoji:
                    "🚗",
                  type:
                    "Car",
                },

                {
                  emoji:
                    "🏎️",
                  type:
                    "Sports Car",
                },
              ];

              const selected =
                vehicleTypes[
                  Math.floor(
                    Math.random() *
                      vehicleTypes.length
                  )
                ];

              const speedCategory =
                Math.random();

              let vehicleSpeed;

              if (
                speedCategory <
                0.3
              ) {
                vehicleSpeed =
                  Math.floor(
                    Math.random() *
                      12
                  ) + 28;
              } else if (
                speedCategory <
                0.75
              ) {
                vehicleSpeed =
                  Math.floor(
                    Math.random() *
                      16
                  ) + 40;
              } else {
                vehicleSpeed =
                  Math.floor(
                    Math.random() *
                      26
                  ) + 56;
              }

              const newVehicle = {
                id:
                  Date.now() +
                  Math.random(),

                emoji:
                  selected.emoji,

                type:
                  selected.type,

                distance:
                  Math.floor(
                    Math.random() *
                      36
                  ) + 45,

                speed:
                  vehicleSpeed,
              };

              setVehicles(
                (current) => [
                  ...current,
                  newVehicle,
                ]
              );

              /*
                NO VOICE.
              */

              scheduleVehicle();
            },

            delay
          );
      };

    scheduleVehicle();

    return () => {
      cancelled = true;

      clearTimeout(
        timeoutId
      );
    };
  }, [monitoring]);

  /* =========================================================
     VEHICLE MOVEMENT
  ========================================================= */

  useEffect(() => {
    if (!monitoring) return;

    let animationFrame;

    let previousTime =
      performance.now();

    const moveVehicles =
      (currentTime) => {
        const deltaTime =
          Math.min(
            currentTime -
              previousTime,
            100
          ) / 1000;

        previousTime =
          currentTime;

        const currentDriverSpeed =
          speedRef.current;

        setVehicles(
          (currentVehicles) =>
            currentVehicles
              .map(
                (vehicle) => {
                  const relativeSpeed =
                    Math.max(
                      0,
                      currentDriverSpeed -
                        vehicle.speed
                    );

                  const vehicleMovement =
                    vehicle.speed *
                    0.025;

                  const driverClosing =
                    relativeSpeed *
                    0.035;

                  const closingRate =
                    vehicleMovement +
                    driverClosing;

                  return {
                    ...vehicle,

                    distance:
                      vehicle.distance -
                      closingRate *
                        deltaTime *
                        10,
                  };
                }
              )
              .filter(
                (vehicle) =>
                  vehicle.distance >
                  3
              )
        );

        animationFrame =
          requestAnimationFrame(
            moveVehicles
          );
      };

    animationFrame =
      requestAnimationFrame(
        moveVehicles
      );

    return () => {
      cancelAnimationFrame(
        animationFrame
      );
    };
  }, [monitoring]);

  /* =========================================================
     ROAD ZONE MOVEMENT
  ========================================================= */

  useEffect(() => {
    if (!monitoring) return;

    let animationFrame;

    let previousTime =
      performance.now();

    const moveZones =
      (currentTime) => {
        const deltaTime =
          Math.min(
            currentTime -
              previousTime,
            100
          ) / 1000;

        previousTime =
          currentTime;

        const currentDriverSpeed =
          speedRef.current;

        setRoadZones(
          (currentZones) =>
            currentZones
              .map((zone) => {
                const movement =
                  currentDriverSpeed *
                  0.025 *
                  deltaTime *
                  10;

                const newDistance =
                  zone.distance -
                  movement;

                let newStatus =
                  zone.status;

                if (
                  newDistance <=
                  20
                ) {
                  newStatus =
                    "active";
                } else if (
                  newDistance <=
                  50
                ) {
                  newStatus =
                    "approaching";
                } else {
                  newStatus =
                    "detected";
                }

                /*
                  Visual event only.

                  NO repeated voice here.
                */

                if (
                  zone.status !==
                    newStatus &&
                  newStatus ===
                    "approaching"
                ) {
                  addEvent({
                    type:
                      "ZONE APPROACHING",

                    icon:
                      zone.icon,

                    message:
                      `${zone.name} — approaching`,

                    detail:
                      "Approximately 50 m",

                    severity:
                      "warning",
                  });

                  setRoadMessage(
                    `${zone.icon} ${zone.name} — approaching.`
                  );
                }

                if (
                  zone.status !==
                    newStatus &&
                  newStatus ===
                    "active"
                ) {
                  addEvent({
                    type:
                      "ACTIVE ZONE",

                    icon:
                      zone.icon,

                    message:
                      `${zone.name} — ACTIVE ZONE`,

                    detail:
                      "Driver response required",

                    severity:
                      "danger",
                  });

                  setRoadMessage(
                    `ACTIVE ZONE: ${zone.name}.`
                  );
                }

                return {
                  ...zone,

                  distance:
                    newDistance,

                  status:
                    newStatus,
                };
              })

              .filter(
                (zone) => {
                  if (
                    zone.distance <=
                      0 &&
                    !zone.evaluated
                  ) {
                    // Count each zone exactly once. Without this guard,
                    // the state updater can be executed more than once
                    // during React development rendering, causing counts
                    // such as 0 -> 2 instead of 0 -> 1.
                    if (
                      !evaluatedZoneIdsRef.current.has(
                        zone.id
                      )
                    ) {
                      evaluatedZoneIdsRef.current.add(
                        zone.id
                      );
                      evaluateZone(zone);
                    }

                    // Mark it immediately so a second pass cannot count it.
                    return {
                      ...zone,
                      evaluated: true,
                    };
                  }

                  return (
                    zone.distance >
                    -15
                  );
                }
              )
        );

        animationFrame =
          requestAnimationFrame(
            moveZones
          );
      };

    animationFrame =
      requestAnimationFrame(
        moveZones
      );

    return () => {
      cancelAnimationFrame(
        animationFrame
      );
    };
  }, [monitoring]);

  /* =========================================================
     HOSPITAL + AMBULANCE
  ========================================================= */

  useEffect(() => {
    if (!monitoring) return;

    roadZones.forEach(
      (zone) => {
        if (
          zone.type ===
            "hospital" &&
          zone.ambulance &&
          zone.distance <=
            35 &&
          !zone.interactionDone
        ) {
          const currentSpeed =
            speedRef.current;

          setRoadMessage(
            "🚑 AMBULANCE APPROACHING — prepare to yield."
          );

          addEvent({
            type:
              "AMBULANCE ALERT",

            icon:
              "🚑",

            message:
              "Emergency ambulance approaching hospital",

            detail:
              `Current speed ${currentSpeed} km/h`,

            severity:
              "warning",
          });

          /*
            ONE emergency voice warning.
          */

          speakWarning(
            "Emergency vehicle approaching. Prepare to yield.",
            "critical"
          );

          setRoadZones(
            (current) =>
              current.map(
                (item) =>
                  item.id ===
                  zone.id
                    ? {
                        ...item,

                        interactionDone:
                          true,
                      }
                    : item
              )
          );
        }
      }
    );
  }, [
    roadZones,
    monitoring,
  ]);

  /* =========================================================
     HAZARD
  ========================================================= */

  useEffect(() => {
    if (!monitoring) return;

    if (hazard) {
      addEvent({
        type:
          "HAZARD",

        icon:
          "⚠️",

        message:
          "Road hazard manually simulated",

        detail:
          "Recommended speed reduced to 25 km/h",

        severity:
          "danger",
      });

      setRoadMessage(
        "⚠️ Road hazard detected. Slow down immediately."
      );

      speakWarning(
        "Warning. Road hazard detected. Slow down immediately.",
        "hazard"
      );
    }
  }, [hazard, monitoring]);

  /* =========================================================
     NEAREST VEHICLE
  ========================================================= */

  const nearestVehicle =
    vehicles.length > 0
      ? vehicles.reduce(
          (closest, vehicle) =>
            vehicle.distance <
            closest.distance
              ? vehicle
              : closest
        )
      : null;

  /* =========================================================
     NEAREST SIMULATED ZONE
  ========================================================= */

  const nearestZone =
    roadZones.length > 0
      ? roadZones.reduce(
          (closest, zone) =>
            zone.distance <
            closest.distance
              ? zone
              : closest
        )
      : null;

  /* =========================================================
     NEAREST REAL MAP PLACE
  ========================================================= */

  const nearestMapPlace =
    mapPlaces.length > 0
      ? mapPlaces.reduce(
          (closest, place) =>
            place.distance <
            closest.distance
              ? place
              : closest
        )
      : null;

  /* =========================================================
     RECOMMENDED SPEED
  ========================================================= */

  let recommendedSpeed =
    60;

  if (nearestZone) {
    recommendedSpeed =
      nearestZone.speedLimit;
  }

  if (nearestMapPlace) {
    if (
      nearestMapPlace.distance <
      500
    ) {
      recommendedSpeed =
        Math.min(
          recommendedSpeed,
          nearestMapPlace.speedLimit
        );
    }
  }

  if (wetRoad) {
    recommendedSpeed =
      Math.min(
        recommendedSpeed,
        40
      );
  }

  if (hazard) {
    recommendedSpeed =
      Math.min(
        recommendedSpeed,
        25
      );
  }

  /* =========================================================
     COLLISION INTELLIGENCE
  ========================================================= */

  const yourSpeedMS =
    speed / 3.6;

  const vehicleSpeedMS =
    nearestVehicle
      ? nearestVehicle.speed /
        3.6
      : 0;

  const closingSpeedMS =
    nearestVehicle
      ? Math.max(
          0,
          yourSpeedMS -
            vehicleSpeedMS
        )
      : 0;

  const timeToCollision =
    nearestVehicle &&
    closingSpeedMS > 0
      ? nearestVehicle.distance /
        closingSpeedMS
      : Infinity;

  const closingSpeed =
    Number(
      (
        closingSpeedMS *
        3.6
      ).toFixed(1)
    );

  const ttc =
    timeToCollision !==
    Infinity
      ? Number(
          timeToCollision.toFixed(
            1
          )
        )
      : null;

  /* =========================================================
     COLLISION VOICE
     
     ONE WARNING ONLY.
  ========================================================= */

  const collisionWarningRef =
    useRef(false);

  useEffect(() => {
    if (!monitoring) {
      collisionWarningRef.current =
        false;

      return;
    }

    if (
      ttc !== null &&
      ttc < 2
    ) {
      if (
        !collisionWarningRef.current
      ) {
        collisionWarningRef.current =
          true;

        speakWarning(
          "Critical warning. Collision risk. Reduce speed immediately.",
          "critical"
        );
      }
    } else if (
      ttc === null ||
      ttc >= 4
    ) {
      collisionWarningRef.current =
        false;
    }
  }, [
    ttc,
    monitoring,
  ]);

  /* =========================================================
     SAFETY RISK
  ========================================================= */

  let risk = "LOW";

  let riskClass = "safe";

  if (!monitoring) {
    risk = "LOW";
    riskClass = "safe";
  } else if (hazard) {
    risk = "HIGH";
    riskClass = "danger";
  } else if (
    nearestVehicle &&
    ttc !== null &&
    ttc < 2
  ) {
    risk = "HIGH";
    riskClass = "danger";
  } else if (
    nearestVehicle &&
    ttc !== null &&
    ttc < 4
  ) {
    risk = "MEDIUM";
    riskClass = "warning";
  } else if (
    nearestZone &&
    nearestZone.status ===
      "active"
  ) {
    risk = "HIGH";
    riskClass = "danger";
  } else if (
    speed >
    recommendedSpeed + 20
  ) {
    risk = "HIGH";
    riskClass = "danger";
  } else if (
    speed >
    recommendedSpeed
  ) {
    risk = "MEDIUM";
    riskClass = "warning";
  }

  /* =========================================================
     SAFETY MESSAGE
  ========================================================= */

  let safetyMessage =
    "Road conditions look safe. Continue driving carefully.";

  if (!monitoring) {
    safetyMessage =
      "Monitoring is currently turned off.";
  } else if (hazard) {
    safetyMessage =
      "⚠️ Road hazard detected ahead. Slow down immediately.";
  } else if (
    nearestVehicle &&
    ttc !== null &&
    ttc < 2
  ) {
    safetyMessage =
      `🔴 CRITICAL: Collision risk in approximately ${ttc} seconds. Reduce speed immediately.`;
  } else if (
    nearestVehicle &&
    ttc !== null &&
    ttc < 4
  ) {
    safetyMessage =
      `🟠 Rapid closing detected. Estimated time to collision: ${ttc} seconds.`;
  } else if (
    nearestZone &&
    nearestZone.status ===
      "active"
  ) {
    safetyMessage =
      `🔴 ${nearestZone.name} is now active. Recommended speed: ${recommendedSpeed} km/h.`;
  } else if (
    nearestZone &&
    nearestZone.status ===
      "approaching"
  ) {
    safetyMessage =
      `${nearestZone.icon} ${nearestZone.name} approaching. Start reducing speed.`;
  } else if (
    nearestZone
  ) {
    safetyMessage =
      `${nearestZone.icon} ${nearestZone.name} detected ${Math.round(
        nearestZone.distance
      )} m ahead.`;
  } else if (
    nearestVehicle &&
    closingSpeed > 10
  ) {
    safetyMessage =
      `You are closing on the vehicle at approximately ${closingSpeed} km/h. Increase following distance.`;
  } else if (
    nearestVehicle &&
    nearestVehicle.distance <
      22
  ) {
    safetyMessage =
      "Vehicle detected ahead. Maintain a safe following distance.";
  } else if (
    speed >
    recommendedSpeed
  ) {
    safetyMessage =
      `Your speed is above the recommended ${recommendedSpeed} km/h.`;
  } else if (wetRoad) {
    safetyMessage =
      "🌧️ Wet road conditions detected. Drive carefully and maintain extra distance.";
  } else if (
    nearestMapPlace
  ) {
    safetyMessage =
      `${nearestMapPlace.icon} ${nearestMapPlace.name} is approximately ${Math.round(
        nearestMapPlace.distance
      )} m away.`;
  }

  /* =========================================================
     MONTHLY REPORT
  ========================================================= */

  const reportStatus =
    safetyScore >= 85
      ? "Excellent"
      : safetyScore >= 70
      ? "Good"
      : safetyScore >= 50
      ? "Needs Improvement"
      : "High Risk";

  const fineApplicable =
    violations > 0;

  /* =========================================================
     START / STOP
  ========================================================= */

  const toggleMonitoring =
    () => {
      if (!monitoring) {
        if (
          speechSupported
        ) {
          stopVoiceSystem();

          const startMessage =
            new SpeechSynthesisUtterance(
              "Smart Road Safety monitoring started."
            );

          startMessage.rate =
            0.95;

          startMessage.volume =
            1;

          window.speechSynthesis.speak(
            startMessage
          );
        }

        /*
          Refresh map immediately when
          monitoring starts.
        */

        if (userLocation) {
          fetchNearbyPlaces(
            userLocation.lat,
            userLocation.lng
          );
        }
      } else {
        stopVoiceSystem();
      }

      setMonitoring(
        (current) =>
          !current
      );
    };

  /* =========================================================
     MAP DEFAULT POSITION
  ========================================================= */

  const mapPosition =
    userLocation
      ? [
          userLocation.lat,
          userLocation.lng,
        ]
      : [
          22.5726,
          88.3639,
        ];

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="app">

      {/* =====================================================
          NAVIGATION
      ===================================================== */}

      <header className="navbar">

        <div className="logo">
          🚦
          <span>
            Smart Road Safety
          </span>
        </div>

        <nav>
          <a href="#home">
            Home
          </a>

          <a href="#problem">
            The Problem
          </a>

          <a href="#solution">
            Our Solution
          </a>

          <a href="#dashboard">
            Dashboard
          </a>

          <a href="#map">
            Live Map
          </a>

          <a href="#history">
            History
          </a>

          <a href="#report">
            Report
          </a>

          <a href="#help">
            Help
          </a>

          <a href="#complaints">
            Report Issue
          </a>
        </nav>

        {currentUser ? (
          <button
            type="button"
            className="nav-button"
            onClick={handleSignOut}
            title={`Signed in as ${currentUser.email || "Google user"}`}
            style={{ border: 0, cursor: "pointer" }}
          >
            Sign out
          </button>
        ) : (
          <button
            type="button"
            className="nav-button"
            onClick={() => openAuthModal("signin")}
            style={{ border: 0, cursor: "pointer" }}
          >
            Sign in
          </button>
        )}

      </header>

      {authModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background: "rgba(3, 6, 12, 0.78)",
          }}
        >
          <div
            style={{
              width: "min(100%, 440px)",
              padding: "28px",
              borderRadius: "18px",
              background: "#141822",
              border: "1px solid #3a4152",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.55)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
              <div>
                <div className="section-label">ACCOUNT</div>
                <h2 id="auth-title" style={{ margin: "8px 0 4px", fontSize: "28px" }}>
                  {authMode === "signin" ? "Welcome back" : "Create your account"}
                </h2>
                <p style={{ margin: 0, color: "#aeb6c7" }}>
                  {authMode === "signin"
                    ? "Sign in to continue."
                    : "Sign up to save your account."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close sign-in window"
                onClick={() => setAuthModalOpen(false)}
                style={{ alignSelf: "start", border: 0, background: "transparent", color: "#fff", fontSize: "26px", cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              style={{
                width: "100%",
                marginTop: "24px",
                padding: "13px 16px",
                borderRadius: "9px",
                border: "1px solid #596174",
                background: "#fff",
                color: "#202124",
                font: "inherit",
                fontWeight: 700,
                cursor: authLoading ? "wait" : "pointer",
              }}
            >
              G&nbsp; Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "22px 0", color: "#8c96a9", fontSize: "13px" }}>
              <span style={{ height: "1px", flex: 1, background: "#343b4b" }} />
              OR WITH EMAIL
              <span style={{ height: "1px", flex: 1, background: "#343b4b" }} />
            </div>

            {authError && (
              <div role="alert" style={{ marginBottom: "16px", padding: "12px", borderRadius: "8px", color: "#ffd7dc", background: "#452127" }}>
                {authError}
              </div>
            )}

            <form onSubmit={handleEmailAuth}>
              <label style={{ display: "grid", gap: "7px", marginBottom: "14px", fontWeight: 700 }}>
                Email address
                <input
                  type="email"
                  value={authEmail}
                  onChange={(event) => setAuthEmail(event.target.value)}
                  required
                  autoComplete="email"
                  style={{ padding: "12px", borderRadius: "8px", border: "1px solid #3a4152", background: "#0e1118", color: "#fff", font: "inherit" }}
                />
              </label>
              <label style={{ display: "grid", gap: "7px", marginBottom: "22px", fontWeight: 700 }}>
                Password
                <input
                  type="password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                  required
                  minLength="6"
                  autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                  style={{ padding: "12px", borderRadius: "8px", border: "1px solid #3a4152", background: "#0e1118", color: "#fff", font: "inherit" }}
                />
              </label>
              <button type="submit" className="primary-button" disabled={authLoading} style={{ width: "100%", border: 0, cursor: authLoading ? "wait" : "pointer", opacity: authLoading ? 0.7 : 1 }}>
                {authLoading
                  ? "Please wait..."
                  : authMode === "signin"
                  ? "Sign in"
                  : "Create account"}
              </button>
            </form>

            <p style={{ margin: "20px 0 0", textAlign: "center", color: "#aeb6c7" }}>
              {authMode === "signin" ? "New here? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === "signin" ? "signup" : "signin");
                  setAuthError("");
                }}
                style={{ border: 0, background: "transparent", color: "#6ce0d5", font: "inherit", fontWeight: 700, cursor: "pointer", padding: 0 }}
              >
                {authMode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        className="hero"
        id="home"
      >

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

            <a
              href="#dashboard"
              className="primary-button"
            >
              Explore Dashboard →
            </a>

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

      {/* =====================================================
          PROBLEM
      ===================================================== */}

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

      {/* =====================================================
          SOLUTION
      ===================================================== */}

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

          <div className="solution-card">

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

          </div>

          <div className="solution-card">

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

          </div>

          <div className="solution-card">

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

          </div>

        </div>

      </section>

      {/* =====================================================
          DASHBOARD
      ===================================================== */}

      <section
        className="dashboard-section"
        id="dashboard"
      >

        <div className="section-label">
          LIVE SAFETY SYSTEM
        </div>

        <h2>
          Driver Safety Dashboard
        </h2>

        <p className="dashboard-intro">
          Start monitoring and allow
          the autonomous road environment
          to generate events around your
          vehicle.
        </p>

        <div
          style={{
            maxWidth:
              "1000px",
            margin:
              "0 auto 20px",
            padding:
              "12px 18px",
            borderRadius:
              "12px",
            background:
              speechSupported
                ? "#111722"
                : "#2a1717",
            border:
              speechSupported
                ? "1px solid #293141"
                : "1px solid #5b2929",
            color:
              speechSupported
                ? "#aeb7c9"
                : "#ff8f8f",
            fontSize:
              "13px",
            textAlign:
              "center",
          }}
        >
          {speechSupported
            ? "🔊 Voice safety alerts enabled — warning messages only"
            : "⚠️ Voice alerts are not supported by this browser"}
        </div>

        {/* =================================================
            SAFETY BANNER
        ================================================= */}

        <div
          className={`safety-banner ${riskClass}`}
        >

          <div>

            <span className="status-label">
              CURRENT SAFETY STATUS
            </span>

            <h3>

              {risk === "LOW" &&
                "🟢 ROAD STATUS: SAFE"}

              {risk === "MEDIUM" &&
                "🟠 CAUTION: DRIVE CAREFULLY"}

              {risk === "HIGH" &&
                "🔴 WARNING: DANGER DETECTED"}

            </h3>

            <p>
              {safetyMessage}
            </p>

          </div>

          <div className="risk-value">
            {risk}
          </div>

        </div>

        {/* =================================================
            STATISTICS
        ================================================= */}

        <div className="stats-grid">

          <div className="stat-card">

            <span>
              🚗 YOUR SPEED
            </span>

            <strong>
              {speed}
            </strong>

            <small>
              km/h
            </small>

          </div>

          <div className="stat-card">

            <span>
              🎯 RECOMMENDED
            </span>

            <strong>
              {recommendedSpeed}
            </strong>

            <small>
              km/h
            </small>

          </div>

          <div className="stat-card">

            <span>
              📏 NEAREST VEHICLE
            </span>

            <strong>
              {nearestVehicle
                ? Math.round(
                    nearestVehicle.distance
                  )
                : "--"}
            </strong>

            <small>
              {nearestVehicle
                ? "meters"
                : "no vehicle"}
            </small>

          </div>

          <div className="stat-card">

            <span>
              📉 CLOSING SPEED
            </span>

            <strong>
              {nearestVehicle
                ? closingSpeed
                : "--"}
            </strong>

            <small>
              km/h
            </small>

          </div>

          <div className="stat-card">

            <span>
              ⏱️ TIME TO COLLISION
            </span>

            <strong>
              {ttc !== null
                ? ttc
                : "--"}
            </strong>

            <small>
              seconds
            </small>

          </div>

          <div className="stat-card">

            <span>
              🛡️ SAFETY SCORE
            </span>

            <strong>
              {safetyScore}
            </strong>

            <small>
              / 100
            </small>

          </div>

          <div className="stat-card">

            <span>
              ✅ SAFE RESPONSES
            </span>

            <strong>
              {safeResponses}
            </strong>

            <small>
              events
            </small>

          </div>

          <div className="stat-card">

            <span>
              ⚠️ VIOLATIONS
            </span>

            <strong>
              {violations}
            </strong>

            <small>
              events
            </small>

          </div>

        </div>

        {/* =================================================
            CONTROL PANEL
        ================================================= */}

        <div className="control-panel">

          <div className="control-header">

            <div>

              <h3>
                Driving Simulation
              </h3>

              <p>
                Control the driver's
                behaviour and road
                conditions.
              </p>

            </div>

            <button
              className={
                monitoring
                  ? "stop-button"
                  : "start-button"
              }
              onClick={
                toggleMonitoring
              }
            >
              {monitoring
                ? "⏹ Stop Monitoring"
                : "▶ Start Monitoring"}
            </button>

          </div>

          <div className="controls">

            <div className="control">

              <label>

                Your speed:

                <strong>
                  {" "}
                  {speed} km/h
                </strong>

              </label>

              <input
                type="range"
                min="0"
                max="120"
                value={speed}
                onChange={(e) =>
                  setSpeed(
                    Number(
                      e.target.value
                    )
                  )
                }
              />

            </div>

            <div className="control">

              <label>

                Road condition:

                <strong>
                  {" "}
                  {wetRoad
                    ? "Wet"
                    : "Dry"}
                </strong>

              </label>

              <button
                className={
                  wetRoad
                    ? "toggle active"
                    : "toggle"
                }
                onClick={() =>
                  setWetRoad(
                    (current) =>
                      !current
                  )
                }
              >
                🌧️{" "}
                {wetRoad
                  ? "Wet Road: ON"
                  : "Wet Road: OFF"}
              </button>

            </div>

          </div>

          <div className="toggle-controls">

            <button
              className={
                hazard
                  ? "toggle danger-toggle"
                  : "toggle"
              }
              onClick={() =>
                setHazard(
                  (current) =>
                    !current
                )
              }
            >
              ⚠️{" "}
              {hazard
                ? "Hazard Detected"
                : "Simulate Road Hazard"}
            </button>

          </div>

        </div>

        {/* =================================================
            REAL MAP
        ================================================= */}

        <div
          className="road-monitor"
          id="map"
          style={{
            marginTop: "30px",
          }}
        >

          <div className="road-header">

            <div>

              <h3>
                🗺️ Live Road Intelligence Map
              </h3>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  color:
                    "#858da0",
                  fontSize:
                    "13px",
                }}
              >
                Real-world safety locations detected
                from OpenStreetMap
              </p>

            </div>

            <span
              className={
                userLocation
                  ? "live-dot"
                  : "offline-dot"
              }
            >
              ●{" "}
              {userLocation
                ? "LOCATION ACTIVE"
                : "LOCATION WAITING"}
            </span>

          </div>

          {/* MAP STATUS */}

          <div
            style={{
              padding:
                "15px 20px",
              background:
                "#111722",
              borderBottom:
                "1px solid #293141",
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap:
                "15px",
              flexWrap:
                "wrap",
            }}
          >

            <div>

              {locationPermission ===
                "granted" && (
                <span>
                  📍 GPS location active
                </span>
              )}

              {locationPermission ===
                "requesting" && (
                <span>
                  📍 Requesting your location...
                </span>
              )}

              {locationPermission ===
                "denied" && (
                <span
                  style={{
                    color:
                      "#ff8f8f",
                  }}
                >
                  ⚠️ Location access denied
                </span>
              )}

              {locationPermission ===
                "unsupported" && (
                <span>
                  ⚠️ Geolocation unavailable
                </span>
              )}

            </div>

            <div
              style={{
                color: "#858da0",
                fontSize: "13px",
              }}
            >
              {typeof driverHeading === "number"
                ? `🧭 Heading ${Math.round(driverHeading)}°`
                : "🧭 Heading unavailable — nearby places still shown"}
            </div>

            <button
              className="toggle"
              onClick={() => {
                if (
                  userLocation
                ) {
                  fetchNearbyPlaces(
                    userLocation.lat,
                    userLocation.lng
                  );
                }
              }}
              disabled={
                mapLoading ||
                !userLocation
              }
            >
              {mapLoading
                ? "🔄 Loading..."
                : "🔄 Refresh Map Data"}
            </button>

          </div>

          {/* MAP */}

          <div
            style={{
              width:
                "100%",
              height:
                "500px",
            }}
          >

            <MapContainer
              center={
                mapPosition
              }
              zoom={15}
              style={{
                width:
                  "100%",
                height:
                  "100%",
              }}
              scrollWheelZoom={
                true
              }
            >

              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapCenter
                position={
                  userLocation
                    ? [
                        userLocation.lat,
                        userLocation.lng,
                      ]
                    : null
                }
              />

              {/* DRIVER */}

              {userLocation && (
                <>
                  <Marker
                    position={[
                      userLocation.lat,
                      userLocation.lng,
                    ]}
                    icon={
                      driverIcon
                    }
                  >

                    <Popup>
                      <strong>
                        🚗 You are here
                      </strong>

                      <br />

                      Smart Road Safety
                      vehicle location
                    </Popup>

                  </Marker>

                  <Circle
                    center={[
                      userLocation.lat,
                      userLocation.lng,
                    ]}
                    radius={3000}
                    pathOptions={{
                      fillOpacity:
                        0.04,
                      weight: 1,
                    }}
                  />

                </>
              )}

              {/* REAL PLACES */}

              {mapPlaces.map(
                (place) => {

                  let icon =
                    schoolIcon;

                  if (
                    place.type ===
                    "hospital"
                  ) {
                    icon =
                      hospitalIcon;
                  }

                  if (
                    place.type ===
                    "construction"
                  ) {
                    icon =
                      constructionIcon;
                  }

                  return (
                    <Marker
                      key={
                        place.id
                      }
                      position={[
                        place.lat,
                        place.lng,
                      ]}
                      icon={
                        icon
                      }
                    >

                      <Popup>

                        <strong>
                          {place.icon}{" "}
                          {place.name}
                        </strong>

                        <br />

                        Type:{" "}
                        {
                          place.type
                        }

                        <br />

                        Distance:{" "}
                        {Math.round(
                          place.distance
                        )}{" "}
                        m

                        <br />

                        Recommended:
                        {" "}
                        {
                          place.speedLimit
                        }{" "}
                        km/h

                      </Popup>

                    </Marker>
                  );
                }
              )}

            </MapContainer>

          </div>

          {/* MAP LEGEND */}

          <div
            style={{
              display:
                "flex",
              flexWrap:
                "wrap",
              gap:
                "15px",
              padding:
                "15px 20px",
              background:
                "#111722",
              borderTop:
                "1px solid #293141",
            }}
          >

            <span>
              🚗 Your Location
            </span>

            <span>
              🏫 Schools
            </span>

            <span>
              🏥 Hospitals
            </span>

            <span>
              🚧 Construction
            </span>

          </div>

          {/* MAP INFORMATION */}

          <div
            style={{
              padding:
                "18px 20px",
              background:
                "#0e121a",
              borderTop:
                "1px solid #293141",
            }}
          >

            {mapError && (
              <p
                style={{
                  color:
                    "#ff8f8f",
                  margin:
                    "0 0 10px",
                }}
              >
                {mapError}
              </p>
            )}

            <p
              style={{
                margin:
                  "0",
                color:
                  "#858da0",
                fontSize:
                  "13px",
              }}
            >
              {mapPlaces.length >
              0
                ? `📡 ${mapPlaces.length} mapped safety locations detected within approximately 3 km.`
                : "📡 No mapped safety locations detected yet."}
            </p>

          </div>

        </div>

        {/* =================================================
            ROAD MONITOR
        ================================================= */}

        <div className="road-monitor">

          <div className="road-header">

            <h3>
              Live Road View
            </h3>

            <span
              className={
                monitoring
                  ? "live-dot"
                  : "offline-dot"
              }
            >
              ●{" "}
              {monitoring
                ? "LIVE MONITORING"
                : "MONITORING OFF"}
            </span>

          </div>

          <div className="road-scene">

            <div className="road-center-line"></div>

            {/* VEHICLES */}

            {vehicles.map(
              (vehicle) => (
                <div
                  key={
                    vehicle.id
                  }
                  className="vehicle-ahead"
                  style={{
                    bottom: `${Math.min(
                      vehicle.distance *
                        1.2,
                      78
                    )}%`,
                  }}
                >

                  <div>
                    {vehicle.emoji}
                  </div>

                  <span>
                    {Math.round(
                      vehicle.distance
                    )}m
                  </span>

                  <small>
                    {vehicle.speed}{" "}
                    km/h
                  </small>

                </div>
              )
            )}

            {/* ROAD ZONES */}

            {roadZones.map(
              (zone) => {

                const laneOffset =
                  zone.lane *
                  65;

                return (
                  <div
                    key={
                      zone.id
                    }
                    className={`road-zone-marker ${zone.color}-marker`}
                    style={{
                      bottom: `${Math.min(
                        Math.max(
                          zone.distance *
                            1.2,
                          8
                        ),
                        78
                      )}%`,
                      left: `calc(50% + ${laneOffset}px)`,
                    }}
                  >

                    <div
                      className={`zone-sign ${zone.status}`}
                    >

                      <div className="zone-icon">
                        {zone.icon}
                      </div>

                      <strong>
                        {zone.name}
                      </strong>

                      <small>

                        {zone.status ===
                          "detected" &&
                          "● DETECTED"}

                        {zone.status ===
                          "approaching" &&
                          "● APPROACHING"}

                        {zone.status ===
                          "active" &&
                          "● ACTIVE ZONE"}

                      </small>

                      <small>
                        SPEED LIMIT{" "}
                        {
                          zone.speedLimit
                        }
                        {" "}
                        km/h
                      </small>

                      {zone.ambulance &&
                        zone.type ===
                          "hospital" && (
                          <small>
                            🚑 AMBULANCE
                          </small>
                        )}

                      <span className="zone-distance">

                        {Math.max(
                          1,
                          Math.round(
                            zone.distance
                          )
                        )}{" "}
                        m

                      </span>

                    </div>

                  </div>
                );
              }
            )}

            {/* HAZARD */}

            {hazard && (
              <div className="road-hazard">

                ⚠️

                <span>
                  HAZARD
                </span>

              </div>
            )}

            {/* YOUR VEHICLE */}

            <div className="your-car">

              🚗

              <span>
                YOU
              </span>

            </div>

          </div>

          <div className="road-message">

            <span>
              SYSTEM
            </span>

            <strong>
              {roadMessage}
            </strong>

          </div>

        </div>

      </section>

      {/* =====================================================
          EVENT HISTORY
      ===================================================== */}

      <section
        className="section"
        id="history"
      >

        <div className="section-label">
          EVENT HISTORY
        </div>

        <h2>
          Recent Safety Events
        </h2>

        <p>
          Every meaningful road and
          driver event is recorded by
          the safety system.
        </p>

        <div
          style={{
            maxWidth:
              "1000px",
            margin:
              "50px auto 0",
          }}
        >

          {eventHistory.length ===
          0 ? (

            <div
              className="solution-card"
            >

              <div className="card-icon">
                📋
              </div>

              <h3>
                No events yet
              </h3>

              <p>
                Start monitoring to
                begin recording safety
                events.
              </p>

            </div>

          ) : (

            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap:
                  "12px",
              }}
            >

              {eventHistory.map(
                (event) => (

                  <div
                    key={
                      event.id
                    }
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "45px 150px 1fr auto",
                      alignItems:
                        "center",
                      gap:
                        "15px",
                      padding:
                        "16px 20px",
                      background:
                        "#141822",
                      border:
                        "1px solid #292e3c",
                      borderRadius:
                        "14px",
                      textAlign:
                        "left",
                    }}
                  >

                    <span
                      style={{
                        fontSize:
                          "22px",
                      }}
                    >
                      {event.icon}
                    </span>

                    <strong
                      style={{
                        fontSize:
                          "11px",
                        letterSpacing:
                          "1px",
                      }}
                    >
                      {event.type}
                    </strong>

                    <div>

                      <strong>
                        {
                          event.message
                        }
                      </strong>

                      <small
                        style={{
                          display:
                            "block",
                          color:
                            "#858da0",
                          marginTop:
                            "4px",
                        }}
                      >
                        {
                          event.detail
                        }
                      </small>

                    </div>

                    <small
                      style={{
                        color:
                          "#737b8e",
                      }}
                    >
                      {
                        event.time
                      }
                    </small>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </section>

      {/* =====================================================
          MONTHLY REPORT
      ===================================================== */}

      <section
        className="dashboard-section"
        id="report"
      >

        <div className="section-label">
          MONTHLY SAFETY REPORT
        </div>

        <h2>
          Driver Performance
        </h2>

        <p className="dashboard-intro">
          A monthly-style summary of
          driver behaviour and safety
          performance.
        </p>

        <div
          style={{
            maxWidth:
              "1000px",
            margin:
              "40px auto",
            display:
              "grid",
            gridTemplateColumns:
              "repeat(2, 1fr)",
            gap:
              "18px",
          }}
        >

          <div className="stat-card">

            <span>
              🛡️ SAFETY SCORE
            </span>

            <strong>
              {safetyScore}
            </strong>

            <small>
              / 100
            </small>

          </div>

          <div className="stat-card">

            <span>
              ⚠️ VIOLATIONS
            </span>

            <strong>
              {violations}
            </strong>

            <small>
              recorded
            </small>

          </div>

          <div className="stat-card">

            <span>
              ✅ SAFE RESPONSES
            </span>

            <strong>
              {safeResponses}
            </strong>

            <small>
              successful responses
            </small>

          </div>

          <div className="stat-card">

            <span>
              📄 STATUS
            </span>

            <strong
              style={{
                fontSize:
                  "25px",
              }}
            >
              {reportStatus}
            </strong>

            <small>
              current assessment
            </small>

          </div>

        </div>

        <div
          className={`safety-banner ${
            fineApplicable
              ? "danger"
              : "safe"
          }`}
          style={{
            maxWidth:
              "1000px",
          }}
        >

          <div>

            <span className="status-label">
              MONTH-END ASSESSMENT
            </span>

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

          <div className="risk-value">
            {safetyScore}/100
          </div>

        </div>

      </section>

      {/* =====================================================
          HELP CENTRE
      ===================================================== */}

      <section className="section" id="help">

        <div className="section-label">
          HELP CENTRE
        </div>

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
            maxWidth: "1000px",
            margin: "45px auto 0",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "18px",
          }}
        >
          {[
            ["▶", "Start monitoring", "Begin from the Dashboard and allow location access when prompted.", "#dashboard"],
            ["🗺️", "Check the Live Map", "See your position, nearby places and detected road zones.", "#map"],
            ["📋", "Review your activity", "Open History to see the safety events recorded in this session.", "#history"],
          ].map(([icon, title, description, link]) => (
            <a
              key={title}
              href={link}
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
            </a>
          ))}
        </div>

        <div
          style={{
            maxWidth: "850px",
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
            maxWidth: "850px",
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
          <a href="#report" className="primary-button">
            View my report →
          </a>
        </div>

      </section>

      {/* =====================================================
          PUBLIC COMPLAINTS
      ===================================================== */}

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
            maxWidth: "900px",
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
                  Upload a clear image of the {complaintType.toLowerCase()}. Please avoid including people’s faces or number plates where possible.
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

      {/* =====================================================
          FUTURE CLOUD
      ===================================================== */}

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

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer>

        <div className="logo">

          🚦

          <span>
            Smart Road Safety
          </span>

        </div>

        <p>
          Building safer roads through
          intelligent technology.
        </p>

        <small>
          Prototype — Safety decisions
          should always follow real-world
          traffic laws and conditions.
        </small>

      </footer>

    </div>
  );
}

export default App;
