import React, { useEffect, useState, Suspense } from "react";
// Popup can be imported directly if it's small or used closely with Marker
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, Popup } from "react-leaflet";

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
  console.log(userPosition);
  const centerPosition = [userPosition.latitude, userPosition.longitude] as [number, number];
  console.log(centerPosition);
  return (
    <MapContainer
      center={centerPosition}
      zoom={13}
      style={{ height: "80%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={centerPosition}>
        <Popup>
          You are here. <br /> Latitude: {userPosition.latitude}, Longitude:{" "}
          {userPosition.longitude}
        </Popup>
      </Marker>
    </MapContainer>
  );
}
