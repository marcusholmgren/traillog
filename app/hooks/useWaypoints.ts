import { useState, useEffect, useCallback } from "react";
import {
  getSavedWaypoints,
  deleteWaypoint as dbDeleteWaypoint,
  type Waypoint,
} from "~/services/db";

export function useWaypoints() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWaypoints = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchWaypoints();
  }, [fetchWaypoints]);

  const deleteWaypoint = useCallback(
    async (id: number) => {
      if (window.confirm("Are you sure you want to delete this waypoint?")) {
        try {
          await dbDeleteWaypoint(id);
          setWaypoints((prevWaypoints) =>
            prevWaypoints.filter((wp) => wp.id !== id)
          );
          // Optionally, could refetch all waypoints to ensure consistency
          // await fetchWaypoints();
        } catch (err) {
          console.error("Error deleting waypoint:", err);
          setError("Failed to delete waypoint. Please try again.");
          // Re-throw or handle as appropriate for the UI
          throw err;
        }
      }
    },
    [] // Removed fetchWaypoints from dependencies as it causes infinite loop with current setup
     // It's better to manually update the state or refetch if deletion is complex
  );

  return {
    waypoints,
    isLoading,
    error,
    fetchWaypoints, // Expose refetch if needed by UI
    deleteWaypoint,
  };
}
