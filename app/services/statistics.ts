import { getSavedWaypoints, getSavedRoutes, type Route } from "~/services/db";
import {calculateTotalRouteDistance, type Coordinates} from "~/services/geolocation";

export async function getWaypointCount(): Promise<number> {
  const waypoints = await getSavedWaypoints();
  return waypoints.length;
}



export async function getTotalDistance(): Promise<number> {
  const routes = await getSavedRoutes();
  const routeCoordinates: Coordinates[] = routes
    .filter((r) => r.geometry.type === "LineString")
    .flatMap((r) =>
      (r.geometry as GeoJSON.LineString).coordinates.map((coord) => ({
        latitude: coord[1],
        longitude: coord[0],
      }))
    );
  const totalDistance = calculateTotalRouteDistance(routeCoordinates);

  return Math.round(totalDistance);
}

export async function getRecentTreks(): Promise<Route[]> {
  const routes = await getSavedRoutes();
  return routes.slice(0, 3);
}
