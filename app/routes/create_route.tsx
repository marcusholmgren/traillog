import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  getSavedWaypoints,
  type Waypoint,
  addRoute, // Import addRoute
} from "../services/db";
import { Button } from "~/components/button";
import { Checkbox } from "~/components/checkbox";
import { Input } from "~/components/input"; // Import Input component
import { ArrowLeftIcon, ArrowDownOnSquareIcon, MapPinIcon, ArchiveBoxIcon } from "@heroicons/react/24/outline"; // Added ArchiveBoxIcon

export default function CreateRoute() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypoints, setSelectedWaypoints] = useState<Waypoint[]>([]);
  const [routeName, setRouteName] = useState(""); // State for route name
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false); // State for save operation
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

  const handleSaveRoute = async () => {
    if (selectedWaypoints.length < 2) {
      alert("Please select at least two waypoints to save a route.");
      return;
    }
    let currentRouteName = routeName.trim();
    if (!currentRouteName) {
      currentRouteName = prompt("Please enter a name for this route:", `Route with ${selectedWaypoints.length} waypoints`) || "";
      if (!currentRouteName.trim()) {
        alert("Route name cannot be empty.");
        return;
      }
      setRouteName(currentRouteName.trim()); // Update state if prompt was used
    }

    setIsSaving(true);
    try {
      const waypointIds = selectedWaypoints.map(wp => wp.id);
      await addRoute(currentRouteName.trim(), waypointIds);
      alert(`Route "${currentRouteName.trim()}" saved successfully!`);
      // Optionally, navigate to a saved routes page or clear selection
      // navigate('/saved-routes');
      setSelectedWaypoints([]);
      setRouteName("");
    } catch (err) {
      console.error("Error saving route:", err);
      alert("Failed to save route. Please try again.");
    } finally {
      setIsSaving(false);
    }
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

      <main className="flex-grow overflow-y-auto pb-24"> {/* Added pb-24 for footer spacing */}
        {isLoading && <p className="p-4 text-center">Loading...</p>}
        {error && <p className="p-4 text-center text-red-500">{error}</p>}
        {!isLoading && !error && waypoints.length === 0 && (
          <p className="p-4 text-center text-slate-500">
            No waypoints available to create a route. Add some waypoints first.
          </p>
        )}
        {!isLoading && !error && waypoints.length > 0 && (
          <>
            <div className="p-4">
              <Input
                type="text"
                placeholder="Enter route name (optional)"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <ul className="divide-y divide-slate-200">
              {waypoints.map((waypoint) => (
                <li key={waypoint.id} className="p-4 flex items-center gap-4">
                  <Checkbox
                    checked={selectedWaypoints.some((wp) => wp.id === waypoint.id)}
                    onChange={() => handleWaypointToggle(waypoint)}
                    aria-label={`Select waypoint ${waypoint.name}`}
                    disabled={isSaving}
                  />
                  {waypoint.imageDataUrl ? (
                    <img
                      src={waypoint.imageDataUrl}
                      alt={waypoint.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200">
                     <MapPinIcon className="h-6 w-6 text-slate-500" data-testid="map-pin-icon"/>
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
          </>
        )}
      </main>

      {selectedWaypoints.length > 1 && (
        <footer className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-slate-200 grid grid-cols-2 gap-4">
          <Button
            onClick={handleSaveRoute}
            className="w-full flex items-center justify-center gap-2"
            disabled={isSaving}
          >
            <ArchiveBoxIcon className="h-5 w-5" />
            {isSaving ? "Saving..." : "Save Route"}
          </Button>
          <Button
            onClick={handleCreateRoute}
            className="w-full flex items-center justify-center gap-2"
            disabled={isSaving}
          >
            <ArrowDownOnSquareIcon className="h-5 w-5" />
            Download Route
          </Button>
        </footer>
      )}
    </div>
  );
}
