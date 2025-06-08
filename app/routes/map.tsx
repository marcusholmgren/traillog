import type { MetaFunction } from "@remix-run/node";
import React, { useEffect, useState, Suspense } from 'react';
// Popup can be imported directly if it's small or used closely with Marker
import { Popup } from 'react-leaflet';
import L from 'leaflet';

// Dynamically import react-leaflet components
const MapContainer = React.lazy(() => import('react-leaflet').then(module => ({ default: module.MapContainer })));
const TileLayer = React.lazy(() => import('react-leaflet').then(module => ({ default: module.TileLayer })));
const Marker = React.lazy(() => import('react-leaflet').then(module => ({ default: module.Marker })));

// Fix for default icon issue with webpack
if (typeof window !== 'undefined') {
  // These lines are problematic for some Vite plugins during SSR/test analysis if not guarded.
  // They are intended for browser execution.
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

export const meta: MetaFunction = () => {
  return [
    { title: "User Location Map" },
    { name: "description", content: "A map displaying the user's current location." },
  ];
};

export default function MapPage() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    const successHandler = (location: GeolocationPosition) => {
      setPosition([location.coords.latitude, location.coords.longitude]);
      setLoading(false);
    };

    const errorHandler = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setError("Location access denied. Please enable location services in your browser settings.");
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
    return <p style={{ color: 'red' }}>{error}</p>;
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
function ActualMap({ userPosition }: { userPosition: [number, number] }) {
  return (
    <MapContainer center={userPosition} zoom={13} style={{ height: "80%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={userPosition}>
        <Popup>
          You are here. <br /> Latitude: {userPosition[0]}, Longitude: {userPosition[1]}
        </Popup>
      </Marker>
    </MapContainer>
  );
}
