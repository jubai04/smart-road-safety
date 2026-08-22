import { randomUUID } from "node:crypto";

export const config = {
  api: { bodyParser: false },
};

const permittedIssueTypes = new Set([
  "Pothole",
  "Broken traffic light",
  "Accident",
  "Road damage",
  "Other safety concern",
]);

function parseMultipart(buffer, boundary) {
  const parts = [];
  const boundaryBuf = Buffer.from(`--${boundary}`);
  let start = bufferIndexOf(buffer, boundaryBuf, 0);
  if (start === -1) return parts;

  while (start !== -1) {
    const nextBoundary = bufferIndexOf(buffer, boundaryBuf, start + boundaryBuf.length);
    if (nextBoundary === -1) break;

    const partData = buffer.slice(start + boundaryBuf.length, nextBoundary);
    const headerEnd = bufferIndexOf(partData, Buffer.from("\r\n\r\n"), 0);
    if (headerEnd === -1) { start = nextBoundary; continue; }

    const headers = partData.slice(0, headerEnd).toString("utf8");
    const body = partData.slice(headerEnd + 4, partData.length - 2);

    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*(.+?)\r/i);

    parts.push({
      name: nameMatch?.[1] || "",
      filename: filenameMatch?.[1] || null,
      contentType: contentTypeMatch?.[1]?.trim() || null,
      data: body,
    });

    start = nextBoundary;
  }

  return parts;
}

function bufferIndexOf(buf, search, offset) {
  for (let i = offset; i <= buf.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (buf[i + j] !== search[j]) { found = false; break; }
    }
    if (found) return i;
  }
  return -1;
}

const inMemoryReports = [];

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    const formatted = inMemoryReports
      .slice()
      .reverse()
      .map((report) => ({
        id: report.id,
        reference: `SRS-${report.id.slice(0, 8).toUpperCase()}`,
        issueType: report.issueType,
        location: report.location,
        description: report.description,
        latitude: report.latitude,
        longitude: report.longitude,
        photoUrl: report.photoUrl || null,
        createdAt: report.createdAt,
      }));

    return res.status(200).json({ reports: formatted });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed." });
  }

  try {
    const contentType = req.headers["content-type"] || "";
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) {
      return res.status(400).json({ message: "Invalid request format." });
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);

    const parts = parseMultipart(body, boundaryMatch[1]);

    const get = (name) => {
      const part = parts.find((p) => p.name === name && !p.filename);
      return part ? part.data.toString("utf8").trim() : "";
    };

    const issueType = get("issueType");
    const location = get("location");
    const description = get("description");
    const latitudeRaw = get("latitude");
    const longitudeRaw = get("longitude");

    if (!permittedIssueTypes.has(issueType)) {
      return res.status(400).json({ message: "Choose a valid issue type." });
    }
    if (!location || location.length > 180) {
      return res.status(400).json({ message: "Enter a location under 180 characters." });
    }
    if (!description || description.length > 2000) {
      return res.status(400).json({ message: "Enter a description under 2,000 characters." });
    }

    const parsedLatitude = latitudeRaw ? Number(latitudeRaw) : null;
    const parsedLongitude = longitudeRaw ? Number(longitudeRaw) : null;
    const validCoords =
      (parsedLatitude === null && parsedLongitude === null) ||
      (Number.isFinite(parsedLatitude) &&
        Number.isFinite(parsedLongitude) &&
        parsedLatitude >= -90 && parsedLatitude <= 90 &&
        parsedLongitude >= -180 && parsedLongitude <= 180);

    if (!validCoords) {
      return res.status(400).json({ message: "The supplied map location is invalid." });
    }

    const id = randomUUID();
    const createdAt = new Date().toISOString();

    inMemoryReports.push({
      id,
      issueType,
      location,
      description,
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      photoUrl: null,
      createdAt,
    });

    if (inMemoryReports.length > 500) inMemoryReports.splice(0, 100);

    return res.status(201).json({
      reference: `SRS-${id.slice(0, 8).toUpperCase()}`,
      createdAt,
    });
  } catch (error) {
    console.error("Report submission error:", error);
    return res.status(500).json({ message: "The reporting service encountered an error." });
  }
}
