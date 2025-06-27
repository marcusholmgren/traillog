import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSavedRoutes, deleteRoute, type Route, getWaypointById, type Waypoint } from "../services/db";
import { Button } from "~/components/button";
import { ArrowLeftIcon, TrashIcon, EyeIcon, MapIcon } from "@heroicons/react/24/outline";
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from "~/components/dialog";

export default function SavedRoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  async function fetchRoutes() {
    try {
      setIsLoading(true);
      const savedRoutes = await getSavedRoutes();
      setRoutes(savedRoutes);
      setError(null);
    } catch (err) {
      console.error("Error fetching saved routes:", err);
      setError("Failed to load saved routes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleNavigateBack = () => {
    navigate(-1); // Or navigate to a specific home/dashboard page
  };

  const openDeleteConfirmDialog = (route: Route) => {
    setRouteToDelete(route);
  };

  const closeDeleteConfirmDialog = () => {
    setRouteToDelete(null);
  };

  const handleDeleteRoute = async () => {
    if (!routeToDelete) return;
    setIsDeleting(true);
    try {
      await deleteRoute(routeToDelete.id);
      setRoutes(prevRoutes => prevRoutes.filter(r => r.id !== routeToDelete.id));
      closeDeleteConfirmDialog();
    } catch (err) {
      console.error("Error deleting route:", err);
      setError(`Failed to delete route "${routeToDelete.name}". Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Basic function to construct a view URL.
  // This will need to be more sophisticated based on how map page handles route display.
  const handleViewRoute = async (route: Route) => {
    try {
      const waypoints = await Promise.all(route.waypointIds.map(id => getWaypointById(id)));
      const validWaypoints = waypoints.filter(wp => wp !== undefined) as Waypoint[];
      if (validWaypoints.length < 2) {
        alert("Route requires at least 2 valid waypoints to display.");
        return;
      }
      const coordinates = validWaypoints.map(wp => `${wp.longitude},${wp.latitude}`).join(';');
      // Assuming a map provider like OpenStreetMap or similar
      // This is a simplified example. Actual implementation might involve passing GeoJSON or structured data.
      // const mapUrl = `/map?route=${encodeURIComponent(JSON.stringify(route))}`;
      // For now, let's just log it, as map display logic is out of scope.
      // console.log("Viewing route:", route);
      // console.log("Waypoints for map:", validWaypoints);
      navigate(`/map?waypoints=${coordinates}`);

    } catch (e) {
        console.error("Failed to prepare route for viewing",e);
        alert("Could not prepare route for viewing")
    }
  };


  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b border-slate-200">
        <Button onClick={handleNavigateBack} className="p-2">
          <ArrowLeftIcon className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Saved Routes</h1>
        <div className="w-10"></div> {/* Placeholder */}
      </header>

      <main className="flex-grow overflow-y-auto">
        {isLoading && <p className="p-4 text-center">Loading...</p>}
        {error && <p className="p-4 text-center text-red-500">{error}</p>}
        {!isLoading && !error && routes.length === 0 && (
          <div className="text-center p-8">
            <MapIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">No Saved Routes Yet</h2>
            <p className="text-slate-500 mb-6">It looks like you haven't saved any routes. Create one now!</p>
            <Button color="green" onClick={() => navigate('/create_route')}>
              Create New Route
            </Button>
          </div>
        )}
        {!isLoading && !error && routes.length > 0 && (
          <ul className="divide-y divide-slate-200">
            {routes.map((route) => (
              <li key={route.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
                <div className="flex-grow">
                  <h2 className="font-bold text-blue-700">{route.name}</h2>
                  <p className="text-sm text-slate-500">
                    Waypoints: {route.waypointIds.length} | Created: {new Date(route.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                   <Button
                    plain
                    onClick={() => handleViewRoute(route)}
                    aria-label={`View route ${route.name}`}
                    className="p-2 text-slate-600 hover:text-blue-600"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    plain
                    onClick={() => openDeleteConfirmDialog(route)}
                    aria-label={`Delete route ${route.name}`}
                    className="p-2 text-slate-600 hover:text-red-600"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {routeToDelete && (
        <Dialog open={!!routeToDelete} onClose={closeDeleteConfirmDialog} size="lg">
          <DialogTitle>Delete Route</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the route "{routeToDelete.name}"? This action cannot be undone.
          </DialogDescription>
          <DialogBody>
            <p>This route contains {routeToDelete.waypointIds.length} waypoint(s).</p>
          </DialogBody>
          <DialogActions>
            <Button plain onClick={closeDeleteConfirmDialog} disabled={isDeleting}>
              Cancel
            </Button>
            <Button color="red" onClick={handleDeleteRoute} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
