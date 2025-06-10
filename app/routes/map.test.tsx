import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import MapPage from './map'; // ActualMap is internal, test MapPage
import { vi } from 'vitest';
import { type Waypoint } from '../services/db';
import L from 'leaflet'; // For L.Layer type if needed

// --- Mocks ---
const mockGetSavedWaypoints = vi.fn();
const mockWaypointsToGeoJSON = vi.fn();

vi.mock('../services/db', () => ({
  getSavedWaypoints: mockGetSavedWaypoints,
  waypointsToGeoJSON: mockWaypointsToGeoJSON,
}));

// Mock Geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};
Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock react-leaflet components
let onEachFeatureCallback: ((feature: any, layer: any) => void) | undefined = undefined;
let capturedGeoJsonData: any = null;
const mockLayers: { layer: L.Layer, boundPopupContent: string }[] = [];

vi.mock('react-leaflet', async () => {
  const actual = await vi.importActual('react-leaflet');
  return {
    ...actual,
    MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
    TileLayer: () => <div data-testid="tile-layer" />,
    Marker: ({ children, position }: { children: React.ReactNode, position: L.LatLngExpression }) => (
      <div data-testid="marker" data-lat={L.latLng(position).lat} data-lng={L.latLng(position).lng}>
        {children}
      </div>
    ),
    Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
    GeoJSON: ({ data, onEachFeature }: { data: any; onEachFeature?: (feature: any, layer: any) => void }) => {
      capturedGeoJsonData = data; // Capture data for inspection
      onEachFeatureCallback = onEachFeature; // Capture callback for direct invocation
      mockLayers.length = 0; // Clear previous layers
      if (data && data.features && onEachFeature) {
        data.features.forEach((feature: any) => {
          const mockLayer = {
            bindPopup: vi.fn((content: string) => {
              mockLayers.push({ layer: mockLayer as any, boundPopupContent: content });
            })
          };
          onEachFeature(feature, mockLayer);
        });
      }
      return <div data-testid="geojson-layer" data-features-count={data?.features?.length || 0} />;
    },
  };
});

const mockMapWaypoints: Waypoint[] = [
  { id: 1, name: 'Map WP With Image', latitude: 10, longitude: 20, createdAt: Date.now(), imageDataUrl: 'map_image1.jpg', notes: 'Map note 1' },
  { id: 2, name: 'Map WP No Image', latitude: 12, longitude: 22, createdAt: Date.now() - 1000, notes: 'Map note 2' },
  { id: 3, name: 'Map WP No Notes', latitude: 13, longitude: 23, createdAt: Date.now() - 2000, imageDataUrl: 'map_image3.jpg' },
];

const generateMockGeoJSONData = (waypoints: Waypoint[]) => ({
  type: "FeatureCollection",
  features: waypoints.map(wp => ({
    type: "Feature",
    properties: { ...wp }, // Ensure all properties are there, including imageDataUrl
    geometry: { type: "Point", coordinates: [wp.longitude, wp.latitude] }
  }))
});


describe('MapPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default success for geolocation
    mockGeolocation.getCurrentPosition.mockImplementation((successCallback) => {
      successCallback({
        coords: { latitude: 51.505, longitude: -0.09, accuracy: 20, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
        timestamp: Date.now(),
      });
    });
    mockGetSavedWaypoints.mockResolvedValue([...mockMapWaypoints]);
    mockWaypointsToGeoJSON.mockImplementation(generateMockGeoJSONData);
    onEachFeatureCallback = undefined; // Reset callback
    capturedGeoJsonData = null; // Reset captured data
    mockLayers.length = 0; // Reset captured layers
  });

  test('renders loading state then the map with user location marker', async () => {
    render(<MapPage />);
    expect(screen.getByText('Loading location...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument();
    });
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
    // Check for user location marker (assuming one is always rendered)
    const userMarker = screen.getByTestId('marker');
    expect(userMarker).toBeInTheDocument();
    expect(userMarker).toHaveAttribute('data-lat', "51.505");
  });

  test('fetches waypoints and passes GeoJSON data to GeoJSON component', async () => {
    render(<MapPage />);
    await waitFor(() => {
      expect(screen.getByTestId('geojson-layer')).toBeInTheDocument();
    });
    expect(mockGetSavedWaypoints).toHaveBeenCalled();
    expect(mockWaypointsToGeoJSON).toHaveBeenCalledWith(mockMapWaypoints);
    expect(screen.getByTestId('geojson-layer')).toHaveAttribute('data-features-count', String(mockMapWaypoints.length));
    expect(capturedGeoJsonData).toEqual(generateMockGeoJSONData(mockMapWaypoints));
  });

  describe('onEachFeature Popup Content', () => {
    test('popup for waypoint with image and notes contains name, notes, image, and edit link', async () => {
      render(<MapPage />);
      await waitFor(() => expect(screen.getByTestId('geojson-layer')).toBeInTheDocument()); // Ensure GeoJSON processing has run

      expect(mockLayers.length).toBe(mockMapWaypoints.length);
      const waypointWithImage = mockMapWaypoints[0]; // Has image and notes
      const relevantLayerBinding = mockLayers.find(l => l.boundPopupContent.includes(`<b>${waypointWithImage.name}</b>`));

      expect(relevantLayerBinding).toBeDefined();
      const popupHtml = relevantLayerBinding!.boundPopupContent;

      expect(popupHtml).toContain(`<b>${waypointWithImage.name}</b>`);
      expect(popupHtml).toContain(`<br />${waypointWithImage.notes}`);
      expect(popupHtml).toContain(`<img src="${waypointWithImage.imageDataUrl}" alt="${waypointWithImage.name} image" style="max-width: 150px; max-height: 100px; object-fit: cover; margin-top: 5px; border-radius: 4px;" />`);
      expect(popupHtml).toContain(`<br /><a href="/waypoints/edit/${waypointWithImage.id}" target="_blank" rel="noopener noreferrer">Edit Waypoint</a>`);
    });

    test('popup for waypoint without image but with notes contains name, notes, and edit link', async () => {
      render(<MapPage />);
      await waitFor(() => expect(screen.getByTestId('geojson-layer')).toBeInTheDocument());

      const waypointWithoutImage = mockMapWaypoints[1]; // No image, has notes
      const relevantLayerBinding = mockLayers.find(l => l.boundPopupContent.includes(`<b>${waypointWithoutImage.name}</b>`));

      expect(relevantLayerBinding).toBeDefined();
      const popupHtml = relevantLayerBinding!.boundPopupContent;

      expect(popupHtml).toContain(`<b>${waypointWithoutImage.name}</b>`);
      expect(popupHtml).toContain(`<br />${waypointWithoutImage.notes}`);
      expect(popupHtml).not.toContain(`<img src`);
      expect(popupHtml).toContain(`<br /><a href="/waypoints/edit/${waypointWithoutImage.id}" target="_blank" rel="noopener noreferrer">Edit Waypoint</a>`);
    });

    test('popup for waypoint with image but no notes contains name, image, and edit link', async () => {
      render(<MapPage />);
      await waitFor(() => expect(screen.getByTestId('geojson-layer')).toBeInTheDocument());

      const waypointWithImageNoNotes = mockMapWaypoints[2]; // Has image, no notes
      const relevantLayerBinding = mockLayers.find(l => l.boundPopupContent.includes(`<b>${waypointWithImageNoNotes.name}</b>`));

      expect(relevantLayerBinding).toBeDefined();
      const popupHtml = relevantLayerBinding!.boundPopupContent;

      expect(popupHtml).toContain(`<b>${waypointWithImageNoNotes.name}</b>`);
      // Check that "undefined" string is not present for notes
      expect(popupHtml).not.toContain(`<br />undefined`);
      expect(popupHtml).not.toContain(`<br />null`);
      expect(popupHtml).toContain(`<img src="${waypointWithImageNoNotes.imageDataUrl}" alt="${waypointWithImageNoNotes.name} image"`);
      expect(popupHtml).toContain(`<br /><a href="/waypoints/edit/${waypointWithImageNoNotes.id}" target="_blank" rel="noopener noreferrer">Edit Waypoint</a>`);
    });
  });

  test('handles no saved waypoints', async () => {
    mockGetSavedWaypoints.mockResolvedValue([]);
    mockWaypointsToGeoJSON.mockReturnValue(generateMockGeoJSONData([]));
    render(<MapPage />);
    await waitFor(() => expect(screen.getByTestId('geojson-layer')).toBeInTheDocument());
    expect(screen.getByTestId('geojson-layer')).toHaveAttribute('data-features-count', '0');
    expect(mockLayers.length).toBe(0);
  });

  test('handles error fetching waypoints', async () => {
    mockGetSavedWaypoints.mockRejectedValue(new Error("Failed to fetch waypoints"));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<MapPage />);
    await waitFor(() => expect(mockGetSavedWaypoints).toHaveBeenCalled());
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load waypoints for map:", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });

   test('handles geolocation error', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((_, errorCallback) => {
      if (errorCallback) errorCallback(new GeolocationPositionError("Permission denied", GeolocationPositionError.PERMISSION_DENIED));
    });
    render(<MapPage />);
    await waitFor(() => expect(screen.getByText(/Location access denied/i)).toBeInTheDocument());
  });
});

// Minimal GeolocationPositionError if not globally available in test env
if (typeof GeolocationPositionError === 'undefined') {
  class GeolocationPositionErrorGlobal extends Error {
    static readonly PERMISSION_DENIED = 1;
    static readonly POSITION_UNAVAILABLE = 2;
    static readonly TIMEOUT = 3;
    readonly code: number;
    constructor(message = "Geolocation error", code = GeolocationPositionErrorGlobal.PERMISSION_DENIED) {
      super(message);
      this.name = "GeolocationPositionError";
      this.code = code;
    }
  }
  global.GeolocationPositionError = GeolocationPositionErrorGlobal as any;
}
