import React, { useEffect, useState, Suspense } from "react";
import L from "leaflet";
import { useSearchParams } from "react-router";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  Popup,
  GeoJSON,
  LayersControl,
} from "react-leaflet";
import CompassIcon from "../components/CompassIcon"; // Moved import to top
import {
  getSavedWaypoints,
  waypointsToGeoJSON,
  type Waypoint,
} from "../services/db";
import type { Feature, Point, LineString } from "geojson";

// Fix for default icon issue with webpack/vite
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  });
}

type UserPosition = {
  longitude: number;
  latitude: number;
};

// --- Components ---

/**
 * A controller component to interact with the map instance.
 * Must be rendered as a child of <MapContainer>.
 */
function MapController({
  routeGeoJSON,
}: {
  routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (routeGeoJSON) {
      const bounds = L.geoJSON(routeGeoJSON).getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [map, routeGeoJSON]);

  return null; // This component does not render anything itself
}

/**
 * Renders the actual map, including user location, waypoints, and routes.
 * This component is wrapped in <MapContainer> by its parent.
 */
function ActualMap({ userPosition }: { userPosition: UserPosition }) {
  const [searchParams] = useSearchParams();
  const [waypointsGeoJSON, setWaypointsGeoJSON] =
    useState<GeoJSON.FeatureCollection<GeoJSON.Point, Waypoint> | null>(null);
  const [routeToDisplayGeoJSON, setRouteToDisplayGeoJSON] =
    useState<GeoJSON.Feature<GeoJSON.LineString> | null>(null);
  const [routeName, setRouteName] = useState<string | null>(null);

  useEffect(() => {
    // Logic for displaying a specific route from URL params
    const waypointsParam = searchParams.get("waypoints");
    const nameParam = searchParams.get("routeName");

    if (waypointsParam) {
      setRouteName(nameParam || "Route");
      try {
        const coordinatePairs = waypointsParam.split(";").map((pairStr) => {
          const parts = pairStr.split(",");
          if (parts.length !== 2) throw new Error("Invalid coordinate pair");
          return [parseFloat(parts[0]), parseFloat(parts[1])]; // lon, lat
        });

        if (coordinatePairs.length >= 2) {
          const lineStringGeom: GeoJSON.LineString = {
            type: "LineString",
            coordinates: coordinatePairs,
          };
          const routeFeature: GeoJSON.Feature<GeoJSON.LineString> = {
            type: "Feature",
            properties: nameParam ? { name: nameParam } : {},
            geometry: lineStringGeom,
          };
          setRouteToDisplayGeoJSON(routeFeature);
        } else {
          setRouteToDisplayGeoJSON(null);
        }
      } catch (e) {
        console.error("Error parsing waypoints from URL:", e);
        setRouteToDisplayGeoJSON(null);
      }
    } else {
      setRouteToDisplayGeoJSON(null);
    }

    // Fetch and display all saved waypoints
    async function fetchAndSetWaypoints() {
      try {
        const waypoints = await getSavedWaypoints();
        const geojsonData = waypointsToGeoJSON(
          waypoints
        ) as GeoJSON.FeatureCollection<GeoJSON.Point, Waypoint>;
        setWaypointsGeoJSON(geojsonData);
      } catch (error) {
        console.error("Failed to load waypoints for map:", error);
      }
    }
    fetchAndSetWaypoints();
  }, [searchParams]);

  const onEachWaypointFeature = (
    feature: Feature<Point, Waypoint>,
    layer: L.Layer
  ) => {
    if (feature.properties) {
      let popupContent = `<b>${feature.properties.name || "Waypoint"}</b>`;
      if (feature.properties.notes) {
        popupContent += `<br />${feature.properties.notes}`;
      }
      if (feature.properties.imageDataUrl) {
        popupContent += `<br /><img src="${
          feature.properties.imageDataUrl
        }" alt="${
          feature.properties.name || "Waypoint"
        } image" style="max-width: 150px; max-height: 100px; object-fit: cover; margin-top: 5px; border-radius: 4px;" />`;
      }
      popupContent += `<br /><a href="/waypoints/edit/${feature.properties.id}" style="margin-top: 5px; display: inline-block;">Edit Waypoint</a>`;
      layer.bindPopup(popupContent);
    }
  };

  const centerPosition: [number, number] = [
    userPosition.latitude,
    userPosition.longitude,
  ];

  return (
    <MapContainer
      center={centerPosition}
      zoom={13}
      style={{ height: "85vh", width: "100%" }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Topographic">
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution='Map data: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <Marker position={centerPosition}>
        <Popup>You are here.</Popup>
      </Marker>

      {waypointsGeoJSON && (
        <GeoJSON
          data={waypointsGeoJSON}
          onEachFeature={onEachWaypointFeature}
        />
      )}

      {routeToDisplayGeoJSON && (
        <GeoJSON
          key={JSON.stringify(routeToDisplayGeoJSON.geometry.coordinates)}
          data={routeToDisplayGeoJSON}
          style={() => ({ color: "red", weight: 4, opacity: 0.8 })}
        >
          {routeName && <Popup>{routeName}</Popup>}
        </GeoJSON>
      )}

      <MapController routeGeoJSON={routeToDisplayGeoJSON} />
    </MapContainer>
  );
}

/**
 * The main page component that handles geolocation and renders the map.
 */
export default function MapPage() {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    const successHandler = (location: GeolocationPosition) => {
      setPosition({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      setHeading(location.coords.heading);
      setLoading(false);
    };

    const errorHandler = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setError(
          "Location access denied. Please enable location services to see the map."
        );
      } else {
        setError(`Error getting location: ${err.message}`);
      }
      // Fallback to a default location if user denies permission
      setPosition({ latitude: 51.505, longitude: -0.09 });
      setLoading(false);
    };

    const watchId = navigator.geolocation.watchPosition(
      successHandler,
      errorHandler,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  if (loading) {
    return <p>Loading location...</p>;
  }

  if (error && !position) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

// ... (rest of the imports and component code)

// Inside MapPage component, before the return statement for when position is available:

  if (position) {
    return (
      <div style={{ height: "100vh", width: "100%", position: "relative" }}> {/* Added position: "relative" */}
        <h1>Map</h1>
        {error && <p style={{ color: "orange" }}>{error}</p>}
        <Suspense fallback={<p>Loading map...</p>}>
          <ActualMap userPosition={position} />
        </Suspense>
        <CompassIcon heading={heading} /> {/* Added CompassIcon */}
      </div>
    );
  }

  return <p>Unable to determine location.</p>;
}
