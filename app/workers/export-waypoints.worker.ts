import { getSavedWaypoints, waypointsToGeoJSON } from "../services/db";

self.onmessage = async () => {
  const waypoints = await getSavedWaypoints();
  const geoJson = waypointsToGeoJSON(waypoints);
  const geoJsonString = JSON.stringify(geoJson, null, 2);
  self.postMessage(geoJsonString);
};
