// Map.tsx
import React, { useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import type { LatLngTuple, PathOptions } from "leaflet";
import "leaflet/dist/leaflet.css";
import PoiControls from "./PoiControls";
import type { Route } from "../types/ors";

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface MapProps {
  route?: Route;
  showSteps?: boolean;
  pathOptions?: PathOptions;
}

const MapUpdater: React.FC<{ positions: LatLngTuple[] }> = ({ positions }) => {
  const map = useMap();
  React.useEffect(() => {
    if (positions.length === 1) {
      map.setView(positions[0], 13);
    } else if (positions.length > 1) {
      map.fitBounds(positions, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
};

const tileProviders = {
  OSM: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  CartoLight: {
    url: "https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; Carto",
  },
};

const Map: React.FC<MapProps> = ({
  route,
  showSteps = false,
  pathOptions = { color: "#3b82f6", weight: 5 },
}) => {
  const [provider, setProvider] = useState<keyof typeof tileProviders>("OSM");
  const [pois, setPois] = useState<OverpassElement[]>([]);
  const DEFAULT_CENTER: LatLngTuple = [9.03, 38.75];

  // Convert route coordinates [lng, lat] -> [lat, lng]
  const positions: LatLngTuple[] = useMemo(
    () =>
      route?.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng] as LatLngTuple
      ) || [],
    [route]
  );

  // Step markers
  const stepMarkers = useMemo(() => {
    if (!route || !showSteps) return [];
    return route.segments.flatMap((segment) =>
      segment.steps
        .map((step) => {
          if (step.way_points) {
            const [startIdx] = step.way_points;
            return {
              position: positions[startIdx],
              instruction: step.instruction,
            };
          }
          return null;
        })
        .filter(
          (s): s is { position: LatLngTuple; instruction: string } => s !== null
        )
    );
  }, [route, positions, showSteps]);

  // Combine route positions + POI positions for fitBounds
  const allPositions: LatLngTuple[] = useMemo(
    () => [
      ...positions,
      ...pois
        .map((p) => {
          const lat = p.lat ?? p.center?.lat;
          const lon = p.lon ?? p.center?.lon;
          if (typeof lat !== "number" || typeof lon !== "number") return null;
          return [lat, lon] as LatLngTuple;
        })
        .filter((p): p is LatLngTuple => p !== null),
    ],
    [positions, pois]
  );

  return (
    <div className="relative">
      <select
        value={provider}
        onChange={(e) =>
          setProvider(e.target.value as keyof typeof tileProviders)
        }
        className="mb-4 p-2 border rounded z-[1000]"
      >
        {Object.keys(tileProviders).map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>

      <div className="map-container w-full h-[500px] rounded shadow overflow-hidden">
        <MapContainer
          center={positions[0] || DEFAULT_CENTER}
          zoom={positions.length ? 13 : 12}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            url={tileProviders[provider].url}
            attribution={tileProviders[provider].attribution}
          />

          {positions.length > 0 && (
            <Polyline positions={positions} pathOptions={pathOptions} />
          )}

          <MapUpdater positions={allPositions} />

          {/* Route markers */}
          {positions.length > 0 && (
            <Marker position={positions[0]}>
              <Popup>Origin</Popup>
            </Marker>
          )}
          {positions.length > 1 && (
            <Marker position={positions[positions.length - 1]}>
              <Popup>Destination</Popup>
            </Marker>
          )}

          {/* Step markers */}
          {showSteps &&
            stepMarkers.map((step, idx) => (
              <CircleMarker
                key={idx}
                center={step.position}
                radius={4}
                pathOptions={{ color: "red", fillColor: "red", fillOpacity: 1 }}
              >
                <Popup>
                  Step {idx + 1}: {step.instruction}
                </Popup>
              </CircleMarker>
            ))}

          {/* POI markers */}
          {pois.map((p) => {
            const lat = p.lat ?? p.center?.lat;
            const lon = p.lon ?? p.center?.lon;
            if (typeof lat !== "number" || typeof lon !== "number") return null;
            const name =
              p.tags?.name || Object.values(p.tags || {})[0] || "POI";
            return (
              <Marker key={`${p.type}-${p.id}`} position={[lat, lon]}>
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">{name}</div>
                    {p.tags && (
                      <div className="text-xs text-gray-600">
                        {p.tags.amenity || p.tags.shop}
                        {p.tags.opening_hours
                          ? ` • ${p.tags.opening_hours}`
                          : ""}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <PoiControls
        center={positions[0] || DEFAULT_CENTER}
        onPoisChange={setPois}
      />
    </div>
  );
};

export default Map;
