import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3001;

app.use(express.json());

const ORS_API_KEY = process.env.ORS_API_KEY;
if (!ORS_API_KEY) {
  console.error("Error: ORS_API_KEY is not defined in .env");
  process.exit(1);
}

app.get("/api/geocode", async (req, res) => {
  try {
    const { text, size } = req.query;
    const response = await axios.get(
      `https://api.openrouteservice.org/geocode/search`,
      {
        params: { api_key: ORS_API_KEY, text, size },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Geocode error:", error);
    res.status(500).json({ error: "Failed to fetch geocode data" });
  }
});

app.post("/api/directions", async (req, res) => {
  try {
    const { coordinates } = req.body;
    const response = await axios.post(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      { coordinates },
      {
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error("Directions error:", error);
    res.status(500).json({ error: "Failed to fetch route data" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
