import React, { useState } from "react";
import axios from "axios";
import type { DirectionsResponse, Route } from "../types/ors";

interface SearchBarProps {
  setRoute: (route: Route) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ setRoute }) => {
  const [destination, setDestination] = useState("");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination) return;

    try {
      const origin = "9.03,38.7578"; // Example starting point
      const [lat, lng] = origin.split(",");
      const coords = [
        [parseFloat(lng), parseFloat(lat)],
        [38.75, 9.05],
      ]; // Replace with real geocoding later

      const res = await axios.post<DirectionsResponse>(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        { coordinates: coords },
        {
          headers: {
            Authorization: import.meta.env.VITE_ORS_API_KEY,
            "Content-Type": "application/json",
          },
        }
      );

      setRoute(res.data.routes[0]);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch directions from ORS.");
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="flex bg-white rounded-lg shadow-md overflow-hidden"
    >
      <input
        type="text"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        placeholder="Enter destination"
        className="flex-1 px-4 py-2 outline-none"
      />
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 font-semibold hover:bg-blue-700"
      >
        Go
      </button>
    </form>
  );
};

export default SearchBar;
