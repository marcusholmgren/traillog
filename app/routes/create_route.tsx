import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type * as GeoJSON from "geojson";
import {
  getSavedWaypoints,
  type Waypoint,
  addRoute,
  waypointsToGeoJSON,
} from "~/services/db";
import { Button } from "~/components/button";
import { Checkbox } from "~/components/checkbox";
import { Input } from "~/components/input";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/components/dialog";
import {
  Alert,
  AlertActions,
  AlertBody,
  AlertTitle,
  AlertDescription,
} from "~/components/alert";
import { useAlert } from "~/hooks/useAlert";
import {
  ArrowLeftIcon,
  ArrowDownOnSquareIcon,
  MapPinIcon,
  ArchiveBoxIcon,
} from "@heroicons/react/24/outline";
import { PageLayout } from "~/components/page-layout";

export default function CreateRoute() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [selectedWaypoints, setSelectedWaypoints] = useState<Waypoint[]>([]);
  const [routeName, setRouteName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPromptingName, setIsPromptingName] = useState(false);
  const navigate = useNavigate();
  const { alert, showAlert } = useAlert();

  useEffect(() => {
    async function fetchWaypoints() {
      try {
        setIsLoading(true);
        const savedWaypoints = await getSavedWaypoints();
        setWaypoints(savedWaypoints.reverse()); // Show newest first
        setError(null);
      } catch (err) {
        console.error("Error fetching saved waypoints:", err);
        setError("Failed to load waypoints. Please try again.");
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
    setSelectedWaypoints((prevSelected) => {
      const isSelected = prevSelected.some((wp) => wp.id === waypoint.id);
      if (isSelected) {
        return prevSelected.filter((wp) => wp.id !== waypoint.id);
      } else {
        // Add new waypoint to the end to maintain order of selection
        return [...prevSelected, waypoint];
      }
    });
  };

  const handleDownloadRoute = () => {
    if (selectedWaypoints.length < 2) {
      showAlert({
        title: "Cannot Download Route",
        message: "Please select at least two waypoints to create a route.",
      });
      return;
    }

    const routeGeoJSON = waypointsToGeoJSON(selectedWaypoints);
    const finalGeoJSON = {
      ...routeGeoJSON,
      features: [
        ...routeGeoJSON.features,
        {
          type: "Feature",
          properties: { name: routeName || "New Route" },
          geometry: {
            type: "LineString",
            coordinates: routeGeoJSON.features.map(
              (f) => f.geometry.coordinates
            ),
          },
        },
      ],
    };

    const jsonString = JSON.stringify(finalGeoJSON, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${(routeName || "route").replace(/\s+/g, "-")}.geojson`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const executeSave = async (name: string) => {
    if (selectedWaypoints.length < 2) {
      showAlert({
        title: "Cannot Save Route",
        message: "Please select at least two waypoints.",
      });
      return;
    }
    if (!name) {
      showAlert({
        title: "Cannot Save Route",
        message: "Route name is required to save.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const waypointIds = selectedWaypoints.map((wp) => wp.id);
      await addRoute(name, waypointIds);
      showAlert({
        title: "Success!",
        message: `Route '${name}' saved successfully!`,
        onConfirm: () => navigate("/routes"),
      });
      setSelectedWaypoints([]);
      setRouteName("");
    } catch (err) {
      console.error("Error saving route:", err);
      showAlert({
        title: "Save Failed",
        message: "Failed to save route. Please try again.",
      });
    } finally {
      setIsSaving(false);
      setIsPromptingName(false);
    }
  };

  const handleSaveRoute = () => {
    if (routeName.trim()) {
      executeSave(routeName.trim());
    } else {
      setIsPromptingName(true);
    }
  };

  const handlePromptSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newRouteName = (formData.get("routeName") as string) || "";
    if (newRouteName.trim()) {
      setRouteName(newRouteName.trim());
      executeSave(newRouteName.trim());
    } else {
      showAlert({
        title: "Invalid Name",
        message: "Route name cannot be empty.",
      });
    }
  };

  return (
    <PageLayout
      title="Create a New Route"
      onBack={handleNavigateBack}
      footer={
        selectedWaypoints.length > 1 ? (
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleSaveRoute}
              disabled={isSaving}
              className="flex items-center justify-center gap-2"
            >
              <ArchiveBoxIcon className="h-5 w-5" />
              {isSaving ? "Saving..." : "Save Route"}
            </Button>
            <Button
              color="light"
              onClick={handleDownloadRoute}
              disabled={isSaving}
              className="flex items-center justify-center gap-2"
            >
              <ArrowDownOnSquareIcon className="h-5 w-5" />
              Download Route
            </Button>
          </div>
        ) : null
      }
    >
      {isLoading && <p className="p-4 text-center">Loading...</p>}
      {error && <p className="p-4 text-center text-red-500">{error}</p>}
      {!isLoading && !error && waypoints.length === 0 && (
        <div className="text-center p-8">
          <MapPinIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700 mb-2">
            No waypoints available to create a route.
          </h2>
          <Button color="green" onClick={() => navigate("/waypoints/new")}>
            Go Add One!
          </Button>
        </div>
      )}
      {!isLoading && !error && waypoints.length > 0 && (
        <ul className="divide-y divide-slate-200">
          {waypoints.map((waypoint) => (
            <li
              key={waypoint.id}
              className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50"
              onClick={() => handleWaypointToggle(waypoint)}
            >
              <Checkbox
                checked={selectedWaypoints.some((wp) => wp.id === waypoint.id)}
                onChange={() => {}} // The li's onClick handles the logic
                aria-label={`Select waypoint ${waypoint.name}`}
                disabled={isSaving}
              />
              {waypoint.imageDataUrl ? (
                <img
                  src={waypoint.imageDataUrl}
                  alt={waypoint.name || "Waypoint image"}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-200">
                  <MapPinIcon
                    className="h-6 w-6 text-slate-500"
                    data-testid="map-pin-icon"
                  />
                </div>
              )}
              <div className="flex-grow">
                <h2 className="font-bold text-slate-800">
                  {waypoint.name || "Unnamed Waypoint"}
                </h2>
                <p className="text-sm text-slate-500">
                  {new Date(waypoint.createdAt).toLocaleDateString()}
                </p>
              </div>
              {selectedWaypoints.some((wp) => wp.id === waypoint.id) && (
                <div className="text-sm font-bold text-blue-600 bg-blue-100 rounded-full h-6 w-6 flex items-center justify-center">
                  {selectedWaypoints.findIndex((wp) => wp.id === waypoint.id) +
                    1}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Alert for general notifications */}
      {alert.isOpen && (
        <Alert open={alert.isOpen} onClose={alert.hide}>
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
          <AlertActions>
            <Button
              onClick={() => {
                alert.hide();
                if (alert.onConfirm) alert.onConfirm();
              }}
            >
              OK
            </Button>
          </AlertActions>
        </Alert>
      )}

      {/* Dialog for prompting route name */}
      {isPromptingName && (
        <Dialog
          open={isPromptingName}
          onClose={() => setIsPromptingName(false)}
        >
          <form onSubmit={handlePromptSubmit}>
            <DialogTitle>Route Name</DialogTitle>
            <DialogDescription>
              Please enter a name for this route to save it.
            </DialogDescription>
            <DialogBody>
              <Input
                name="routeName"
                placeholder={`Route with ${selectedWaypoints.length} waypoints`}
                autoFocus
              />
            </DialogBody>
            <DialogActions>
              <Button
                type="button"
                plain
                onClick={() => setIsPromptingName(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogActions>
          </form>
        </Dialog>
      )}
    </PageLayout>
  );
}
