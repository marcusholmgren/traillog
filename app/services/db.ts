import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// --- Type Definitions ---

import type * as GeoJSON from 'geojson';

export interface Waypoint {
  id: number;
  name?: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  createdAt: number;
  notes?: string;
  imageDataUrl?: string;
}

export interface WaypointUpdate {
  name?: string;
  altitude?: number | null;
  notes?: string;
  imageDataUrl?: string | null;
}

export interface Route {
  id: number;
  name: string;
  geometry: GeoJSON.LineString | GeoJSON.Polygon; // Changed from waypointIds
  createdAt: number;
}

interface TrailLogDBSchema extends DBSchema {
  waypoints: {
    key: number;
    value: Waypoint;
    indexes: { createdAt: number };
  };
  routes: {
    key: number;
    value: Route;
    indexes: { createdAt: number };
  };
}

// --- Database Setup ---

const DB_NAME = "traillog-db";
const DB_VERSION = 2;
const STORE_NAME_WAYPOINTS = "waypoints";
const STORE_NAME_ROUTES = "routes";

// Exported for testability
export async function openWaypointsDB(): Promise<
  IDBPDatabase<TrailLogDBSchema>
> {
  return openDB<TrailLogDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains(STORE_NAME_WAYPOINTS)) {
          const waypointStore = db.createObjectStore(STORE_NAME_WAYPOINTS, {
            keyPath: "id",
            autoIncrement: true,
          });
          waypointStore.createIndex("createdAt", "createdAt");
        }
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_NAME_ROUTES)) {
          const routeStore = db.createObjectStore(STORE_NAME_ROUTES, {
            keyPath: "id",
            autoIncrement: true,
          });
          routeStore.createIndex("createdAt", "createdAt");
        }
      }
    },
  });
}

// --- Waypoint Functions ---

export async function addWaypoint(
  waypointData: Omit<Waypoint, "id" | "createdAt">
): Promise<number> {
  const db = await openWaypointsDB();
  const waypoint: Omit<Waypoint, "id"> = {
    ...waypointData,
    createdAt: Date.now(),
  };
  const id = await db.add(STORE_NAME_WAYPOINTS, waypoint as Waypoint);
  return Number(id);
}

export async function getSavedWaypoints(): Promise<Waypoint[]> {
  const db = await openWaypointsDB();
  // Return newest first by reversing the default ascending order from the index
  return db
    .getAllFromIndex(STORE_NAME_WAYPOINTS, "createdAt")
    .then((w) => w.reverse());
}

export async function getWaypointById(
  id: number
): Promise<Waypoint | undefined> {
  const db = await openWaypointsDB();
  return db.get(STORE_NAME_WAYPOINTS, id);
}

export async function updateWaypoint(
  id: number,
  updates: WaypointUpdate
): Promise<Waypoint> {
  const db = await openWaypointsDB();
  const tx = db.transaction(STORE_NAME_WAYPOINTS, "readwrite");
  const waypoint = await tx.store.get(id);

  if (!waypoint) {
    throw new Error(`Waypoint with id ${id} not found`);
  }

  const updatedWaypoint: Waypoint = { ...waypoint };

  if (updates.name !== undefined) {
    updatedWaypoint.name = updates.name;
  }
  if (updates.notes !== undefined) {
    updatedWaypoint.notes = updates.notes;
  }
  if (updates.altitude !== undefined) {
    updatedWaypoint.altitude =
      updates.altitude === null ? undefined : updates.altitude;
  }
  if (updates.imageDataUrl !== undefined) {
    updatedWaypoint.imageDataUrl =
      updates.imageDataUrl === null ? undefined : updates.imageDataUrl;
  }

  await tx.store.put(updatedWaypoint);
  await tx.done;
  return updatedWaypoint;
}

export async function deleteWaypoint(id: number): Promise<void> {
  const db = await openWaypointsDB();
  await db.delete(STORE_NAME_WAYPOINTS, id);
}

export async function clearAllWaypoints(): Promise<void> {
  const db = await openWaypointsDB();
  await db.clear(STORE_NAME_WAYPOINTS);
}

export async function exportWaypoints(): Promise<string> {
  const waypoints = await getSavedWaypoints();
  const geoJson = waypointsToGeoJSON(waypoints);
  return JSON.stringify(geoJson, null, 2);
}

export async function importWaypoints(geoJsonString: string): Promise<void> {
  const geoJson: GeoJSON.FeatureCollection<GeoJSON.Point> =
    JSON.parse(geoJsonString);
  const db = await openWaypointsDB();
  const tx = db.transaction(STORE_NAME_WAYPOINTS, "readwrite");

  for (const feature of geoJson.features) {
    const properties = feature.properties;
    const coordinates = feature.geometry.coordinates;

    // Check if coordinates exist and have at least two values (longitude, latitude)
    if (!coordinates || coordinates.length < 2) {
      console.warn("Skipping waypoint with invalid coordinates:", feature);
      continue;
    }

    const waypointData: Omit<Waypoint, "id" | "createdAt"> = {
      name: properties?.name,
      latitude: coordinates[1],
      longitude: coordinates[0],
      altitude: coordinates.length > 2 ? coordinates[2] : undefined,
      notes: properties?.notes,
      imageDataUrl: properties?.imageDataUrl,
    };
    await addWaypoint(waypointData); // Use existing addWaypoint function
  }
  await tx.done;
}

// --- Route Functions ---

export async function addRoute(
  routeName: string,
  geometry: GeoJSON.LineString | GeoJSON.Polygon // Changed from waypointIds
): Promise<number> {
  const db = await openWaypointsDB();
  const route: Omit<Route, "id"> = {
    name: routeName,
    geometry: geometry, // Changed from waypointIds
    createdAt: Date.now(),
  };
  const id = await db.add(STORE_NAME_ROUTES, route as Route);
  return Number(id);
}

export async function getSavedRoutes(): Promise<Route[]> {
  const db = await openWaypointsDB();
  // Sort by 'createdAt' in descending order to get newest routes first
  return db
    .getAllFromIndex(STORE_NAME_ROUTES, "createdAt")
    .then((routes) => routes.reverse());
}

export async function getRouteById(id: number): Promise<Route | undefined> {
  const db = await openWaypointsDB();
  return db.get(STORE_NAME_ROUTES, id);
}

export async function deleteRoute(id: number): Promise<void> {
  const db = await openWaypointsDB();
  await db.delete(STORE_NAME_ROUTES, id);
}

export async function clearAllRoutes(): Promise<void> {
  const db = await openWaypointsDB();
  await db.clear(STORE_NAME_ROUTES);
}

export async function deleteDatabase(): Promise<void> {
  const db = await openWaypointsDB();
  await db.close();
  await indexedDB.deleteDatabase(DB_NAME);
}

export async function getStorageEstimate(): Promise<{usage: number, quota: number}> {
    const estimate = await navigator.storage.estimate();
    return {
        usage: estimate.usage ?? 0,
        quota: estimate.quota ?? 0
    }
}

export async function exportRoutes(): Promise<string> {
  const routes = await getSavedRoutes();
  const features: GeoJSON.Feature<GeoJSON.LineString | GeoJSON.Polygon>[] = routes.map(route => ({
    type: "Feature",
    properties: {
      id: route.id,
      name: route.name,
      createdAt: route.createdAt,
      // Potentially add other relevant properties from the route object if needed
    },
    geometry: route.geometry,
  }));

  const featureCollection: GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Polygon> = {
    type: "FeatureCollection",
    features: features,
  };
  return JSON.stringify(featureCollection, null, 2);
}

export async function importRoutes(jsonString: string): Promise<void> {
  const featureCollection: GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.Polygon> = JSON.parse(jsonString);
  const db = await openWaypointsDB();
  const tx = db.transaction(STORE_NAME_ROUTES, "readwrite");

  if (featureCollection && featureCollection.features && Array.isArray(featureCollection.features)) {
    for (const feature of featureCollection.features) {
      if (feature && feature.geometry && (feature.geometry.type === "LineString" || feature.geometry.type === "Polygon")) {
        const routeName = feature.properties?.name || "Imported Route";
        // Use current time for createdAt if not provided in properties, to ensure it's always a number
        const routeCreatedAt = typeof feature.properties?.createdAt === 'number' ? feature.properties.createdAt : Date.now();
        const routeGeometry = feature.geometry as GeoJSON.LineString | GeoJSON.Polygon; // Cast to be sure

        if (!routeGeometry.coordinates || !Array.isArray(routeGeometry.coordinates)) {
          console.warn("Skipping route with invalid coordinates in geometry:", feature);
          continue;
        }

        const newRoute: Omit<Route, "id"> = {
          name: routeName,
          geometry: routeGeometry,
          createdAt: routeCreatedAt,
        };
        await tx.store.add(newRoute as Route);
      } else {
        console.warn("Skipping non-LineString/Polygon feature or feature with invalid geometry during route import:", feature);
      }
    }
  } else {
    console.warn("ImportRoutes: Input JSON is not a valid FeatureCollection or has no features.", featureCollection);
  }
  await tx.done;
}

// --- GeoJSON Conversion ---

export function waypointsToGeoJSON(
  waypoints: Waypoint[]
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = waypoints.map(
    (waypoint) => {
      const coordinates: GeoJSON.Position =
        waypoint.altitude !== undefined && waypoint.altitude !== null
          ? [waypoint.longitude, waypoint.latitude, waypoint.altitude]
          : [waypoint.longitude, waypoint.latitude];

      const feature: GeoJSON.Feature<GeoJSON.Point> = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: coordinates,
        },
        properties: {
          id: waypoint.id,
          name: waypoint.name,
          createdAt: waypoint.createdAt,
        },
      };

      if (waypoint.notes) {
        feature.properties.notes = waypoint.notes;
      }
      if (waypoint.imageDataUrl) {
        feature.properties.imageDataUrl = waypoint.imageDataUrl;
      }
      if (waypoint.altitude !== undefined && waypoint.altitude !== null) {
        feature.properties.altitude = waypoint.altitude;
      }

      return feature;
    }
  );

  return {
    type: "FeatureCollection",
    features: features,
  };
}
