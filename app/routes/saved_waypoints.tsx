import { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router";
import {
  getSavedWaypoints,
  type Waypoint,
  waypointsToGeoJSON,
  deleteWaypoint,
} from "../services/db";
import { Button } from "~/components/button";
import {
  ArrowLeftIcon,
  PlusIcon,
  ArrowDownOnSquareIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

export default function SavedWaypoints() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
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

  const handleAddWaypoint = () => {
    navigate("/waypoints/add");
  };

  const handleDeleteWaypoint = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this waypoint?")) {
      try {
        await deleteWaypoint(id);
        setWaypoints((prevWaypoints) =>
          prevWaypoints.filter((wp) => wp.id !== id)
        );
        console.log(`Waypoint ${id} deleted successfully.`);
      } catch (err) {
        console.error("Error deleting waypoint:", err);
        setError("Failed to delete waypoint. Please try again.");
      }
    }
  };

  const handleShareWaypoint = async (waypoint: Waypoint) => {
    const shareText = `Waypoint: ${
      waypoint.name
    } - Lat: ${waypoint.latitude.toFixed(4)}, Lon: ${waypoint.longitude.toFixed(
      4
    )}`;
    const shareTitle = `Share Waypoint: ${waypoint.name}`;

    if (navigator.share) {
      try {
        const geojsonData = waypointsToGeoJSON([waypoint]);
        const geojsonString = JSON.stringify(geojsonData);
        const fileName = `${waypoint.name}.geojson`;
        const file = new File([geojsonString], fileName, {
          type: "application/geo+json",
        });

        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file],
        });
        console.log("Waypoint shared successfully");
      } catch (error) {
        console.error("Error sharing waypoint:", error);
        alert("Error sharing: " + (error as Error).message);
      }
    } else {
      console.warn("Web Share API not supported in this browser.");
      alert(
        "Web Share API is not supported in your browser. Try copying the details manually."
      );
    }
  };

  const handleExportToGeoJSON = async () => {
    try {
      const waypoints = await getSavedWaypoints();
      if (waypoints.length === 0) {
        alert("No waypoints to export.");
        return;
      }
      const geojsonData = waypointsToGeoJSON(waypoints);
      const jsonString = JSON.stringify(geojsonData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = "waypoints.geojson";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
    } catch (err) {
      console.error("Error exporting to GeoJSON:", err);
      alert("Failed to export waypoints. See console for details.");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b border-slate-200">
        <Button onClick={handleNavigateBack} className="p-2">
          <ArrowLeftIcon className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Saved Waypoints</h1>
        <Button onClick={handleAddWaypoint} className="p-2">
          <PlusIcon className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex-grow overflow-y-auto">
        {isLoading && <p className="p-4 text-center">Loading...</p>}
        {error && <p className="p-4 text-center text-red-500">{error}</p>}
        {!isLoading && !error && waypoints.length === 0 && (
          <p className="p-4 text-center text-slate-500">
            No waypoints saved yet.
          </p>
        )}
        {!isLoading && !error && waypoints.length > 0 && (
          <ul className="divide-y divide-slate-200">
            {waypoints.map((waypoint) => (
              <li key={waypoint.id} className="p-4">
                <div className="flex items-start gap-4">
                  {waypoint.imageDataUrl ? (
                    <img
                      src={waypoint.imageDataUrl}
                      alt={waypoint.name}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-200">
                      <MapPinIcon className="h-8 w-8 text-slate-500" />
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
                    {waypoint.altitude && (
                      <p className="text-sm text-slate-500">
                        Altitude: {waypoint.altitude}m
                      </p>
                    )}
                    <p className="text-xs text-slate-400 pt-1">
                      {new Date(waypoint.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <NavLink to={`/waypoints/edit/${waypoint.id}`}>
                      <Button outline className="p-2">
                        <PencilIcon className="h-5 w-5" />
                      </Button>
                    </NavLink>
                    <Button
                      outline
                      onClick={() => handleDeleteWaypoint(waypoint.id)}
                      className="p-2"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                    <Button
                      outline
                      onClick={() => handleShareWaypoint(waypoint)}
                      className="p-2"
                    >
                      <ShareIcon className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="p-4 border-t border-slate-200">
        <Button
          onClick={handleExportToGeoJSON}
          className="w-full flex items-center justify-center gap-2"
        >
          <ArrowDownOnSquareIcon className="h-5 w-5" />
          Export all to GeoJSON
        </Button>
      </footer>
    </div>
  );
}

const dateFormatter = (number: number | Date) => {
  const userLocales = navigator.languages || [navigator.language];
  //TODO console.log(userLocales);
  const seLong = new Intl.DateTimeFormat(userLocales, {
    dateStyle: "full",
    timeStyle: "short",
  });
  return seLong.format(number);
};
