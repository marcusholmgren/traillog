import { describe, it, expect } from "vitest";
import { calculateDistance, calculateTotalRouteDistance } from "./geolocation";

describe("calculateDistance", () => {
  const paris = { latitude: 48.8566, longitude: 2.3522 };
  const newYork = { latitude: 40.7128, longitude: -74.006 };
  const london = { latitude: 51.5072, longitude: -0.1276 };

  it("should return 0 for the same coordinates", () => {
    expect(calculateDistance(paris, paris)).toBe(0);
  });

  it("should calculate the correct distance between Paris and London", () => {
    // Expected distance is ~344 km
    const distance = calculateDistance(paris, london);
    expect(distance).toBeCloseTo(343.5, 0);
  });

  it("should calculate the correct distance between Paris and New York", () => {
    // Expected distance is ~5837 km
    const distance = calculateDistance(paris, newYork);
    expect(distance).toBeCloseTo(5837, 0);
  });

  it("should handle coordinates crossing the prime meridian and equator", () => {
    const point1 = { latitude: 10, longitude: 10 };
    const point2 = { latitude: -10, longitude: -10 };
    // Expected distance is ~3130 km
    const distance = calculateDistance(point1, point2);
    expect(distance).toBeCloseTo(3137.0, 0);
  });
});

describe("calculateTotalRouteDistance", () => {
  it("should calculate the total distance for a route", () => {
    // Let's plan a simple road trip in Sweden
    const stockholm = { latitude: 59.3293, longitude: 18.0686 };
    const uppsala = { latitude: 59.8586, longitude: 17.6389 };
    const vasteras = { latitude: 59.6162, longitude: 16.5528 };

    const myRoute = [stockholm, uppsala, vasteras];

    const totalDistance = calculateTotalRouteDistance(myRoute);
    // The distance from Stockholm to Uppsala is ~64 km
    // The distance from Uppsala to Västerås is ~70 km
    // Total should be around 134 km

    // Expected output: Total route distance: 133.72 km
    expect(totalDistance).toBeCloseTo(130.19, 0.5);
  });
});
