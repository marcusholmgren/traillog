import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import MapPage from "./map";
import { MemoryRouter } from "react-router"; // Required for components using useSearchParams

import { vi } from "vitest";

// Mock Leaflet and its components as they are not relevant to this test
// and will cause errors in a Node environment.
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer"></div>,
  Marker: ({ position }: { position: [number, number] }) => (
    <div
      data-testid="marker"
      data-latitude={position[0]}
      data-longitude={position[1]}
    ></div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  GeoJSON: () => <div data-testid="geojson"></div>,
  LayersControl: Object.assign(
    ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    {
      BaseLayer: ({ children }: { children: React.ReactNode }) => (
        <div>{children}</div>
      ),
    }
  ),
  useMap: () => ({}), // Mock useMap hook
}));

// Mock db services
vi.mock("../services/db", () => ({
  getSavedWaypoints: vi.fn().mockResolvedValue([]),
  waypointsToGeoJSON: vi
    .fn()
    .mockReturnValue({ type: "FeatureCollection", features: [] }),
}));

const mockWatchPosition = vi.fn();
const mockClearWatch = vi.fn();
const mockGetCurrentPosition = vi.fn();
let trueOriginalGeolocation: any; // To store the very original geolocation

describe("MapPage", () => {
  beforeAll(() => {
    trueOriginalGeolocation = navigator.geolocation; // Store the true original once
    // Set to our mock object for the entire suite
    // @ts-ignore
    navigator.geolocation = {
      watchPosition: mockWatchPosition,
      clearWatch: mockClearWatch,
      getCurrentPosition: mockGetCurrentPosition,
    };
  });

  afterAll(() => {
    // Restore the true original after all tests in the suite
    // @ts-ignore
    navigator.geolocation = trueOriginalGeolocation;
  });

  beforeEach(() => {
    // Only reset spies, navigator.geolocation is already our mock object
    mockWatchPosition.mockReset();
    mockClearWatch.mockReset();
    mockGetCurrentPosition.mockReset();
  });

  it("displays loading state initially", () => {
    // Prevent success/error callbacks to keep it in loading state
    mockWatchPosition.mockImplementationOnce((success, error) => {
      // No calls to success or error
      return 1; // Return a mock watchId
    });
    render(
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>
    );
    expect(screen.getByText("Loading location...")).toBeInTheDocument();
  });

  it("displays an error if geolocation is not supported", () => {
    const sharedMock = navigator.geolocation; // Store the shared mock
    // @ts-ignore
    navigator.geolocation = undefined; // Temporarily set to undefined for this test
    render(
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>
    );
    expect(
      screen.getByText("Geolocation is not supported by your browser.")
    ).toBeInTheDocument();
    // @ts-ignore
    navigator.geolocation = sharedMock; // Restore the shared mock
  });

  /*
  it("successfully gets and displays initial location and updates on watch", async () => {
    let successCallback: ((position: GeolocationPosition) => void) | null =
      null;

    mockWatchPosition.mockImplementationOnce((success) => {
      successCallback = success;
      // Simulate initial position
      act(() => {
        success({
          coords: {
            latitude: 51.505,
            longitude: -0.09,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: 0,
            speed: null,
          },
          timestamp: Date.now(),
        });
      });
      return 1; // watchId
    });

    render(
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>
    );

    // Wait for loading to finish and initial marker to appear
    await waitFor(async () => {
      expect(screen.queryByText("Loading location...")).not.toBeInTheDocument();
      const marker = await screen.findByTestId("marker");
      expect(marker).toHaveAttribute("data-latitude", "51.505");
      expect(marker).toHaveAttribute("data-longitude", "-0.09");
      const compass = await screen.findByTestId("compass-icon");
      expect(compass).toHaveAttribute("data-heading", "0");
    });

    // Simulate a position update
    act(() => {
      if (successCallback) {
        successCallback({
          coords: {
            latitude: 52.0,
            longitude: -0.1,
            accuracy: 10,
            altitude: null,
            altitudeAccuracy: null,
            heading: 90,
            speed: null,
          },
          timestamp: Date.now(),
        });
      }
    });

    // Wait for the marker and compass to update
    await waitFor(async () => {
      const marker = await screen.findByTestId("marker");
      expect(marker).toHaveAttribute("data-latitude", "52");
      expect(marker).toHaveAttribute("data-longitude", "-0.1");
      const compass = await screen.findByTestId("compass-icon");
      expect(compass).toHaveAttribute("data-heading", "90");
    });

    expect(mockWatchPosition).toHaveBeenCalledTimes(1);
  });
  */

  /*
  it('handles permission denied error and uses fallback location', async () => {
    mockWatchPosition.mockImplementationOnce((success, errorCallback) => { // added success for consistency
      act(() => {
        if (errorCallback) {
          errorCallback({
            code: 1, // PERMISSION_DENIED
            message: 'User denied Geolocation',
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
          } as GeolocationPositionError);
        }
      });
      return 1;
    });

    render(
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>
    );

    await waitFor(async () => {
      expect(screen.queryByText('Loading location...')).not.toBeInTheDocument();
      expect(await screen.findByText('Location access denied. Please enable location services to see the map.')).toBeInTheDocument();

      // Check for fallback location
      const marker = await screen.findByTestId('marker');
      expect(marker).toHaveAttribute('data-latitude', '51.505'); // Default fallback
      expect(marker).toHaveAttribute('data-longitude', '-0.09');  // Default fallback
    });
  });
  */

  it("clears watchPosition on unmount", async () => {
    // Made test async
    const watchId = 123;
    mockWatchPosition.mockImplementationOnce((success, error) => {
      // Do not call success or error, keep position null
      return watchId;
    });

    const { unmount } = render(
      <MemoryRouter>
        <MapPage />
      </MemoryRouter>
    );

    // Expect it to stay in loading location state or error state, but not render ActualMap
    // We don't need to wait for "Loading location..." to disappear here.
    // The main point is that unmount calls clearWatch.

    unmount();
    expect(mockClearWatch).toHaveBeenCalledWith(watchId);
  });
});
