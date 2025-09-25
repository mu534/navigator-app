import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
const port = 3001;

const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

const GH_API_KEY = process.env.GH_API_KEY;
if (!GH_API_KEY) {
  console.error("GH_API_KEY not defined in .env");
  process.exit(1);
}

// Geocode endpoint
app.get("/api/geocode", async (req, res) => {
  try {
    const { text, size } = req.query;
    if (!text) return res.status(400).json({ error: "Missing text" });

    const response = await axios.get("https://graphhopper.com/api/1/geocode", {
      params: { key: GH_API_KEY, q: text, limit: size || 5 },
    });

    res.json(response.data);
  } catch (err) {
    console.error("Geocode error:", err.response?.data || err.message);
    res.status(500).json({ error: "Geocode failed" });
  }
});

// Simple in-memory rate limit per IP: max 60 requests per 60 seconds
const requestCounts = new Map();
const RATE_LIMIT = Number(process.env.RATE_LIMIT || 60);
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
app.use((req, res, next) => {
  const ip =
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";
  const now = Date.now();
  const info = requestCounts.get(ip) || { count: 0, windowStart: now };
  if (now - info.windowStart > WINDOW_MS) {
    info.count = 0;
    info.windowStart = now;
  }
  info.count += 1;
  requestCounts.set(ip, info);
  if (info.count > RATE_LIMIT) {
    return res.status(429).json({ error: "Too many requests" });
  }
  next();
});

// Nearby POIs via Overpass API (free, OSM-based)
app.get("/api/nearby", async (req, res) => {
  try {
    const { lat, lng, radius = 1000, types } = req.query;
    if (!lat || !lng) return res.status(400).json({ error: "Missing lat/lng" });

    // Map simple type chips to Overpass amenity/shop/highway tags
    const typeList = (
      typeof types === "string"
        ? String(types).split(",")
        : Array.isArray(types)
        ? types
        : []
    )
      .map((t) => String(t).trim().toLowerCase())
      .filter(Boolean);

    const tagSets =
      typeList.length > 0
        ? typeList
        : ["restaurant", "cafe", "atm", "fuel", "hotel", "hospital"];

    const around = `around:${radius},${lat},${lng}`;
    const filters = tagSets
      .map(
        (tag) =>
          `node[amenity=${tag}](${around});way[amenity=${tag}](${around});node[shop=${tag}](${around});`
      )
      .join("\n");

    const query = `
      [out:json];
      (
        ${filters}
      );
      out center 30;
    `;

    const { data } = await axios.post(
      "https://overpass-api.de/api/interpreter",
      query,
      {
        headers: { "Content-Type": "text/plain" },
        timeout: 15000,
      }
    );

    res.json(data);
  } catch (err) {
    console.error("Nearby error:", err.response?.data || err.message);
    res.status(500).json({ error: "Nearby search failed" });
  }
});

// Nearby POIs along a route using multiple around() filters
app.post("/api/nearby-along", async (req, res) => {
  try {
    const { coordinates, radius = 300, types } = req.body || {};
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return res
        .status(400)
        .json({
          error: "coordinates must be an array of [lat,lng] with length >= 2",
        });
    }
    const typeList = (
      Array.isArray(types)
        ? types
        : typeof types === "string"
        ? String(types).split(",")
        : []
    )
      .map((t) => String(t).trim().toLowerCase())
      .filter(Boolean);
    const tagSets =
      typeList.length > 0
        ? typeList
        : ["restaurant", "cafe", "atm", "fuel", "hotel", "hospital"];

    // Sample up to 15 points evenly along the polyline
    const samples = [];
    const n = Math.min(15, coordinates.length);
    for (let i = 0; i < n; i++) {
      const idx = Math.floor((i * (coordinates.length - 1)) / (n - 1));
      const [lat, lng] = coordinates[idx];
      samples.push({ lat, lng });
    }

    const around = (lat, lng) => `around:${radius},${lat},${lng}`;
    const aroundBlocks = samples
      .map((p) =>
        tagSets
          .map(
            (tag) =>
              `node[amenity=${tag}](${around(
                p.lat,
                p.lng
              )});way[amenity=${tag}](${around(
                p.lat,
                p.lng
              )});node[shop=${tag}](${around(p.lat, p.lng)});`
          )
          .join("\n")
      )
      .join("\n");

    const query = `
      [out:json][timeout:25];
      (
        ${aroundBlocks}
      );
      out center 50;
    `;

    const { data } = await axios.post(
      "https://overpass-api.de/api/interpreter",
      query,
      {
        headers: { "Content-Type": "text/plain" },
        timeout: 20000,
      }
    );
    res.json(data);
  } catch (err) {
    console.error("Nearby-along error:", err.response?.data || err.message);
    res.status(500).json({ error: "Nearby-along search failed" });
  }
});

// Directions endpoint
app.post("/api/directions", async (req, res) => {
  try {
    const { coordinates, mode = "car", avoid } = req.body;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return res.status(400).json({ error: "Need at least 2 coordinates" });
    }

    // GraphHopper routing (free tier)
    // Format coordinates as GraphHopper expects
    const pointParams = coordinates.map(([lat, lng]) => `${lat},${lng}`);

    const response = await axios.get("https://graphhopper.com/api/1/route", {
      params: {
        key: GH_API_KEY,
        point: pointParams,
        vehicle: mode,
        instructions: true,
        points_encoded: true,
        type: "json",
        ...(avoid
          ? {
              // allow values like ["toll","ferry","motorway"] or comma string
              avoid: Array.isArray(avoid) ? avoid.join(",") : String(avoid),
            }
          : {}),
      },
      paramsSerializer: (params) => {
        // Axios serializes arrays as point[]=x,y
        return Object.entries(params)
          .map(([k, v]) =>
            Array.isArray(v)
              ? v
                  .map(
                    (val) =>
                      `${encodeURIComponent(k)}=${encodeURIComponent(val)}`
                  )
                  .join("&")
              : `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
          )
          .join("&");
      },
    });

    if (!response.data.paths || response.data.paths.length === 0)
      return res.status(404).json({ error: "No route found" });

    res.json(response.data);
  } catch (err) {
    console.error("Directions error:", err.response?.data || err.message);
    res
      .status(500)
      .json({ error: err.response?.data?.message || "Directions failed" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
