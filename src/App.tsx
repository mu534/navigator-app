import React, { useState, useEffect } from "react";
import axios from "axios";
import polyline from "polyline";
import {
  MapContainer,
  TileLayer,
  Polyline as LeafletPolyline,
  Marker,
  Popup,
  CircleMarker,
} from "react-leaflet";
import RouteDrawer from "./components/RouteDrawer";
import MapUpdater from "./components/MapUpdater";
import PoiControls from "./components/PoiControls";
import ModeSelector from "./components/ModeSelector";
import SearchBar from "./components/SearchBar";
import "leaflet/dist/leaflet.css";

import type { Route, Step, Segment } from "./types/ors";

interface GraphHopperInstruction {
  text: string;
  distance?: number;
  time?: number;
}

interface GraphHopperPath {
  points: string;
  instructions: GraphHopperInstruction[];
  distance: number;
  time: number;
}

interface GraphHopperResponse {
  paths: GraphHopperPath[];
}

const App: React.FC = () => {
  const defaultOrigin: [number, number] = [9.03, 38.7578];

  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [plannedCoords, setPlannedCoords] = useState<[number, number][]>([]);
  const [mode, setMode] = useState<"car" | "foot" | "bike">("car");
  const [isDark, setIsDark] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const [livePos, setLivePos] = useState<[number, number] | null>(null);
  const [highlightPoi, setHighlightPoi] = useState<{
    lat: number;
    lng: number;
    name?: string;
  } | null>(null);

  // Get current location and watch live position
  useEffect(() => {
    if (!navigator.geolocation) {
      setOrigin(defaultOrigin);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigin([pos.coords.latitude, pos.coords.longitude]),
      () => setOrigin(defaultOrigin),
      { enableHighAccuracy: true }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLivePos([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Load dark mode and last route
  useEffect(() => {
    setIsDark(localStorage.getItem("ui.dark") === "1");
    const savedRoute = localStorage.getItem("route.last");
    if (savedRoute) {
      try {
        setRoute(JSON.parse(savedRoute) as Route);
      } catch (err) {
        console.error("Failed to load saved route from localStorage", err);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("ui.dark", isDark ? "1" : "0");
  }, [isDark]);

  // Navigate to a point (POI or destination)
  const navigateTo = async (lat: number, lng: number, name?: string) => {
    try {
      const start = origin || defaultOrigin;
      setHighlightPoi({ lat, lng, name });

      const { data } = await axios.post<GraphHopperResponse>(
        "/api/directions",
        {
          coordinates: [start, [lat, lng]],
          mode,
        }
      );

      const path = data.paths[0];
      if (!path) return;

      const decodedRaw: number[][] = polyline.decode(path.points);
      const decoded: [number, number][] = decodedRaw.filter(
        (item): item is [number, number] => item.length === 2
      );

      const geometryCoordinates: [number, number][] = decoded.map(
        ([lat, lng]) => [lng, lat]
      );

      const steps: Step[] = path.instructions.map((i) => ({
        instruction: i.text,
        distance: i.distance,
        duration: i.time,
        way_points: [],
      }));

      const segments: Segment[] = [
        { steps, distance: path.distance, duration: path.time },
      ];

      const built: Route = {
        segments,
        geometry: { coordinates: geometryCoordinates, type: "LineString" },
        distance: path.distance,
        duration: path.time,
      };

      setRoute(built);
      localStorage.setItem("route.last", JSON.stringify(built));
      setFitKey((k) => k + 1);
    } catch (err) {
      console.error("Navigation failed", err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Sidebar */}
      <div className="md:w-1/3 flex flex-col p-4 gap-4 overflow-y-auto bg-white dark:bg-gray-200">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Navigator</h1>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isDark}
              onChange={(e) => setIsDark(e.target.checked)}
            />
            Dark
          </label>
        </div>

        <ModeSelector mode={mode} setMode={setMode} />
        <SearchBar
          setRoute={setRoute}
          mode={mode}
          origin={origin || defaultOrigin}
          rerouteOnOriginChange
          onPlannedCoordinates={setPlannedCoords}
        />

        <button
          className="px-3 py-1.5 border rounded"
          onClick={() => setFitKey((k) => k + 1)}
        >
          Reset View
        </button>

        {route && <RouteDrawer route={route} />}
      </div>

      {/* Map */}
      <div className="md:w-2/3 flex-1 min-h-[500px]">
        <MapContainer
          center={origin || defaultOrigin}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url={
              isDark
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
                : "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            }
            attribution="&copy; OpenStreetMap contributors & CARTO"
          />

          {/* Route */}
          {route && (
            <>
              <LeafletPolyline
                positions={route.geometry.coordinates.map(([lng, lat]) => [
                  lat,
                  lng,
                ])}
                color="#2563eb"
                weight={5}
              />
              <Marker
                position={[
                  route.geometry.coordinates[0][1],
                  route.geometry.coordinates[0][0],
                ]}
              >
                <Popup>Origin</Popup>
              </Marker>
              <Marker
                position={[
                  route.geometry.coordinates.slice(-1)[0][1],
                  route.geometry.coordinates.slice(-1)[0][0],
                ]}
              >
                <Popup>Destination</Popup>
              </Marker>
              <MapUpdater
                coordinates={route.geometry.coordinates}
                fitOnce
                fitKey={fitKey}
              />
            </>
          )}

          {/* Planned steps */}
          {plannedCoords.map(([lat, lng], idx) => (
            <CircleMarker
              key={idx}
              center={[lat, lng]}
              radius={6}
              pathOptions={{ color: "#22c55e", fillOpacity: 0.9 }}
            />
          ))}

          {/* Highlight selected POI */}
          {highlightPoi && (
            <Marker position={[highlightPoi.lat, highlightPoi.lng]}>
              <Popup>{highlightPoi.name || "Destination"}</Popup>
            </Marker>
          )}

          {/* Live position */}
          {livePos && (
            <Marker position={livePos}>
              <Popup>Your Current Location</Popup>
            </Marker>
          )}

          <PoiControls
            center={
              route
                ? [
                    route.geometry.coordinates[0][0],
                    route.geometry.coordinates[0][1],
                  ]
                : defaultOrigin
            }
            onPickDestination={navigateTo}
          />
        </MapContainer>
      </div>
    </div>
  );
};

export default App;
