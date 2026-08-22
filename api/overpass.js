export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let query;

    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("application/json")) {
      query = req.body?.data;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const rawBody = await new Promise((resolve) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      });
      const params = new URLSearchParams(rawBody);
      query = params.get("data");
    }

    if (!query) {
      return res.status(400).json({ error: "Missing query data" });
    }

    const overpassUrl = process.env.OVERPASS_API_URL || "https://overpass-api.de/api/interpreter";
    const response = await fetch(overpassUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "data=" + encodeURIComponent(query),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Overpass API error" });
    }

    const json = await response.json();
    return res.status(200).json(json);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch map data" });
  }
}
