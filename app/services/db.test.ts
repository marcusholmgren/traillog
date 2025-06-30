import { describe, it, expect, beforeEach, vi } from "vitest";
import { openDB } from "idb";
import { IDBFactory } from "fake-indexeddb";
import * as db from "./db";
import type { Waypoint } from "./db";

// Mock the global indexedDB with fake-indexeddb and restore mocks before each test
beforeEach(() => {
  indexedDB = new IDBFactory();
  vi.restoreAllMocks();
});

// This constant is based on the implementation detail in db.ts
const TEST_DB_INTERNAL_NAME = "traillog-db";

describe("Waypoint Database Operations (db.ts)", () => {
  // A sample waypoint for testing, matching the WaypointPayload structure
  const sampleWaypoint: Omit<Waypoint, "id" | "createdAt"> = {
    latitude: 40.7128,
    longitude: -74.006,
    name: "New York City",
    notes: "The Big Apple",
  };

  describe("addWaypoint", () => {
    it("should add a waypoint to the database and generate createdAt and id", async () => {
      const id = await db.addWaypoint(sampleWaypoint);
      expect(id).toBeTypeOf("number");

      const savedWaypoint = await db.getWaypointById(id);
      expect(savedWaypoint).toBeDefined();
      expect(savedWaypoint?.id).toBe(id);
      expect(savedWaypoint?.name).toBe(sampleWaypoint.name);
      expect(savedWaypoint?.createdAt).toBeTypeOf("number");
    });

    it("should add a waypoint with altitude", async () => {
      const waypointWithAltitude = { ...sampleWaypoint, altitude: 500 };
      const id = await db.addWaypoint(waypointWithAltitude);
      const savedWaypoint = await db.getWaypointById(id);
      expect(savedWaypoint?.altitude).toBe(500);
    });

    it("should add a waypoint with an imageDataUrl", async () => {
      const waypointWithImage = {
        ...sampleWaypoint,
        imageDataUrl: "data:image/png;base64,...",
      };
      const id = await db.addWaypoint(waypointWithImage);
      const savedWaypoint = await db.getWaypointById(id);
      expect(savedWaypoint?.imageDataUrl).toBe("data:image/png;base64,...");
    });

    it("should auto-increment IDs for multiple waypoints", async () => {
      const id1 = await db.addWaypoint({
        ...sampleWaypoint,
        name: "Waypoint 1",
      });
      const id2 = await db.addWaypoint({
        ...sampleWaypoint,
        name: "Waypoint 2",
      });
      expect(id1).toBe(1);
      expect(id2).toBe(2);
    });
  });

  describe("getSavedWaypoints", () => {
    it("should return an empty array if no waypoints exist", async () => {
      const waypoints = await db.getSavedWaypoints();
      expect(waypoints).toEqual([]);
    });

    it("should return all saved waypoints", async () => {
      await db.addWaypoint({ ...sampleWaypoint, name: "W1" });
      await db.addWaypoint({ ...sampleWaypoint, name: "W2" });
      const waypoints = await db.getSavedWaypoints();
      expect(waypoints.length).toBe(2);
    });

    it("should correctly retrieve waypoints with and without imageDataUrl in getSavedWaypoints", async () => {
      await db.addWaypoint({
        ...sampleWaypoint,
        name: "W1",
        imageDataUrl: "data:image/png;base64,...",
      });
      await db.addWaypoint({ ...sampleWaypoint, name: "W2" });
      const waypoints = await db.getSavedWaypoints();
      // Note: getSavedWaypoints sorts by date, so we check properties, not order
      const w1 = waypoints.find((w) => w.name === "W1");
      const w2 = waypoints.find((w) => w.name === "W2");
      expect(w1?.imageDataUrl).toBe("data:image/png;base64,...");
      expect(w2?.imageDataUrl).toBeUndefined();
    });

    it("should return waypoints ordered by createdAt (descending)", async () => {
      vi.spyOn(Date, "now")
        .mockReturnValueOnce(1000) // W-Older
        .mockReturnValueOnce(2000); // W-Newer

      await db.addWaypoint({ ...sampleWaypoint, name: "W-Older" });
      await db.addWaypoint({ ...sampleWaypoint, name: "W-Newer" });

      const waypoints = await db.getSavedWaypoints();
      expect(waypoints.length).toBe(2);
      // The implementation returns newest first (descending order)
      expect(waypoints[0].name).toBe("W-Newer");
      expect(waypoints[1].name).toBe("W-Older");
    });
  });

  describe("updateWaypoint", () => {
    let waypointId: number;
    beforeEach(async () => {
      waypointId = await db.addWaypoint(sampleWaypoint);
    });

    it("should update the name and notes of an existing waypoint (imageDataUrl remains undefined)", async () => {
      const updates = { name: "Updated Name", notes: "Updated Notes" };
      await db.updateWaypoint(waypointId, updates);
      const updatedWaypoint = await db.getWaypointById(waypointId);
      expect(updatedWaypoint?.name).toBe("Updated Name");
      expect(updatedWaypoint?.notes).toBe("Updated Notes");
      expect(updatedWaypoint?.imageDataUrl).toBeUndefined();
    });

    it("should update only the name if notes and imageDataUrl are not provided", async () => {
      await db.updateWaypoint(waypointId, { name: "Just Name" });
      const updatedWaypoint = await db.getWaypointById(waypointId);
      expect(updatedWaypoint?.name).toBe("Just Name");
      expect(updatedWaypoint?.notes).toBe(sampleWaypoint.notes);
    });

    it("should update only the notes if name and imageDataUrl are not provided", async () => {
      await db.updateWaypoint(waypointId, { notes: "Just Notes" });
      const updatedWaypoint = await db.getWaypointById(waypointId);
      expect(updatedWaypoint?.name).toBe(sampleWaypoint.name);
      expect(updatedWaypoint?.notes).toBe("Just Notes");
    });

    it("should update a waypoint to add an imageDataUrl", async () => {
      await db.updateWaypoint(waypointId, { imageDataUrl: "data:..." });
      const updatedWaypoint = await db.getWaypointById(waypointId);
      expect(updatedWaypoint?.imageDataUrl).toBe("data:...");
    });

    it("should update an existing imageDataUrl to a new one", async () => {
      const idWithImage = await db.addWaypoint({
        ...sampleWaypoint,
        imageDataUrl: "data:old",
      });
      await db.updateWaypoint(idWithImage, { imageDataUrl: "data:new" });
      const updatedWaypoint = await db.getWaypointById(idWithImage);
      expect(updatedWaypoint?.imageDataUrl).toBe("data:new");
    });

    it("should remove an imageDataUrl from a waypoint (set to null)", async () => {
      const idWithImage = await db.addWaypoint({
        ...sampleWaypoint,
        imageDataUrl: "data:image",
      });
      await db.updateWaypoint(idWithImage, { imageDataUrl: null });
      const updatedWaypoint = await db.getWaypointById(idWithImage);
      expect(updatedWaypoint?.imageDataUrl).toBeUndefined();
    });

    it("should not change an existing imageDataUrl when update value is undefined", async () => {
      const idWithImage = await db.addWaypoint({
        ...sampleWaypoint,
        imageDataUrl: "data:image",
      });
      // An undefined value in the update payload should not change the existing value
      await db.updateWaypoint(idWithImage, {
        name: "new name",
        imageDataUrl: undefined,
      });
      const updatedWaypoint = await db.getWaypointById(idWithImage);
      expect(updatedWaypoint?.imageDataUrl).toBe("data:image");
    });

    it("should preserve imageDataUrl when updating other fields like name", async () => {
      const idWithImage = await db.addWaypoint({
        ...sampleWaypoint,
        imageDataUrl: "data:image",
      });
      await db.updateWaypoint(idWithImage, { name: "New Name" });
      const updatedWaypoint = await db.getWaypointById(idWithImage);
      expect(updatedWaypoint?.imageDataUrl).toBe("data:image");
    });

    it("should leave notes and imageDataUrl as undefined if initially undefined and not updated", async () => {
      const bareWaypoint = { latitude: 1, longitude: 1 };
      const id = await db.addWaypoint(bareWaypoint);
      await db.updateWaypoint(id, { name: "A Name" });
      const updatedWaypoint = await db.getWaypointById(id);
      expect(updatedWaypoint?.name).toBe("A Name");
      expect(updatedWaypoint?.notes).toBeUndefined();
      expect(updatedWaypoint?.imageDataUrl).toBeUndefined();
    });

    it("should add notes and imageDataUrl if initially undefined and provided in update", async () => {
      const bareWaypoint = { latitude: 1, longitude: 1 };
      const id = await db.addWaypoint(bareWaypoint);
      await db.updateWaypoint(id, {
        notes: "new notes",
        imageDataUrl: "data:...",
      });
      const updatedWaypoint = await db.getWaypointById(id);
      expect(updatedWaypoint?.notes).toBe("new notes");
      expect(updatedWaypoint?.imageDataUrl).toBe("data:...");
    });

    it("should throw an error if trying to update a non-existent waypoint", async () => {
      await expect(db.updateWaypoint(999, { name: "ghost" })).rejects.toThrow(
        "Waypoint with id 999 not found"
      );
    });

    it("should not modify id, latitude, longitude, or createdAt", async () => {
      const originalWaypoint = await db.getWaypointById(waypointId);
      await db.updateWaypoint(waypointId, { name: "changed" });
      const updatedWaypoint = await db.getWaypointById(waypointId);
      expect(updatedWaypoint?.id).toBe(originalWaypoint?.id);
      expect(updatedWaypoint?.latitude).toBe(originalWaypoint?.latitude);
      expect(updatedWaypoint?.longitude).toBe(originalWaypoint?.longitude);
      expect(updatedWaypoint?.createdAt).toBe(originalWaypoint?.createdAt);
    });

    it("should add altitude to a waypoint that doesn't have it", async () => {
      await db.updateWaypoint(waypointId, { altitude: 100 });
      const updatedWaypoint = await db.getWaypointById(waypointId);
      expect(updatedWaypoint?.altitude).toBe(100);
    });

    it("should update an existing altitude", async () => {
      const idWithAlt = await db.addWaypoint({
        ...sampleWaypoint,
        altitude: 100,
      });
      await db.updateWaypoint(idWithAlt, { altitude: 200 });
      const updatedWaypoint = await db.getWaypointById(idWithAlt);
      expect(updatedWaypoint?.altitude).toBe(200);
    });

    it("should remove altitude from a waypoint (set to null)", async () => {
      const idWithAlt = await db.addWaypoint({
        ...sampleWaypoint,
        altitude: 100,
      });
      await db.updateWaypoint(idWithAlt, { altitude: null });
      const updatedWaypoint = await db.getWaypointById(idWithAlt);
      expect(updatedWaypoint?.altitude).toBeUndefined();
    });

    it("should preserve altitude when updating other fields like notes", async () => {
      const idWithAlt = await db.addWaypoint({
        ...sampleWaypoint,
        altitude: 100,
      });
      await db.updateWaypoint(idWithAlt, { notes: "new notes" });
      const updatedWaypoint = await db.getWaypointById(idWithAlt);
      expect(updatedWaypoint?.altitude).toBe(100);
    });
  });

  describe("getWaypointById", () => {
    it("should retrieve a specific waypoint by its ID including altitude if present", async () => {
      const id = await db.addWaypoint({ ...sampleWaypoint, altitude: 123 });
      const waypoint = await db.getWaypointById(id);
      expect(waypoint).toBeDefined();
      expect(waypoint?.id).toBe(id);
      expect(waypoint?.altitude).toBe(123);
    });

    it("should retrieve a specific waypoint by its ID", async () => {
      const id = await db.addWaypoint(sampleWaypoint);
      const waypoint = await db.getWaypointById(id);
      expect(waypoint).toBeDefined();
      expect(waypoint?.id).toBe(id);
      expect(waypoint?.name).toBe(sampleWaypoint.name);
    });

    it("should retrieve a waypoint by ID that does not have an imageDataUrl", async () => {
      const id = await db.addWaypoint(sampleWaypoint);
      const waypoint = await db.getWaypointById(id);
      expect(waypoint).toBeDefined();
      expect(waypoint?.imageDataUrl).toBeUndefined();
    });

    it("should return undefined if waypoint with ID does not exist", async () => {
      const waypoint = await db.getWaypointById(999);
      expect(waypoint).toBeUndefined();
    });
  });

  describe("waypointsToGeoJSON", () => {
    it("should return an empty FeatureCollection for an empty waypoints array", () => {
      const geojson = db.waypointsToGeoJSON([]);
      expect(geojson.type).toBe("FeatureCollection");
      expect(geojson.features).toEqual([]);
    });

    it("should convert a single waypoint correctly (with notes)", () => {
      const waypoint: Waypoint = {
        id: 1,
        createdAt: Date.now(),
        ...sampleWaypoint,
      };
      const geojson = db.waypointsToGeoJSON([waypoint]);
      expect(geojson.features.length).toBe(1);
      const feature = geojson.features[0];
      expect(feature.type).toBe("Feature");
      expect(feature.geometry.type).toBe("Point");
      expect(feature.geometry.coordinates).toEqual([
        sampleWaypoint.longitude,
        sampleWaypoint.latitude,
      ]);
      expect(feature.properties?.name).toBe(sampleWaypoint.name);
      expect(feature.properties?.notes).toBe(sampleWaypoint.notes);
    });

    it("should convert a single waypoint correctly (without notes, imageDataUrl, or altitude)", () => {
      const bareWaypoint: Waypoint = {
        id: 1,
        createdAt: Date.now(),
        latitude: 10,
        longitude: 20,
      };
      const geojson = db.waypointsToGeoJSON([bareWaypoint]);
      const feature = geojson.features[0];
      expect(feature.geometry.coordinates).toEqual([20, 10]);
      expect(feature.properties?.name).toBeUndefined();
      expect(feature.properties?.notes).toBeUndefined();
      expect(feature.properties?.altitude).toBeUndefined();
    });

    it("should convert multiple waypoints correctly, including altitude and imageDataUrl where present", () => {
      const waypoints: Waypoint[] = [
        {
          id: 1,
          createdAt: Date.now(),
          latitude: 10,
          longitude: 20,
          altitude: 100,
          name: "W1",
        },
        {
          id: 2,
          createdAt: Date.now(),
          latitude: 11,
          longitude: 21,
          imageDataUrl: "data:...",
          name: "W2",
        },
      ];
      const geojson = db.waypointsToGeoJSON(waypoints);
      expect(geojson.features.length).toBe(2);
      expect(geojson.features[0].geometry.coordinates).toEqual([20, 10, 100]);
      expect(geojson.features[0].properties?.name).toBe("W1");
      expect(geojson.features[1].geometry.coordinates).toEqual([21, 11]);
      expect(geojson.features[1].properties?.imageDataUrl).toBe("data:...");
    });

    it("should handle waypoint with notes and imageDataUrl properties explicitly set to undefined", () => {
      const waypoint: Waypoint = {
        id: 1,
        createdAt: Date.now(),
        latitude: 10,
        longitude: 20,
        notes: undefined,
        imageDataUrl: undefined,
      };
      const geojson = db.waypointsToGeoJSON([waypoint]);
      const feature = geojson.features[0];
      expect(feature.properties).not.toHaveProperty("notes");
      expect(feature.properties).not.toHaveProperty("imageDataUrl");
    });
  });

  describe("deleteWaypoint", () => {
    it("should delete a specific waypoint and leave others intact", async () => {
      const id1 = await db.addWaypoint({ ...sampleWaypoint, name: "W1" });
      const id2 = await db.addWaypoint({ ...sampleWaypoint, name: "W2" });
      await db.deleteWaypoint(id1);
      const waypoints = await db.getSavedWaypoints();
      expect(waypoints.length).toBe(1);
      expect(waypoints[0].id).toBe(id2);
    });

    it("should not throw an error when trying to delete a non-existent waypoint", async () => {
      await db.addWaypoint(sampleWaypoint);
      await expect(db.deleteWaypoint(999)).resolves.toBeUndefined();
      const waypoints = await db.getSavedWaypoints();
      expect(waypoints.length).toBe(1);
    });

    it("should correctly delete a waypoint even if it's the only one", async () => {
      const id = await db.addWaypoint(sampleWaypoint);
      await db.deleteWaypoint(id);
      const waypoints = await db.getSavedWaypoints();
      expect(waypoints).toEqual([]);
    });
  });

  describe("clearAllWaypoints", () => {
    it("should remove all waypoints from the database", async () => {
      await db.addWaypoint({ ...sampleWaypoint, name: "W1" });
      await db.addWaypoint({ ...sampleWaypoint, name: "W2" });
      await db.clearAllWaypoints();
      const waypoints = await db.getSavedWaypoints();
      expect(waypoints).toEqual([]);
    });

    it("should execute without error if the store is already empty", async () => {
      await expect(db.clearAllWaypoints()).resolves.toBeUndefined();
    });

    it("should leave the store empty if called after adding and then clearing waypoints", async () => {
      await db.addWaypoint(sampleWaypoint);
      await db.clearAllWaypoints();
      const waypoints = await db.getSavedWaypoints();
      expect(waypoints).toEqual([]);
    });
  });

  describe("Route DB Functions", () => {
    const sampleCoordinates: GeoJSON.Position[] = [[1,1], [2,2], [3,3]];
    const sampleLineString: GeoJSON.LineString = {
      type: "LineString",
      coordinates: sampleCoordinates,
    };
    const emptyLineString: GeoJSON.LineString = {
      type: "LineString",
      coordinates: [],
    };

    it("should add a new route and retrieve it", async () => {
      const routeName = "Test Route 1";
      const routeId = await db.addRoute(routeName, sampleLineString);

      expect(routeId).toBeTypeOf("number");

      const savedRoute = await db.getRouteById(routeId);
      expect(savedRoute).toBeDefined();
      expect(savedRoute?.name).toBe(routeName);
      expect(savedRoute?.geometry).toEqual(sampleLineString);
      expect(savedRoute?.createdAt).toBeTypeOf("number");
    });

    it("should get all saved routes, sorted by newest first (descending createdAt)", async () => {
      const route1Name = "Route Alpha";
      const route2Name = "Route Beta";
      const route3Name = "Route Gamma";

      vi.spyOn(Date, "now")
        .mockReturnValueOnce(1000) // Gamma
        .mockReturnValueOnce(2000) // Beta
        .mockReturnValueOnce(3000); // Alpha

      const route3Id = await db.addRoute(route3Name, {type: "LineString", coordinates: [[4,4],[5,5],[6,6]]});
      const route2Id = await db.addRoute(route2Name, {type: "LineString", coordinates: [[2,2],[3,3]]});
      const route1Id = await db.addRoute(route1Name, {type: "LineString", coordinates: [[1,1]]});

      const routes = await db.getSavedRoutes();
      expect(routes.length).toBe(3);
      expect(routes[0].id).toBe(route1Id);
      expect(routes[0].name).toBe(route1Name);
      expect(routes[1].id).toBe(route2Id);
      expect(routes[2].name).toBe(route3Name);
    });

    it("should return undefined for a non-existent route ID", async () => {
      const route = await db.getRouteById(999);
      expect(route).toBeUndefined();
    });

    it("should delete a route", async () => {
      const routeId = await db.addRoute("To Be Deleted", [10, 20]);
      let route = await db.getRouteById(routeId);
      expect(route).toBeDefined();

      await db.deleteRoute(routeId);
      route = await db.getRouteById(routeId);
      expect(route).toBeUndefined();
    });

    it("getSavedRoutes should return an empty array if no routes are saved", async () => {
      const routes = await db.getSavedRoutes();
      expect(routes).toEqual([]);
    });

    it("addRoute should create a new route if name is an empty string", async () => {
      const routeId = await db.addRoute("", [1]);
      const route = await db.getRouteById(routeId);
      expect(route).toBeDefined();
      expect(route?.name).toBe("");
    });

    it("addRoute should create a route with empty waypointIds", async () => {
      const routeId = await db.addRoute("Empty Coordinates Route", emptyLineString);
      const route = await db.getRouteById(routeId);
      expect(route).toBeDefined();
      expect(route?.geometry.coordinates).toEqual([]);
    });

    it("should correctly upgrade the DB schema to include routes store (v2 check)", async () => {
      // This test needs its own fresh indexedDB instance to test the upgrade path.
      indexedDB = new IDBFactory();

      // 1. Open with version 1 and set up the 'waypoints' store.
      const dbV1 = await openDB(TEST_DB_INTERNAL_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("waypoints")) {
            db.createObjectStore("waypoints", {
              keyPath: "id",
              autoIncrement: true,
            }).createIndex("createdAt", "createdAt");
          }
          // Ensure 'routes' does not exist at v1
          expect(db.objectStoreNames.contains("routes")).toBe(false);
        },
      });
      expect(dbV1.objectStoreNames.contains("routes")).toBe(false);
      dbV1.close();

      // 2. Now, let our main openWaypointsDB function (which targets v2) handle the upgrade.
      const dbV2 = await db.openWaypointsDB();
      expect(dbV2.version).toBe(2);
      expect(dbV2.objectStoreNames.contains("waypoints")).toBe(true);
      expect(dbV2.objectStoreNames.contains("routes")).toBe(true);

      const routeStore = dbV2.transaction("routes", "readonly").store;
      expect(routeStore.keyPath).toBe("id");
      expect(routeStore.autoIncrement).toBe(true);
      expect(routeStore.indexNames.contains("createdAt")).toBe(true);

      dbV2.close();
    });
  });

  describe("Import/Export Functions", () => {
    const sampleWaypoints: Waypoint[] = [
      { id: 1, latitude: 10, longitude: 20, name: "W1", createdAt: 1000 },
      { id: 2, latitude: 11, longitude: 21, name: "W2", createdAt: 2000, altitude: 100, notes: "Note for W2" },
    ];

    const sampleRouteObjects: db.Route[] = [ // Renamed to avoid confusion with GeoJSON.Route
      { id: 1, name: "R1", geometry: { type: "LineString", coordinates: [[1,1]] }, createdAt: 3000 },
      { id: 2, name: "R2", geometry: { type: "LineString", coordinates: [[1,1], [2,2]] }, createdAt: 4000 },
    ];

    // Sample GeoJSON structure for route import/export tests
    const sampleRouteFeatureCollection: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
      type: "FeatureCollection",
      features: sampleRouteObjects.map(r => ({
        type: "Feature",
        geometry: r.geometry,
        properties: { name: r.name, createdAt: r.createdAt, id: r.id } // id might not be used on import
      }))
    };


    beforeEach(async () => {
      // Clear and populate DB for each test
      await db.clearAllWaypoints();
      const routeDb = await db.openWaypointsDB();
      const routeTx = routeDb.transaction("routes", "readwrite"); // Use string literal "routes"
      await routeTx.store.clear();
      await routeTx.done;

      const waypointTx = routeDb.transaction("waypoints", "readwrite"); // Use string literal "waypoints"
      for (const wp of sampleWaypoints) {
        // Manually add with original createdAt for consistent testing
        await waypointTx.store.add({ ...wp });
      }
      await waypointTx.done;

      // Add routes with their specific geometries and createdAt times
      const routeAddTx = routeDb.transaction("routes", "readwrite"); // Use string literal "routes"
      for (const route of sampleRouteObjects) {
        // Add route with its specific geometry and createdAt
        await routeAddTx.store.add({ name: route.name, geometry: route.geometry, createdAt: route.createdAt });
      }
      await routeAddTx.done;
      routeDb.close();
    });

    describe("exportWaypoints", () => {
      it("should export waypoints to GeoJSON string", async () => {
        const geoJsonString = await db.exportWaypoints();
        const geoJson = JSON.parse(geoJsonString);
        expect(geoJson.type).toBe("FeatureCollection");
        expect(geoJson.features.length).toBe(2);
        // Verify some properties of the first feature (W2 because it's newer)
        expect(geoJson.features[0].properties.name).toBe("W2");
        expect(geoJson.features[0].geometry.coordinates).toEqual([21, 11, 100]);
         // Verify some properties of the second feature (W1)
        expect(geoJson.features[1].properties.name).toBe("W1");
        expect(geoJson.features[1].geometry.coordinates).toEqual([20, 10]);
      });
    });

    describe("importWaypoints", () => {
      it("should import waypoints from GeoJSON string", async () => {
        await db.clearAllWaypoints(); // Start with an empty DB
        const geoJsonToImport = db.waypointsToGeoJSON(sampleWaypoints); // Use existing waypoints for test data
        await db.importWaypoints(JSON.stringify(geoJsonToImport));

        const importedWaypoints = await db.getSavedWaypoints();
        expect(importedWaypoints.length).toBe(2);
        // Order might change due to new createdAt, so check by name
        const w1 = importedWaypoints.find(w => w.name === "W1");
        const w2 = importedWaypoints.find(w => w.name === "W2");

        expect(w1).toBeDefined();
        expect(w2).toBeDefined();
        expect(w1?.latitude).toBe(10);
        expect(w2?.altitude).toBe(100);
      });

      it("should skip waypoints with invalid coordinates", async () => {
        await db.clearAllWaypoints();
        const invalidGeoJson = {
          type: "FeatureCollection",
          features: [
            { type: "Feature", geometry: { type: "Point", coordinates: [1] }, properties: { name: "Invalid" } },
            { type: "Feature", geometry: { type: "Point", coordinates: [10,20] }, properties: { name: "Valid" } }
          ]
        };
        await db.importWaypoints(JSON.stringify(invalidGeoJson));
        const waypoints = await db.getSavedWaypoints();
        expect(waypoints.length).toBe(1);
        expect(waypoints[0].name).toBe("Valid");
      });
    });

    describe("exportRoutes", () => {
      it("should export routes to JSON string", async () => {
        const jsonString = await db.exportRoutes();
        const exportedFeatureCollection = JSON.parse(jsonString) as GeoJSON.FeatureCollection<GeoJSON.LineString>;
        expect(exportedFeatureCollection.type).toBe("FeatureCollection");
        expect(exportedFeatureCollection.features.length).toBe(2);

        // Routes are sorted by createdAt descending in getSavedRoutes, which exportRoutes uses
        const exportedR2 = exportedFeatureCollection.features.find(f => f.properties?.name === "R2");
        const exportedR1 = exportedFeatureCollection.features.find(f => f.properties?.name === "R1");

        expect(exportedR2).toBeDefined();
        expect(exportedR1).toBeDefined();

        expect(exportedR2?.properties?.name).toBe("R2");
        expect(exportedR2?.geometry.type).toBe("LineString");
        expect(exportedR2?.geometry.coordinates).toEqual([[1,1], [2,2]]);
        expect(exportedR1?.properties?.name).toBe("R1");
        expect(exportedR1?.geometry.coordinates).toEqual([[1,1]]);
      });
    });

    describe("importRoutes", () => {
      it("should import routes from JSON string, preserving createdAt", async () => {
        const routeDb = await db.openWaypointsDB();
        const routeTx = routeDb.transaction("routes", "readwrite"); // Use string literal "routes"
        await routeTx.store.clear(); // Start with empty routes
        await routeTx.done;
        routeDb.close();

        // Use the sampleRouteFeatureCollection defined above
        await db.importRoutes(JSON.stringify(sampleRouteFeatureCollection));
        const importedRoutes = await db.getSavedRoutes(); // Sorted by createdAt desc

        expect(importedRoutes.length).toBe(2);

        const importedR2 = importedRoutes.find(r => r.name === "R2");
        const importedR1 = importedRoutes.find(r => r.name === "R1");

        expect(importedR2).toBeDefined();
        expect(importedR1).toBeDefined();

        expect(importedR2?.createdAt).toBe(4000);
        expect(importedR1?.createdAt).toBe(3000);
        expect(importedR2?.geometry.coordinates).toEqual([[1,1], [2,2]]);
        expect(importedR1?.geometry.coordinates).toEqual([[1,1]]);
      });
    });
  });
});
