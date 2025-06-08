import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Waypoint {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: number;
}

interface WaypointsDBSchema extends DBSchema {
  waypoints: {
    key: number;
    value: Waypoint;
    indexes: { 'createdAt': number };
  };
}

const DB_NAME = 'waypoints-db';
const DB_VERSION = 1;
const STORE_NAME = 'waypoints';

async function openWaypointsDB(): Promise<IDBPDatabase<WaypointsDBSchema>> {
  return openDB<WaypointsDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('createdAt', 'createdAt');
      }
    },
  });
}

export async function addWaypoint(waypointData: Omit<Waypoint, 'id' | 'createdAt'>): Promise<number> {
  const db = await openWaypointsDB();
  const waypoint: Omit<Waypoint, 'id'> = {
    ...waypointData,
    createdAt: Date.now(),
  };
  // The `add` method returns the key of the added record.
  const id = await db.add(STORE_NAME, waypoint as Waypoint); // Cast to Waypoint because autoincrement handles 'id'
  return Number(id); // Ensure it's a number, as IDBKey can be other types.
}

export async function getSavedWaypoints(): Promise<Waypoint[]> {
  const db = await openWaypointsDB();
  return db.getAllFromIndex(STORE_NAME, 'createdAt');
}
