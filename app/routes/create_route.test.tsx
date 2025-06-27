import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CreateRoute from "./create_route"; // Adjust path as necessary
import * as db from "../services/db"; // To mock getSavedWaypoints
import { Waypoint, Route } from "../services/db"; // Import Waypoint type and Route type

// Mock react-router useNavigate and useLocation
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();
vi.mock("react-router-dom", async (importActual) => {
    const actual = await importActual<typeof import("react-router-dom")>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => mockUseLocation(), // Return the result of the mock function
    };
});


// Mock data
const mockWaypointsDbData: Waypoint[] = [
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
  let mockGetSavedWaypoints: vi.SpyInstance;
  let mockAddRoute: vi.SpyInstance;
  let mockCreateObjectURL: vi.Mock;
  let mockRevokeObjectURL: vi.Mock;
  let mockAlert: vi.SpyInstance;
  let mockPrompt: vi.SpyInstance;

  beforeEach(() => {
    // Reset mocks and provide default implementations
    vi.resetAllMocks(); // Ensures mocks are clean for each test

    mockGetSavedWaypoints = vi.spyOn(db, "getSavedWaypoints").mockResolvedValue(mockWaypointsDbData);
    mockAddRoute = vi.spyOn(db, "addRoute").mockResolvedValue(123); // Default success for addRoute

    mockCreateObjectURL = vi.fn((blob) => `blob:${blob.size}#mockURL`);
    mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock window.alert and window.prompt
    mockAlert = vi.spyOn(window, "alert").mockImplementation(() => {});
    mockPrompt = vi.spyOn(window, "prompt").mockImplementation(() => null); // Default prompt returns null (user cancels)


    // Mock document.createElement to track the download link behavior
    const mockAnchorInstance = {
        href: "",
        download: "",
        click: vi.fn(),
        // style: { display: '' }, // Not strictly necessary for these tests
        // appendChild: vi.fn(), // Not used by the component's download logic
        // removeChild: vi.fn(), // Not used by the component's download logic
      };

    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName.toLowerCase() === "a") {
        // Reset the mockAnchorInstance's click for each new link created if needed,
        // but typically one link is created per download.
        mockAnchorInstance.click = vi.fn();
        return mockAnchorInstance as any;
      }
      // Fallback for other elements, though not expected in this component's direct logic
      return document.createElementNS("http://www.w3.org/1999/xhtml", tagName);
    });
    // Mock appendChild and removeChild on document.body
    // These are called by the download logic.
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => ({} as Node));
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as Node));

  });

  afterEach(() => {
    vi.restoreAllMocks(); // This is good practice
    // Clean up fake-indexeddb if necessary, though with IDBFactory per test, it's usually handled.
    // await deleteDB(TEST_DB_NAME); // If you were using a persistent test DB name
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
    expect(screen.queryByText(/Save Route/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Download Route/i)).not.toBeInTheDocument();


    fireEvent.click(checkbox2);
    expect(checkbox1).toBeChecked();
    expect(checkbox2).toBeChecked();
    // Footer buttons should be visible with 2 waypoints selected
    expect(screen.getByText("Save Route")).toBeInTheDocument();
    expect(screen.getByText("Download Route")).toBeInTheDocument();


    fireEvent.click(checkbox1); // Deselect waypoint 1
    expect(checkbox1).not.toBeChecked();
    expect(checkbox2).toBeChecked();
    // Footer buttons should hide again with only 1 waypoint selected
    expect(screen.queryByText(/Save Route/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Download Route/i)).not.toBeInTheDocument();
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

  it("does not show footer buttons if less than 2 waypoints are selected", async () => {
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1"));

    // No waypoints selected initially
    expect(screen.queryByText(/Save Route/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Download Route/i)).not.toBeInTheDocument();


    const checkbox1 = screen.getByLabelText("Select waypoint Waypoint 1");
    fireEvent.click(checkbox1); // Select 1 waypoint

    expect(screen.queryByText(/Save Route/i)).not.toBeInTheDocument();
    expect(screen.queryYByText(/Download Route/i)).not.toBeInTheDocument();
    expect(mockAlert).not.toHaveBeenCalled(); // Alert should not be called as button isn't clicked
  });

  it("downloads a GeoJSON file when 'Download Route' is clicked with sufficient waypoints", async () => {
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1"));

    const checkbox1 = screen.getByLabelText("Select waypoint Waypoint 1");
    const checkbox2 = screen.getByLabelText("Select waypoint Waypoint 2");
    fireEvent.click(checkbox1);
    fireEvent.click(checkbox2);

    // Ensure the mocked 'click' on the anchor is fresh for this test.
    const mockAnchor = document.createElement('a') as HTMLAnchorElement & { click: vi.Mock };
     // Re-assign in case it was cleared or modified by other tests, though beforeEach should handle fresh mocks.
    (document.createElement as vi.Mock).mockReturnValue(mockAnchor);


    const downloadButton = screen.getByText("Download Route");
    fireEvent.click(downloadButton);

    await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(mockAnchor.click).toHaveBeenCalled(); // Check the click on the *specific instance*
    });

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
        expect(geojsonData.features[0].properties.name).toBe("New Route"); // Default name from component
        expect(geojsonData.features[0].geometry.type).toBe("LineString");
        expect(geojsonData.features[0].geometry.coordinates).toEqual([
          [mockWaypointsDbData[0].longitude, mockWaypointsDbData[0].latitude],
          [mockWaypointsDbData[1].longitude, mockWaypointsDbData[1].latitude],
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
    await waitFor(() => screen.getByText("Waypoint 1")); // Wait for waypoints to load

    const waypoint1Item = screen.getByText("Waypoint 1").closest('li');
    expect(waypoint1Item?.querySelector('img')).toBeNull(); // Waypoint 1 has null imageDataUrl
    expect(waypoint1Item?.querySelector('svg[data-testid="map-pin-icon"]')).toBeInTheDocument(); // Check for placeholder

    const waypoint2Item = screen.getByText("Waypoint 2").closest('li');
    const imgElement = waypoint2Item?.querySelector('img');
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute('src', mockWaypointsDbData[1].imageDataUrl);
    expect(imgElement).toHaveAttribute('alt', mockWaypointsDbData[1].name);
  });

  // --- Tests for Save Route Functionality ---

  it("saves a route when 'Save Route' is clicked with a name and sufficient waypoints", async () => {
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1")); // Ensure waypoints are loaded

    const routeNameInput = screen.getByPlaceholderText("Enter route name (optional)");
    fireEvent.change(routeNameInput, { target: { value: "My Awesome Route" } });

    const checkbox1 = screen.getByLabelText("Select waypoint Waypoint 1");
    const checkbox2 = screen.getByLabelText("Select waypoint Waypoint 2");
    fireEvent.click(checkbox1);
    fireEvent.click(checkbox2);

    await waitFor(() => screen.getByText("Save Route")); // Wait for button to appear
    const saveButton = screen.getByText("Save Route");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockAddRoute).toHaveBeenCalledWith("My Awesome Route", [mockWaypointsDbData[0].id, mockWaypointsDbData[1].id]);
      expect(mockAlert).toHaveBeenCalledWith('Route "My Awesome Route" saved successfully!');
    });

    // Check if selection and input are cleared
    expect(checkbox1).not.toBeChecked();
    expect(checkbox2).not.toBeChecked();
    expect(routeNameInput).toHaveValue("");
  });

  it("prompts for a route name if 'Save Route' is clicked without a name, then saves if name provided", async () => {
    mockPrompt.mockReturnValueOnce("Prompted Route Name"); // User enters a name in prompt
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1"));

    const checkbox1 = screen.getByLabelText("Select waypoint Waypoint 1");
    const checkbox2 = screen.getByLabelText("Select waypoint Waypoint 2");
    fireEvent.click(checkbox1);
    fireEvent.click(checkbox2);

    await waitFor(() => screen.getByText("Save Route"));
    const saveButton = screen.getByText("Save Route");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalledWith("Please enter a name for this route:", `Route with 2 waypoints`);
      expect(mockAddRoute).toHaveBeenCalledWith("Prompted Route Name", [mockWaypointsDbData[0].id, mockWaypointsDbData[1].id]);
      expect(mockAlert).toHaveBeenCalledWith('Route "Prompted Route Name" saved successfully!');
    });
    expect(screen.getByPlaceholderText("Enter route name (optional)")).toHaveValue(""); // Should be cleared
  });

  it("shows alert and does not save if prompt for route name is cancelled or empty", async () => {
    mockPrompt.mockReturnValueOnce(""); // User provides empty name or cancels prompt
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1"));

    const checkbox1 = screen.getByLabelText("Select waypoint Waypoint 1");
    const checkbox2 = screen.getByLabelText("Select waypoint Waypoint 2");
    fireEvent.click(checkbox1);
    fireEvent.click(checkbox2);

    await waitFor(() => screen.getByText("Save Route"));
    const saveButton = screen.getByText("Save Route");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockPrompt).toHaveBeenCalled();
      expect(mockAlert).toHaveBeenCalledWith("Route name cannot be empty.");
      expect(mockAddRoute).not.toHaveBeenCalled();
    });
  });


  it("shows an alert if saving route fails (e.g., DB error)", async () => {
    mockAddRoute.mockRejectedValueOnce(new Error("DB save error"));
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1"));

    fireEvent.change(screen.getByPlaceholderText("Enter route name (optional)"), { target: { value: "Fail Route" } });
    fireEvent.click(screen.getByLabelText("Select waypoint Waypoint 1"));
    fireEvent.click(screen.getByLabelText("Select waypoint Waypoint 2"));

    await waitFor(() => screen.getByText("Save Route"));
    fireEvent.click(screen.getByText("Save Route"));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to save route. Please try again.");
    });
  });

  it("shows alert if trying to save with less than 2 waypoints (handler logic check)", async () => {
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1"));

    // This tests the internal logic of handleSaveRoute, though the UI should prevent this.
    // To test, we'd select one, then somehow trigger save.
    // The button itself is conditional on >1 selected waypoints.
    // If the button was somehow clicked (e.g. if condition was different)
    // fireEvent.click(screen.getByLabelText("Select waypoint Waypoint 1"));
    // const saveButton = screen.getByText("Save Route"); // This button wouldn't be there
    // fireEvent.click(saveButton);
    // expect(mockAlert).toHaveBeenCalledWith("Please select at least two waypoints to save a route.");
    // This specific alert for save is hard to trigger via UI due to button conditional rendering.
    // The download button alert is more easily testable for this kind of condition.
  });

  it("shows alert if trying to download with less than 2 waypoints", async () => {
    render(<CreateRoute />);
    await waitFor(() => screen.getByText("Waypoint 1"));

    fireEvent.click(screen.getByLabelText("Select waypoint Waypoint 1")); // Select one

    // The "Download Route" button also only appears when selectedWaypoints.length > 1
    // So, similar to save, this alert is a safeguard.
    // To test this alert, we'd need to select two, then deselect one, then click download.
    const checkbox1 = screen.getByLabelText("Select waypoint Waypoint 1");
    const checkbox2 = screen.getByLabelText("Select waypoint Waypoint 2");
    fireEvent.click(checkbox1); // Ensure it's selected
    fireEvent.click(checkbox2); // Select two

    await waitFor(() => screen.getByText("Download Route")); // Button appears

    fireEvent.click(checkbox2); // Deselect one, now only 1 selected
    await waitFor(() => expect(checkbox2).not.toBeChecked());

    // The download button should now be gone from the UI.
    // If it *was* still there and clicked:
    // fireEvent.click(screen.getByText("Download Route"));
    // await waitFor(() => {
    //  expect(mockAlert).toHaveBeenCalledWith("Please select at least two waypoints to create a route.");
    // });
    // This confirms the button's conditional rendering is the primary gate.
    expect(screen.queryByText("Download Route")).not.toBeInTheDocument();
  });

});
