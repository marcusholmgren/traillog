import { useNavigate, NavLink } from "react-router";
import {
  type Waypoint,
  waypointsToGeoJSON,
  getSavedWaypoints as dbGetSavedWaypoints,
} from "~/services/db";
import { Button } from "~/components/button";
import {
  ArrowDownOnSquareIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  MapPinIcon,
  MapIcon,
} from "@heroicons/react/24/outline";
import { useWaypoints } from "~/hooks/useWaypoints";
import { EntityPageLayout } from "~/components/entity-page-layout";
import { ResourceList } from "~/components/resource-list";
import {
  coordinateFormat,
  dateFormatter,
  numberFormat,
} from "~/services/formatter";

export default function SavedWaypoints() {
  const navigate = useNavigate();
  const {
    waypoints,
    isLoading,
    error: waypointsError, // Renamed to avoid conflict if EntityPageLayout introduces its own error prop
    deleteWaypoint,
  } = useWaypoints();

  // Error from hook needs to be available for ResourceList and potentially other UI elements
  const error = waypointsError;

  const handleAddWaypoint = () => {
    navigate("/waypoints/add");
  };

  const handleDeleteWaypoint = async (id: number) => {
    try {
      await deleteWaypoint(id);
      // UI is updated via hook state
      console.log(`Waypoint ${id} deleted successfully.`);
    } catch (err) {
      console.error("Error deleting waypoint from UI:", err);
      // Error is already set in the hook, but you could show a specific notification here if needed
      alert("Failed to delete waypoint. Please try again.");
    }
  };

  const handleShareWaypoint = async (waypoint: Waypoint) => {
    const shareText = `Waypoint: ${
      waypoint.name || "Unnamed"
    } - Lat: ${coordinateFormat(waypoint.latitude)}, Lon: ${coordinateFormat(
      waypoint.longitude
    )}`;
    const shareTitle = `Share Waypoint: ${waypoint.name || "Unnamed"}`;

    if (navigator.share) {
      try {
        const geojsonData = waypointsToGeoJSON([waypoint]);
        const geojsonString = JSON.stringify(geojsonData);
        const fileName = `${waypoint.name || "waypoint"}.geojson`;
        const file = new File([geojsonString], fileName, {
          type: "application/geo+json",
        });

        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file],
        });
        console.log("Waypoint shared successfully");
      } catch (shareError) {
        console.error("Error sharing waypoint:", shareError);
        alert("Error sharing: " + (shareError as Error).message);
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
      // It's better to use the waypoints from the hook's state if they are always up-to-date
      // or fetch fresh ones if necessary, though the hook should keep them fresh.
      const currentWaypoints = await dbGetSavedWaypoints(); // Or use 'waypoints' from hook if always current
      if (currentWaypoints.length === 0) {
        alert("No waypoints to export.");
        return;
      }
      const geojsonData = waypointsToGeoJSON(currentWaypoints);
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

  const renderWaypointItem = (waypoint: Waypoint) => (
    <div className="flex items-start gap-4 p-4">
      {waypoint.imageDataUrl ? (
        <img
          src={waypoint.imageDataUrl}
          alt={waypoint.name || "Waypoint image"}
          className="h-16 w-16 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-200">
          <MapPinIcon className="h-8 w-8 text-slate-500" />
        </div>
      )}
      <div className="flex-grow">
        <h2 className="font-bold text-green-700">
          {waypoint.name || "Unnamed Waypoint"}
        </h2>
        <p className="text-sm text-slate-500">
          Lat: {coordinateFormat(waypoint.latitude)}, Lon:{" "}
          {coordinateFormat(waypoint.longitude)}
        </p>
        {waypoint.altitude && (
          <p className="text-sm text-slate-500">
            Altitude: {numberFormat(waypoint.altitude)}
          </p>
        )}
        <p className="text-xs text-slate-400 pt-1">
          {dateFormatter(waypoint.createdAt)}
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <NavLink to={`/waypoints/edit/${waypoint.id}`}>
          <Button outline className="p-2" aria-label="Edit waypoint">
            <PencilIcon className="h-5 w-5" />
          </Button>
        </NavLink>
        <Button
          outline
          onClick={() => handleDeleteWaypoint(waypoint.id)}
          className="p-2"
          aria-label="Delete waypoint"
        >
          <TrashIcon className="h-5 w-5" />
        </Button>
        <Button
          outline
          onClick={() => handleShareWaypoint(waypoint)}
          className="p-2"
          aria-label="Share waypoint"
        >
          <ShareIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );

  const pageFooter = (
    <>
      <Button
        onClick={() => navigate("/routes/create")}
        className="w-full flex items-center justify-center gap-2"
        color="green"
      >
        <MapIcon className="h-5 w-5" />
        Create Route from Waypoints
      </Button>
      <Button
        onClick={handleExportToGeoJSON}
        className="w-full flex items-center justify-center gap-2"
      >
        <ArrowDownOnSquareIcon className="h-5 w-5" />
        Export all to GeoJSON
      </Button>
    </>
  );

  return (
    <EntityPageLayout
      pageTitle="Saved Waypoints"
      onAdd={handleAddWaypoint}
      addLabel="Add New Waypoint"
      footerContent={pageFooter}
    >
      <ResourceList
        items={waypoints}
        renderItem={renderWaypointItem}
        isLoading={isLoading}
        error={error}
        emptyStateMessage="No waypoints saved yet."
        itemKey="id"
      />
    </EntityPageLayout>
  );
}
