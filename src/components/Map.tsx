import React, { useMemo } from "react";
import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";

import type { LatLngTuple, PathOptions } from "leaflet"; // Type-only import
import "leaflet/dist/leaflet.css";
import type { Route } from "../types/ors";

interface MapProps {
  route?: Route;
  pathOptions?: PathOptions;
}

const MapUpdater: React.FC<{ positions: LatLngTuple[] }> = ({ positions }) => {
  const map = useMap();
  React.useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
};

const Map: React.FC<MapProps> = ({
  route,
  pathOptions = { color: "#3b82f6", weight: 5 },
}) => {
  const positions: LatLngTuple[] = useMemo(
    () =>
      route?.geometry.coordinates.map(
        ([lng, lat]) => [lat, lng] as LatLngTuple
      ) || [],
    [route]
  );

  return (
    <div className="map-container">
      <MapContainer
        center={[9.03, 38.75]} // Addis Ababa, Ethiopia
        zoom={13}
        scrollWheelZoom={true}
        className="w-full h-full"
        aria-label="Interactive route map"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {positions.length > 0 ? (
          <>
            <Polyline positions={positions} pathOptions={pathOptions} />
            <MapUpdater positions={positions} />
          </>
        ) : (
          <div className="absolute top-2 left-2 bg-white p-2 rounded shadow">
            No route available
          </div>
        )}
      </MapContainer>
    </div>
  );
};

export default Map;
