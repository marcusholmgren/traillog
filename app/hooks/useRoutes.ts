import { useState, useEffect, useCallback } from "react";
import {
  getSavedRoutes,
  deleteRoute as dbDeleteRoute,
  type Route,
} from "~/services/db";

export function useRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const deleteRoute = useCallback(
    async (id: number) => {
      // Confirmation dialog should be handled by the UI component
      try {
        await dbDeleteRoute(id);
        setRoutes((prevRoutes) => prevRoutes.filter((r) => r.id !== id));
      } catch (err) {
        console.error("Error deleting route:", err);
        setError("Failed to delete route. Please try again.");
        throw err; // Re-throw to allow UI to handle it
      }
    },
    []
  );

  return {
    routes,
    isLoading,
    error,
    fetchRoutes, // Expose refetch if needed
    deleteRoute,
  };
}
