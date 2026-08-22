import "dotenv/config";
import cors from "cors";
import Database from "better-sqlite3";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDirectory = path.join(__dirname, "uploads");
const dataDirectory = path.join(__dirname, "data");
mkdirSync(uploadsDirectory, { recursive: true });
mkdirSync(dataDirectory, { recursive: true });

const db = new Database(path.join(dataDirectory, "reports.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    issue_type TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    photo_url TEXT,
    created_at TEXT NOT NULL
  )
`);

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));
app.use("/uploads", express.static(uploadsDirectory));

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, uploadsDirectory),
    filename: (_request, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
    callback(
      supportedTypes.includes(file.mimetype)
        ? null
        : new Error("Only JPG, PNG, and WebP images are allowed."),
      supportedTypes.includes(file.mimetype)
    );
  },
});

const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many reports from this device. Please try again later." },
});

const permittedIssueTypes = new Set([
  "Pothole",
  "Broken traffic light",
  "Accident",
  "Road damage",
  "Other safety concern",
]);

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/reports", reportLimiter, upload.single("photo"), (request, response) => {
  const { issueType, location, description, latitude, longitude } = request.body;

  if (!permittedIssueTypes.has(issueType)) {
    return response.status(400).json({ message: "Choose a valid issue type." });
  }

  if (!location?.trim() || location.trim().length > 180) {
    return response.status(400).json({ message: "Enter a location under 180 characters." });
  }

  if (!description?.trim() || description.trim().length > 2000) {
    return response.status(400).json({ message: "Enter a description under 2,000 characters." });
  }

  const parsedLatitude = latitude === undefined ? null : Number(latitude);
  const parsedLongitude = longitude === undefined ? null : Number(longitude);
  const validCoordinates =
    (parsedLatitude === null && parsedLongitude === null) ||
    (Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude) &&
      parsedLatitude >= -90 && parsedLatitude <= 90 &&
      parsedLongitude >= -180 && parsedLongitude <= 180);

  if (!validCoordinates) {
    return response.status(400).json({ message: "The supplied map location is invalid." });
  }

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const publicBaseUrl = process.env.PUBLIC_BASE_URL || `${request.protocol}://${request.get("host")}`;
  const photoUrl = request.file
    ? `${publicBaseUrl}/uploads/${request.file.filename}`
    : null;

  db.prepare(`
    INSERT INTO reports (id, issue_type, location, description, latitude, longitude, photo_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    issueType,
    location.trim(),
    description.trim(),
    parsedLatitude,
    parsedLongitude,
    photoUrl,
    createdAt
  );

  response.status(201).json({
    reference: `SRS-${id.slice(0, 8).toUpperCase()}`,
    createdAt,
  });
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return response.status(400).json({ message: "Images must be smaller than 10 MB." });
  }

  if (error.message) {
    return response.status(400).json({ message: error.message });
  }

  console.error(error);
  response.status(500).json({ message: "The reporting service encountered an error." });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Reporting API is running on http://localhost:${port}`);
});
