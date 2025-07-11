interface Coordinates {
  latitude: number;
  longitude: number;
}

export enum ShorthandDirection {
  N = "N",
  NE = "N-E",
  E = "E",
  SE = "S-E",
  S = "S",
  SW = "S-W",
  W = "W",
  NW = "N-W",
}

/**
 * Calculates the distance between two geographic coordinates using the Haversine formula.
 *
 * @param point1 - The first coordinate point { latitude, longitude }.
 * @param point2 - The second coordinate point { latitude, longitude }.
 * @returns The distance between the two points in kilometers.
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371; // Earth's radius in kilometers

  const lat1Rad = toRadians(point1.latitude);
  const lon1Rad = toRadians(point1.longitude);
  const lat2Rad = toRadians(point2.latitude);
  const lon2Rad = toRadians(point2.longitude);

  const dLat = lat2Rad - lat1Rad;
  const dLon = lon2Rad - lon1Rad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // Distance in kilometers
  return distance;
}

/**
 * Helper function to convert degrees to radians.
 * @param degrees - The angle in degrees.
 * @returns The angle in radians.
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculates the total distance of a route defined by an array of waypoints.
 *
 * @param route - An array of coordinate points [{ latitude, longitude }].
 * @returns The total distance of the route in kilometers.
 */
export function calculateTotalRouteDistance(route: Coordinates[]): number {
  // A route with 0 or 1 point has a distance of 0.
  if (route.length < 2) {
    return 0;
  }

  let totalDistance = 0;
  // Iterate from the first point to the second-to-last point.
  for (let i = 0; i < route.length - 1; i++) {
    const point1 = route[i];
    const point2 = route[i + 1];
    totalDistance += calculateDistance(point1, point2);
  }

  return totalDistance;
}

/**
 * Calculates the compass direction (bearing) from point1 to point2.
 * @param point1 - The starting coordinate point { latitude, longitude }.
 * @param point2 - The destination coordinate point { latitude, longitude }.
 * @returns The bearing in degrees (0-360).
 */
export function calculateCompassDirection(
  point1: Coordinates,
  point2: Coordinates
): number {
  const lat1Rad = toRadians(point1.latitude);
  const lon1Rad = toRadians(point1.longitude);
  const lat2Rad = toRadians(point2.latitude);
  const lon2Rad = toRadians(point2.longitude);

  const dLon = lon2Rad - lon1Rad;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = Math.atan2(y, x);
  bearing = toDegrees(bearing);
  bearing = (bearing + 360) % 360; // Normalize to 0-360

  return bearing;
}

/**
 * Helper function to convert radians to degrees.
 * @param radians - The angle in radians.
 * @returns The angle in degrees.
 */
function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Translates a bearing (in degrees) to a shorthand compass direction.
 * @param bearing - The bearing in degrees (0-360).
 * @returns The shorthand compass direction (e.g., N, N-E, E).
 */
export function translateToShorthand(bearing: number): ShorthandDirection {
  if (bearing < 0 || bearing > 360) {
    throw new Error("Bearing must be between 0 and 360 degrees.");
  }

  if ((bearing >= 0 && bearing < 22.5) || bearing >= 337.5) {
    return ShorthandDirection.N;
  } else if (bearing >= 22.5 && bearing < 67.5) {
    return ShorthandDirection.NE;
  } else if (bearing >= 67.5 && bearing < 112.5) {
    return ShorthandDirection.E;
  } else if (bearing >= 112.5 && bearing < 157.5) {
    return ShorthandDirection.SE;
  } else if (bearing >= 157.5 && bearing < 202.5) {
    return ShorthandDirection.S;
  } else if (bearing >= 202.5 && bearing < 247.5) {
    return ShorthandDirection.SW;
  } else if (bearing >= 247.5 && bearing < 292.5) {
    return ShorthandDirection.W;
  } else {
    // bearing >= 292.5 && bearing < 337.5
    return ShorthandDirection.NW;
  }
}
