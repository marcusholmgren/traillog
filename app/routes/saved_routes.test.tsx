import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

const mockRoutesData: db.Route[] = [
  {
    id: 1,
    name: "Scenic Drive",
    waypointIds: [1, 2, 3],
    createdAt: Date.now() - 10000,
  },
  {
    id: 2,
    name: "City Tour",
    waypointIds: [4, 5],
    createdAt: Date.now() - 5000,
  },
  {
    id: 3,
    name: "Mountain Hike",
    waypointIds: [6, 7, 8, 9],
    createdAt: Date.now(),
  },
];

const mockWaypointsForView: Record<number, db.Waypoint> = {
  1: {
    id: 1,
    name: "Start Scenic",
    latitude: 10,
    longitude: 10,
    createdAt: Date.now(),
  },
  2: {
    id: 2,
    name: "Mid Scenic",
    latitude: 11,
    longitude: 11,
    createdAt: Date.now(),
  },
  3: {
    id: 3,
    name: "End Scenic",
    latitude: 12,
    longitude: 12,
    createdAt: Date.now(),
  },
};

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
      expect(screen.getByText(/Waypoints: 3/)).toBeInTheDocument();
      expect(screen.getByText("City Tour")).toBeInTheDocument();
      expect(screen.getByText(/Waypoints: 2/)).toBeInTheDocument();
      expect(screen.getByText("Mountain Hike")).toBeInTheDocument();
      expect(screen.getByText(/Waypoints: 4/)).toBeInTheDocument();
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
    const createButton = screen.getByRole("button", {
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
      expect(
        screen.getByText(
          `Failed to delete route "${routeToDelete.name}". Please try again.`
        )
      ).toBeInTheDocument();
    });
    // Route should still be in the list
    //TODO expect(screen.getByText(routeToDelete.name)).toBeInTheDocument();
    // Dialog should still be open if error is shown within it, or closed if error is global
    // Based on current implementation, dialog closes and error is in main page area.
    // If error was inside dialog, this expectation would change.
    // For now, assume it's a global error message, so dialog would close.
    //TODO expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); // Or check if it's still open depending on UX for error
  });

  it("navigates to map page with correct parameters when 'View' button is clicked", async () => {
    renderWithRouter(<SavedRoutesPage />, { route: "/routes" });
    await waitFor(() => screen.getByText("Scenic Drive"));

    const routeToView = mockRoutesData[0]; // Scenic Drive, IDs: [1,2,3]
    const viewButton = screen.getAllByLabelText(
      `View route ${routeToView.name}`
    )[0];
    fireEvent.click(viewButton);

    const expectedCoordinates = `${mockWaypointsForView[1].longitude},${mockWaypointsForView[1].latitude};${mockWaypointsForView[2].longitude},${mockWaypointsForView[2].latitude};${mockWaypointsForView[3].longitude},${mockWaypointsForView[3].latitude}`;

    await waitFor(() => {
      expect(db.getWaypointById).toHaveBeenCalledWith(1);
      expect(db.getWaypointById).toHaveBeenCalledWith(2);
      expect(db.getWaypointById).toHaveBeenCalledWith(3);
      expect(mockNavigateFn).toHaveBeenCalledWith(
        `/map?waypoints=${expectedCoordinates}`
      );
    });
  });

  it("shows alert if trying to view a route with less than 2 valid waypoints", async () => {
    // Mock getWaypointById to return only one valid waypoint for the first route
    (db.getWaypointById as vi.Mock).mockImplementation(async (id: number) => {
      if (id === mockRoutesData[0].waypointIds[0])
        return mockWaypointsForView[id];
      return undefined; // Other waypoints are invalid/not found
    });

    renderWithRouter(<SavedRoutesPage />, { route: "/routes" });
    await waitFor(() => screen.getByText("Scenic Drive"));

    const routeToView = mockRoutesData[0];
    fireEvent.click(
      screen.getAllByLabelText(`View route ${routeToView.name}`)[0]
    );

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        "Route requires at least 2 valid waypoints to display."
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
