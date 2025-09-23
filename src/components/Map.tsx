import React, { useEffect } from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Route } from "../types/ors";

interface MapProps {
  route?: Route;
}

const Map: React.FC<MapProps> = ({ route }) => {
  const positions =
    route?.geometry.coordinates.map(([lng, lat]) => [lat, lng]) || [];

  return (
    <MapContainer center={[9.03, 38.75]} zoom={13} className="w-full h-full">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {positions.length > 0 && (
        <Polyline positions={positions} color="#3b82f6" />
      )}
    </MapContainer>
  );
};

export default Map;
