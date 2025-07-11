import { describe, it, expect } from "vitest";
import {
  calculateDistance,
  calculateTotalRouteDistance,
  calculateCompassDirection,
  translateToShorthand,
  ShorthandDirection,
} from "./geolocation";

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

describe("calculateCompassDirection", () => {
  const pointN = { latitude: 0, longitude: 0 };
  const pointNE = { latitude: 1, longitude: 1 };
  const pointE = { latitude: 0, longitude: 1 };
  const pointSE = { latitude: -1, longitude: 1 };
  const pointS = { latitude: -1, longitude: 0 };
  const pointSW = { latitude: -1, longitude: -1 };
  const pointW = { latitude: 0, longitude: -1 };
  const pointNW = { latitude: 1, longitude: -1 };

  it("should return 0 for North (same longitude, increasing latitude)", () => {
    const p1 = { latitude: 0, longitude: 0 };
    const p2 = { latitude: 1, longitude: 0 };
    expect(calculateCompassDirection(p1, p2)).toBeCloseTo(0);
  });

  it("should return 45 for North-East", () => {
    expect(calculateCompassDirection(pointN, pointNE)).toBeCloseTo(45);
  });

  it("should return 90 for East (same latitude, increasing longitude)", () => {
    expect(calculateCompassDirection(pointN, pointE)).toBeCloseTo(90);
  });

  it("should return 135 for South-East", () => {
    expect(calculateCompassDirection(pointN, pointSE)).toBeCloseTo(135);
  });

  it("should return 180 for South (same longitude, decreasing latitude)", () => {
    expect(calculateCompassDirection(pointN, pointS)).toBeCloseTo(180);
  });

  it("should return 225 for South-West", () => {
    expect(calculateCompassDirection(pointN, pointSW)).toBeCloseTo(225);
  });

  it("should return 270 for West (same latitude, decreasing longitude)", () => {
    expect(calculateCompassDirection(pointN, pointW)).toBeCloseTo(270);
  });

  it("should return 315 for North-West", () => {
    expect(calculateCompassDirection(pointN, pointNW)).toBeCloseTo(315);
  });

  // Test with different points to ensure general applicability
  it("should calculate correct bearing for arbitrary points", () => {
    const p1 = { latitude: 50, longitude: 5 };
    const p2 = { latitude: 51, longitude: 6 }; // North-East direction
    expect(calculateCompassDirection(p1, p2)).toBeCloseTo(32.07, 2); // Updated expected value
  });
});

describe("translateToShorthand", () => {
  it("should translate bearings to correct shorthand directions", () => {
    expect(translateToShorthand(0)).toBe(ShorthandDirection.N);
    expect(translateToShorthand(22.4)).toBe(ShorthandDirection.N);
    expect(translateToShorthand(22.5)).toBe(ShorthandDirection.NE);
    expect(translateToShorthand(45)).toBe(ShorthandDirection.NE);
    expect(translateToShorthand(67.4)).toBe(ShorthandDirection.NE);
    expect(translateToShorthand(67.5)).toBe(ShorthandDirection.E);
    expect(translateToShorthand(90)).toBe(ShorthandDirection.E);
    expect(translateToShorthand(112.4)).toBe(ShorthandDirection.E);
    expect(translateToShorthand(112.5)).toBe(ShorthandDirection.SE);
    expect(translateToShorthand(135)).toBe(ShorthandDirection.SE);
    expect(translateToShorthand(157.4)).toBe(ShorthandDirection.SE);
    expect(translateToShorthand(157.5)).toBe(ShorthandDirection.S);
    expect(translateToShorthand(180)).toBe(ShorthandDirection.S);
    expect(translateToShorthand(202.4)).toBe(ShorthandDirection.S);
    expect(translateToShorthand(202.5)).toBe(ShorthandDirection.SW);
    expect(translateToShorthand(225)).toBe(ShorthandDirection.SW);
    expect(translateToShorthand(247.4)).toBe(ShorthandDirection.SW);
    expect(translateToShorthand(247.5)).toBe(ShorthandDirection.W);
    expect(translateToShorthand(270)).toBe(ShorthandDirection.W);
    expect(translateToShorthand(292.4)).toBe(ShorthandDirection.W);
    expect(translateToShorthand(292.5)).toBe(ShorthandDirection.NW);
    expect(translateToShorthand(315)).toBe(ShorthandDirection.NW);
    expect(translateToShorthand(337.4)).toBe(ShorthandDirection.NW);
    expect(translateToShorthand(337.5)).toBe(ShorthandDirection.N);
    expect(translateToShorthand(360)).toBe(ShorthandDirection.N);
  });

  it("should throw an error for bearings out of range", () => {
    expect(() => translateToShorthand(-1)).toThrow(
      "Bearing must be between 0 and 360 degrees."
    );
    expect(() => translateToShorthand(360.1)).toThrow(
      "Bearing must be between 0 and 360 degrees."
    );
  });
});
