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
  ...prefix("routes", [
    route("/", "routes/saved_routes.tsx"), // Added saved_routes
    route("/create", "routes/create_route.tsx"),
  ]),
  route("/settings", "routes/settings.tsx"),
  route("/hiking", "routes/hiking.tsx"),
] satisfies RouteConfig;
