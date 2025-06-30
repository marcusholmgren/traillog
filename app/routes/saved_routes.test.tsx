import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { expect, it, vi } from "vitest";
import SavedRoutesPage from "./saved_routes";
import * as db from "../services/db"; // To mock db functions
import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";

// Mock the db module
vi.mock("../services/db", async (importOriginal) => {
  const actual = await importOriginal<typeof db>();
  return {
    ...actual,
    getSavedRoutes: vi.fn(),
    deleteRoute: vi.fn(),
    getWaypointById: vi.fn(), // Also mock getWaypointById if view logic uses it
  };
});

// Mock react-router useNavigate
const mockNavigateFn = vi.fn();
vi.mock("react-router-dom", async (importActual) => {
  const actual = await importActual<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigateFn,
  };
});

const mockWaypointsForView: Record<number, db.Waypoint> = {
  1: { id: 1, name: "Start Scenic", latitude: 10, longitude: 10, createdAt: Date.now() - 20000 },
  2: { id: 2, name: "Mid Scenic", latitude: 11, longitude: 11, createdAt: Date.now() - 19000 },
  3: { id: 3, name: "End Scenic", latitude: 12, longitude: 12, createdAt: Date.now() - 18000 },
  4: { id: 4, name: "City Start", latitude: 20, longitude: 20, createdAt: Date.now() - 17000 },
  5: { id: 5, name: "City End", latitude: 21, longitude: 21, createdAt: Date.now() - 16000 },
  6: { id: 6, name: "Hike P1", latitude: 30, longitude: 30, createdAt: Date.now() - 15000 },
  7: { id: 7, name: "Hike P2", latitude: 31, longitude: 31, createdAt: Date.now() - 14000 },
  8: { id: 8, name: "Hike P3", latitude: 32, longitude: 32, createdAt: Date.now() - 13000 },
  9: { id: 9, name: "Hike P4", latitude: 33, longitude: 33, createdAt: Date.now() - 12000 },
};

const mockRoutesData: db.Route[] = [
  {
    id: 1,
    name: "Scenic Drive",
    geometry: {
      type: "LineString",
      coordinates: [
        [mockWaypointsForView[1].longitude, mockWaypointsForView[1].latitude],
        [mockWaypointsForView[2].longitude, mockWaypointsForView[2].latitude],
        [mockWaypointsForView[3].longitude, mockWaypointsForView[3].latitude],
      ]
    },
    createdAt: Date.now() - 10000,
  },
  {
    id: 2,
    name: "City Tour",
    geometry: {
      type: "LineString",
      coordinates: [
        [mockWaypointsForView[4].longitude, mockWaypointsForView[4].latitude],
        [mockWaypointsForView[5].longitude, mockWaypointsForView[5].latitude],
      ]
    },
    createdAt: Date.now() - 5000,
  },
  {
    id: 3,
    name: "Mountain Hike",
    geometry: {
      type: "LineString",
      coordinates: [
        [mockWaypointsForView[6].longitude, mockWaypointsForView[6].latitude],
        [mockWaypointsForView[7].longitude, mockWaypointsForView[7].latitude],
        [mockWaypointsForView[8].longitude, mockWaypointsForView[8].latitude],
        [mockWaypointsForView[9].longitude, mockWaypointsForView[9].latitude],
      ]
    },
    createdAt: Date.now(),
  },
];

// Helper to wrap component in Router
const renderWithRouter = (ui: React.ReactElement, { route = "/" } = {}) => {
  window.history.pushState({}, "Test page", route);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/routes" element={ui} />
        <Route path="/routes/create" element={<div>Create Route Page</div>} />
        <Route path="/map" element={<div>Map Page</div>} />{" "}
        {/* Mock map page */}
      </Routes>
    </MemoryRouter>
  );
};

describe("SavedRoutesPage", () => {
  beforeEach(() => {
    indexedDB = new IDBFactory(); // Fresh IndexedDB
    vi.resetAllMocks(); // Reset all mocks

    // Default mock implementations
    (db.getSavedRoutes as vi.Mock).mockResolvedValue(mockRoutesData);
    (db.deleteRoute as vi.Mock).mockResolvedValue(undefined);
    (db.getWaypointById as vi.Mock).mockImplementation(
      async (id: number) => mockWaypointsForView[id]
    );

    window.alert = vi.fn(); // Mock window.alert
    // No window.confirm in the component, but good practice if it were
  });

  it("loads and displays saved routes", async () => {
    renderWithRouter(<SavedRoutesPage />, { route: "/routes" });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Scenic Drive")).toBeInTheDocument();
      expect(screen.getByText(/Points: 3/)).toBeInTheDocument(); // Changed "Waypoints" to "Points"
      expect(screen.getByText("City Tour")).toBeInTheDocument();
      expect(screen.getByText(/Points: 2/)).toBeInTheDocument(); // Changed "Waypoints" to "Points"
      expect(screen.getByText("Mountain Hike")).toBeInTheDocument();
      expect(screen.getByText(/Points: 4/)).toBeInTheDocument(); // Changed "Waypoints" to "Points"
    });
    expect(db.getSavedRoutes).toHaveBeenCalledTimes(1);
  });

  it("shows an error message if loading routes fails", async () => {
    (db.getSavedRoutes as vi.Mock).mockRejectedValueOnce(
      new Error("Failed to fetch routes")
    );
    renderWithRouter(<SavedRoutesPage />, { route: "/routes" });
    await waitFor(() => {
      expect(
        screen.getByText("Failed to load saved routes. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("shows 'No Saved Routes Yet' message and 'Create New Route' button if no routes are present", async () => {
    (db.getSavedRoutes as vi.Mock).mockResolvedValue([]);
    renderWithRouter(<SavedRoutesPage />, { route: "/routes" });
    await waitFor(() => {
      expect(screen.getByText("No Saved Routes Yet")).toBeInTheDocument();
      expect(
        screen.getByText(
          "It looks like you haven't saved any routes. Create one now!"
        )
      ).toBeInTheDocument();
    });
    // The "Create New Route" button is now part of the emptyStateContent which is rendered within the main landmark
    const mainContent = screen.getByRole("main");
    const createButton = within(mainContent).getByRole("button", {
      name: /Create New Route/i,
    });
    expect(createButton).toBeInTheDocument();
    fireEvent.click(createButton);
    expect(mockNavigateFn).toHaveBeenCalledWith("/routes/create");
  });

  it("opens delete confirmation dialog when delete button is clicked", async () => {
    renderWithRouter(<SavedRoutesPage />, { route: "/routes" });
    await waitFor(() => screen.getByText("Scenic Drive"));

    const deleteButtons = screen.getAllByLabelText(/Delete route/i);
    fireEvent.click(deleteButtons[0]); // Click delete for "Scenic Drive"

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Delete Route")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Are you sure you want to delete the route "Scenic Drive"?/
        )
      ).toBeInTheDocument();
    });
  });

  it("closes delete confirmation dialog when cancel is clicked", async () => {
    renderWithRouter(<SavedRoutesPage />, { route: "/routes" });
    await waitFor(() => screen.getByText("Scenic Drive"));

    fireEvent.click(screen.getAllByLabelText(/Delete route/i)[0]); // Open dialog for first route
    await waitFor(() => screen.getByRole("dialog")); // Wait for dialog

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("deletes a route and removes it from the list when confirmed", async () => {
    renderWithRouter(<SavedRoutesPage />, { route: "/routes" });
    await waitFor(() => screen.getByText("Scenic Drive")); // Wait for routes to load

    const routeToDelete = mockRoutesData[0]; // Scenic Drive

    const deleteButtons = screen.getAllByLabelText(
      `Delete route ${routeToDelete.name}`
    );
    fireEvent.click(deleteButtons[0]); // Open dialog

    await waitFor(() => screen.getByRole("dialog"));
    const confirmDeleteButton = screen.getByRole("button", { name: "Delete" });
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(db.deleteRoute).toHaveBeenCalledWith(routeToDelete.id);
      expect(screen.queryByText(routeToDelete.name)).not.toBeInTheDocument(); // Check if removed from UI
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); // Dialog should be closed
    // Ensure other routes are still present
    expect(screen.getByText("City Tour")).toBeInTheDocument();
  });

  it("shows error if deleting a route fails", async () => {
    (db.deleteRoute as vi.Mock).mockRejectedValueOnce(
      new Error("Deletion failed")
    );
    renderWithRouter(<SavedRoutesPage />, { route: "/routes" });
    await waitFor(() => screen.getByText("Scenic Drive"));

    const routeToDelete = mockRoutesData[0];
    fireEvent.click(
      screen.getAllByLabelText(`Delete route ${routeToDelete.name}`)[0]
    );
    await waitFor(() => screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      // The hook sets a generic error message now.
      // This error message is rendered by ResourceList, replacing the list of items.
      expect(
        screen.getByText("Failed to delete route. Please try again.")
      ).toBeInTheDocument();
    });
    // When ResourceList displays an error, it does not display the items.
    // So, the route name should NOT be in the document as part of the list.
    expect(screen.queryByText(routeToDelete.name)).not.toBeInTheDocument();
    // Dialog should REMAIN OPEN if deletion fails, allowing user to retry or cancel.
    // The error is displayed in the main page area by ResourceList.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("navigates to map page with correct parameters when 'View' button is clicked", async () => {
    renderWithRouter(<SavedRoutesPage />, { route: "/routes" });
    await waitFor(() => screen.getByText("Scenic Drive"));

    const routeToView = mockRoutesData[0]; // Scenic Drive, IDs: [1,2,3]
    // Updated aria-label
    const viewButton = screen.getAllByLabelText(
      `View route ${routeToView.name} on map`
    )[0];
    fireEvent.click(viewButton);

    const expectedCoordinates = routeToView.geometry.coordinates
      .map(coord => `${coord[0]},${coord[1]}`)
      .join(';');
    const expectedRouteName = encodeURIComponent(routeToView.name);

    await waitFor(() => {
      // db.getWaypointById should not be called anymore for this
      expect(db.getWaypointById).not.toHaveBeenCalled();
      expect(mockNavigateFn).toHaveBeenCalledWith(
        `/map?waypoints=${expectedCoordinates}&routeName=${expectedRouteName}`
      );
    });
  });

  it("shows alert if trying to view a route with less than 2 valid waypoints", async () => {
    // Modify the mock data for a specific route to have less than 2 points
    const routeWithFewPoints = {
      ...mockRoutesData[0], // Scenic Drive
      geometry: {
        type: "LineString" as "LineString", // Added type assertion
        coordinates: [[mockWaypointsForView[1].longitude, mockWaypointsForView[1].latitude]]
      }
    };
    (db.getSavedRoutes as vi.Mock).mockResolvedValue([routeWithFewPoints, ...mockRoutesData.slice(1)]);

    renderWithRouter(<SavedRoutesPage />, { route: "/routes" });
    await waitFor(() => screen.getByText("Scenic Drive")); // Wait for the specific route

    fireEvent.click(
      screen.getByLabelText(`View route ${routeWithFewPoints.name} on map`)
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Route does not have enough coordinates to display on the map."
      );
      expect(mockNavigateFn).not.toHaveBeenCalledWith(
        expect.stringContaining("/map")
      );
    });
  });

  it("navigates back when header back button is clicked", async () => {
    renderWithRouter(<SavedRoutesPage />, { route: "/routes" });
    await waitFor(() => screen.getByText("Saved Routes")); // Wait for page title or some content

    const header = screen.getByRole("banner");
    const backButton = header.querySelector("button"); // Assuming it's the first button
    expect(backButton).toBeInTheDocument();
    if (backButton) {
      fireEvent.click(backButton);
    }
    expect(mockNavigateFn).toHaveBeenCalledWith(-1);
  });
});
