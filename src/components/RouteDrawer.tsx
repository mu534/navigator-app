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

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      className="p-4 bg-white shadow-md rounded-lg max-h-96 overflow-y-auto"
      role="region"
      aria-label="Route directions"
    >
      <h2 className="font-bold text-lg mb-4">Directions</h2>
      <div className="flex items-center gap-2 mb-3">
        <button
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded"
          onClick={() => speak("Starting guidance. Follow the instructions.")}
        >
          Enable Voice
        </button>
        <button
          className="px-3 py-1.5 bg-gray-100 text-gray-800 text-sm rounded border"
          onClick={() => window.speechSynthesis?.cancel?.()}
        >
          Stop
        </button>
      </div>
      <ol className="list-decimal list-inside space-y-2 text-gray-700">
        {steps.map((step, idx) => (
          <li
            key={`${idx}-${step.instruction}`}
            className="text-sm cursor-pointer hover:text-blue-700"
            onClick={() => speak(step.instruction)}
          >
            {step.instruction}
          </li>
        ))}
      </ol>
    </div>
  );
};

export default RouteDrawer;
