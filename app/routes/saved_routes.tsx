import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  type Route,
  getWaypointById,
  type Waypoint,
} from "~/services/db";
import { Button } from "~/components/button";
import { TrashIcon, EyeIcon, MapIcon } from "@heroicons/react/24/outline";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/components/dialog";
import { useRoutes } from "~/hooks/useRoutes";
import { EntityPageLayout } from "~/components/entity-page-layout";
import { ResourceList } from "~/components/resource-list";

export default function SavedRoutesPage() {
  const navigate = useNavigate();
  const {
    routes,
    isLoading,
    error: routesError, // Renamed to avoid conflict
    deleteRoute,
  } = useRoutes();

  const [routeToDelete, setRouteToDelete] = useState<Route | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Consolidate error display
  const error = routesError || (isDeleting && "Failed to delete route.");


  const handleCreateNewRoute = () => {
    navigate("/routes/create");
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
      await deleteRoute(routeToDelete.id); // Hook handles UI update
      closeDeleteConfirmDialog();
    } catch (err) {
      console.error("Error deleting route from UI:", err);
      // Error will be set by the hook, or you can set a specific message here
      // For instance, if the hook's error is generic:
      // setError(`Failed to delete route "${routeToDelete.name}". Please try again.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewRouteOnMap = async (route: Route) => {
    try {
      const waypoints = await Promise.all(
        route.waypointIds.map((id) => getWaypointById(id))
      );
      const validWaypoints = waypoints.filter(
        (wp) => wp !== undefined
      ) as Waypoint[];

      if (validWaypoints.length < 2) {
        alert("Route requires at least 2 valid waypoints to display on the map.");
        return;
      }
      const coordinates = validWaypoints
        .map((wp) => `${wp.longitude},${wp.latitude}`)
        .join(";");
      navigate(`/map?waypoints=${coordinates}&routeName=${encodeURIComponent(route.name)}`);
    } catch (e) {
      console.error("Failed to prepare route for viewing on map", e);
      alert("Could not prepare route for map viewing. Please try again.");
    }
  };

  const renderRouteItem = (route: Route) => (
    <div className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
      <div className="flex-grow">
        <h2 className="font-bold text-blue-700">{route.name}</h2>
        <p className="text-sm text-slate-500">
          Waypoints: {route.waypointIds.length} | Created:{" "}
          {new Date(route.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          plain
          onClick={() => handleViewRouteOnMap(route)}
          aria-label={`View route ${route.name} on map`}
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
    </div>
  );

  const emptyStateContent = (
    <div className="text-center p-8">
      <MapIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-slate-700 mb-2">
        No Saved Routes Yet
      </h2>
      <p className="text-slate-500 mb-6">
        It looks like you haven't saved any routes. Create one now!
      </p>
      <Button color="green" onClick={handleCreateNewRoute}>
        Create New Route
      </Button>
    </div>
  );


  return (
    <EntityPageLayout
      pageTitle="Saved Routes"
      onAdd={handleCreateNewRoute}
      addLabel="Create New Route"
    >
      <ResourceList
        items={routes}
        renderItem={renderRouteItem}
        isLoading={isLoading}
        error={error} // Display consolidated error
        emptyStateMessage={emptyStateContent} // Custom empty state component
        itemKey="id"
        itemClassName="" // Remove default li padding if renderRouteItem handles it
      />

      {routeToDelete && (
        <Dialog
          open={!!routeToDelete}
          onClose={closeDeleteConfirmDialog}
          size="lg"
        >
          <DialogTitle>Delete Route</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the route "{routeToDelete.name}"?
            This action cannot be undone.
          </DialogDescription>
          <DialogBody>
            <p>
              This route contains {routeToDelete.waypointIds.length}{" "}
              waypoint(s).
            </p>
          </DialogBody>
          <DialogActions>
            <Button
              plain
              onClick={closeDeleteConfirmDialog}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDeleteRoute}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </EntityPageLayout>
  );
}
