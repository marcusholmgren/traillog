import { describe, it, expect, vi, beforeEach } from "vitest";
import * as db from "./db";
import {
  getWaypointCount,
  getTotalDistance,
  getRecentTreks,
} from "./statistics";
import type { Route } from "./db";

// Mock the db service functions
vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getSavedWaypoints: vi.fn(),
    getSavedRoutes: vi.fn(),
  };
});

describe("statistics service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getWaypointCount", () => {
    it("should return the correct number of waypoints", async () => {
      vi.mocked(db.getSavedWaypoints).mockResolvedValue([
        { id: 1, name: "A", latitude: 0, longitude: 0, createdAt: Date.now() },
        { id: 2, name: "B", latitude: 0, longitude: 0, createdAt: Date.now() },
      ]);
      const count = await getWaypointCount();
      expect(count).toBe(2);
    });

    it("should return 0 when there are no waypoints", async () => {
      vi.mocked(db.getSavedWaypoints).mockResolvedValue([]);
      const count = await getWaypointCount();
      expect(count).toBe(0);
    });
  });

  describe("getTotalDistance", () => {
    it("should calculate correct total distance for LineString routes", async () => {
      // 0,0 to 0,1 is ~111km
      const route1: Route = {
        id: 1,
        name: "Route 1",
        createdAt: Date.now(),
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 0], // Longitude 1 degree at Equator is ~111km
          ],
        },
      };

      const route2: Route = {
        id: 2,
        name: "Route 2",
        createdAt: Date.now(),
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [0, 1], // Latitude 1 degree is ~111km
          ],
        },
      };

      vi.mocked(db.getSavedRoutes).mockResolvedValue([route1, route2]);
      const distance = await getTotalDistance();

      // distance from (0,0) to (1,0) is ~111.19 km
      // distance from (0,0) to (0,1) is ~111.19 km
      // sum is ~222.39 km, round to 222
      expect(distance).toBe(222);
    });

    it("should calculate correct total distance for Polygon routes", async () => {
      const route1: Route = {
        id: 1,
        name: "Polygon Route",
        createdAt: Date.now(),
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      };

      vi.mocked(db.getSavedRoutes).mockResolvedValue([route1]);
      const distance = await getTotalDistance();

      // Edges: (0,0)->(1,0) [~111.19], (1,0)->(1,1) [~111.19], (1,1)->(0,1) [~111.18], (0,1)->(0,0) [~111.19]
      // Sum is ~444.77 km, round to 445
      expect(distance).toBe(445);
    });

    it("should return 0 when there are no routes", async () => {
      vi.mocked(db.getSavedRoutes).mockResolvedValue([]);
      const distance = await getTotalDistance();
      expect(distance).toBe(0);
    });
  });

  describe("getRecentTreks", () => {
    it("should return the top 3 recent routes", async () => {
      const routes: Route[] = [
        { id: 1, name: "A", createdAt: 100, geometry: { type: "LineString", coordinates: [] } },
        { id: 2, name: "B", createdAt: 90, geometry: { type: "LineString", coordinates: [] } },
        { id: 3, name: "C", createdAt: 80, geometry: { type: "LineString", coordinates: [] } },
        { id: 4, name: "D", createdAt: 70, geometry: { type: "LineString", coordinates: [] } },
      ];

      // db.getSavedRoutes is assumed to return them ordered descending by createdAt (newest first)
      vi.mocked(db.getSavedRoutes).mockResolvedValue(routes);

      const recent = await getRecentTreks();
      expect(recent).toHaveLength(3);
      expect(recent[0].id).toBe(1);
      expect(recent[1].id).toBe(2);
      expect(recent[2].id).toBe(3);
    });

    it("should return all routes if less than 3 exist", async () => {
      const routes: Route[] = [
        { id: 1, name: "A", createdAt: 100, geometry: { type: "LineString", coordinates: [] } },
      ];

      vi.mocked(db.getSavedRoutes).mockResolvedValue(routes);

      const recent = await getRecentTreks();
      expect(recent).toHaveLength(1);
      expect(recent[0].id).toBe(1);
    });
  });
});
