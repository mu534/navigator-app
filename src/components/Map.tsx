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
import type { Route } from "../types/ors";

interface MapProps {
  route?: Route;
  showSteps?: boolean;
  pathOptions?: PathOptions;
}

// Auto-fit map bounds
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

// Tile providers
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
  CartoDark: {
    url: "https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; Carto",
  },
  TonerLite: {
    url: "https://stamen-tiles.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png",
    attribution: "Map tiles by Stamen Design, &copy; OpenStreetMap",
  },
  Watercolor: {
    url: "https://stamen-tiles.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg",
    attribution: "Map tiles by Stamen Design, &copy; OpenStreetMap",
  },
};

const Map: React.FC<MapProps> = ({
  route,
  showSteps = false,
  pathOptions = { color: "#3b82f6", weight: 5 },
}) => {
  const [provider, setProvider] = useState<keyof typeof tileProviders>("OSM");

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

  const DEFAULT_CENTER: LatLngTuple = [9.03, 38.75];

  return (
    <div>
      {/* Dropdown for tile selection */}
      <select
        value={provider}
        onChange={(e) =>
          setProvider(e.target.value as keyof typeof tileProviders)
        }
        className="mb-4 p-2 border rounded"
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

          <MapUpdater positions={positions} />

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

          {showSteps &&
            stepMarkers.map((step, idx) => (
              <CircleMarker
                key={idx}
                center={step.position}
                radius={4}
                pathOptions={{ color: "red", fillColor: "red" }}
              >
                <Popup>
                  Step {idx + 1}: {step.instruction}
                </Popup>
              </CircleMarker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default Map;
