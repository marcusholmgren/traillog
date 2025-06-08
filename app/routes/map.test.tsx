import { render, screen, waitFor } from '@testing-library/react';
import MapPage from './map';
import { vi } from 'vitest';

// Mock Leaflet (L object)
vi.mock('leaflet', () => {
  const mockL = {
    map: vi.fn().mockReturnValue({ setView: vi.fn(), on: vi.fn(), remove: vi.fn() }),
    tileLayer: vi.fn().mockReturnValue({ addTo: vi.fn() }),
    marker: vi.fn().mockReturnValue({ addTo: vi.fn(), bindPopup: vi.fn().mockReturnThis(), openPopup: vi.fn() }),
    popup: vi.fn(),
    icon: vi.fn(),
    Icon: { Default: vi.fn().mockImplementation(() => ({ options: {} })) },
  };
  (mockL.Icon.Default as any).prototype = { options: {}, _getIconUrl: undefined, mergeOptions: vi.fn() };
  (mockL.Icon.Default as any).mergeOptions = vi.fn();
  return { __esModule: true, default: mockL, ...mockL };
});

// Mock react-leaflet components
vi.mock('react-leaflet', () => ({
  __esModule: true,
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer"></div>,
  Marker: ({ children }: { children?: React.ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
}));

describe('MapPage', () => {
  const mockGeolocation = {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(), // Not used in component, but good to have in mock
    clearWatch: vi.fn()   // Not used in component
  };

  let originalGeolocation: Geolocation | undefined;

  beforeEach(() => {
    vi.resetAllMocks(); // Reset all mocks

    // Ensure navigator object exists
    if (typeof global.navigator === 'undefined') {
      (global as any).navigator = {};
    }

    originalGeolocation = global.navigator.geolocation;
    (global.navigator as any).geolocation = mockGeolocation;
  });

  afterEach(() => {
    // Restore original geolocation if it existed
    if (originalGeolocation) {
      (global.navigator as any).geolocation = originalGeolocation;
    } else {
      // If we created navigator.geolocation, delete it
      delete (global.navigator as any).geolocation;
    }
    // If navigator itself was created by us and is empty, remove it.
    if (typeof global.navigator === 'object' && Object.keys(global.navigator).length === 0) {
        delete (global as any).navigator;
    }
  });

  test('renders loading state initially', () => {
    // Prevent getCurrentPosition from calling success or error immediately
    mockGeolocation.getCurrentPosition.mockImplementationOnce(() => {});
    render(<MapPage />);
    expect(screen.getByText('Loading location...')).toBeInTheDocument();
  });

  test('renders map with marker when geolocation is successful', async () => {
    const mockPosition = {
      coords: { latitude: 51.505, longitude: -0.09, accuracy: 10, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: Date.now(),
    };
    mockGeolocation.getCurrentPosition.mockImplementationOnce((successCallback) => {
      successCallback(mockPosition);
    });

    render(<MapPage />);
    await waitFor(() => expect(screen.getByTestId('map-container')).toBeInTheDocument());
    expect(screen.getByTestId('marker')).toBeInTheDocument();
    expect(screen.getByTestId('popup')).toHaveTextContent('You are here.Latitude: 51.505, Longitude: -0.09');
  });

  test('renders error message when geolocation is not supported by browser', async () => {
    // Simulate navigator.geolocation being undefined
    const tempOriginalGeolocation = global.navigator.geolocation; // Save current mock
    (global.navigator as any).geolocation = undefined;

    render(<MapPage />);
    await waitFor(() => expect(screen.getByText('Geolocation is not supported by your browser.')).toBeInTheDocument());

    // Restore the mock for other tests
    (global.navigator as any).geolocation = tempOriginalGeolocation;
  });

  test('renders error message when location access is denied', async () => {
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success, errorCallback) => {
      const error = new Error('User denied Geolocation') as GeolocationPositionError;
      (error as any).code = 1; // PERMISSION_DENIED
      errorCallback(error);
    });

    render(<MapPage />);
    await waitFor(() => expect(screen.getByText('Location access denied. Please enable location services in your browser settings.')).toBeInTheDocument());
  });

  test('renders generic error message for other geolocation errors', async () => {
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success, errorCallback) => {
      const error = new Error('Other geolocation error') as GeolocationPositionError;
      (error as any).code = 2; // POSITION_UNAVAILABLE or other codes
      errorCallback(error);
    });

    render(<MapPage />);
    await waitFor(() => expect(screen.getByText('Error getting location: Other geolocation error')).toBeInTheDocument());
  });
});
