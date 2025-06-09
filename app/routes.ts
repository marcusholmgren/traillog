import {
  type RouteConfig,
  route,
  index,
  layout,
  prefix,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),

  route("/map", "routes/map.tsx"),
  ...prefix("waypoints", [
    index("routes/saved_waypoints.tsx"),
    route("/add", "routes/add_waypoint.tsx"),
    route("/edit/:wpId", "routes/edit_waypoint.tsx"),
  ]),
] satisfies RouteConfig;
