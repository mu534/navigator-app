import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L, { type LatLngTuple } from "leaflet";

interface MapUpdaterProps {
  coordinates: [number, number][]; // [lng, lat]
  fitOnce?: boolean; // only fit on first render
  fitKey?: number; // when changed, force a fit regardless of fitOnce
}

const MapUpdater: React.FC<MapUpdaterProps> = ({ coordinates, fitOnce = false, fitKey }) => {
  const map = useMap();
  const didFitRef = useRef(false);
  const lastKeyRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!coordinates || coordinates.length === 0) return;

    // Convert [lng, lat] -> [lat, lng] for Leaflet
    const latLngs: LatLngTuple[] = coordinates.map(([lng, lat]) => [lat, lng]);

    const forceFit = fitKey !== lastKeyRef.current && fitKey !== undefined;
    if (!forceFit && fitOnce && didFitRef.current) return;

    // Fit map bounds
    if (latLngs.length === 1) {
      map.setView(latLngs[0], 13); // single point, zoom in
    } else {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    if (fitOnce) didFitRef.current = true;
    lastKeyRef.current = fitKey;
  }, [coordinates, map, fitOnce, fitKey]);

  return null;
};

export default MapUpdater;
