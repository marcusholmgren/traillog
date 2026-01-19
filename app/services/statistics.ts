import { getSavedWaypoints, getSavedRoutes, Route } from "./db";
import * as GeoJSON from "geojson";

export async function getWaypointCount(): Promise<number> {
  const waypoints = await getSavedWaypoints();
  return waypoints.length;
}

function haversineDistance(
  coords1: GeoJSON.Position,
  coords2: GeoJSON.Position
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;

  const lon1 = coords1[0];
  const lat1 = coords1[1];
  const lon2 = coords2[0];
  const lat2 = coords2[1];

  const R = 6371; // km
  const x1 = lat2 - lat1;
  const dLat = toRad(x1);
  const x2 = lon2 - lon1;
  const dLon = toRad(x2);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return d;
}

function calculateRouteDistance(route: Route): number {
  let totalDistance = 0;
  const coordinates = route.geometry.coordinates;

  if (route.geometry.type === "LineString") {
    for (let i = 0; i < coordinates.length - 1; i++) {
      totalDistance += haversineDistance(
        coordinates[i] as GeoJSON.Position,
        coordinates[i + 1] as GeoJSON.Position
      );
    }
  } else if (route.geometry.type === "Polygon") {
    for (let i = 0; i < coordinates[0].length - 1; i++) {
      totalDistance += haversineDistance(
        coordinates[0][i] as GeoJSON.Position,
        coordinates[0][i + 1] as GeoJSON.Position
      );
    }
  }

  return totalDistance;
}

export async function getTotalDistance(): Promise<number> {
  const routes = await getSavedRoutes();
  let totalDistance = 0;

  for (const route of routes) {
    totalDistance += calculateRouteDistance(route);
  }

  return Math.round(totalDistance);
}

export async function getRecentTreks(): Promise<Route[]> {
  const routes = await getSavedRoutes();
  return routes.slice(0, 3);
}
