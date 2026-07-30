import { getSavedWaypoints, getSavedRoutes, type Route } from "~/services/db";
import { calculateTotalRouteDistance, type Coordinates } from "~/services/geolocation";
import type * as GeoJSON from "geojson";

export async function getWaypointCount(): Promise<number> {
  const waypoints = await getSavedWaypoints();
  return waypoints.length;
}



export async function getTotalDistance(): Promise<number> {
  const routes = await getSavedRoutes();
  let totalDistance = 0;

  for (const route of routes) {
    if (route.geometry.type === "LineString") {
      const coords: Coordinates[] = route.geometry.coordinates.map((coord) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
      totalDistance += calculateTotalRouteDistance(coords);
    } else if (route.geometry.type === "Polygon") {
      const outerRing = route.geometry.coordinates[0];
      if (outerRing) {
        const coords: Coordinates[] = outerRing.map((coord) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        totalDistance += calculateTotalRouteDistance(coords);
      }
    }
  }

  return Math.round(totalDistance);
}

export async function getRecentTreks(): Promise<Route[]> {
  const routes = await getSavedRoutes();
  return routes.slice(0, 3);
}
