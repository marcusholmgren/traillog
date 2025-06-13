import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import SavedWaypoints from "./saved_waypoints";
import { Waypoint, getSavedWaypoints, deleteWaypoint } from "../services/db";
import { MemoryRouter } from "react-router-dom";
import { useNavigate, NavLink } from "react-router";
import { vi } from "vitest";

// Helper function to read File content
async function readFileContent(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      reject(reader.error);
    };
    reader.readAsText(file);
  });
}

vi.mock("../services/db", async () => {
  const actualDb = await vi.importActual("../services/db");
  return {
    // @ts-ignore
    ...actualDb,
    getSavedWaypoints: vi.fn(),
    deleteWaypoint: vi.fn(),
  };
});

const mockNavigatorShare = vi.fn();
const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

vi.mock("react-router", () => ({
  useNavigate: vi.fn(() => vi.fn()),
  NavLink: vi.fn(({ children, to }) => <a href={to as string}>{children}</a>),
}));


Object.defineProperty(global.navigator, 'share', {
  value: mockNavigatorShare,
  configurable: true,
  writable: true,
});

global.console.warn = vi.fn();
global.console.error = vi.fn();

const mockWaypoints: Waypoint[] = [
  {
    id: 1,
    name: "Waypoint Alpha",
    latitude: 12.3456,
    longitude: 78.91011,
    createdAt: Date.now() - 100000,
    imageDataUrl: "data:image/png;base64,alphathumbnail",
  },
  {
    id: 2,
    name: "Waypoint Beta",
    latitude: 34.5678,
    longitude: 90.12345,
    createdAt: Date.now(),
    imageDataUrl: null,
  },
];

describe("SavedWaypoints Component", () => {
  beforeEach(() => {
    mockNavigatorShare.mockReset();
    mockAlert.mockClear();
    (getSavedWaypoints as ReturnType<typeof vi.fn>).mockReset();
    (deleteWaypoint as ReturnType<typeof vi.fn>).mockReset();
    (global.console.warn as ReturnType<typeof vi.fn>).mockClear();
    (global.console.error as ReturnType<typeof vi.fn>).mockClear();
    (useNavigate as ReturnType<typeof vi.fn>).mockReset();
    (useNavigate as ReturnType<typeof vi.fn>).mockImplementation(() => vi.fn());
    (NavLink as ReturnType<typeof vi.fn>).mockClear();
  });

  const renderComponent = async (currentMockWaypoints: Waypoint[] = mockWaypoints) => {
    (getSavedWaypoints as ReturnType<typeof vi.fn>).mockResolvedValue([...currentMockWaypoints]);
    render(
      <MemoryRouter>
        <SavedWaypoints />
      </MemoryRouter>
    );
    if (currentMockWaypoints.length > 0) {
      await screen.findByText(currentMockWaypoints[0].name, {}, { timeout: 3000 });
    }
  };

  describe("Share Functionality", () => {
    test("should call navigator.share with GeoJSON file when share button is clicked", async () => {
      await renderComponent();
      const waypointToShare = mockWaypoints[0];
      const shareButton = screen.getByTestId(`share-waypoint-button-${waypointToShare.id}`);
      await act(async () => { fireEvent.click(shareButton); });

      expect(mockNavigatorShare).toHaveBeenCalledTimes(1);
      const shareArgs = mockNavigatorShare.mock.calls[0][0];
      expect(shareArgs.title).toBe(`Share Waypoint: ${waypointToShare.name}`);
      expect(shareArgs.text).toBe(`Waypoint: ${waypointToShare.name} - Lat: ${waypointToShare.latitude.toFixed(4)}, Lon: ${waypointToShare.longitude.toFixed(4)}`);
      expect(shareArgs.files).toHaveLength(1);

      const file = shareArgs.files[0] as File; // Cast to File
      expect(file.name).toBe(`${waypointToShare.name}.geojson`);
      expect(file.type).toBe("application/geo+json");

      const fileContent = await readFileContent(file); // Use helper to read file
      const geojson = JSON.parse(fileContent);

      expect(geojson.type).toBe("FeatureCollection");
      expect(geojson.features).toHaveLength(1);
      const feature = geojson.features[0];
      expect(feature.geometry.type).toBe("Point");
      expect(feature.geometry.coordinates).toEqual([
        waypointToShare.longitude,
        waypointToShare.latitude,
      ]);
      expect(feature.properties.name).toBe(waypointToShare.name);
      expect(feature.properties.id).toBe(waypointToShare.id);
    });

    test("should alert if navigator.share is not available when share button is clicked", async () => {
        const currentWaypoints = [mockWaypoints[0]];
        await renderComponent(currentWaypoints);
        const originalShare = global.navigator.share;
        Object.defineProperty(global.navigator, 'share', { value: undefined, configurable: true });
        const shareButton = screen.getByTestId(`share-waypoint-button-${currentWaypoints[0].id}`);
        await act(async () => { fireEvent.click(shareButton); });
        expect(mockAlert).toHaveBeenCalledWith("Web Share API is not supported in your browser. Try copying the details manually.");
        Object.defineProperty(global.navigator, 'share', { value: originalShare, configurable: true });
    });

    test("should handle errors during navigator.share when share button is clicked", async () => {
        const currentWaypoints = [mockWaypoints[0]];
        await renderComponent(currentWaypoints);
        const errorMessage = "Test share error";
        mockNavigatorShare.mockRejectedValueOnce(new Error(errorMessage));
        const shareButton = screen.getByTestId(`share-waypoint-button-${currentWaypoints[0].id}`);
        await act(async () => { fireEvent.click(shareButton); });
        expect(mockAlert).toHaveBeenCalledWith("Error sharing: " + errorMessage);
    });

    test("should correctly create GeoJSON for waypoint name with special characters", async () => {
        const specialCharWaypoint: Waypoint = { id: 3, name: "Waypoint with !@#$%^&*()_+-=[]{};':\",./<>?", latitude: 10, longitude: 20, createdAt: Date.now(), imageDataUrl: null };
        await renderComponent([specialCharWaypoint]);
        const shareButton = screen.getByTestId(`share-waypoint-button-${specialCharWaypoint.id}`);
        await act(async () => { fireEvent.click(shareButton); });

        expect(mockNavigatorShare).toHaveBeenCalledTimes(1);
        const shareArgs = mockNavigatorShare.mock.calls[0][0];
        const file = shareArgs.files[0] as File; // Cast to File
        expect(file.name).toBe(`${specialCharWaypoint.name}.geojson`);

        const fileContent = await readFileContent(file); // Use helper to read file
        const geojson = JSON.parse(fileContent);
        expect(geojson.features[0].properties.name).toBe(specialCharWaypoint.name);
    });
  });
});
