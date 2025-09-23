import React, { useState } from "react";
import Map from "./components/Map";
import SearchBar from "./components/SearchBar";
import RouteDrawer from "./components/RouteDrawer";
import type { Route as ORSRoute } from "./types/ors";

const App: React.FC = () => {
  const [route, setRoute] = useState<ORSRoute | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);

  return (
    <div className="w-full h-screen relative flex flex-col">
      {/* Map */}
      <div className="flex-1 relative">
        <Map route={route ?? undefined} />
      </div>

      {/* Search Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50">
        <SearchBar setRoute={setRoute} />
      </div>

      {/* Route Drawer */}
      {route && (
        <div
          className={`absolute bottom-0 left-0 w-full max-h-[40%] bg-white/95 p-4 shadow-lg z-50 backdrop-blur-sm transition-transform duration-300 md:max-w-md md:left-4 md:bottom-4 md:rounded-lg ${
            isDrawerOpen ? "translate-y-0" : "translate-y-full"
          }`}
          role="dialog"
          aria-label="Route instructions"
        >
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="absolute top-2 right-2 p-2 text-gray-600 hover:text-gray-800"
            aria-label={isDrawerOpen ? "Close directions" : "Open directions"}
          >
            <svg
              className={`h-5 w-5 transform ${
                isDrawerOpen ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {isDrawerOpen && <RouteDrawer route={route} />}
        </div>
      )}
    </div>
  );
};

export default App;
