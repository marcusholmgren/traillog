import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CreateRoute from "./create_route"; // Adjust path as necessary
import * as db from "../services/db"; // To mock getSavedWaypoints
import { Waypoint } from "../services/db"; // Import Waypoint type

// Mock react-router useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  ...vi.importActual("react-router"),
  useNavigate: () => mockNavigate,
}));

// Mock data
const mockWaypoints: Waypoint[] = [
  {
    id: 1,
    name: "Waypoint 1",
    latitude: 10,
    longitude: 20,
    createdAt: new Date().toISOString(),
    altitude: 100,
    imageDataUrl: null,
  },
  {
    id: 2,
    name: "Waypoint 2",
    latitude: 11,
    longitude: 21,
    createdAt: new Date().toISOString(),
    altitude: 101,
    imageDataUrl: "data:image/png;base64,test",
  },
  {
    id: 3,
    name: "Waypoint 3",
    latitude: 12,
    longitude: 22,
    createdAt: new Date().toISOString(),
    altitude: null,
    imageDataUrl: null,
  },
];

describe("CreateRoute Component", () => {
  let mockGetSavedWaypoints: any;
  let mockCreateObjectURL: any;
  let mockRevokeObjectURL: any;
  let mockAlert: any;

  beforeEach(() => {
    mockGetSavedWaypoints = vi
      .spyOn(db, "getSavedWaypoints")
      .mockResolvedValue(mockWaypoints);

    // Mock URL.createObjectURL and URL.revokeObjectURL
    mockCreateObjectURL = vi.fn((blob) => `blob:${blob.size}#mockURL`);
    mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock window.alert
    mockAlert = vi.spyOn(window, "alert").mockImplementation(() => {});

    // Mock document.createElement to track the download link
    // Store the mocked click function to check if it was called
    const mockAnchorClick = vi.fn();
    const originalCreateElement = document.createElement; // Save original
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      // Use the saved original function for creating the element
      const elem = originalCreateElement.call(document, tagName);
      if (tagName.toLowerCase() === 'a') {
        // @ts-ignore
        elem.click = mockAnchorClick;
      }
      return elem;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders loading state initially", () => {
    render(<CreateRoute />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("fetches and displays waypoints", async () => {
    render(<CreateRoute />);
    await waitFor(() => {
      expect(screen.getByText("Waypoint 1")).toBeInTheDocument();
      expect(screen.getByText("Waypoint 2")).toBeInTheDocument();
      expect(screen.getByText("Waypoint 3")).toBeInTheDocument();
    });
    expect(mockGetSavedWaypoints).toHaveBeenCalledTimes(1);
  });

  it("displays an error message if fetching waypoints fails", async () => {
    mockGetSavedWaypoints.mockRejectedValueOnce(
      new Error("Failed to fetch")
    );
    render(<CreateRoute />);
    await waitFor(() => {
      expect(
        screen.getByText("Failed to load saved waypoints. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("displays message when no waypoints are available", async () => {
    mockGetSavedWaypoints.mockResolvedValueOnce([]);
    render(<CreateRoute />);
    await waitFor(() => {
      expect(screen.getByText("No waypoints available to create a route. Add some waypoints first.")).toBeInTheDocument();
    });
  });

  it("allows selecting and deselecting waypoints and shows/hides create button", async () => {
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1"));

    const checkbox1 = screen.getByLabelText("Select waypoint Waypoint 1");
    const checkbox2 = screen.getByLabelText("Select waypoint Waypoint 2");

    fireEvent.click(checkbox1);
    expect(checkbox1).toBeChecked();
    expect(checkbox2).not.toBeChecked();
    // Create and Download button should not be visible with only 1 waypoint selected
    expect(screen.queryByText(/Create and Download Route/)).not.toBeInTheDocument();

    fireEvent.click(checkbox2);
    expect(checkbox1).toBeChecked();
    expect(checkbox2).toBeChecked();
    // Button should be visible with 2 waypoints selected
    expect(screen.getByText("Create and Download Route (2 waypoints)")).toBeInTheDocument();

    fireEvent.click(checkbox1); // Deselect waypoint 1
    expect(checkbox1).not.toBeChecked();
    expect(checkbox2).toBeChecked();
    // Button should hide again with only 1 waypoint selected
    expect(screen.queryByText(/Create and Download Route/)).not.toBeInTheDocument();
  });

  it("navigates back when back button is clicked", async () => {
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1"));

    // The back button is the first button in the header
    const header = screen.getByRole('banner');
    const backButton = header.querySelector('button');
    expect(backButton).toBeInTheDocument();
    if (backButton) {
      fireEvent.click(backButton);
    }
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("does not show create route button if less than 2 waypoints are selected", async () => {
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1"));

    // No waypoints selected initially
    expect(screen.queryByText(/Create and Download Route/)).not.toBeInTheDocument();

    const checkbox1 = screen.getByLabelText("Select waypoint Waypoint 1");
    fireEvent.click(checkbox1); // Select 1 waypoint

    expect(screen.queryByText(/Create and Download Route/)).not.toBeInTheDocument();
    expect(mockAlert).not.toHaveBeenCalled(); // Alert should not be called as button isn't clicked
  });


  it("creates and downloads a GeoJSON file for a valid route", async () => {
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1"));

    const checkbox1 = screen.getByLabelText("Select waypoint Waypoint 1");
    const checkbox2 = screen.getByLabelText("Select waypoint Waypoint 2");
    fireEvent.click(checkbox1);
    fireEvent.click(checkbox2);

    const createButton = screen.getByText("Create and Download Route (2 waypoints)");
    fireEvent.click(createButton);

    expect(mockCreateObjectURL).toHaveBeenCalled();
    // @ts-ignore - check that the mocked anchor click was called
    expect(vi.mocked(document.createElement('a').click)).toHaveBeenCalled();


    // Verify GeoJSON structure from the blob passed to createObjectURL
    const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
    expect(blobArg.type).toBe("application/json");

    const reader = new FileReader();
    await new Promise<void>((resolve, reject) => { // Ensure void promise for async/await
      reader.onload = () => {
        const geojsonData = JSON.parse(reader.result as string);
        expect(geojsonData.type).toBe("FeatureCollection");
        expect(geojsonData.features.length).toBe(1);
        expect(geojsonData.features[0].type).toBe("Feature");
        expect(geojsonData.features[0].properties.name).toBe("New Route");
        expect(geojsonData.features[0].geometry.type).toBe("LineString");
        expect(geojsonData.features[0].geometry.coordinates).toEqual([
          [mockWaypoints[0].longitude, mockWaypoints[0].latitude],
          [mockWaypoints[1].longitude, mockWaypoints[1].latitude],
        ]);
        resolve();
      };
      reader.onerror = reject;
      reader.readAsText(blobArg);
    });

    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

   it("uses waypoint image if available, otherwise placeholder", async () => {
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1"));

    const waypoint1Item = screen.getByText("Waypoint 1").closest('li');
    expect(waypoint1Item?.querySelector('img')).toBeNull();
    expect(waypoint1Item?.querySelector('svg')).toBeInTheDocument();

    const waypoint2Item = screen.getByText("Waypoint 2").closest('li');
    const imgElement = waypoint2Item?.querySelector('img');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', mockWaypoints[1].imageDataUrl);
    expect(imgElement).toHaveAttribute('alt', mockWaypoints[1].name);
  });

});
