import React, { useMemo } from "react";
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
  showSteps?: boolean; // whether to render step markers
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

const Map: React.FC<MapProps> = ({
  route,
  showSteps = false,
  pathOptions = { color: "#3b82f6", weight: 5 },
}) => {
  // Convert route coordinates [lng, lat] -> [lat, lng]
  const positions: LatLngTuple[] = useMemo(
    () => route?.geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLngTuple) || [],
    [route]
  );

  // Prepare step markers with matching instructions
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
  

  // Default map center if no route
  const DEFAULT_CENTER: LatLngTuple = [9.03, 38.75];

  return (
    <div className="map-container w-full h-[500px] rounded shadow overflow-hidden">
      <MapContainer
        center={positions[0] || DEFAULT_CENTER}
        zoom={positions.length ? 13 : 12}
        scrollWheelZoom={true}
        className="w-full h-full"
        aria-label="Interactive route map"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Polyline for route */}
        {positions.length > 0 && <Polyline positions={positions} pathOptions={pathOptions} />}

        {/* Auto-fit bounds */}
        <MapUpdater positions={positions} />

        {/* Origin marker */}
        {positions.length > 0 && (
          <Marker position={positions[0]}>
            <Popup>Origin</Popup>
          </Marker>
        )}

        {/* Destination marker */}
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
              pathOptions={{ color: "red", fillColor: "red" }}
            >
              <Popup>
                Step {idx + 1}: {step.instruction}
              </Popup>
            </CircleMarker>
          ))}
      </MapContainer>
    </div>
  );
};

export default Map;
