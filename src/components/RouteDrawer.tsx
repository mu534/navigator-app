import React from "react";
import type { Route } from "../types/ors";

interface RouteDrawerProps {
  route: Route;
}

const RouteDrawer: React.FC<RouteDrawerProps> = ({ route }) => {
  if (!route.segments || route.segments.length === 0) return null;

  return (
    <div>
      <h2 className="font-bold text-lg mb-2">Directions</h2>
      <ul className="space-y-1 text-gray-700">
        {route.segments[0].steps.map((step, idx) => (
          <li key={idx} className="text-sm">
            {step.instruction}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RouteDrawer;
