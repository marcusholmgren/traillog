import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  getSavedWaypoints,
  type Waypoint,
  waypointsToGeoJSON,
} from "../services/db";
import { Button } from "~/components/button";
import { Checkbox } from "~/components/checkbox";
import { ArrowLeftIcon, ArrowDownOnSquareIcon, MapPinIcon } from "@heroicons/react/24/outline";

export default function CreateRoute() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypoints, setSelectedWaypoints] = useState<Waypoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchWaypoints() {
      try {
        setIsLoading(true);
        const savedWaypoints = await getSavedWaypoints();
        setWaypoints(savedWaypoints);
        setError(null);
      } catch (err) {
        console.error("Error fetching saved waypoints:", err);
        setError("Failed to load saved waypoints. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchWaypoints();
  }, []);

  const handleNavigateBack = () => {
    navigate(-1);
  };

  const handleWaypointToggle = (waypoint: Waypoint) => {
    setSelectedWaypoints((prevSelected) =>
      prevSelected.find((wp) => wp.id === waypoint.id)
        ? prevSelected.filter((wp) => wp.id !== waypoint.id)
        : [...prevSelected, waypoint]
    );
  };

  const handleCreateRoute = () => {
    if (selectedWaypoints.length < 2) {
      alert("Please select at least two waypoints to create a route.");
      return;
    }

    const routeGeoJSON = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            name: "New Route", // Or generate a name based on selected waypoints
          },
          geometry: {
            type: "LineString",
            coordinates: selectedWaypoints.map((wp) => [
              wp.longitude,
              wp.latitude,
            ]),
          },
        },
      ],
    };

    const jsonString = JSON.stringify(routeGeoJSON, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "route.geojson";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b border-slate-200">
        <Button onClick={handleNavigateBack} className="p-2">
          <ArrowLeftIcon className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Create Route</h1>
        <div className="w-10"></div> {/* Placeholder for right side icon if needed */}
      </header>

      <main className="flex-grow overflow-y-auto">
        {isLoading && <p className="p-4 text-center">Loading...</p>}
        {error && <p className="p-4 text-center text-red-500">{error}</p>}
        {!isLoading && !error && waypoints.length === 0 && (
          <p className="p-4 text-center text-slate-500">
            No waypoints available to create a route. Add some waypoints first.
          </p>
        )}
        {!isLoading && !error && waypoints.length > 0 && (
          <ul className="divide-y divide-slate-200">
            {waypoints.map((waypoint) => (
              <li key={waypoint.id} className="p-4 flex items-center gap-4">
                <Checkbox
                  checked={selectedWaypoints.some((wp) => wp.id === waypoint.id)}
                  onChange={() => handleWaypointToggle(waypoint)}
                  aria-label={`Select waypoint ${waypoint.name}`}
                />
                {waypoint.imageDataUrl ? (
                  <img
                    src={waypoint.imageDataUrl}
                    alt={waypoint.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200">
                    <MapPinIcon className="h-6 w-6 text-slate-500" />
                  </div>
                )}
                <div className="flex-grow">
                  <h2 className="font-bold text-green-700">
                    {waypoint.name}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Lat: {waypoint.latitude.toFixed(4)}, Lon:{" "}
                    {waypoint.longitude.toFixed(4)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {selectedWaypoints.length > 1 && (
        <footer className="p-4 border-t border-slate-200">
          <Button
            onClick={handleCreateRoute}
            className="w-full flex items-center justify-center gap-2"
          >
            <ArrowDownOnSquareIcon className="h-5 w-5" />
            Create and Download Route ({selectedWaypoints.length} waypoints)
          </Button>
        </footer>
      )}
    </div>
  );
}
