import React, { useState } from "react";
import Map from "./components/Map";
import SearchBar from "./components/SearchBar";
import RouteDrawer from "./components/RouteDrawer";
import type { Route as ORSRoute } from "./types/ors";

function App() {
  const [route, setRoute] = useState<ORSRoute | null>(null);

  return (
    <div className="w-full h-screen relative">
      <Map route={route || undefined} />
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-lg">
        <SearchBar setRoute={setRoute} />
      </div>
      {route && (
        <div className="absolute bottom-0 left-0 w-full max-h-[40%] overflow-y-auto bg-white p-4 shadow-lg">
          <RouteDrawer route={route} />
        </div>
      )}
    </div>
  );
}

export default App;
