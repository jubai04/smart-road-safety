import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  auth,
  firebaseIsConfigured,
  googleProvider,
} from "../firebase";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const toDeg = (value) => (value * 180) / Math.PI;
  const y =
    Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.cos(toRad(lon2 - lon1));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const smallestAngleDifference = (a, b) => {
  const difference = Math.abs(a - b) % 360;
  return difference > 180 ? 360 - difference : difference;
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

const REPORTS_API_URL = "http://localhost:4000/api/reports";

const AppContext = createContext(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

export function AppProvider({ children }) {
  const [monitoring, setMonitoring] = useState(false);
  const [speed, setSpeed] = useState(42);
  const [wetRoad, setWetRoad] = useState(false);
  const [hazard, setHazard] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [roadZones, setRoadZones] = useState([]);
  const [roadMessage, setRoadMessage] = useState(
    "Waiting to begin monitoring..."
  );
  const [openHelpTopic, setOpenHelpTopic] = useState(0);

  const [complaintType, setComplaintType] = useState("Pothole");
  const [complaintLocation, setComplaintLocation] = useState("");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [complaintPhoto, setComplaintPhoto] = useState(null);
  const [complaintPhotoPreview, setComplaintPhotoPreview] = useState("");
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  const [complaintError, setComplaintError] = useState("");
  const [reportReference, setReportReference] = useState("");

  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const complaintPreviewUrlRef = useRef("");

  const [safetyScore, setSafetyScore] = useState(100);
  const [eventHistory, setEventHistory] = useState([]);
  const [safeResponses, setSafeResponses] = useState(0);
  const [violations, setViolations] = useState(0);

  const evaluatedZoneIdsRef = useRef(new Set());
  const speedRef = useRef(speed);

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
      "auth/invalid-credential":
        "That email address or password is incorrect.",
      "auth/email-already-in-use":
        "An account already exists with this email address.",
      "auth/weak-password":
        "Use a password with at least 6 characters.",
      "auth/popup-closed-by-user":
        "Google sign-in was cancelled.",
    };
    return (
      messages[error.code] ||
      "We could not complete sign-in. Please try again."
    );
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
        URL.revokeObjectURL(complaintPreviewUrlRef.current);
      }
    };
  }, []);

  const handleComplaintPhotoChange = (event) => {
    const selectedPhoto = event.target.files?.[0] || null;
    if (complaintPreviewUrlRef.current) {
      URL.revokeObjectURL(complaintPreviewUrlRef.current);
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

  const [userLocation, setUserLocation] = useState(null);
  const [driverHeading, setDriverHeading] = useState(null);
  const [mapPlaces, setMapPlaces] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState("");
  const [locationPermission, setLocationPermission] = useState("waiting");
  const locationWatchRef = useRef(null);

  const handleComplaintSubmit = async (event) => {
    event.preventDefault();
    setComplaintSubmitting(true);
    setComplaintError("");
    const reportData = new FormData();
    reportData.append("issueType", complaintType);
    reportData.append("location", complaintLocation.trim());
    reportData.append("description", complaintDescription.trim());
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
        error.message || "Unable to reach the reporting service."
      );
    } finally {
      setComplaintSubmitting(false);
    }
  };

  const speechSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const spokenEventsRef = useRef(new Set());
  const lastCriticalSpeechRef = useRef(0);
  const lastHazardSpeechRef = useRef(0);
  const speechQueueRef = useRef([]);
  const speakingRef = useRef(false);

  const processSpeechQueue = () => {
    if (!speechSupported) return;
    if (speakingRef.current) return;
    if (speechQueueRef.current.length === 0) return;

    const nextMessage = speechQueueRef.current.shift();
    speakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(nextMessage.text);
    utterance.rate = nextMessage.priority === "critical" ? 1.0 : 0.9;
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

    window.speechSynthesis.speak(utterance);
  };

  const speakWarning = (message, priority = "normal") => {
    if (!speechSupported || !message) return;

    const now = Date.now();

    if (
      priority === "critical" &&
      now - lastCriticalSpeechRef.current < 5000
    ) {
      return;
    }

    if (
      priority === "hazard" &&
      now - lastHazardSpeechRef.current < 7000
    ) {
      return;
    }

    if (priority === "critical") {
      lastCriticalSpeechRef.current = now;
    }

    if (priority === "hazard") {
      lastHazardSpeechRef.current = now;
    }

    const alreadyQueued = speechQueueRef.current.some(
      (item) => item.text === message
    );

    if (
      alreadyQueued ||
      (speakingRef.current && window.speechSynthesis.speaking)
    ) {
      return;
    }

    if (priority === "critical") {
      speechQueueRef.current.unshift({ text: message, priority });
    } else {
      speechQueueRef.current.push({ text: message, priority });
    }

    processSpeechQueue();
  };

  const stopVoiceSystem = () => {
    if (!speechSupported) return;
    window.speechSynthesis.cancel();
    speechQueueRef.current = [];
    speakingRef.current = false;
  };

  const addEvent = (event) => {
    setEventHistory(
      (current) =>
        [
          {
            id: Date.now() + Math.random(),
            time: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            ...event,
          },
          ...current,
        ].slice(0, 20)
    );
  };

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

    setLocationPermission("requesting");

    locationWatchRef.current =
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, heading } =
            position.coords;
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
          setLocationPermission("granted");
        },
        (error) => {
          console.error("Location error:", error);
          setLocationPermission("denied");
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
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(
          locationWatchRef.current
        );
      }
    };
  }, []);

  const fetchNearbyPlaces = async (latitude, longitude) => {
    setMapLoading(true);
    setMapError("");

    try {
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

      const response = await fetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded",
          },
          body:
            "data=" + encodeURIComponent(query),
        }
      );

      if (!response.ok) {
        throw new Error("Map data request failed.");
      }

      const data = await response.json();

      const places = (data.elements || [])
        .map((element) => {
          const lat =
            element.lat ?? element.center?.lat;
          const lng =
            element.lon ?? element.center?.lon;

          if (
            typeof lat !== "number" ||
            typeof lng !== "number"
          ) {
            return null;
          }

          const tags = element.tags || {};
          let type = "unknown";
          let icon = "\u{1F4CD}";
          let name =
            tags.name ||
            tags["name:en"] ||
            "Unnamed location";
          let speedLimit = 40;

          if (tags.amenity === "school") {
            type = "school";
            icon = "\u{1F3EB}";
            speedLimit = 30;
          } else if (tags.amenity === "hospital") {
            type = "hospital";
            icon = "\u{1F3E5}";
            speedLimit = 40;
          } else if (
            tags.highway === "construction" ||
            tags.construction ||
            tags.landuse === "construction"
          ) {
            type = "construction";
            icon = "\u{1F6A7}";
            speedLimit = 30;
          }

          const distance =
            calculateDistance(
              latitude, longitude, lat, lng
            ) * 1000;

          return {
            id: `${element.type}-${element.id}`,
            osmId: element.id,
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
        .filter(Boolean)
        .filter((place) => place.type !== "unknown");

      const uniquePlaces = Array.from(
        new Map(
          places.map((place) => [
            `${place.type}-${place.lat.toFixed(
              5
            )}-${place.lng.toFixed(5)}`,
            place,
          ])
        ).values()
      );

      uniquePlaces.sort(
        (a, b) => a.distance - b.distance
      );

      setMapPlaces(uniquePlaces);
      setMapLoading(false);
      return uniquePlaces;
    } catch (error) {
      console.error(error);
      setMapLoading(false);
      setMapError(
        "Unable to load nearby map data. Please try again."
      );
      return [];
    }
  };

  const lastMapFetchRef = useRef(null);

  useEffect(() => {
    if (!userLocation) return;
    const now = Date.now();
    if (
      lastMapFetchRef.current &&
      now - lastMapFetchRef.current < 30000
    ) {
      return;
    }
    lastMapFetchRef.current = now;
    fetchNearbyPlaces(
      userLocation.lat,
      userLocation.lng
    );
  }, [userLocation]);

  useEffect(() => {
    if (
      !monitoring ||
      !userLocation ||
      mapPlaces.length === 0
    ) {
      return;
    }

    const warningDistance = 300;

    const nearbyPlaces = mapPlaces.filter(
      (place) => place.distance <= warningDistance
    );

    if (nearbyPlaces.length === 0) return;

    const warningPlace = nearbyPlaces.find((place) => {
      if (
        driverHeading === null ||
        typeof driverHeading !== "number"
      ) {
        return true;
      }
      const bearingToPlace = calculateBearing(
        userLocation.lat,
        userLocation.lng,
        place.lat,
        place.lng
      );
      return (
        smallestAngleDifference(
          driverHeading,
          bearingToPlace
        ) <= 60
      );
    });

    if (!warningPlace) return;

    const voiceKey = `map-${warningPlace.id}`;
    if (spokenEventsRef.current.has(voiceKey)) return;

    spokenEventsRef.current.add(voiceKey);

    const roundedDistance = Math.max(
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
    if (warningPlace.type === "construction") {
      speakWarning(
        `Warning. Construction ahead. ${roundedDistance} meters.`,
        "critical"
      );
    }

    addEvent({
      type: "MAP WARNING",
      icon: warningPlace.icon,
      message: `${warningPlace.name} \u2014 ahead`,
      detail: `${roundedDistance} m from current location`,
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

  useEffect(() => {
    if (!userLocation) return;
    setMapPlaces((current) =>
      current.map((place) => ({
        ...place,
        distance:
          calculateDistance(
            userLocation.lat,
            userLocation.lng,
            place.lat,
            place.lng
          ) * 1000,
      }))
    );
  }, [userLocation]);

  const evaluateZone = (zone) => {
    const currentSpeed = speedRef.current;
    let limit = zone.speedLimit;

    if (wetRoad) {
      limit = Math.min(limit, 40);
    }
    if (zone.type === "accident" || hazard) {
      limit = Math.min(limit, 25);
    }

    const complied = currentSpeed <= limit + 5;

    if (complied) {
      setSafeResponses((current) => current + 1);
      setSafetyScore((current) =>
        Math.min(100, current + 2)
      );
      addEvent({
        type: "SAFE RESPONSE",
        icon: "\u2705",
        message: `${zone.name} \u2014 driver responded safely`,
        detail: `Speed ${currentSpeed} km/h`,
        severity: "safe",
      });
      setRoadMessage(
        `Safe response recorded for ${zone.name}.`
      );
    } else {
      setViolations((current) => current + 1);
      setSafetyScore((current) =>
        Math.max(0, current - 8)
      );
      addEvent({
        type: "VIOLATION",
        icon: "\u26A0\uFE0F",
        message: `${zone.name} \u2014 speed violation`,
        detail: `${currentSpeed} km/h \u2022 Recommended ${limit} km/h`,
        severity: "danger",
      });
      setRoadMessage(
        `Violation detected in ${zone.name}.`
      );
    }

    setRoadZones((current) =>
      current.map((item) =>
        item.id === zone.id
          ? { ...item, evaluated: true }
          : item
      )
    );
  };

  useEffect(() => {
    if (!monitoring) {
      setRoadZones([]);
      evaluatedZoneIdsRef.current.clear();
      return;
    }

    let timeoutId;
    let cancelled = false;

    const scheduleZone = () => {
      const delay =
        Math.floor(Math.random() * 12000) + 18000;

      timeoutId = setTimeout(() => {
        if (cancelled) return;

        const zoneTypes = [
          {
            type: "school",
            icon: "\u{1F3EB}",
            name: "SCHOOL AHEAD",
            speedLimit: 30,
            color: "school",
          },
          {
            type: "hospital",
            icon: "\u{1F3E5}",
            name: "HOSPITAL AHEAD",
            speedLimit: 40,
            color: "hospital",
            ambulance: Math.random() > 0.45,
          },
          {
            type: "construction",
            icon: "\u{1F6A7}",
            name: "CONSTRUCTION AHEAD",
            speedLimit: 30,
            color: "construction",
          },
          {
            type: "accident",
            icon: "\u26A0\uFE0F",
            name: "ACCIDENT AHEAD",
            speedLimit: 25,
            color: "accident",
          },
        ];

        const selected =
          zoneTypes[
            Math.floor(
              Math.random() * zoneTypes.length
            )
          ];

        const lanes = [-1, 0, 1];

        const newZone = {
          id: Date.now() + Math.random(),
          type: selected.type,
          icon: selected.icon,
          name: selected.name,
          speedLimit: selected.speedLimit,
          color: selected.color,
          distance:
            Math.floor(Math.random() * 41) + 100,
          lane:
            lanes[
              Math.floor(
                Math.random() * lanes.length
              )
            ],
          ambulance: selected.ambulance || false,
          status: "detected",
          evaluated: false,
          interactionDone: false,
        };

        setRoadZones((current) => [
          ...current,
          newZone,
        ]);

        addEvent({
          type: "ROAD DETECTION",
          icon: selected.icon,
          message: selected.name,
          detail: `Detected at approximately ${Math.round(
            newZone.distance
          )} m`,
          severity: "info",
        });

        setRoadMessage(
          `${selected.icon} ${selected.name} detected ahead.`
        );

        const speechKey = `sim-${newZone.id}`;
        if (
          !spokenEventsRef.current.has(speechKey)
        ) {
          spokenEventsRef.current.add(speechKey);

          if (selected.type === "school") {
            speakWarning(
              `Caution. School ahead. ${Math.round(
                newZone.distance
              )} meters.`,
              "normal"
            );
          }
          if (selected.type === "hospital") {
            speakWarning(
              `Caution. Hospital ahead. ${Math.round(
                newZone.distance
              )} meters.`,
              "normal"
            );
          }
          if (selected.type === "construction") {
            speakWarning(
              `Warning. Construction ahead. ${Math.round(
                newZone.distance
              )} meters. Reduce speed.`,
              "critical"
            );
          }
          if (selected.type === "accident") {
            speakWarning(
              `Warning. Accident ahead. ${Math.round(
                newZone.distance
              )} meters. Reduce speed.`,
              "critical"
            );
          }
        }

        scheduleZone();
      }, delay);
    };

    scheduleZone();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [monitoring]);

  useEffect(() => {
    if (!monitoring) {
      setVehicles([]);
      return;
    }

    let timeoutId;
    let cancelled = false;

    const scheduleVehicle = () => {
      const delay =
        Math.floor(Math.random() * 6000) + 8000;

      timeoutId = setTimeout(() => {
        if (cancelled) return;

        const vehicleTypes = [
          { emoji: "\u{1F699}", type: "SUV" },
          { emoji: "\u{1F695}", type: "Taxi" },
          { emoji: "\u{1F690}", type: "Van" },
          { emoji: "\u{1F697}", type: "Car" },
          { emoji: "\u{1F3CE}\uFE0F", type: "Sports Car" },
        ];

        const selected =
          vehicleTypes[
            Math.floor(
              Math.random() * vehicleTypes.length
            )
          ];

        const speedCategory = Math.random();
        let vehicleSpeed;
        if (speedCategory < 0.3) {
          vehicleSpeed =
            Math.floor(Math.random() * 12) + 28;
        } else if (speedCategory < 0.75) {
          vehicleSpeed =
            Math.floor(Math.random() * 16) + 40;
        } else {
          vehicleSpeed =
            Math.floor(Math.random() * 26) + 56;
        }

        const newVehicle = {
          id: Date.now() + Math.random(),
          emoji: selected.emoji,
          type: selected.type,
          distance:
            Math.floor(Math.random() * 36) + 45,
          speed: vehicleSpeed,
        };

        setVehicles((current) => [
          ...current,
          newVehicle,
        ]);

        scheduleVehicle();
      }, delay);
    };

    scheduleVehicle();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [monitoring]);

  useEffect(() => {
    if (!monitoring) return;

    let animationFrame;
    let previousTime = performance.now();

    const moveVehicles = (currentTime) => {
      const deltaTime =
        Math.min(
          currentTime - previousTime,
          100
        ) / 1000;

      previousTime = currentTime;

      const currentDriverSpeed = speedRef.current;

      setVehicles((currentVehicles) =>
        currentVehicles
          .map((vehicle) => {
            const relativeSpeed = Math.max(
              0,
              currentDriverSpeed - vehicle.speed
            );
            const vehicleMovement =
              vehicle.speed * 0.025;
            const driverClosing =
              relativeSpeed * 0.035;
            const closingRate =
              vehicleMovement + driverClosing;
            return {
              ...vehicle,
              distance:
                vehicle.distance -
                closingRate * deltaTime * 10,
            };
          })
          .filter(
            (vehicle) => vehicle.distance > 3
          )
      );

      animationFrame =
        requestAnimationFrame(moveVehicles);
    };

    animationFrame =
      requestAnimationFrame(moveVehicles);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [monitoring]);

  useEffect(() => {
    if (!monitoring) return;

    let animationFrame;
    let previousTime = performance.now();

    const moveZones = (currentTime) => {
      const deltaTime =
        Math.min(
          currentTime - previousTime,
          100
        ) / 1000;

      previousTime = currentTime;

      const currentDriverSpeed = speedRef.current;

      setRoadZones((currentZones) =>
        currentZones
          .map((zone) => {
            const movement =
              currentDriverSpeed *
              0.025 *
              deltaTime *
              10;

            const newDistance =
              zone.distance - movement;

            let newStatus = zone.status;

            if (newDistance <= 20) {
              newStatus = "active";
            } else if (newDistance <= 50) {
              newStatus = "approaching";
            } else {
              newStatus = "detected";
            }

            if (
              zone.status !== newStatus &&
              newStatus === "approaching"
            ) {
              addEvent({
                type: "ZONE APPROACHING",
                icon: zone.icon,
                message: `${zone.name} \u2014 approaching`,
                detail: "Approximately 50 m",
                severity: "warning",
              });
              setRoadMessage(
                `${zone.icon} ${zone.name} \u2014 approaching.`
              );
            }

            if (
              zone.status !== newStatus &&
              newStatus === "active"
            ) {
              addEvent({
                type: "ACTIVE ZONE",
                icon: zone.icon,
                message: `${zone.name} \u2014 ACTIVE ZONE`,
                detail: "Driver response required",
                severity: "danger",
              });
              setRoadMessage(
                `ACTIVE ZONE: ${zone.name}.`
              );
            }

            return {
              ...zone,
              distance: newDistance,
              status: newStatus,
            };
          })
          .filter((zone) => {
            if (
              zone.distance <= 0 &&
              !zone.evaluated
            ) {
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
              return {
                ...zone,
                evaluated: true,
              };
            }
            return zone.distance > -15;
          })
      );

      animationFrame =
        requestAnimationFrame(moveZones);
    };

    animationFrame =
      requestAnimationFrame(moveZones);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [monitoring]);

  useEffect(() => {
    if (!monitoring) return;

    roadZones.forEach((zone) => {
      if (
        zone.type === "hospital" &&
        zone.ambulance &&
        zone.distance <= 35 &&
        !zone.interactionDone
      ) {
        const currentSpeed = speedRef.current;

        setRoadMessage(
          "\u{1F691} AMBULANCE APPROACHING \u2014 prepare to yield."
        );

        addEvent({
          type: "AMBULANCE ALERT",
          icon: "\u{1F691}",
          message:
            "Emergency ambulance approaching hospital",
          detail: `Current speed ${currentSpeed} km/h`,
          severity: "warning",
        });

        speakWarning(
          "Emergency vehicle approaching. Prepare to yield.",
          "critical"
        );

        setRoadZones((current) =>
          current.map((item) =>
            item.id === zone.id
              ? {
                  ...item,
                  interactionDone: true,
                }
              : item
          )
        );
      }
    });
  }, [roadZones, monitoring]);

  useEffect(() => {
    if (!monitoring) return;

    if (hazard) {
      addEvent({
        type: "HAZARD",
        icon: "\u26A0\uFE0F",
        message: "Road hazard manually simulated",
        detail:
          "Recommended speed reduced to 25 km/h",
        severity: "danger",
      });

      setRoadMessage(
        "\u26A0\uFE0F Road hazard detected. Slow down immediately."
      );

      speakWarning(
        "Warning. Road hazard detected. Slow down immediately.",
        "hazard"
      );
    }
  }, [hazard, monitoring]);

  const nearestVehicle =
    vehicles.length > 0
      ? vehicles.reduce((closest, vehicle) =>
          vehicle.distance < closest.distance
            ? vehicle
            : closest
        )
      : null;

  const nearestZone =
    roadZones.length > 0
      ? roadZones.reduce((closest, zone) =>
          zone.distance < closest.distance
            ? zone
            : closest
        )
      : null;

  const nearestMapPlace =
    mapPlaces.length > 0
      ? mapPlaces.reduce((closest, place) =>
          place.distance < closest.distance
            ? place
            : closest
        )
      : null;

  let recommendedSpeed = 60;

  if (nearestZone) {
    recommendedSpeed = nearestZone.speedLimit;
  }

  if (nearestMapPlace) {
    if (nearestMapPlace.distance < 500) {
      recommendedSpeed = Math.min(
        recommendedSpeed,
        nearestMapPlace.speedLimit
      );
    }
  }

  if (wetRoad) {
    recommendedSpeed = Math.min(recommendedSpeed, 40);
  }

  if (hazard) {
    recommendedSpeed = Math.min(recommendedSpeed, 25);
  }

  const yourSpeedMS = speed / 3.6;
  const vehicleSpeedMS = nearestVehicle
    ? nearestVehicle.speed / 3.6
    : 0;
  const closingSpeedMS = nearestVehicle
    ? Math.max(0, yourSpeedMS - vehicleSpeedMS)
    : 0;
  const timeToCollision =
    nearestVehicle && closingSpeedMS > 0
      ? nearestVehicle.distance / closingSpeedMS
      : Infinity;
  const closingSpeed = Number(
    (closingSpeedMS * 3.6).toFixed(1)
  );
  const ttc =
    timeToCollision !== Infinity
      ? Number(timeToCollision.toFixed(1))
      : null;

  const collisionWarningRef = useRef(false);

  useEffect(() => {
    if (!monitoring) {
      collisionWarningRef.current = false;
      return;
    }

    if (ttc !== null && ttc < 2) {
      if (!collisionWarningRef.current) {
        collisionWarningRef.current = true;
        speakWarning(
          "Critical warning. Collision risk. Reduce speed immediately.",
          "critical"
        );
      }
    } else if (ttc === null || ttc >= 4) {
      collisionWarningRef.current = false;
    }
  }, [ttc, monitoring]);

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
    nearestZone.status === "active"
  ) {
    risk = "HIGH";
    riskClass = "danger";
  } else if (
    speed > recommendedSpeed + 20
  ) {
    risk = "HIGH";
    riskClass = "danger";
  } else if (speed > recommendedSpeed) {
    risk = "MEDIUM";
    riskClass = "warning";
  }

  let safetyMessage =
    "Road conditions look safe. Continue driving carefully.";

  if (!monitoring) {
    safetyMessage =
      "Monitoring is currently turned off.";
  } else if (hazard) {
    safetyMessage =
      "\u26A0\uFE0F Road hazard detected ahead. Slow down immediately.";
  } else if (
    nearestVehicle &&
    ttc !== null &&
    ttc < 2
  ) {
    safetyMessage =
      `\u{1F534} CRITICAL: Collision risk in approximately ${ttc} seconds. Reduce speed immediately.`;
  } else if (
    nearestVehicle &&
    ttc !== null &&
    ttc < 4
  ) {
    safetyMessage =
      `\u{1F7E0} Rapid closing detected. Estimated time to collision: ${ttc} seconds.`;
  } else if (
    nearestZone &&
    nearestZone.status === "active"
  ) {
    safetyMessage =
      `\u{1F534} ${nearestZone.name} is now active. Recommended speed: ${recommendedSpeed} km/h.`;
  } else if (
    nearestZone &&
    nearestZone.status === "approaching"
  ) {
    safetyMessage =
      `${nearestZone.icon} ${nearestZone.name} approaching. Start reducing speed.`;
  } else if (nearestZone) {
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
    nearestVehicle.distance < 22
  ) {
    safetyMessage =
      "Vehicle detected ahead. Maintain a safe following distance.";
  } else if (speed > recommendedSpeed) {
    safetyMessage =
      `Your speed is above the recommended ${recommendedSpeed} km/h.`;
  } else if (wetRoad) {
    safetyMessage =
      "\u{1F327}\uFE0F Wet road conditions detected. Drive carefully and maintain extra distance.";
  } else if (nearestMapPlace) {
    safetyMessage =
      `${nearestMapPlace.icon} ${nearestMapPlace.name} is approximately ${Math.round(
        nearestMapPlace.distance
      )} m away.`;
  }

  const reportStatus =
    safetyScore >= 85
      ? "Excellent"
      : safetyScore >= 70
      ? "Good"
      : safetyScore >= 50
      ? "Needs Improvement"
      : "High Risk";

  const fineApplicable = violations > 0;

  const toggleMonitoring = () => {
    if (!monitoring) {
      if (speechSupported) {
        stopVoiceSystem();
        const startMessage =
          new SpeechSynthesisUtterance(
            "Smart Road Safety monitoring started."
          );
        startMessage.rate = 0.95;
        startMessage.volume = 1;
        window.speechSynthesis.speak(startMessage);
      }
      if (userLocation) {
        fetchNearbyPlaces(
          userLocation.lat,
          userLocation.lng
        );
      }
    } else {
      stopVoiceSystem();
    }
    setMonitoring((current) => !current);
  };

  const mapPosition = userLocation
    ? [userLocation.lat, userLocation.lng]
    : [22.5726, 88.3639];

  const value = {
    monitoring,
    speed,
    wetRoad,
    hazard,
    vehicles,
    roadZones,
    roadMessage,
    openHelpTopic,
    safetyScore,
    eventHistory,
    safeResponses,
    violations,
    currentUser,
    authModalOpen,
    authMode,
    authEmail,
    authPassword,
    authLoading,
    authError,
    userLocation,
    driverHeading,
    mapPlaces,
    mapLoading,
    mapError,
    locationPermission,
    complaintType,
    complaintLocation,
    complaintDescription,
    complaintPhoto,
    complaintPhotoPreview,
    complaintSubmitted,
    complaintSubmitting,
    complaintError,
    reportReference,
    speechSupported,
    recommendedSpeed,
    risk,
    riskClass,
    safetyMessage,
    nearestVehicle,
    nearestZone,
    nearestMapPlace,
    closingSpeed,
    ttc,
    reportStatus,
    fineApplicable,
    mapPosition,
    setMonitoring,
    setSpeed,
    setWetRoad,
    setHazard,
    setRoadMessage,
    setOpenHelpTopic,
    setAuthModalOpen,
    setAuthMode,
    setAuthEmail,
    setComplaintType,
    setComplaintLocation,
    setComplaintDescription,
    toggleMonitoring,
    evaluateZone,
    addEvent,
    fetchNearbyPlaces,
    speakWarning,
    stopVoiceSystem,
    handleGoogleSignIn,
    handleEmailAuth,
    handleSignOut,
    openAuthModal,
    getAuthErrorMessage,
    handleComplaintPhotoChange,
    handleComplaintSubmit,
    processSpeechQueue,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export { calculateDistance, calculateBearing, smallestAngleDifference, helpTopics, REPORTS_API_URL };
