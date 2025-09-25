// PoiControls.tsx
import React from "react";
import axios from "axios";
import type { LatLngTuple } from "leaflet";

type PoiType = "restaurant" | "cafe" | "atm" | "fuel" | "hotel" | "hospital";

interface OverpassElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface PoiControlsProps {
  center: LatLngTuple;
  onPoisChange: (pois: OverpassElement[]) => void;
  onPickDestination?: (lat: number, lng: number, name?: string) => void;
}

const DEFAULT_TYPES: PoiType[] = [
  "restaurant",
  "cafe",
  "atm",
  "fuel",
  "hotel",
  "hospital",
];

const TYPE_COLORS: Record<PoiType, string> = {
  restaurant: "#168E6A",
  cafe: "#FBBO3B",
  atm: "#B4B6B7",
  fuel: "#292D32",
  hotel: "#168E6A",
  hospital: "#FBBO3B",
};

const PoiControls: React.FC<PoiControlsProps> = ({ center, onPoisChange }) => {
  const [activeTypes, setActiveTypes] = React.useState<Set<PoiType>>(
    new Set(["restaurant", "cafe"])
  );
  const [loading, setLoading] = React.useState(false);

  const toggleType = (t: PoiType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) {
        next.delete(t);
      } else {
        next.add(t);
      }
      return next;
    });
  };

  const fetchPois = async () => {
    if (activeTypes.size === 0) {
      onPoisChange([]);
      return;
    }

    setLoading(true);
    try {
      const types = Array.from(activeTypes).join(",");
      const { data } = await axios.get("/api/nearby", {
        params: { lat: center[0], lng: center[1], radius: 1500, types },
      });
      const newPois = Array.isArray(data?.elements) ? data.elements : [];
      onPoisChange(newPois);
    } catch (e) {
      console.error("POI fetch error", e);
      onPoisChange([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchPois();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTypes, center[0], center[1]]);

  return (
    <div
      className="absolute top-10 right-2 z-[1000] bg-white p-4 rounded shadow-md"
      style={{ zIndex: 1000 }}
    >
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="text-gray-700 font-medium">Nearby:</span>
        {DEFAULT_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => toggleType(t)}
            className={`px-2 py-1 rounded-md border ${
              activeTypes.has(t)
                ? `bg-[${TYPE_COLORS[t]}] border-[${TYPE_COLORS[t]}] text-white`
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
    </div>
  );
};

export default PoiControls;
