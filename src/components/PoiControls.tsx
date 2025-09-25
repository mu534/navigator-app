import React from "react";
import axios from "axios";
import { Marker, Popup } from "react-leaflet";
import type { LatLngTuple } from "leaflet";

type PoiType = "restaurant" | "cafe" | "atm" | "fuel" | "hotel" | "hospital";

interface PoiControlsProps {
  center: LatLngTuple;
  onPickDestination?: (lat: number, lng: number, name?: string) => void;
}

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const DEFAULT_TYPES: PoiType[] = [
  "restaurant",
  "cafe",
  "atm",
  "fuel",
  "hotel",
  "hospital",
];

const PoiControls: React.FC<PoiControlsProps> = ({
  center,
  onPickDestination,
}) => {
  const [activeTypes, setActiveTypes] = React.useState<Set<PoiType>>(
    new Set(["restaurant", "cafe"])
  );
  const [pois, setPois] = React.useState<OverpassElement[]>([]);
  const [loading, setLoading] = React.useState(false);

  const toggleType = (t: PoiType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next as Set<PoiType>;
    });
  };

  const fetchPois = async () => {
    setLoading(true);
    try {
      const types = Array.from(activeTypes).join(",");
      const { data } = await axios.get("/api/nearby", {
        params: { lat: center[0], lng: center[1], radius: 1500, types },
      });
      setPois(Array.isArray(data?.elements) ? data.elements : []);
    } catch (e) {
      console.error("POI fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPois();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.from(activeTypes).join(","), center[0], center[1]]);

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span className="text-gray-700 font-medium">Nearby:</span>
        {DEFAULT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => toggleType(t)}
            className={`px-2 py-1 rounded-md border ${
              activeTypes.has(t)
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {t}
          </button>
        ))}
        <button
          onClick={fetchPois}
          className={`px-2 py-1 rounded-md border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {pois.map((el) => {
        const name = el.tags?.name || Object.values(el.tags || {})[0] || "POI";
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (typeof lat !== "number" || typeof lon !== "number") return null;
        return (
          <Marker key={`${el.type}-${el.id}`} position={[lat, lon]}>
            <Popup>
              <div className="space-y-1">
                <div className="font-semibold">{name}</div>
                {el.tags && (
                  <div className="text-xs text-gray-600">
                    {el.tags.amenity || el.tags.shop}
                    {el.tags.opening_hours ? ` • ${el.tags.opening_hours}` : ""}
                  </div>
                )}
                {onPickDestination && (
                  <button
                    className="mt-2 px-2 py-1 text-xs bg-blue-600 text-white rounded"
                    onClick={() => onPickDestination(lat, lon, name)}
                  >
                    Navigate here
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export default PoiControls;
