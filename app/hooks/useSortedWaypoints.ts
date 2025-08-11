import { useState, useEffect, useCallback } from "react";
import type { Waypoint } from "~/services/db";
import {
  getCurrentPosition,
  calculateDistance,
} from "~/services/geolocation";

interface SortedWaypoint extends Waypoint {
  distance?: number;
}

export function useSortedWaypoints(initialWaypoints: Waypoint[]) {
  const [waypoints, setWaypoints] = useState<SortedWaypoint[]>(initialWaypoints);
  const [isSortingEnabled, setIsSortingEnabled] = useState(false);
  const [userLocation, setUserLocation] =
    useState<GeolocationCoordinates | null>(null);

  useEffect(() => {
    setWaypoints(initialWaypoints);
  }, [initialWaypoints]);

  const sortWaypoints = useCallback(async () => {
    if (!isSortingEnabled) {
      setWaypoints(initialWaypoints);
      return;
    }

    try {
      const position = await getCurrentPosition();
      const { latitude, longitude } = position.coords;
      setUserLocation(position.coords);

      const waypointsWithDistances = initialWaypoints.map((waypoint) => ({
        ...waypoint,
        distance: calculateDistance(
          { latitude, longitude },
          { latitude: waypoint.latitude, longitude: waypoint.longitude }
        ),
      }));

      waypointsWithDistances.sort((a, b) => a.distance - b.distance);
      setWaypoints(waypointsWithDistances);
    } catch (error) {
      console.error("Error getting user location or sorting waypoints:", error);
      // Handle location error (e.g., show a notification to the user)
      setIsSortingEnabled(false); // Disable sorting if location is not available
    }
  }, [isSortingEnabled, initialWaypoints]);

  useEffect(() => {
    sortWaypoints();
  }, [sortWaypoints]);

  const toggleSorting = () => {
    setIsSortingEnabled((prev) => !prev);
  };

  return { sortedWaypoints: waypoints, toggleSorting, isSortingEnabled, userLocation };
}
