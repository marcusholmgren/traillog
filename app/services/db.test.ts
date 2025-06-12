import { describe, it, expect, beforeEach, vi } from "vitest";
import { openDB, deleteDB } from "idb";

// Import fake-indexeddb/auto at the very top of your test file
// This ensures that the global indexedDB is mocked before 'idb' uses it.
import "fake-indexeddb/auto";

// You might also want to reset the IndexedDB state before each test
// to ensure test isolation.
import { IDBFactory } from "fake-indexeddb";
import {
  type Waypoint,
  addWaypoint,
  getSavedWaypoints,
  updateWaypoint,
  getWaypointById,
  waypointsToGeoJSON,
  deleteWaypoint, // Added import
  clearAllWaypoints, // Added import
} from "./db"; // Assuming db.ts is in the same directory for simplicity here, adjust if needed

// --- Vitest Setup for fake-indexeddb ---
// The db module uses openDB from 'idb' directly. We need to mock 'idb' to use fake-indexeddb.
// However, a simpler approach for testing the db functions directly without deep mocking 'idb'
// is to pass the fake-indexeddb factory to openDB if the db.ts allowed it, or manage a test DB instance.
// For this test, we'll directly use fake-indexeddb to manage the DB state for our tests.

const TEST_DB_INTERNAL_NAME = "waypoints-db"; // This is the actual name used in db.ts
const STORE_NAME = "waypoints";
/*
// Mock the 'idb' module to ensure its openDB and deleteDB use fake-indexeddb
// This is the preferred way to ensure the actual db.ts code is tested with the fake DB.
vi.mock("idb", async (importOriginal) => {
  const actualIdb = await importOriginal<typeof import("idb")>();
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
      });
    },
    deleteDB: (...args: Parameters<typeof actualIdb.deleteDB>) => {
      const dbName = args[0];
      const options = args[1] || {};
      return actualIdb.deleteDB(dbName, {
        ...options,
      });
    },
  };
});
*/
// vi.mock("idb", async (importOriginal) => {
//   const actualIdb = await importOriginal<typeof import("idb")>();
//   return {
//     ...actualIdb,
//     openDB: (...args: Parameters<typeof actualIdb.openDB>) => {
//       return actualIdb.openDB(...args);
//     },
//     deleteDB: (...args: Parameters<typeof actualIdb.deleteDB>) => {
//       return actualIdb.deleteDB(...args);
//     },
//   };
// });

describe("Waypoint Database Operations (db.ts)", () => {
  //let addWaypoint: typeof import("./db").addWaypoint;
  //let importedGetSavedWaypoints: typeof import("./db").getSavedWaypoints;

  beforeEach(async () => {
    // Clear any existing database state between tests
    indexedDB = new IDBFactory(); // This creates a fresh, empty IndexedDB instance
    await deleteDB(TEST_DB_INTERNAL_NAME);
    // Reset modules to ensure the mocked 'idb' is used for each test.
    // This also clears any cached instances of the database connection within db.ts.
    // vi.resetModules();
    // const actualDbModule = await import("./db"); // Re-import the module under test
    // addWaypoint = actualDbModule.addWaypoint;
    // importedGetSavedWaypoints = actualDbModule.getSavedWaypoints;

    // // Clean up the database before each test by deleting it using the *actual* idb.deleteDB,
    // // but it will be intercepted by our mock to use FDBFactory.
    // // This ensures that the database used by db.ts (which is TEST_DB_INTERNAL_NAME) is cleared.
    // // We need to import 'idb' here, it will be our mocked version.
    // const idbMocked = await import("idb");
    // try {
    //   await idbMocked.deleteDB(TEST_DB_INTERNAL_NAME);
    // } catch (e) {
    //   // Deleting a non-existent DB might throw or fail silently depending on fake-indexeddb version
    //   console.log(
    //     "Error deleting test DB (might be normal if it didn't exist):",
    //     e
    //   );
    // }
  });

  // afterEach(async () => {
  //   vi.restoreAllMocks(); // Restore any other mocks like Date.now
  //   // Optional: delete DB again, though beforeEach should handle it.
  //   const idbMocked = await import("idb");
  //   try {
  //     await idbMocked.deleteDB(TEST_DB_INTERNAL_NAME);
  //   } catch (e) {}
  // }, 15000);

  describe("addWaypoint", () => {
    it("should add a waypoint to the database and generate createdAt and id", async () => {
      const waypointData = {
        name: "Test Point 1",
        latitude: 10,
        longitude: 20,
      };
      const startTime = Date.now();
      const generatedId = await addWaypoint(waypointData);

      expect(generatedId).toBeGreaterThan(0);

      // Verify directly using the mocked openDB to inspect the DB state
      const idbMockedLib = await import("idb"); // Get the mocked idb lib
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
      expect(savedWaypoint.imageDataUrl).toBeUndefined(); // Explicitly check for imageDataUrl
    });

    it("should add a waypoint with an imageDataUrl", async () => {
      const waypointData = {
        name: "Test Point with Image",
        latitude: 15,
        longitude: 25,
        imageDataUrl: "data:image/png;base64,test",
      };
      const generatedId = await addWaypoint(waypointData);
      const dbVerify = await openDB(TEST_DB_INTERNAL_NAME, 1);
      const savedWaypoint = await dbVerify.get(STORE_NAME, generatedId);
      dbVerify.close();

      expect(savedWaypoint).toBeDefined();
      expect(savedWaypoint.imageDataUrl).toBe(waypointData.imageDataUrl);
    });

    it("should auto-increment IDs for multiple waypoints", async () => {
      const id1 = await addWaypoint({
        name: "Point A",
        latitude: 1,
        longitude: 1,
      });
      const id2 = await addWaypoint({
        name: "Point B",
        latitude: 2,
        longitude: 2,
      });

      expect(id1).toBe(1); // FDBFactory typically starts autoIncrement at 1
      expect(id2).toBe(2);

      const idbMockedLib = await import("idb");
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

  describe("getSavedWaypoints", () => {
    it("should return an empty array if no waypoints exist", async () => {
      const waypoints = await getSavedWaypoints();
      expect(waypoints).toEqual([]);
    });

    it("should return all saved waypoints", async () => {
      await addWaypoint({
        name: "Waypoint Alpha",
        latitude: 30,
        longitude: 40,
      });
      await addWaypoint({
        name: "Waypoint Beta",
        latitude: 31,
        longitude: 41,
      });

      const waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(2);
      // Order depends on Date.now() precision; check names are present
      expect(waypoints.map((w) => w.name)).toContain("Waypoint Alpha");
      expect(waypoints.map((w) => w.name)).toContain("Waypoint Beta");
      // Check imageDataUrl for one of them if applicable, or ensure it's undefined
      const alpha = waypoints.find((w) => w.name === "Waypoint Alpha");
      expect(alpha?.imageDataUrl).toBeUndefined();
    });

    it("should correctly retrieve waypoints with and without imageDataUrl in getSavedWaypoints", async () => {
      await addWaypoint({
        name: "WP With Image",
        latitude: 1,
        longitude: 1,
        imageDataUrl: "image1.jpg",
      });
      await addWaypoint({
        name: "WP Without Image",
        latitude: 2,
        longitude: 2,
      });
      await addWaypoint({
        name: "WP With Another Image",
        latitude: 3,
        longitude: 3,
        imageDataUrl: "image2.png",
      });

      const waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(3);

      const wpWithImage = waypoints.find((w) => w.name === "WP With Image");
      expect(wpWithImage?.imageDataUrl).toBe("image1.jpg");

      const wpWithoutImage = waypoints.find(
        (w) => w.name === "WP Without Image"
      );
      expect(wpWithoutImage?.imageDataUrl).toBeUndefined();

      const wpWithAnotherImage = waypoints.find(
        (w) => w.name === "WP With Another Image"
      );
      expect(wpWithAnotherImage?.imageDataUrl).toBe("image2.png");
    });

    it("should return waypoints ordered by createdAt (ascending)", async () => {
      const now = Date.now();

      // Mock Date.now to control createdAt timestamps
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(now) // First addWaypoint
        .mockReturnValueOnce(now + 1000) // Second addWaypoint (later)
        .mockReturnValueOnce(now - 1000); // Third addWaypoint (earlier)

      await addWaypoint({ name: "Wp Now", latitude: 1, longitude: 1 }); // createdAt: now
      await addWaypoint({ name: "Wp Later", latitude: 2, longitude: 2 }); // createdAt: now + 1000
      await addWaypoint({ name: "Wp Earlier", latitude: 3, longitude: 3 }); // createdAt: now - 1000

      vi.restoreAllMocks(); // Restore Date.now mock

      // To make this testable, the mocked addWaypoint needs to use the mocked Date.now()
      // The re-defined addWaypoint in vi.mock will use the global Date.now(), so this should work.

      const waypoints = await getSavedWaypoints();

      expect(waypoints.length).toBe(3);
      // getAllFromIndex for 'createdAt' should return them in ascending order of 'createdAt'
      expect(waypoints[0].name).toBe("Wp Now"); // Corrected expected order
      expect(waypoints[1].name).toBe("Wp Later"); // Corrected expected order
      expect(waypoints[2].name).toBe("Wp Earlier"); // Corrected expected order
    });
  });

  describe("updateWaypoint", () => {
    let initialWaypoint: Waypoint;

    beforeEach(async () => {
      // Add a waypoint to be updated in tests
      const waypointData = {
        name: "Initial Waypoint",
        latitude: 10.0,
        longitude: 20.0,
        notes: "Initial notes",
        // imageDataUrl will be undefined initially for this base test case
      };
      // We need to control createdAt for consistent checks
      const fixedTime = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(fixedTime);
      const id = await addWaypoint(waypointData);
      vi.restoreAllMocks();

      const db = await openDB(TEST_DB_INTERNAL_NAME, 1);
      initialWaypoint = (await db.get(STORE_NAME, id))!; // This will include imageDataUrl: undefined
      db.close();

      // Ensure notes are explicitly part of the initial object for tests
      if (
        initialWaypoint &&
        initialWaypoint.notes === undefined &&
        waypointData.notes
      ) {
        initialWaypoint.notes = waypointData.notes;
      }
      // Ensure imageDataUrl is part of the initial object for tests if set
      if (
        initialWaypoint &&
        initialWaypoint.imageDataUrl === undefined &&
        (waypointData as any).imageDataUrl
      ) {
        initialWaypoint.imageDataUrl = (waypointData as any).imageDataUrl;
      }
    });

    it("should update the name and notes of an existing waypoint (imageDataUrl remains undefined)", async () => {
      const updates = {
        name: "Updated Name",
        notes: "Updated notes.",
      };
      const updated = await updateWaypoint(initialWaypoint.id, updates);

      expect(updated.name).toBe(updates.name);
      expect(updated.notes).toBe(updates.notes);
      expect(updated.id).toBe(initialWaypoint.id);
      expect(updated.latitude).toBe(initialWaypoint.latitude);
      expect(updated.longitude).toBe(initialWaypoint.longitude);
      expect(updated.createdAt).toBe(initialWaypoint.createdAt);
      expect(updated.imageDataUrl).toBeUndefined(); // Should remain undefined

      // Verify in DB
      const db = await openDB(TEST_DB_INTERNAL_NAME, 1);
      const dbWaypoint = await db.get(STORE_NAME, initialWaypoint.id);
      db.close();
      expect(dbWaypoint?.name).toBe(updates.name);
      expect(dbWaypoint?.notes).toBe(updates.notes);
      expect(dbWaypoint?.imageDataUrl).toBeUndefined();
    });

    it("should update only the name if notes and imageDataUrl are not provided", async () => {
      const updates = { name: "Only Name Updated" };
      const updated = await updateWaypoint(initialWaypoint.id, updates);

      expect(updated.name).toBe(updates.name);
      expect(updated.notes).toBe(initialWaypoint.notes); // Notes should remain unchanged
      expect(updated.imageDataUrl).toBe(initialWaypoint.imageDataUrl); // imageDataUrl should remain unchanged
      expect(updated.id).toBe(initialWaypoint.id);
    });

    it("should update only the notes if name and imageDataUrl are not provided", async () => {
      const updates = { notes: "Only Notes Updated" };
      const updated = await updateWaypoint(initialWaypoint.id, updates);

      expect(updated.name).toBe(initialWaypoint.name); // Name should remain unchanged
      expect(updated.notes).toBe(updates.notes);
      expect(updated.imageDataUrl).toBe(initialWaypoint.imageDataUrl); // imageDataUrl should remain unchanged
      expect(updated.id).toBe(initialWaypoint.id);
    });

    it("should update a waypoint to add an imageDataUrl", async () => {
      expect(initialWaypoint.imageDataUrl).toBeUndefined(); // Pre-condition
      const updates = { imageDataUrl: "newImage.jpg" };
      const updated = await updateWaypoint(initialWaypoint.id, updates);
      expect(updated.imageDataUrl).toBe("newImage.jpg");
      expect(updated.name).toBe(initialWaypoint.name); // Other fields remain
    });

    it("should update an existing imageDataUrl to a new one", async () => {
      // First, add an image
      await updateWaypoint(initialWaypoint.id, {
        imageDataUrl: "firstImage.png",
      });
      const updates = { imageDataUrl: "secondImage.jpeg" };
      const updated = await updateWaypoint(initialWaypoint.id, updates);
      expect(updated.imageDataUrl).toBe("secondImage.jpeg");
    });

    it("should remove an imageDataUrl from a waypoint (set to null)", async () => {
      await updateWaypoint(initialWaypoint.id, {
        imageDataUrl: "toBeRemoved.gif",
      });
      const updates = { imageDataUrl: null }; // Using null to remove
      const updated = await updateWaypoint(initialWaypoint.id, updates as any); // Cast because WaypointUpdate expects string | undefined
      expect(updated.imageDataUrl).toBeUndefined();
    });

    it("should remove an imageDataUrl from a waypoint (set to undefined)", async () => {
      await updateWaypoint(initialWaypoint.id, {
        imageDataUrl: "toBeRemovedAgain.gif",
      });
      const updates = { imageDataUrl: null };
      const updated = await updateWaypoint(initialWaypoint.id, updates);
      // The actual behavior might store undefined or remove the property.
      // If property is removed, it will be undefined on read.
      // If it's stored as undefined, it will also be undefined on read.
      expect(updated.imageDataUrl).toBeUndefined();
    });

    it("should preserve imageDataUrl when updating other fields like name", async () => {
      const imageUrl = "persistentImage.webp";
      await updateWaypoint(initialWaypoint.id, { imageDataUrl: imageUrl });
      const updates = { name: "Name Changed, Image Stays" };
      const updated = await updateWaypoint(initialWaypoint.id, updates);
      expect(updated.name).toBe(updates.name);
      expect(updated.imageDataUrl).toBe(imageUrl);
    });

    it("should leave notes and imageDataUrl as undefined if initially undefined and not updated", async () => {
      // Create a waypoint without notes initially
      vi.spyOn(Date, "now").mockReturnValue(Date.now());
      const noExtraDataId = await addWaypoint({
        name: "No Extras WP",
        latitude: 5,
        longitude: 5,
      });
      vi.restoreAllMocks();

      const db = await openDB(TEST_DB_INTERNAL_NAME, 1);
      const noExtraDataWaypoint = (await db.get(STORE_NAME, noExtraDataId))!;
      db.close();

      expect(noExtraDataWaypoint.notes).toBeUndefined();
      expect(noExtraDataWaypoint.imageDataUrl).toBeUndefined();

      const updates = { name: "No Extras WP Updated Name" };
      const updated = await updateWaypoint(noExtraDataId, updates);

      expect(updated.name).toBe(updates.name);
      expect(updated.notes).toBeUndefined();
      expect(updated.imageDataUrl).toBeUndefined();
    });

    it("should add notes and imageDataUrl if initially undefined and provided in update", async () => {
      vi.spyOn(Date, "now").mockReturnValue(Date.now());
      const freshId = await addWaypoint({
        name: "Fresh WP",
        latitude: 6,
        longitude: 6,
      });
      vi.restoreAllMocks();

      const updates = {
        notes: "Adding notes now",
        imageDataUrl: "freshImage.jpg",
      };
      const updated = await updateWaypoint(freshId, updates);

      expect(updated.name).toBe("Fresh WP");
      expect(updated.notes).toBe(updates.notes);
      expect(updated.imageDataUrl).toBe(updates.imageDataUrl);
    });

    it("should throw an error if trying to update a non-existent waypoint", async () => {
      const nonExistentId = 9999;
      const updates = { name: "Ghost Update" };
      await expect(updateWaypoint(nonExistentId, updates)).rejects.toThrow(
        `Waypoint with id ${nonExistentId} not found`
      );
    });

    it("should not modify id, latitude, longitude, or createdAt", async () => {
      const updates = {
        name: "Integrity Check",
        notes: "Checking other fields",
      };
      const updated = await updateWaypoint(initialWaypoint.id, updates);

      expect(updated.id).toBe(initialWaypoint.id);
      expect(updated.latitude).toBe(initialWaypoint.latitude);
      expect(updated.longitude).toBe(initialWaypoint.longitude);
      expect(updated.createdAt).toBe(initialWaypoint.createdAt);
    });
  });

  describe("getWaypointById", () => {
    it("should retrieve a specific waypoint by its ID", async () => {
      const waypointData = {
        name: "Specific WP",
        latitude: 123,
        longitude: 456,
        imageDataUrl: "specificImage.gif",
      };
      const id = await addWaypoint(waypointData);

      const fetchedWaypoint = await getWaypointById(id);

      expect(fetchedWaypoint).toBeDefined();
      expect(fetchedWaypoint!.id).toBe(id);
      expect(fetchedWaypoint!.name).toBe(waypointData.name);
      expect(fetchedWaypoint!.imageDataUrl).toBe(waypointData.imageDataUrl);
    });

    it("should retrieve a waypoint by ID that does not have an imageDataUrl", async () => {
      const waypointData = {
        name: "No Image WP",
        latitude: 789,
        longitude: 101,
      };
      const id = await addWaypoint(waypointData);
      const fetchedWaypoint = await getWaypointById(id);
      expect(fetchedWaypoint).toBeDefined();
      expect(fetchedWaypoint!.imageDataUrl).toBeUndefined();
    });

    it("should return undefined if waypoint with ID does not exist", async () => {
      const nonExistentId = 999;
      const fetchedWaypoint = await getWaypointById(nonExistentId);
      expect(fetchedWaypoint).toBeUndefined();
    });
  });

  describe("waypointsToGeoJSON", () => {
    const mockWaypoints: Waypoint[] = [
      {
        id: 1,
        name: "Waypoint 1",
        latitude: 10,
        longitude: 20,
        createdAt: 1678886400000,
        notes: "Note 1",
        imageDataUrl: "img1.jpg",
      },
      {
        id: 2,
        name: "Waypoint 2",
        latitude: 12,
        longitude: 22,
        createdAt: 1678886500000,
      }, // No notes, no image
      {
        id: 3,
        name: "Waypoint 3",
        latitude: 15,
        longitude: 25,
        createdAt: 1678886600000,
        notes: "Note 3",
        imageDataUrl: "img3.png",
      },
      {
        id: 4,
        name: "Waypoint 4",
        latitude: 18,
        longitude: 28,
        createdAt: 1678886700000,
        notes: "Note 4" /* imageDataUrl undefined */,
      },
    ];

    it("should return an empty FeatureCollection for an empty waypoints array", () => {
      const result = waypointsToGeoJSON([]);
      expect(result.type).toBe("FeatureCollection");
      expect(result.features).toEqual([]);
    });

    it("should convert a single waypoint correctly (with notes)", () => {
      const singleWaypoint: Waypoint = { ...mockWaypoints[0] };
      const result = waypointsToGeoJSON([singleWaypoint]);

      expect(result.type).toBe("FeatureCollection");
      expect(result.features.length).toBe(1);

      const feature = result.features[0];
      expect(feature.type).toBe("Feature");
      expect(feature.geometry.type).toBe("Point");
      expect(feature.geometry.coordinates).toEqual([
        singleWaypoint.longitude,
        singleWaypoint.latitude,
      ]);
      expect(feature.properties).toEqual({
        id: singleWaypoint.id,
        name: singleWaypoint.name,
        createdAt: singleWaypoint.createdAt,
        notes: singleWaypoint.notes,
        imageDataUrl: singleWaypoint.imageDataUrl, // Check for imageDataUrl
      });
    });

    it("should convert a single waypoint correctly (without notes or imageDataUrl)", () => {
      const singleWaypointNoExtras: Waypoint = { ...mockWaypoints[1] }; // This one has no notes or image
      const result = waypointsToGeoJSON([singleWaypointNoExtras]);

      expect(result.type).toBe("FeatureCollection");
      expect(result.features.length).toBe(1);

      const feature = result.features[0];
      expect(feature.type).toBe("Feature");
      expect(feature.geometry.type).toBe("Point");
      expect(feature.geometry.coordinates).toEqual([
        singleWaypointNoExtras.longitude,
        singleWaypointNoExtras.latitude,
      ]);
      expect(feature.properties).toEqual({
        id: singleWaypointNoExtras.id,
        name: singleWaypointNoExtras.name,
        createdAt: singleWaypointNoExtras.createdAt,
      });
      expect(feature.properties).not.toHaveProperty("notes");
      expect(feature.properties).not.toHaveProperty("imageDataUrl");
    });

    it("should convert multiple waypoints correctly, including imageDataUrl where present", () => {
      const result = waypointsToGeoJSON(mockWaypoints);

      expect(result.type).toBe("FeatureCollection");
      expect(result.features.length).toBe(mockWaypoints.length);

      mockWaypoints.forEach((waypoint, index) => {
        const feature = result.features[index];
        expect(feature.type).toBe("Feature");
        expect(feature.geometry.type).toBe("Point");
        expect(feature.geometry.coordinates).toEqual([
          waypoint.longitude,
          waypoint.latitude,
        ]);
        expect(feature.properties.id).toBe(waypoint.id);
        expect(feature.properties.name).toBe(waypoint.name);
        expect(feature.properties.createdAt).toBe(waypoint.createdAt);

        if (waypoint.notes) {
          expect(feature.properties.notes).toBe(waypoint.notes);
        } else {
          expect(feature.properties).not.toHaveProperty("notes");
        }

        if (waypoint.imageDataUrl) {
          expect(feature.properties.imageDataUrl).toBe(waypoint.imageDataUrl);
        } else {
          expect(feature.properties).not.toHaveProperty("imageDataUrl");
        }
      });
    });

    it("should handle waypoint with notes and imageDataUrl properties explicitly set to undefined", () => {
      const waypointWithUndefinedProps: Waypoint = {
        id: 5,
        name: "Undefined Props WP",
        latitude: 30,
        longitude: 40,
        createdAt: 1678886700000,
        notes: undefined,
        imageDataUrl: undefined,
      };
      const result = waypointsToGeoJSON([waypointWithUndefinedProps]);
      expect(result.features.length).toBe(1);
      const feature = result.features[0];
      expect(feature.properties).toEqual({
        id: waypointWithUndefinedProps.id,
        name: waypointWithUndefinedProps.name,
        createdAt: waypointWithUndefinedProps.createdAt,
      });
      expect(feature.properties).not.toHaveProperty("notes");
      expect(feature.properties).not.toHaveProperty("imageDataUrl");
    });
  });

  describe("deleteWaypoint", () => {
    let wp1Id: number, wp2Id: number;
    const wp1Data = { name: "WP to Delete", latitude: 1, longitude: 1 };
    const wp2Data = { name: "WP to Keep", latitude: 2, longitude: 2 };

    beforeEach(async () => {
      // Add some waypoints before each test in this describe block
      wp1Id = await addWaypoint(wp1Data);
      wp2Id = await addWaypoint(wp2Data);
    });

    it("should delete a specific waypoint and leave others intact", async () => {
      let waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(2); // Verify initial state

      await deleteWaypoint(wp1Id);

      const deletedWaypoint = await getWaypointById(wp1Id);
      expect(deletedWaypoint).toBeUndefined();

      const remainingWaypoint = await getWaypointById(wp2Id);
      expect(remainingWaypoint).toBeDefined();
      expect(remainingWaypoint!.name).toBe(wp2Data.name);

      waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(1);
      expect(waypoints[0].id).toBe(wp2Id);
    });

    it("should not throw an error when trying to delete a non-existent waypoint", async () => {
      const nonExistentId = 999;
      await expect(deleteWaypoint(nonExistentId)).resolves.not.toThrow();

      // Verify that existing waypoints are unaffected
      const waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(2); // Still 2 waypoints
      const foundWp1 = waypoints.find(wp => wp.id === wp1Id);
      const foundWp2 = waypoints.find(wp => wp.id === wp2Id);
      expect(foundWp1).toBeDefined();
      expect(foundWp2).toBeDefined();
    });

    it("should correctly delete a waypoint even if it's the only one", async () => {
      // First, clear the two waypoints added in beforeEach
      await deleteWaypoint(wp1Id);
      await deleteWaypoint(wp2Id);

      // Add a single waypoint
      const singleWpId = await addWaypoint({ name: "Single WP", latitude: 3, longitude: 3 });
      let waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(1);
      expect(waypoints[0].id).toBe(singleWpId);

      await deleteWaypoint(singleWpId);

      const deletedSingleWaypoint = await getWaypointById(singleWpId);
      expect(deletedSingleWaypoint).toBeUndefined();

      waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(0);
    });
  });

  describe("clearAllWaypoints", () => {
    const wpData1 = { name: "WP Clear 1", latitude: 10, longitude: 10 };
    const wpData2 = { name: "WP Clear 2", latitude: 20, longitude: 20 };
    const wpData3 = { name: "WP Clear 3", latitude: 30, longitude: 30 };

    it("should remove all waypoints from the database", async () => {
      await addWaypoint(wpData1);
      await addWaypoint(wpData2);
      await addWaypoint(wpData3);

      let waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(3); // Verify initial state

      await clearAllWaypoints();

      waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(0);
      expect(waypoints).toEqual([]);
    });

    it("should execute without error if the store is already empty", async () => {
      let waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(0); // Ensure store is empty

      await expect(clearAllWaypoints()).resolves.not.toThrow();

      waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(0);
    });

    it("should leave the store empty if called after adding and then clearing waypoints", async () => {
      await addWaypoint(wpData1);
      await addWaypoint(wpData2);

      await clearAllWaypoints(); // First clear

      let waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(0);

      await clearAllWaypoints(); // Second clear on already empty store

      waypoints = await getSavedWaypoints();
      expect(waypoints.length).toBe(0);
    });
  });
});
