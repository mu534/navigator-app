import React, { useState } from "react";
import axios from "axios";
import polyline from "polyline";
import type { Route, Step, Segment } from "../types/ors";

interface GraphHopperInstruction {
  text: string;
  distance?: number;
  time?: number;
}

interface GraphHopperPath {
  instructions: GraphHopperInstruction[];
  points: string;
  distance: number;
  time: number;
}

interface GraphHopperDirectionsResponse {
  paths: GraphHopperPath[];
}

interface GraphHopperGeocodeHit {
  point: {
    lat: number;
    lng: number;
  };
  name?: string;
}

interface GraphHopperGeocodeResponse {
  hits: GraphHopperGeocodeHit[];
}

// Error response interfaces
interface ApiErrorResponse {
  error?: string;
  message?: string;
  details?: string;
}

interface SearchBarProps {
  setRoute: (route: Route | null) => void;
  mode?: "car" | "foot" | "bike";
  origin?: [number, number];
  rerouteOnOriginChange?: boolean;
  onPlannedCoordinates?: (coords: [number, number][]) => void;
}

// Custom error type
class DirectionsError extends Error {
  public userMessage: string;

  constructor(message: string, userMessage?: string) {
    super(message);
    this.name = "DirectionsError";
    this.userMessage = userMessage || message;
  }
}

const SearchBar: React.FC<SearchBarProps> = ({
  setRoute,
  mode = "car",
  origin = [9.03, 38.7578],
  rerouteOnOriginChange = false,
  onPlannedCoordinates,
}) => {
  const [destination, setDestination] = useState("");
  const [waypoints, setWaypoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avoidToll, setAvoidToll] = useState(false);
  const [avoidFerry, setAvoidFerry] = useState(false);
  const [avoidMotorway, setAvoidMotorway] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const doSearch = async () => {
    setError(null);
    setRoute(null);

    if (!destination.trim()) {
      setError("Please enter a destination");
      return;
    }

    setLoading(true);

    try {
      // 1. Geocode destination
      const geoRes = await axios.get<GraphHopperGeocodeResponse>(
        `/api/geocode?text=${encodeURIComponent(destination)}&size=1`
      );

      const destinationHit = geoRes.data.hits?.[0];
      if (!destinationHit) {
        throw new DirectionsError(
          "Destination not found",
          "The destination address could not be found. Please try a different location."
        );
      }

      const destCoords: [number, number] = [
        destinationHit.point.lat,
        destinationHit.point.lng,
      ];

      // 2. Geocode waypoints
      const waypointCoords: [number, number][] = [];
      for (const w of waypoints) {
        const trimmed = w.trim();
        if (!trimmed) continue;
        const wRes = await axios.get<GraphHopperGeocodeResponse>(
          `/api/geocode?text=${encodeURIComponent(trimmed)}&size=1`
        );
        const wHit = wRes.data.hits?.[0];
        if (wHit) waypointCoords.push([wHit.point.lat, wHit.point.lng]);
      }

      // 3. Prepare coordinates for directions
      const coordinates: [number, number][] = [
        origin,
        ...waypointCoords,
        destCoords,
      ];
      onPlannedCoordinates?.(coordinates);

      // 4. Fetch directions
      const avoidOptions: string[] = [];
      if (avoidToll) avoidOptions.push("toll");
      if (avoidFerry) avoidOptions.push("ferry");
      if (avoidMotorway) avoidOptions.push("motorway");

      const dirRes = await axios.post<GraphHopperDirectionsResponse>(
        "/api/directions",
        {
          coordinates,
          mode,
          ...(avoidOptions.length > 0 ? { avoid: avoidOptions } : {}),
        }
      );

      const path = dirRes.data.paths?.[0];
      if (!path) {
        throw new DirectionsError(
          "No route path found",
          "No route could be calculated for the given locations."
        );
      }

      // 5. Decode polyline to [lng, lat]
      const decodedArray: number[][] = polyline.decode(path.points);
      const geometryCoordinates: [number, number][] = decodedArray.map(
        (coord) => [coord[1], coord[0]]
      );

      // 6. Map instructions to Step[] with way_points
      let pointIndex = 0; // to assign polyline indices
      const steps: Step[] =
        path.instructions?.map((instruction) => {
          const wpCount = Math.max(
            Math.round((instruction.distance || 0) / 10),
            1
          ); // simple estimate
          const way_points = Array.from(
            { length: wpCount },
            (_, i) => pointIndex + i
          );
          pointIndex += wpCount;

          return {
            instruction: instruction.text,
            distance: instruction.distance,
            duration: instruction.time,
            way_points,
          };
        }) || [];

      // 7. Create segment
      const segments: Segment[] = [
        {
          steps,
          distance: path.distance,
          duration: path.time,
        },
      ];

      // 8. Create route object
      const route: Route = {
        segments,
        geometry: {
          coordinates: geometryCoordinates,
          type: "LineString",
        },
        distance: path.distance,
        duration: path.time,
      };

      setRoute(route);
    } catch (err: unknown) {
      let errorMessage: string;

      if (axios.isAxiosError(err)) {
        const apiError = err.response?.data as ApiErrorResponse;
        errorMessage =
          apiError?.error ||
          apiError?.message ||
          err.message ||
          "Network error occurred";
      } else if (err instanceof DirectionsError) {
        errorMessage = err.userMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = "An unexpected error occurred";
      }

      setError(errorMessage);
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await doSearch();
  };

  // Optional: reroute when origin changes
  React.useEffect(() => {
    if (!rerouteOnOriginChange) return;
    if (!destination.trim()) return;
    doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin?.[0], origin?.[1]]);

  return (
    <div className="search-bar">
      <form onSubmit={handleSearch} className="flex flex-col gap-3 mb-4">
        <input
          type="text"
          placeholder="Enter destination address"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          disabled={loading}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {waypoints.map((w, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-white"
            draggable
            onDragStart={() => setDragIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex === null || dragIndex === idx) return;
              const next = [...waypoints];
              const [moved] = next.splice(dragIndex, 1);
              next.splice(idx, 0, moved);
              setWaypoints(next);
              setDragIndex(null);
            }}
          >
            <input
              type="text"
              placeholder={`Waypoint ${idx + 1}`}
              value={w}
              onChange={(e) => {
                const next = [...waypoints];
                next[idx] = e.target.value;
                setWaypoints(next);
              }}
              disabled={loading}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="px-2 py-1 border rounded text-gray-50"
                onClick={() => {
                  if (idx === 0) return;
                  const next = [...waypoints];
                  [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                  setWaypoints(next);
                }}
              >
                ↑
              </button>
              <button
                type="button"
                className="px-2 py-1 border rounded text-gray-50"
                onClick={() => {
                  if (idx === waypoints.length - 1) return;
                  const next = [...waypoints];
                  [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                  setWaypoints(next);
                }}
              >
                ↓
              </button>
              <button
                type="button"
                className="px-2 py-1 border rounded text-gray-50"
                onClick={() =>
                  setWaypoints(waypoints.filter((_, i) => i !== idx))
                }
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        <div>
          <button
            type="button"
            className="px-3 py-1.5 border rounded text-gray-50 hover:bg-blue-700"
            onClick={() => setWaypoints((prev) => [...prev, ""])}
          >
            Add waypoint
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-white font-medium">Avoid:</span>
          <label className="flex items-center gap-2 text-gray-100">
            <input
              type="checkbox"
              checked={avoidToll}
              onChange={(e) => setAvoidToll(e.target.checked)}
              disabled={loading}
            />
            Tolls
          </label>
          <label className="flex items-center gap-2 text-gray-100">
            <input
              type="checkbox"
              checked={avoidFerry}
              onChange={(e) => setAvoidFerry(e.target.checked)}
              disabled={loading}
            />
            Ferries
          </label>
          <label className="flex items-center gap-2 text-gray-100">
            <input
              type="checkbox"
              checked={avoidMotorway}
              onChange={(e) => setAvoidMotorway(e.target.checked)}
              disabled={loading}
            />
            Motorways
          </label>
        </div>
        <div>
          <button
            type="submit"
            disabled={loading || !destination.trim()}
            className={`px-6 py-2 text-white rounded-md font-medium ${
              loading || !destination.trim()
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Searching..." : "Get Directions"}
          </button>
        </div>
      </form>

      {error && (
        <div className="text-red-600 bg-red-50 px-3 py-2 rounded-md">
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
