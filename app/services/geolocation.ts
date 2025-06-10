interface Coordinates {
  latitude: number;
  longitude: number;
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
