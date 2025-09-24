import React, { useState } from "react";
import axios from "axios";
import polyline from "polyline";
import { MapContainer, TileLayer, Polyline, CircleMarker, Marker, Popup } from "react-leaflet";
import SearchBar from "./components/SearchBar";
import RouteDrawer from "./components/RouteDrawer";
import MapUpdater from "./components/MapUpdater";
import type { Route, Step, Segment } from "./types/ors";
import ModeSelector from "./components/ModeSelector";
import PoiControls from "./components/PoiControls";

const App: React.FC = () => {
  const [route, setRoute] = useState<Route | null>(null);
  const [trafficOverlay, setTrafficOverlay] = useState(false);
  const [mode, setMode] = useState<"car" | "foot" | "bike">("car");
  const [origin, setOrigin] = useState<[number, number] | null>(null);
  const defaultOrigin: [number, number] = [9.03, 38.7578];
  const [plannedCoords, setPlannedCoords] = useState<[number, number][]>([]);
  const [isDark, setIsDark] = useState(false);
  const [fitKey, setFitKey] = useState(0);
  const [livePos, setLivePos] = useState<[number, number] | null>(null); // [lat, lng]

  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setOrigin([pos.coords.latitude, pos.coords.longitude]),
        () => setOrigin(defaultOrigin),
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );
      // Start watching for live position
      const id = navigator.geolocation.watchPosition(
        (pos) => setLivePos([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
      return () => navigator.geolocation.clearWatch(id);
    } else {
      setOrigin(defaultOrigin);
    }
  }, []);

  React.useEffect(() => {
    const savedDark = localStorage.getItem('ui.dark') === '1';
    setIsDark(savedDark);
    const savedRoute = localStorage.getItem('route.last');
    if (savedRoute) {
      try { setRoute(JSON.parse(savedRoute)); } catch {}
    }
  }, []);

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try { localStorage.setItem('ui.dark', isDark ? '1' : '0'); } catch {}
  }, [isDark]);

  const navigateTo = async (lat: number, lng: number) => {
    try {
      const start = origin || defaultOrigin;
      const coordinates: [number, number][] = [start, [lat, lng]];
      const { data } = await axios.post("/api/directions", {
        coordinates,
        mode,
      });

      const path = data?.paths?.[0];
      if (!path) return;

      const decodedArray = polyline.decode(path.points);
      // store as [lng, lat] to match GeoJSON convention used elsewhere
      const geometryCoordinates: [number, number][] = decodedArray.map((coord) => [coord[1], coord[0]]);
      const steps: Step[] = (path.instructions || []).map((i: any) => ({
        instruction: i.text,
        distance: i.distance,
        duration: i.time,
      }));
      const segments: Segment[] = [
        {
          steps,
          distance: path.distance,
          duration: path.time,
        },
      ];
      const built: Route = {
        segments,
        geometry: { coordinates: geometryCoordinates, type: "LineString" },
        distance: path.distance,
        duration: path.time,
      };
      setRoute(built);
      try { localStorage.setItem('route.last', JSON.stringify(built)); } catch {}
    } catch (e) {
      console.error("Navigate to POI failed", e);
    }
  };

  // Compute haversine distance in meters between two [lat, lng]
  const distanceMeters = (a: [number, number], b: [number, number]) => {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b[0] - a[0]);
    const dLng = toRad(b[1] - a[1]);
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  // Distance from point to route polyline (approx) in meters
  const distanceToRoute = (pointLatLng: [number, number], routeLngLat: [number, number][]) => {
    // Convert [lng, lat] to [lat, lng]
    const pts: [number, number][] = routeLngLat.map(([lng, lat]) => [lat, lng]);
    let minD = Infinity;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      // Project point onto segment a-b in lat/lng space (rough planar approx for short segments)
      const ax = a[1], ay = a[0];
      const bx = b[1], by = b[0];
      const px = pointLatLng[1], py = pointLatLng[0];
      const vx = bx - ax, vy = by - ay;
      const wx = px - ax, wy = py - ay;
      const c1 = vx * wx + vy * wy;
      const c2 = vx * vx + vy * vy || 1e-12;
      let t = c1 / c2;
      t = Math.max(0, Math.min(1, t));
      const proj: [number, number] = [ay + t * vy, ax + t * vx];
      const d = distanceMeters([py, px], [proj[0], proj[1]]);
      if (d < minD) minD = d;
    }
    return minD;
  };

  // Auto-reroute when drifting off route (>80m)
  React.useEffect(() => {
    if (!route || !livePos) return;
    const d = distanceToRoute(livePos, route.geometry.coordinates);
    if (d > 80) {
      // Destination from current route end [lng, lat] -> [lat, lng]
      const end = route.geometry.coordinates[route.geometry.coordinates.length - 1];
      const destLat = end[1];
      const destLng = end[0];
      (async () => {
        try {
          const coordinates: [number, number][] = [livePos, [destLat, destLng]];
          const { data } = await axios.post("/api/directions", { coordinates, mode });
          const path = data?.paths?.[0];
          if (!path) return;
          const decodedArray = polyline.decode(path.points);
          const geometryCoordinates: [number, number][] = decodedArray.map((c) => [c[1], c[0]]);
          const steps: Step[] = (path.instructions || []).map((i: any) => ({
            instruction: i.text,
            distance: i.distance,
            duration: i.time,
          }));
          const segments: Segment[] = [{ steps, distance: path.distance, duration: path.time }];
          const built: Route = { segments, geometry: { coordinates: geometryCoordinates, type: "LineString" }, distance: path.distance, duration: path.time };
          setRoute(built);
        } catch {}
      })();
    }
  }, [route, livePos, mode]);

  // isDark defined above; the initialization effect below will set it from storage

  return (
    <div className="flex flex-col md:flex-row gap-4 p-4">
      <div className="md:w-1/3">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold mb-0">Navigator</h1>
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={isDark} onChange={(e) => setIsDark(e.target.checked)} />
              Dark mode
            </label>
          </div>
          <p className="text-sm opacity-80 mb-3">Find places and get directions with ease.</p>
          <ModeSelector mode={mode} setMode={setMode} />
          <div className="mt-3">
            <SearchBar setRoute={setRoute} mode={mode} origin={origin || defaultOrigin} rerouteOnOriginChange={true} onPlannedCoordinates={setPlannedCoords} />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={trafficOverlay}
              onChange={(e) => setTrafficOverlay(e.target.checked)}
            />
            Show traffic-style overlay (visual only)
          </label>
        </div>
        <div className="mt-2">
          <button
            className="px-3 py-1.5 border rounded"
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (pos) => setOrigin([pos.coords.latitude, pos.coords.longitude]),
                  (err) => console.warn('Geolocation error', err),
                  { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
                );
              }
            }}
          >
            Use my location
          </button>
          {route && (
            <button
              className="ml-2 px-3 py-1.5 border rounded"
              onClick={() => setFitKey((k) => k + 1)}
            >
              Reset view
            </button>
          )}
        </div>
        {route && <RouteDrawer route={route} />}
      </div>
      <div className="md:w-2/3 h-[500px]">
        <MapContainer
          center={origin || defaultOrigin}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          {isDark ? (
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors & CARTO"
            />
          ) : (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
          )}
          {trafficOverlay && (
            <TileLayer
              // A public demo tile style that visually hints congestion-like colors; replace with your own if desired
              url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
              opacity={0.6}
            />
          )}

          {route && (
            <>
              <Polyline
                positions={route.geometry.coordinates.map(([lng, lat]) => [lat, lng])}
                color={trafficOverlay ? "#d97706" : "#2563eb"}
                weight={trafficOverlay ? 6 : 5}
                opacity={trafficOverlay ? 0.9 : 1}
              />
              {/* Origin marker */}
              <Marker position={[route.geometry.coordinates[0][1], route.geometry.coordinates[0][0]]}>
                <Popup>Origin</Popup>
              </Marker>
              {/* Destination marker */}
              <Marker position={[route.geometry.coordinates[route.geometry.coordinates.length - 1][1], route.geometry.coordinates[route.geometry.coordinates.length - 1][0]]}>
                <Popup>Destination</Popup>
              </Marker>
              <MapUpdater coordinates={route.geometry.coordinates} fitOnce={true} fitKey={fitKey} />
            </>
          )}
          {/* Numbered markers for origin/waypoints/destination */}
          {plannedCoords.length > 0 && (
            <>
              {plannedCoords.map(([lat, lng], idx) => (
                <CircleMarker
                  key={`marker-${idx}`}
                  center={[lat, lng]}
                  radius={idx === 0 ? 6 : idx === plannedCoords.length - 1 ? 6 : 5}
                  pathOptions={{ color: idx === 0 ? '#22c55e' : idx === plannedCoords.length - 1 ? '#ef4444' : '#0ea5e9', fillOpacity: 0.9 }}
                >
                </CircleMarker>
              ))}
            </>
          )}
          {/* POIs controlled from the left panel; use map center for now */}
          <PoiControls
            center={route ? [route.geometry.coordinates[0][0], route.geometry.coordinates[0][1]] : defaultOrigin}
            onPickDestination={(lat, lng) => navigateTo(lat, lng)}
          />
        </MapContainer>
        {!navigator.onLine && (
          <div className="offline-banner">Offline: using cached tiles and last routes</div>
        )}
      </div>
    </div>
  );
};

export default App;
