import React from "react";
import type { Route, Step } from "../types/ors";

interface RouteDrawerProps {
  route: Route;
}

const RouteDrawer: React.FC<RouteDrawerProps> = ({ route }) => {
  // Flatten steps from all segments
  const steps: Step[] =
    route.segments?.flatMap((segment) => segment.steps) || [];

  // Show placeholder if no steps
  if (steps.length === 0) {
    return (
      <div className="p-4 bg-white shadow-md rounded-lg">
        <h2 className="font-bold text-lg mb-4">Directions</h2>
        <p className="text-sm text-gray-500">No instructions available</p>
      </div>
    );
  }

  return (
    <div
      className="p-4 bg-white shadow-md rounded-lg max-h-96 overflow-y-auto"
      role="region"
      aria-label="Route directions"
    >
      <h2 className="font-bold text-lg mb-4">Directions</h2>
      <ol className="list-decimal list-inside space-y-2 text-gray-700">
        {steps.map((step, idx) => (
          <li key={`${idx}-${step.instruction}`} className="text-sm">
            {step.instruction}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default RouteDrawer;
