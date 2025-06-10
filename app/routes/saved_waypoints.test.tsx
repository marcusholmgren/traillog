import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SavedWaypoints from './saved_waypoints';
import { vi } from 'vitest';
import { type Waypoint } from '../services/db';

// --- Mocks ---
const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    NavLink: (props: React.ComponentProps<typeof actual.NavLink>) => <a {...props}>{props.children}</a>,
  };
});

const mockGetSavedWaypoints = vi.fn();
const mockWaypointsToGeoJSON = vi.fn(); // Also mock waypointsToGeoJSON as it's imported
vi.mock('../services/db', () => ({
  getSavedWaypoints: mockGetSavedWaypoints,
  waypointsToGeoJSON: mockWaypointsToGeoJSON, // Provide the mock
}));

// Mock Geolocation for dateFormatter potentially using navigator.languages
Object.defineProperty(global.navigator, 'languages', {
  value: ['en-US'],
  configurable: true,
});

const mockWaypointsList: Waypoint[] = [
  { id: 1, name: 'Waypoint With Image', latitude: 10, longitude: 20, createdAt: Date.now(), imageDataUrl: 'image1.jpg', notes: "Notes for WP1" },
  { id: 2, name: 'Waypoint No Image', latitude: 12, longitude: 22, createdAt: Date.now() - 100000, notes: 'Has notes' },
  { id: 3, name: 'Another With Image', latitude: 15, longitude: 25, createdAt: Date.now() - 200000, imageDataUrl: 'image3.png' },
];

// Helper to format date similar to the component for assertion
const dateFormatterTestHelper = (timestamp: number) => {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'short' }).format(timestamp);
};


describe('SavedWaypoints Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('displays waypoints with and without images correctly', async () => {
    mockGetSavedWaypoints.mockResolvedValue([...mockWaypointsList]);
    render(<SavedWaypoints />);

    await waitFor(() => {
      expect(screen.getByText('Waypoint With Image')).toBeInTheDocument();
    });

    // Waypoint with image
    const img1 = screen.getByAltText('Waypoint With Image thumbnail') as HTMLImageElement;
    expect(img1).toBeInTheDocument();
    expect(img1.src).toContain('image1.jpg');
    expect(screen.getByText(`Lat: ${mockWaypointsList[0].latitude.toFixed(4)}, Lon: ${mockWaypointsList[0].longitude.toFixed(4)}`)).toBeInTheDocument();
    expect(screen.getByText(`Created: ${dateFormatterTestHelper(mockWaypointsList[0].createdAt)}`)).toBeInTheDocument();


    // Waypoint without image
    expect(screen.getByText('Waypoint No Image')).toBeInTheDocument();
    const placeholderForNoImage = screen.getByText('Waypoint No Image').closest('div')?.parentElement?.querySelector('svg'); // Find SVG near 'Waypoint No Image'
    expect(placeholderForNoImage).toBeInTheDocument(); // Check for placeholder SVG
    expect(screen.queryByAltText('Waypoint No Image thumbnail')).not.toBeInTheDocument();
    expect(screen.getByText(`Lat: ${mockWaypointsList[1].latitude.toFixed(4)}, Lon: ${mockWaypointsList[1].longitude.toFixed(4)}`)).toBeInTheDocument();
     expect(screen.getByText(`Created: ${dateFormatterTestHelper(mockWaypointsList[1].createdAt)}`)).toBeInTheDocument();


    // Another waypoint with image
    const img3 = screen.getByAltText('Another With Image thumbnail') as HTMLImageElement;
    expect(img3).toBeInTheDocument();
    expect(img3.src).toContain('image3.png');
     expect(screen.getByText(`Lat: ${mockWaypointsList[2].latitude.toFixed(4)}, Lon: ${mockWaypointsList[2].longitude.toFixed(4)}`)).toBeInTheDocument();
     expect(screen.getByText(`Created: ${dateFormatterTestHelper(mockWaypointsList[2].createdAt)}`)).toBeInTheDocument();


    // Check "Edit" links
    const editLinks = screen.getAllByText('Edit');
    expect(editLinks.length).toBe(mockWaypointsList.length);
    expect(editLinks[0]).toHaveAttribute('href', `/waypoints/edit/${mockWaypointsList[0].id}`);
  });

  test('displays "No waypoints saved yet" message when list is empty', async () => {
    mockGetSavedWaypoints.mockResolvedValue([]);
    render(<SavedWaypoints />);

    await waitFor(() => {
      expect(screen.getByText('No waypoints saved yet.')).toBeInTheDocument();
    });
  });

  test('displays error message when fetching waypoints fails', async () => {
    mockGetSavedWaypoints.mockRejectedValue(new Error('Failed to fetch'));
    render(<SavedWaypoints />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load saved waypoints. Please try again.')).toBeInTheDocument();
    });
  });

  test('navigates back when back button is clicked', async () => {
    mockGetSavedWaypoints.mockResolvedValue([]);
    render(<SavedWaypoints />);
    await userEvent.click(screen.getByTestId('back-saved-waypoints-button'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  test('navigates to add waypoint page when "Add Waypoint" button is clicked', async () => {
    mockGetSavedWaypoints.mockResolvedValue([]);
    render(<SavedWaypoints />);
    // The add button is just an icon in the current structure, find by testid
    await userEvent.click(screen.getByTestId('add-new-waypoint-button'));
    expect(mockNavigate).toHaveBeenCalledWith('/add-waypoint');
  });

  test('handles GeoJSON export correctly', async () => {
    mockGetSavedWaypoints.mockResolvedValue([...mockWaypointsList]);
    const mockGeoJsonData = { type: "FeatureCollection", features: [] }; // Simplified
    mockWaypointsToGeoJSON.mockReturnValue(mockGeoJsonData);

    // Mock Blob and URL.createObjectURL
    const mockCreateObjectURL = vi.fn(() => 'mock-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement('a') and link.click()
    const mockLink = { href: '', download: '', click: vi.fn(), style: { display: '' } };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});


    render(<SavedWaypoints />);
    await waitFor(() => expect(screen.getByText('Waypoint With Image')).toBeInTheDocument()); // Ensure waypoints loaded

    await userEvent.click(screen.getByTestId('export-geojson-button'));

    expect(mockGetSavedWaypoints).toHaveBeenCalledTimes(2); // Initial load + export
    expect(mockWaypointsToGeoJSON).toHaveBeenCalledWith(mockWaypointsList);
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url');

    // Restore spies
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
   test('handles GeoJSON export with no waypoints', async () => {
    mockGetSavedWaypoints.mockResolvedValue([]);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<SavedWaypoints />);
    await waitFor(() => expect(screen.getByText('No waypoints saved yet.')).toBeInTheDocument());

    await userEvent.click(screen.getByTestId('export-geojson-button'));

    expect(alertSpy).toHaveBeenCalledWith("No waypoints to export.");
    expect(mockWaypointsToGeoJSON).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});

create_file_with_block
app/routes/map.test.tsx
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
      expect(popupHtml).not.toContain(`<br />${undefined}`); // Check notes aren't 'undefined' string
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
    // The component currently logs the error but doesn't display a specific UI error message within ActualMap
    // We can check console.error or, if UI error handling were added, test for that.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<MapPage />);
    await waitFor(() => expect(mockGetSavedWaypoints).toHaveBeenCalled());
    // The map will render, but GeoJSON layer might be empty or not present
    expect(screen.getByTestId('map-container')).toBeInTheDocument(); // Map still loads
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to load waypoints for map:", expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
   test('handles geolocation error', async () => {
    mockGeolocation.getCurrentPosition.mockImplementation((_, errorCallback) => {
      if (errorCallback) errorCallback(new GeolocationPositionError("Permission denied", 1));
    });
    render(<MapPage />);
    await waitFor(() => expect(screen.getByText(/Location access denied/i)).toBeInTheDocument());
  });
});

// Minimal GeolocationPositionError if not globally available in test env
if (typeof GeolocationPositionError === 'undefined') {
  class GeolocationPositionError extends Error {
    static PERMISSION_DENIED = 1;
    static POSITION_UNAVAILABLE = 2;
    static TIMEOUT = 3;
    code: number;
    constructor(message = "Geolocation error", code = GeolocationPositionError.PERMISSION_DENIED) {
      super(message);
      this.name = "GeolocationPositionError";
      this.code = code;
    }
  }
  global.GeolocationPositionError = GeolocationPositionError;
}
