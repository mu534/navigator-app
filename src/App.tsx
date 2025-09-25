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
  useMap,
} from "react-leaflet";
import RouteDrawer from "./components/RouteDrawer";
import MapUpdater from "./components/MapUpdater";
import PoiControls from "./components/PoiControls";
import ModeSelector from "./components/ModeSelector";
import SearchBar from "./components/SearchBar";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, ZoomIn, ZoomOut } from "lucide-react";
import type { Route } from "./types/ors";

// --- Locate Button ---
interface LocateButtonProps {
  setOrigin: (coords: [number, number]) => void;
}
interface Instruction {
  text: string;
  distance?: number;
  time?: number;
}

const LocateButton: React.FC<LocateButtonProps> = ({ setOrigin }) => {
  const map = useMap();
  const handleLocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords: [number, number] = [
          pos.coords.latitude,
          pos.coords.longitude,
        ];
        setOrigin(coords);
        map.setView(coords, 15);
      });
    }
  };
  return (
    <motion.button
      className="absolute bottom-20 right-4 bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 z-[999] transition-colors"
      onClick={handleLocate}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      title="Locate Me"
    >
      <svg
        className="w-5 h-5 text-gray-800 dark:text-gray-200"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm9-2c0 .55-.45 1-1 1h-1.41l-3.29 3.29c-.39.39-1.02.39-1.41 0s-.39-1.02 0-1.41L17.17 13H13v2.59c0 .55-.45 1-1 1s-1-.45-1-1V13H6.83l3.29 3.29c.39.39.39 1.02 0 1.41s-1.02.39-1.41 0L5.41 14H4c-.55 0-1-.45-1-1s.45-1 1-1h1.41l-3.29-3.29c-.39-.39-.39-1.02 0-1.41s1.02-.39 1.41 0L6.83 11H11V8.41c0-.55.45-1 1-1s1 .45 1 1V11h4.17l-3.29-3.29c-.39-.39-.39-1.02 0-1.41s1.02-.39 1.41 0L18.59 11H20c.55 0 1 .45 1 1z" />
      </svg>
    </motion.button>
  );
};

// --- Zoom Controls ---
const ZoomControls: React.FC = () => {
  const map = useMap();
  return (
    <div className="absolute bottom-32 right-4 flex flex-col gap-2 z-[999]">
      <motion.button
        className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => map.zoomIn()}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Zoom In"
      >
        <ZoomIn className="w-5 h-5 text-gray-800 dark:text-gray-200" />
      </motion.button>
      <motion.button
        className="bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        onClick={() => map.zoomOut()}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Zoom Out"
      >
        <ZoomOut className="w-5 h-5 text-gray-800 dark:text-gray-200" />
      </motion.button>
    </div>
  );
};

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
  const [showDirections, setShowDirections] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize geolocation and watch position
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

  // Handle dark mode and saved route
  useEffect(() => {
    setIsDark(localStorage.getItem("ui.dark") === "1");
    const savedRoute = localStorage.getItem("route.last");
    if (savedRoute) {
      try {
        setRoute(JSON.parse(savedRoute));
      } catch (err) {
        console.error("Failed to load saved route from localStorage", err);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("ui.dark", isDark ? "1" : "0");
  }, [isDark]);

  // Navigate to destination
  const navigateTo = async (lat: number, lng: number, name?: string) => {
    if (!origin) return;
    setIsLoading(true);
    try {
      setHighlightPoi({ lat, lng, name });
      const { data } = await axios.post("/api/directions", {
        coordinates: [origin, [lat, lng]],
        mode,
      });

      const path = data.paths?.[0];
      if (!path) return;

      const decodedRaw: number[][] = polyline.decode(path.points);
      const geometryCoordinates: [number, number][] = decodedRaw
        .filter((item) => item.length === 2)
        .map(([lat, lng]) => [lng, lat]);

      const steps = path.instructions.map((i: Instruction, index: number) => ({
        instruction: i.text,
        distance: i.distance,
        duration: i.time,
        way_points: [index],
      }));

      const segments = [
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <motion.div
        className="md:w-96 w-full p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg shadow-xl rounded-r-2xl overflow-y-auto"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">
            Navigator
          </h1>
          <motion.button
            className="flex items-center gap-2 text-gray-700 dark:text-gray-200"
            onClick={() => setIsDark(!isDark)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isDark ? (
              <Sun className="w-6 h-6" />
            ) : (
              <Moon className="w-6 h-6" />
            )}
            <span className="text-sm">{isDark ? "Light" : "Dark"}</span>
          </motion.button>
        </div>

        <ModeSelector mode={mode} setMode={setMode} />
        <SearchBar
          setRoute={setRoute}
          mode={mode}
          origin={origin || defaultOrigin}
          rerouteOnOriginChange
          onPlannedCoordinates={setPlannedCoords}
        />

        <motion.button
          className="w-full px-4 py-2 mt-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => setFitKey((k) => k + 1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Reset Map View
        </motion.button>

        {/* Route Summary */}
        <AnimatePresence>
          {route && (
            <motion.div
              className="mt-4 p-4 bg-white/50 dark:bg-gray-700/50 rounded-lg shadow-md"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                Route Summary
              </h2>
              <div className="mt-2 space-y-2">
                <p className="text-gray-700 dark:text-gray-200">
                  <strong>Distance:</strong>{" "}
                  {(route.distance / 1000).toFixed(1)} km
                </p>
                <p className="text-gray-700 dark:text-gray-200">
                  <strong>ETA:</strong> {Math.round(route.duration / 60000)} min
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-600">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{
                      width: `${Math.min(
                        (route.distance / 1000 / 10) * 100,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Directions */}
        {route && (
          <>
            <motion.button
              className="w-full px-4 py-2 mt-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              onClick={() => setShowDirections(!showDirections)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {showDirections ? "Hide Directions" : "Show Directions"}
            </motion.button>
            <AnimatePresence>
              {showDirections && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden mt-4"
                >
                  <RouteDrawer route={route} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>

      {/* Map */}
      <div className="flex-1 relative">
        {isLoading && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black/30 z-[1000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </motion.div>
        )}
        <MapContainer
          center={origin || defaultOrigin}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
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
                opacity={0.8}
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

          {/* Planned waypoints */}
          {plannedCoords.map(([lat, lng], idx) => (
            <CircleMarker
              key={idx}
              center={[lat, lng]}
              radius={6}
              pathOptions={{ color: "#22c55e", fillOpacity: 0.9 }}
            />
          ))}

          {/* Highlighted POI */}
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

          <LocateButton setOrigin={setOrigin} />
          <ZoomControls />
        </MapContainer>
      </div>
    </div>
  );
};

export default App;
