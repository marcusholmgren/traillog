import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("/add-waypoint", "routes/add_waypoint.tsx"),
  route("/edit-waypoint", "routes/edit_waypoint.tsx"),
  route("/map", "routes/map.tsx"),
  route("/saved-waypoints", "routes/saved_waypoints.tsx"),
] satisfies RouteConfig;
