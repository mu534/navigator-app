import React, { useState } from "react";
import axios from "axios";
import type { Route, DirectionsResponse } from "../types/ors";

interface GeocodeResponse {
  features: Array<{
    geometry: {
      coordinates: [number, number];
    };
  }>;
}

interface SearchBarProps {
  setRoute: (route: Route) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ setRoute }) => {
  const [origin] = useState("9.03,38.7578"); // Addis Ababa
  const [destination, setDestination] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!destination.trim()) {
      setError("Please enter a destination");
      return;
    }
    if (!origin.match(/^-?\d+\.\d+,-?\d+\.\d+$/)) {
      setError("Invalid origin format. Use 'lat,lng'");
      return;
    }

    setLoading(true);

    try {
      // Geocode via backend proxy (no api_key in frontend)
      const geoRes = await axios.get<GeocodeResponse>(
        `/api/geocode?text=${destination.trim()}&size=1`
      );

      const destCoords = geoRes.data.features?.[0]?.geometry?.coordinates;
      if (!destCoords) {
        setError("Destination not found");
        setLoading(false);
        return;
      }

      const originCoords = origin.split(",").map(Number) as [number, number];
      if (originCoords.some(isNaN)) {
        setError("Invalid origin coordinates");
        setLoading(false);
        return;
      }

      const coords: [number, number][] = [
        [originCoords[1], originCoords[0]], // [lng, lat]
        [destCoords[0], destCoords[1]], // [lng, lat]
      ];

      // Directions via backend proxy (no Authorization header in frontend)
      const routeRes = await axios.post<DirectionsResponse>(
        "/api/directions",
        { coordinates: coords },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (routeRes.data.routes.length === 0) {
        setError("No route found");
      } else {
        setRoute(routeRes.data.routes[0]);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch route. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="flex w-full max-w-lg bg-white rounded-lg shadow-md overflow-hidden"
    >
      <div className="flex-1 relative">
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Enter destination (e.g., Bole, Addis Ababa)"
          className="w-full px-4 py-2 outline-none disabled:bg-gray-100"
          disabled={loading}
        />
        {error && (
          <p className="absolute left-4 top-full mt-1 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        className={`px-4 font-semibold text-white ${
          loading
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center">
            <svg
              className="animate-spin h-5 w-5 mr-2 text-white"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"
              />
            </svg>
            Loading...
          </span>
        ) : (
          "Go"
        )}
      </button>
    </form>
  );
};

export default SearchBar;
