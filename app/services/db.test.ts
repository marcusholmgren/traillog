import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { openDB, deleteDB, IDBPDatabase } from 'idb';
import FDBFactory from 'fake-indexeddb/lib/FDBFactory';
import { Waypoint, addWaypoint, getSavedWaypoints } from './db'; // Assuming db.ts is in the same directory for simplicity here, adjust if needed

// --- Vitest Setup for fake-indexeddb ---
// The db module uses openDB from 'idb' directly. We need to mock 'idb' to use fake-indexeddb.
// However, a simpler approach for testing the db functions directly without deep mocking 'idb'
// is to pass the fake-indexeddb factory to openDB if the db.ts allowed it, or manage a test DB instance.
// For this test, we'll directly use fake-indexeddb to manage the DB state for our tests.

const DB_NAME = 'waypoints-db-test'; // Use a separate test DB name
const STORE_NAME = 'waypoints';
let testDb: IDBPDatabase<any>; // Use 'any' for schema in test, or replicate WaypointsDBSchema

// Helper to initialize DB for tests
async function initTestDB() {
  // Important: Ensure fake-indexeddb is used by idb's openDB for these tests
  // This typically involves setting indexedDB to new FDBFactory() globally in a setup file or per test.
  // For Vitest, this can be done in a setupFile or at the top of the test file.
  // If db.ts internally calls openDB, we must ensure it uses the fake factory.
  // One way is to vi.mock('idb', async (importOriginal) => { ... }); see below.

// --- Vitest Setup for fake-indexeddb ---
// The db module uses openDB from 'idb' directly. We mock 'idb' to use fake-indexeddb.

const TEST_DB_INTERNAL_NAME = 'waypoints-db'; // This is the actual name used in db.ts
const STORE_NAME = 'waypoints'; // Actual store name used in db.ts
// let testDb: IDBPDatabase<any>; // Not needed with module-level mocking

// Mock the 'idb' module to ensure its openDB and deleteDB use fake-indexeddb
// This is the preferred way to ensure the actual db.ts code is tested with the fake DB.
vi.mock('idb', async (importOriginal) => {
  const actualIdb = await importOriginal<typeof import('idb')>();
  // Use a single factory instance for all DB operations in a test suite run if possible,
  // or a new one per open/delete if tests need strict isolation between openDB calls.
  // For simplicity here, a new factory for each call ensures max isolation.
  return {
    ...actualIdb,
    openDB: (...args: Parameters<typeof actualIdb.openDB>) => {
      const dbName = args[0];
      const version = args[1];
      const upgradeCallbackObj = args[2] || {};
      // Force fake factory for all openDB calls via the module under test
      return actualIdb.openDB(dbName, version, {
        ...upgradeCallbackObj,
        indexedDB: new FDBFactory(),
      });
    },
    deleteDB: (...args: Parameters<typeof actualIdb.deleteDB>) => {
      const dbName = args[0];
      const options = args[1] || {};
      return actualIdb.deleteDB(dbName, {
        ...options,
        indexedDB: new FDBFactory(),
      });
    }
  };
});


describe('Waypoint Database Operations (db.ts)', () => {
  let importedAddWaypoint: typeof import('./db').addWaypoint;
  let importedGetSavedWaypoints: typeof import('./db').getSavedWaypoints;

  beforeEach(async () => {
    // Reset modules to ensure the mocked 'idb' is used for each test.
    // This also clears any cached instances of the database connection within db.ts.
    vi.resetModules();
    const actualDbModule = await import('./db'); // Re-import the module under test
    importedAddWaypoint = actualDbModule.addWaypoint;
    importedGetSavedWaypoints = actualDbModule.getSavedWaypoints;

    // Clean up the database before each test by deleting it using the *actual* idb.deleteDB,
    // but it will be intercepted by our mock to use FDBFactory.
    // This ensures that the database used by db.ts (which is TEST_DB_INTERNAL_NAME) is cleared.
    // We need to import 'idb' here, it will be our mocked version.
    const idbMocked = await import('idb');
    try {
      await idbMocked.deleteDB(TEST_DB_INTERNAL_NAME);
    } catch (e) {
      // Deleting a non-existent DB might throw or fail silently depending on fake-indexeddb version
      // console.log("Error deleting test DB (might be normal if it didn't exist):", e);
    }
  });

  afterEach(async () => {
    vi.restoreAllMocks(); // Restore any other mocks like Date.now
    // Optional: delete DB again, though beforeEach should handle it.
    const idbMocked = await import('idb');
    try {
      await idbMocked.deleteDB(TEST_DB_INTERNAL_NAME);
    } catch (e) {}
  });

  describe('addWaypoint', () => {
    it('should add a waypoint to the database and generate createdAt and id', async () => {
      const waypointData = { name: 'Test Point 1', latitude: 10, longitude: 20 };
      const startTime = Date.now();
      const generatedId = await importedAddWaypoint(waypointData);

      expect(generatedId).toBeGreaterThan(0);

      // Verify directly using the mocked openDB to inspect the DB state
      const idbMockedLib = await import('idb'); // Get the mocked idb lib
      const dbVerify = await idbMockedLib.openDB(TEST_DB_INTERNAL_NAME, 1); // Version should match db.ts
      const savedWaypoint = await dbVerify.get(STORE_NAME, generatedId);
      dbVerify.close();

      expect(savedWaypoint).toBeDefined();
      expect(savedWaypoint.id).toEqual(generatedId);
      expect(savedWaypoint.name).toBe(waypointData.name);
      expect(savedWaypoint.latitude).toBe(waypointData.latitude);
      expect(savedWaypoint.longitude).toBe(waypointData.longitude);
      expect(savedWaypoint.createdAt).toBeGreaterThanOrEqual(startTime);
      expect(savedWaypoint.createdAt).toBeLessThanOrEqual(Date.now() + 100); // Added a small buffer for time check
    });

    it('should auto-increment IDs for multiple waypoints', async () => {
      const id1 = await importedAddWaypoint({ name: 'Point A', latitude: 1, longitude: 1 });
      const id2 = await importedAddWaypoint({ name: 'Point B', latitude: 2, longitude: 2 });

      expect(id1).toBe(1); // FDBFactory typically starts autoIncrement at 1
      expect(id2).toBe(2);

      const idbMockedLib = await import('idb');
      const dbVerify = await idbMockedLib.openDB(TEST_DB_INTERNAL_NAME, 1);
      const wp1 = await dbVerify.get(STORE_NAME, id1);
      const wp2 = await dbVerify.get(STORE_NAME, id2);
      dbVerify.close();

      expect(wp1).toBeDefined();
      expect(wp1!.id).toBe(id1);
      expect(wp2).toBeDefined();
      expect(wp2!.id).toBe(id2);
    });
  });

  describe('getSavedWaypoints', () => {
    it('should return an empty array if no waypoints exist', async () => {
      const waypoints = await importedGetSavedWaypoints();
      expect(waypoints).toEqual([]);
    });

    it('should return all saved waypoints', async () => {
      await importedAddWaypoint({ name: 'Waypoint Alpha', latitude: 30, longitude: 40 });
      await importedAddWaypoint({ name: 'Waypoint Beta', latitude: 31, longitude: 41 });

      const waypoints = await importedGetSavedWaypoints();
      expect(waypoints.length).toBe(2);
      // Order depends on Date.now() precision; check names are present
      expect(waypoints.map(w => w.name)).toContain('Waypoint Alpha');
      expect(waypoints.map(w => w.name)).toContain('Waypoint Beta');
    });

    it('should return waypoints ordered by createdAt (ascending)', async () => {
      const now = Date.now();

      // Mock Date.now to control createdAt timestamps
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(now)        // First addWaypoint
        .mockReturnValueOnce(now + 1000) // Second addWaypoint (later)
        .mockReturnValueOnce(now - 1000); // Third addWaypoint (earlier)

      await addWaypoint({ name: 'Wp Now', latitude: 1, longitude: 1 }); // createdAt: now
      await addWaypoint({ name: 'Wp Later', latitude: 2, longitude: 2 }); // createdAt: now + 1000
      await addWaypoint({ name: 'Wp Earlier', latitude: 3, longitude: 3 }); // createdAt: now - 1000

      vi.restoreAllMocks(); // Restore Date.now mock

      // To make this testable, the mocked addWaypoint needs to use the mocked Date.now()
      // The re-defined addWaypoint in vi.mock will use the global Date.now(), so this should work.

      const waypoints = await getSavedWaypoints();

      expect(waypoints.length).toBe(3);
      // getAllFromIndex for 'createdAt' should return them in ascending order of 'createdAt'
      expect(waypoints[0].name).toBe('Wp Earlier');
      expect(waypoints[1].name).toBe('Wp Now');
      expect(waypoints[2].name).toBe('Wp Later');
    });
  });
});
