import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EditWaypoint from "./edit_waypoint"; // Component to test
import * as db from "../services/db"; // To mock db functions

// Mock react-router-dom hooks
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: vi.fn(), // Will be customized per test suite or test
  };
});

// Mock db functions
vi.mock("../services/db");

const mockWaypoint: db.Waypoint = {
  id: 1,
  name: "Test Waypoint",
  latitude: 12.345,
  longitude: -67.89,
  createdAt: Date.now(),
  notes: "Some initial notes",
};

describe("EditWaypoint Route Component", () => {
  beforeEach(() => {
    vi.resetAllMocks(); // Reset mocks before each test
    // Default mock for useParams, can be overridden in specific tests
    vi.mocked(require("react-router-dom").useParams).mockReturnValue({ id: "1" });
  });

  const renderComponent = (waypointId = "1") => {
    // Update useParams mock for this render if needed
    vi.mocked(require("react-router-dom").useParams).mockReturnValue({ id: waypointId });

    render(
      <MemoryRouter initialEntries={[`/edit-waypoint/${waypointId}`]}>
        <Routes>
          <Route path="/edit-waypoint/:id" element={<EditWaypoint />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it("should display loading state initially", () => {
    vi.mocked(db.getWaypointById).mockResolvedValueOnce(new Promise(() => {})); // Keep it pending
    renderComponent();
    expect(screen.getByText(/loading waypoint data.../i)).toBeInTheDocument();
  });

  it("should fetch waypoint data and populate the form", async () => {
    vi.mocked(db.getWaypointById).mockResolvedValueOnce(mockWaypoint);
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue(mockWaypoint.name);
    });
    expect(screen.getByLabelText(/notes/i)).toHaveValue(mockWaypoint.notes!);
    expect(screen.getByLabelText(/latitude/i)).toHaveValue(
      String(mockWaypoint.latitude)
    );
    expect(screen.getByLabelText(/longitude/i)).toHaveValue(
      String(mockWaypoint.longitude)
    );
  });

  it("latitude and longitude fields should be read-only", async () => {
    vi.mocked(db.getWaypointById).mockResolvedValueOnce(mockWaypoint);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/latitude/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/latitude/i)).toHaveAttribute("readonly");
    expect(screen.getByLabelText(/longitude/i)).toHaveAttribute("readonly");
  });

  it("should display error message if waypoint not found", async () => {
    vi.mocked(db.getWaypointById).mockResolvedValueOnce(undefined);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/error: waypoint not found/i)).toBeInTheDocument();
    });
  });

  it("should display error message if fetching data fails", async () => {
    vi.mocked(db.getWaypointById).mockRejectedValueOnce(new Error("Fetch failed"));
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/error: failed to fetch waypoint data/i)).toBeInTheDocument();
    });
  });

  it("should update name and notes fields on user input", async () => {
    vi.mocked(db.getWaypointById).mockResolvedValueOnce(mockWaypoint);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/name/i);
    const notesInput = screen.getByLabelText(/notes/i);

    fireEvent.change(nameInput, { target: { value: "New Name" } });
    fireEvent.change(notesInput, { target: { value: "New Notes" } });

    expect(nameInput).toHaveValue("New Name");
    expect(notesInput).toHaveValue("New Notes");
  });

  it("should call updateWaypoint and navigate on successful submission", async () => {
    vi.mocked(db.getWaypointById).mockResolvedValueOnce(mockWaypoint);
    const updatedName = "Updated Waypoint Name";
    const updatedNotes = "These are the updated notes.";
    vi.mocked(db.updateWaypoint).mockResolvedValueOnce({
      ...mockWaypoint,
      name: updatedName,
      notes: updatedNotes,
    });
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: updatedName } });
    fireEvent.change(screen.getByLabelText(/notes/i), { target: { value: updatedNotes } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(db.updateWaypoint).toHaveBeenCalledWith(mockWaypoint.id, {
        name: updatedName,
        notes: updatedNotes,
      });
    });
    expect(await screen.findByText(/waypoint updated successfully!/i)).toBeInTheDocument();

    // Check for navigation (setTimeout in component makes this tricky, advance timers if needed)
    // For now, just check if navigate was called.
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(-1), { timeout: 2000 });
  });

  it("should display error message if updateWaypoint fails", async () => {
    vi.mocked(db.getWaypointById).mockResolvedValueOnce(mockWaypoint);
    vi.mocked(db.updateWaypoint).mockRejectedValueOnce(new Error("Update failed miserably"));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(db.updateWaypoint).toHaveBeenCalled();
    });
    expect(await screen.findByText(/error: update failed miserably/i)).toBeInTheDocument();
  });

  it("should navigate back when Cancel button is clicked", async () => {
    vi.mocked(db.getWaypointById).mockResolvedValueOnce(mockWaypoint);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/cancel/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/cancel/i));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("should navigate back when Close (X icon) button is clicked", async () => {
    vi.mocked(db.getWaypointById).mockResolvedValueOnce(mockWaypoint);
    renderComponent();
    await waitFor(() => {
      // The close button is identified by its aria-label
      expect(screen.getByLabelText(/close/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText(/close/i));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("should handle invalid waypoint ID in params", async () => {
    vi.mocked(require("react-router-dom").useParams).mockReturnValue({ id: "invalid-id" });
    renderComponent("invalid-id"); // Pass it to renderComponent as well for consistency

    await waitFor(() => {
      expect(screen.getByText(/error: invalid waypoint id/i)).toBeInTheDocument();
    });
    // Form fields should not be rendered, or save button should not be active/present
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument(); // Because the form is not rendered
  });

  it("should handle missing waypoint ID in params", async () => {
    vi.mocked(require("react-router-dom").useParams).mockReturnValue({ id: undefined });
    renderComponent(undefined as any); // Pass undefined for the id

    await waitFor(() => {
      expect(screen.getByText(/error: waypoint id is missing/i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();
  });

});
