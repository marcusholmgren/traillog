import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface Waypoint {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  createdAt: number;
  notes?: string;
  imageDataUrl?: string;
}

export interface WaypointUpdate {
  name?: string;
  altitude?: number;
  notes?: string;
  imageDataUrl?: string | null;
}

export interface Route {
  id: number;
  name: string;
  waypointIds: number[];
  createdAt: number;
}

interface WaypointsDBSchema extends DBSchema {
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

// Route-specific database functions

export async function addRoute(
  routeName: string,
  waypointIds: number[]
): Promise<number> {
  const db = await openWaypointsDB();
  const route: Omit<Route, "id"> = {
    name: routeName,
    waypointIds: waypointIds,
    createdAt: Date.now(),
  };
  const id = await db.add(STORE_NAME_ROUTES, route as Route);
  return Number(id);
}

export async function getSavedRoutes(): Promise<Route[]> {
  const db = await openWaypointsDB();
  // Sort by 'createdAt' in descending order to get newest routes first
  return db.getAllFromIndex(STORE_NAME_ROUTES, "createdAt").then(routes => routes.reverse());
}

export async function getRouteById(id: number): Promise<Route | undefined> {
  const db = await openWaypointsDB();
  return db.get(STORE_NAME_ROUTES, id);
}

export async function deleteRoute(id: number): Promise<void> {
  const db = await openWaypointsDB();
  await db.delete(STORE_NAME_ROUTES, id);
}

const DB_NAME = "waypoints-db";
const DB_VERSION = 2; // Incremented DB_VERSION due to schema change
const STORE_NAME_WAYPOINTS = "waypoints";
const STORE_NAME_ROUTES = "routes";

async function openWaypointsDB(): Promise<IDBPDatabase<WaypointsDBSchema>> {
  return openDB<WaypointsDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) { // For initial setup or versions before 1
        if (!db.objectStoreNames.contains(STORE_NAME_WAYPOINTS)) {
          const waypointStore = db.createObjectStore(STORE_NAME_WAYPOINTS, {
            keyPath: "id",
            autoIncrement: true,
          });
          waypointStore.createIndex("createdAt", "createdAt");
        }
      }
      if (oldVersion < 2) { // For versions before 2 (i.e., when routes store was added)
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

export async function addWaypoint(
  waypointData: Omit<Waypoint, "id" | "createdAt">
): Promise<number> {
  const db = await openWaypointsDB();
  const waypoint: Omit<Waypoint, "id"> = {
    name: waypointData.name,
    latitude: waypointData.latitude,
    longitude: waypointData.longitude,
    altitude: waypointData.altitude,
    notes: waypointData.notes,
    imageDataUrl: waypointData.imageDataUrl, // Add imageDataUrl
    createdAt: Date.now(),
  };
  // The `add` method returns the key of the added record.
  const id = await db.add(STORE_NAME_WAYPOINTS, waypoint as Waypoint); // Cast to Waypoint because autoincrement handles 'id'
  return Number(id); // Ensure it's a number, as IDBKey can be other types.
}

export async function getSavedWaypoints(): Promise<Waypoint[]> {
  const db = await openWaypointsDB();
  return db.getAllFromIndex(STORE_NAME_WAYPOINTS, "createdAt");
}

export async function updateWaypoint(
  id: number,
  updates: WaypointUpdate
): Promise<Waypoint> {
  const db = await openWaypointsDB();
  const waypoint = await db.get(STORE_NAME_WAYPOINTS, id);

  if (!waypoint) {
    throw new Error(`Waypoint with id ${id} not found`);
  }

  // Update only the provided fields
  const updatedWaypoint = { ...waypoint };
  if (updates.name !== undefined) {
    updatedWaypoint.name = updates.name;
  }
  if (updates.altitude !== undefined && updates.altitude !== null) {
    updatedWaypoint.altitude = updates.altitude;
  }
  if (updates.altitude === null) {
    updatedWaypoint.altitude = undefined;
  }
  if (updates.notes !== undefined) {
    updatedWaypoint.notes = updates.notes;
  }
  if (updates.imageDataUrl === null) {
    // Add this block
    updatedWaypoint.imageDataUrl = undefined;
  }
  if (updates.imageDataUrl !== undefined && updates.imageDataUrl !== null) {
    // Add this block
    updatedWaypoint.imageDataUrl = updates.imageDataUrl;
  }

  await db.put(STORE_NAME_WAYPOINTS, updatedWaypoint);
  return updatedWaypoint;
}

export async function getWaypointById(
  id: number
): Promise<Waypoint | undefined> {
  const db = await openWaypointsDB();
  return db.get(STORE_NAME_WAYPOINTS, id);
}

export async function deleteWaypoint(id: number): Promise<void> {
  const db = await openWaypointsDB();
  await db.delete(STORE_NAME_WAYPOINTS, id);
}

export async function clearAllWaypoints(): Promise<void> {
  const db = await openWaypointsDB();
  await db.clear(STORE_NAME_WAYPOINTS);
}

export function waypointsToGeoJSON(
  waypoints: Waypoint[]
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = waypoints.map(
    (waypoint) => {
      const coordinates: GeoJSON.Position = waypoint.altitude !== undefined
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
      if (waypoint.altitude !== undefined) {
        feature.properties.altitude = waypoint.altitude;
      }
      if (waypoint.notes !== undefined) {
        feature.properties.notes = waypoint.notes;
      }
      if (waypoint.imageDataUrl !== undefined) {
        // Add this block
        feature.properties.imageDataUrl = waypoint.imageDataUrl;
      }
      return feature;
    }
  );

  return {
    type: "FeatureCollection",
    features: features,
  };
}
