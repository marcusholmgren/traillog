import { exportRoutes } from "../services/db";

self.onmessage = async () => {
  const geoJsonString = await exportRoutes();
  self.postMessage(geoJsonString);
};
