import { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router"; // Import Link
import {
  getSavedWaypoints,
  type Waypoint,
  waypointsToGeoJSON,
  deleteWaypoint,
} from "../services/db";
import { data } from "react-router";
import {WaypointsList} from "~/welcome/waypoints/list";

export default function SavedWaypoints() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null); // Added success message state
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
    navigate(-1, { viewTransition: true }); // Go back to the previous page
  };

  const handleAddWaypoint = () => {
    navigate("/add-waypoint", { viewTransition: true }); // Navigate to add waypoint page
  };

  const handleDeleteWaypoint = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this waypoint?")) {
      try {
        await deleteWaypoint(id);
        setWaypoints((prevWaypoints) =>
          prevWaypoints.filter((wp) => wp.id !== id)
        );
        // Optionally: set a success message or log
        console.log(`Waypoint ${id} deleted successfully.`);
      } catch (err) {
        console.error("Error deleting waypoint:", err);
        setError("Failed to delete waypoint. Please try again.");
        setSuccessMessage(null); // Clear success message on new error
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
        const file = new File([geojsonString], fileName, { type: "application/geo+json" });

        await navigator.share({
          title: shareTitle,
          text: shareText,
          files: [file],
        });
        console.log("Waypoint shared successfully");
        // Optionally, set a success message for sharing
        // setSuccessMessage("Waypoint shared!");
      } catch (error) {
        console.error("Error sharing waypoint:", error);
        // setError("Failed to share waypoint. Please try again or check browser permissions.");
        // Alerting for now as setError might be overwritten by other operations quickly
        alert("Error sharing: " + (error as Error).message);
      }
    } else {
      console.warn("Web Share API not supported in this browser.");
      alert(
        "Web Share API is not supported in your browser. Try copying the details manually."
      );
      // Fallback perhaps: copy to clipboard or show a modal with the text
    }
  };

  const handleExportToGeoJSON = async () => {
    try {
      const waypoints = await getSavedWaypoints();
      if (waypoints.length === 0) {
        alert("No waypoints to export."); // Or some other user feedback
        return;
      }
      const geojsonData = waypointsToGeoJSON(waypoints);
      const jsonString = JSON.stringify(geojsonData, null, 2); // Pretty print JSON
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
    <div className="relative flex size-full min-h-screen flex-col bg-slate-50 justify-between group/design-root overflow-x-hidden">
      <div>
        <div className="flex items-center bg-slate-50 p-4 pb-2 justify-between">
          <div
            className="text-[#0d141c] flex size-12 shrink-0 items-center"
            data-icon="ArrowLeft"
            data-size="24px"
            data-weight="regular"
            onClick={handleNavigateBack}
            style={{ cursor: "pointer" }}
            data-testid="back-saved-waypoints-button"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24px"
              height="24px"
              fill="currentColor"
              viewBox="0 0 256 256"
            >
              <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"></path>
            </svg>
          </div>
          <h2 className="text-[#0d141c] text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
            Waypoints
          </h2>
        </div>
        {isLoading && (
          <p className="p-4 text-center text-[#0d141c]">Loading waypoints...</p>
        )}
        {error && <p className="p-4 text-center text-red-500">{error}</p>}
        {successMessage && (
          <p className="p-4 text-center text-green-500">{successMessage}</p>
        )}{" "}
        {/* Display success message */}
        {!isLoading && !error && !successMessage && waypoints.length === 0 && (
          <p className="p-4 text-center text-[#49739c]">
            No waypoints saved yet.
          </p>
        )}
        {!isLoading && !error && waypoints.length > 0 && (
          <div className="overflow-y-auto">
            {" "}
            <WaypointsList waypoints={waypoints} />
            {/* Added for scrollability if list is long */}
            {waypoints.map((waypoint) => (
              <div
                key={waypoint.id}
                className="flex items-center gap-4 bg-slate-50 px-4 min-h-[72px] py-3 border-b border-slate-200 last:border-b-0"
              >
                {waypoint.imageDataUrl ? (
                  <img
                    src={waypoint.imageDataUrl}
                    alt={`${waypoint.name} thumbnail`}
                    className="size-12 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="text-[#0d141c] flex items-center justify-center rounded-lg bg-[#e7edf4] shrink-0 size-12">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24px"
                      height="24px"
                      fill="currentColor"
                      viewBox="0 0 256 256"
                    >
                      <path d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z"></path>
                    </svg>
                  </div>
                )}
                <div className="flex flex-col justify-center flex-grow overflow-hidden">
                  <p className="text-[#0d141c] text-base font-medium leading-normal line-clamp-1">
                    {waypoint.name}
                  </p>
                  <p className="text-[#49739c] text-sm font-normal leading-normal">
                    Lat: {waypoint.latitude.toFixed(4)}, Lon:{" "}
                    {waypoint.longitude.toFixed(4)}
                  </p>
                  {waypoint.altitude !== undefined && waypoint.altitude !== null && (
                    <p className="text-gray-500 text-xs font-normal leading-normal">
                      Altitude: {waypoint.altitude}m
                    </p>
                  )}
                  <p className="text-gray-500 text-xs font-normal leading-normal">
                    Created: {dateFormatter(waypoint.createdAt)}
                  </p>
                </div>
                <NavLink
                  to={`/waypoints/edit/${waypoint.id}`}
                  className="ml-auto flex-shrink-0 px-3 py-1.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md shadow-sm transition-colors"
                  aria-label={`Edit ${waypoint.name}`}
                >
                  Edit
                </NavLink>
                <button
                  onClick={() => handleDeleteWaypoint(waypoint.id)}
                  className="ml-2 flex-shrink-0 px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-md shadow-sm transition-colors"
                  aria-label={`Delete ${waypoint.name}`}
                >
                  Delete
                </button>
                <button
                  onClick={() => handleShareWaypoint(waypoint)}
                  className="ml-2 flex-shrink-0 px-3 py-1.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-md shadow-sm transition-colors"
                  data-testid={`share-waypoint-button-${waypoint.id}`}
                  aria-label={`Share ${waypoint.name}`}
                >
                  Share
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mt-auto">
        {" "}
        {/* Ensures buttons are at the bottom */}
        <div className="flex flex-wrap justify-center items-center gap-4 px-5 pb-5 pt-2">
          {" "}
          {/* Adjusted for wrapping and centering */}
          <button
            onClick={handleExportToGeoJSON}
            className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 bg-slate-600 hover:bg-slate-700 text-slate-50 text-base font-bold leading-normal tracking-[0.015em] min-w-0 px-4 gap-2"
            data-testid="export-geojson-button"
          >
            <div
              className="text-slate-50"
              data-icon="Download" /* Using a generic download icon idea */
              data-size="20px"
              data-weight="regular"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20px"
                height="20px"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M216,152v56a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V152a8,8,0,0,1,16,0v48H200V152a8,8,0,0,1,16,0Zm-40.49-20.49a8,8,0,0,0-11.32,0L136,160V40a8,8,0,0,0-16,0V160L91.81,131.51a8,8,0,0,0-11.32,11.32l40,40a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,175.51,131.51Z"></path>
              </svg>
            </div>
            <span>Export GeoJSON</span>
          </button>
          <button
            onClick={handleAddWaypoint}
            className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 bg-[#0c7ff2] hover:bg-[#0a6ac9] text-slate-50 text-base font-bold leading-normal tracking-[0.015em] min-w-0 px-2 gap-4 pl-4 pr-6 order-first sm:order-none" // Order first on small screens
            data-testid="add-new-waypoint-button"
          >
            <div
              className="text-slate-50"
              data-icon="Plus"
              data-size="24px"
              data-weight="regular"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24px"
                height="24px"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
              </svg>
            </div>
            {/* Text for Add button can be added here if needed, like the Export button */}
          </button>
        </div>
        <div className="h-5 bg-slate-50"></div>
      </div>
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
