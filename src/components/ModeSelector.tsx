import React from "react";

type Mode = "car" | "foot" | "bike";

interface ModeSelectorProps {
  mode: Mode;
  setMode: (m: Mode) => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, setMode }) => {
  return (
    <div className="flex gap-2">
      {([
        { key: "car", label: "Drive" },
        { key: "foot", label: "Walk" },
        { key: "bike", label: "Bike" },
      ] as const).map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
            mode === m.key
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
};

export default ModeSelector;


