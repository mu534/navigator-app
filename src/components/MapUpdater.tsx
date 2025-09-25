import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L, { type LatLngTuple } from "leaflet";

interface MapUpdaterProps {
  coordinates: [number, number][]; // [lng, lat]
  fitOnce?: boolean; // fit map only once
  fitKey?: number; // force fit when changed
}

const MapUpdater: React.FC<MapUpdaterProps> = ({
  coordinates,
  fitOnce = false,
  fitKey,
}) => {
  const map = useMap();
  const didFitRef = useRef(false);
  const lastKeyRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!coordinates || coordinates.length === 0) return;

    // Convert [lng, lat] -> [lat, lng] for Leaflet
    const latLngs: LatLngTuple[] = coordinates.map(([lng, lat]) => [lat, lng]);

    // Determine if we should fit map
    const forceFit = fitKey !== lastKeyRef.current && fitKey !== undefined;
    if (fitOnce && didFitRef.current && !forceFit) return;

    if (latLngs.length === 1) {
      map.setView(latLngs[0], 13);
    } else {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
    }

    didFitRef.current = fitOnce || didFitRef.current;
    lastKeyRef.current = fitKey;
  }, [coordinates, map, fitOnce, fitKey]);

  return null;
};

export default MapUpdater;
