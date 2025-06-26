import React, { useEffect, useState, Suspense } from "react";
import L from "leaflet";
// Added GeoJSON import
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  Popup,
  GeoJSON,
  LayersControl,
} from "react-leaflet";
import {
  getSavedWaypoints,
  waypointsToGeoJSON,
  type Waypoint,
} from "../services/db"; // Import db services
import type { Feature, Point } from "geojson"; // Import GeoJSON types

// Fix for default icon issue with webpack
if (typeof window !== "undefined") {
  // These lines are problematic for some Vite plugins during SSR/test analysis if not guarded.
  // They are intended for browser execution.
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

export default function MapPage() {
  const [position, setPosition] = useState<UserPosition | null>(null);
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
      setLoading(false);
    };

    const errorHandler = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setError(
          "Location access denied. Please enable location services in your browser settings."
        );
      } else {
        setError(`Error getting location: ${err.message}`);
      }
      setLoading(false);
    };

    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  }, []);

  if (loading) {
    return <p>Loading location...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  if (position) {
    return (
      <div style={{ height: "100vh", width: "100%" }}>
        <h1>Your Current Location</h1>
        <Suspense fallback={<p>Loading map...</p>}>
          <ActualMap userPosition={position} />
        </Suspense>
      </div>
    );
  }

  return <p>Unable to determine location.</p>;
}

// New component to render the actual map with lazy-loaded components
function ActualMap({ userPosition }: { userPosition: UserPosition }) {
  const [waypointsGeoJSON, setWaypointsGeoJSON] =
    useState<GeoJSON.FeatureCollection<GeoJSON.Point, Waypoint> | null>(null);

  useEffect(() => {
    async function fetchAndSetWaypoints() {
      try {
        const waypoints = await getSavedWaypoints();
        const geojsonData = waypointsToGeoJSON(
          waypoints
        ) as GeoJSON.FeatureCollection<GeoJSON.Point, Waypoint>;
        setWaypointsGeoJSON(geojsonData);
      } catch (error) {
        console.error("Failed to load waypoints for map:", error);
        // Optionally set an error state to display to the user
      }
    }
    fetchAndSetWaypoints();
  }, []);

  const onEachWaypointFeature = (
    feature: Feature<Point, Waypoint>,
    layer: L.Layer
  ) => {
    if (feature.properties) {
      let popupContent = `<b>${feature.properties.name}</b>`;
      if (feature.properties.notes) {
        popupContent += `<br />${feature.properties.notes}`;
      }
      if (feature.properties.imageDataUrl) {
        popupContent += `<br /><img src="${feature.properties.imageDataUrl}" alt="${feature.properties.name} image" style="max-width: 150px; max-height: 100px; object-fit: cover; margin-top: 5px; border-radius: 4px;" />`;
      }
      // Add edit link
      popupContent += `<br /><a href="${
        import.meta.env.BASE_URL
      }waypoints/edit/${
        feature.properties.id
      }" target="_blank" rel="noopener noreferrer">Edit Waypoint</a>`;
      layer.bindPopup(popupContent);
    }
  };

  const centerPosition = [userPosition.latitude, userPosition.longitude] as [
    number,
    number
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
        <LayersControl.BaseLayer name="OpenTopoMap">
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution='Map data: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      <Marker position={centerPosition}>
        <Popup>
          You are here. <br /> Latitude: {userPosition.latitude}, Longitude:{" "}
          {userPosition.longitude}
        </Popup>
      </Marker>
      {waypointsGeoJSON && (
        <GeoJSON
          data={waypointsGeoJSON}
          onEachFeature={onEachWaypointFeature}
        />
      )}
    </MapContainer>
  );
}
