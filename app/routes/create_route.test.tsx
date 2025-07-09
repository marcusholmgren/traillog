import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateRoute from "./create_route";
import * as db from "~/services/db";
import type { Waypoint } from "~/services/db"; // Ensure Waypoint type is imported

// Mock the db module
vi.mock("~/services/db", async () => {
  const actual = await vi.importActual("~/services/db");
  return {
    ...actual,
    getSavedWaypoints: vi.fn(),
    addRoute: vi.fn(),
  };
});

// Mock useNavigate
const mockedNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

const mockWaypoints: Waypoint[] = [
  {
    id: "1",
    name: "Waypoint 1",
    latitude: 34.0522,
    longitude: -118.2437,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Waypoint 2",
    latitude: 36.1699,
    longitude: -115.1398,
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Waypoint 3",
    latitude: 40.7128,
    longitude: -74.006,
    createdAt: new Date().toISOString(),
  },
];

describe("CreateRoute", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (db.getSavedWaypoints as vi.Mock).mockResolvedValue(mockWaypoints);
    (db.addRoute as vi.Mock).mockResolvedValue(undefined);
  });

  test("renders loading state initially", () => {
    (db.getSavedWaypoints as vi.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  test("renders waypoints after loading", async () => {
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("Waypoint 1")).toBeInTheDocument();
      expect(screen.getByText("Waypoint 2")).toBeInTheDocument();
      expect(screen.getByText("Waypoint 3")).toBeInTheDocument();
    });
  });

  test("allows selecting and deselecting waypoints", async () => {
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>
    );
    await waitFor(() => screen.getByText("Waypoint 1"));

    // Select Waypoint 1
    fireEvent.click(screen.getByText("Waypoint 1").closest("li")!);
    expect(
      screen.getByLabelText("Select waypoint Waypoint 1")
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("1")).toBeInTheDocument(); // Order badge

    // Select Waypoint 2
    fireEvent.click(screen.getByText("Waypoint 2").closest("li")!);
    expect(
      screen.getByLabelText("Select waypoint Waypoint 2")
    ).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("2")).toBeInTheDocument(); // Order badge

    // Deselect Waypoint 1
    fireEvent.click(screen.getByText("Waypoint 1").closest("li")!);
    expect(
      screen.getByLabelText("Select waypoint Waypoint 1")
    ).toHaveAttribute("aria-checked", "false");
    // Waypoint 2 should now be 1
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  test("does not display distance when less than 2 waypoints are selected", async () => {
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>
    );
    await waitFor(() => screen.getByText("Waypoint 1"));
    expect(screen.queryByText(/Selected Route Distance:/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Waypoint 1").closest("li")!);
    expect(screen.queryByText(/Selected Route Distance:/)).not.toBeInTheDocument();
  });

  test("calculates and displays route distance when 2 or more waypoints are selected", async () => {
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>
    );
    await waitFor(() => screen.getByText("Waypoint 1"));

    // Select Waypoint 1
    fireEvent.click(screen.getByText("Waypoint 1").closest("li")!);
    // Select Waypoint 2
    fireEvent.click(screen.getByText("Waypoint 2").closest("li")!);

    let distanceW1W2Text = "";
    await waitFor(() => {
      const distanceDisplay = screen.getByText(/Selected Route Distance:/);
      expect(distanceDisplay).toBeInTheDocument();
      // Waypoint 1: 34.0522, -118.2437
      // Waypoint 2: 36.1699, -115.1398
      // Expected distance is approx 367.61 km
      expect(distanceDisplay).toHaveTextContent("367.61 km");
      distanceW1W2Text = distanceDisplay.textContent || "0 km";
    });

    // Select Waypoint 3
    fireEvent.click(screen.getByText("Waypoint 3").closest("li")!);
    let distanceW1W2W3Text = "";
    await waitFor(() => {
      const distanceDisplay = screen.getByText(/Selected Route Distance:/);
      expect(distanceDisplay.textContent).toContain(" km");
      expect(distanceDisplay.textContent).not.toBe(distanceW1W2Text);

      const currentNumericDistance = parseFloat(distanceDisplay.textContent?.match(/(\d+\.\d+)/)?.[0] || "0");
      const previousNumericDistance = parseFloat(distanceW1W2Text.match(/(\d+\.\d+)/)?.[0] || "0");
      // Adding a third waypoint should generally increase the distance
      expect(currentNumericDistance).toBeGreaterThan(previousNumericDistance);
      distanceW1W2W3Text = distanceDisplay.textContent || "0 km";
    });

     // Deselect Waypoint 2
    fireEvent.click(screen.getByText("Waypoint 2").closest("li")!);
    await waitFor(() => {
      const distanceDisplay = screen.getByText(/Selected Route Distance:/);
      expect(distanceDisplay.textContent).toContain(" km");
      expect(distanceDisplay.textContent).not.toBe(distanceW1W2W3Text);
      // This specific distance d(W1,W3) should be ~3965.14 km.
      // Let's check if it's reasonably close to that.
      const numericDistanceW1W3 = parseFloat(distanceDisplay.textContent?.match(/(\d+\.\d+)/)?.[0] || "0");
      expect(numericDistanceW1W3).toBeGreaterThan(3900);
      expect(numericDistanceW1W3).toBeLessThan(4000);
      // And ensure it's different from the W1-W2 distance
      expect(distanceDisplay.textContent).not.toBe(distanceW1W2Text);
    });
  });

  test("shows alert if trying to save/download with less than 2 waypoints", async () => {
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>
    );
    await waitFor(() => screen.getByText("Waypoint 1"));

    // Footer with save/download buttons should not be visible yet
    expect(screen.queryByText("Save Route")).not.toBeInTheDocument();
    expect(screen.queryByText("Download Route")).not.toBeInTheDocument();

    // Select one waypoint
    fireEvent.click(screen.getByText("Waypoint 1").closest("li")!);
    // Footer should still not be visible
    expect(screen.queryByText("Save Route")).not.toBeInTheDocument();
    expect(screen.queryByText("Download Route")).not.toBeInTheDocument();

    // Select second waypoint - now footer should be visible
    fireEvent.click(screen.getByText("Waypoint 2").closest("li")!);
    await waitFor(() => {
      expect(screen.getByText("Save Route")).toBeInTheDocument();
      expect(screen.getByText("Download Route")).toBeInTheDocument();
    });

    // Deselect one waypoint - footer should hide
    fireEvent.click(screen.getByText("Waypoint 1").closest("li")!);
     await waitFor(() => {
      expect(screen.queryByText("Save Route")).not.toBeInTheDocument();
      expect(screen.queryByText("Download Route")).not.toBeInTheDocument();
    });
  });


  test("prompts for route name if not set when saving", async () => {
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>
    );
    await waitFor(() => screen.getByText("Waypoint 1"));

    fireEvent.click(screen.getByText("Waypoint 1").closest("li")!);
    fireEvent.click(screen.getByText("Waypoint 2").closest("li")!);

    await waitFor(() => screen.getByText("Save Route"));
    fireEvent.click(screen.getByText("Save Route"));

    await waitFor(() => {
      expect(screen.getByText("Route Name")).toBeInTheDocument(); // Dialog title
      expect(
        screen.getByPlaceholderText("Route with 2 waypoints")
      ).toBeInTheDocument();
    });
  });

  test("saves the route with a given name", async () => {
    render(
      <MemoryRouter>
        <CreateRoute />
      </MemoryRouter>
    );
    await waitFor(() => screen.getByText("Waypoint 1"));

    fireEvent.click(screen.getByText("Waypoint 1").closest("li")!);
    fireEvent.click(screen.getByText("Waypoint 2").closest("li")!);

    await waitFor(() => screen.getByText("Save Route"));
    fireEvent.click(screen.getByText("Save Route"));


    await waitFor(() => screen.getByPlaceholderText("Route with 2 waypoints"));
    fireEvent.change(screen.getByPlaceholderText("Route with 2 waypoints"), {
      target: { value: "My Test Route" },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));


    await waitFor(() => {
      expect(db.addRoute).toHaveBeenCalledWith("My Test Route", ["1", "2"]);
      expect(screen.getByText("Success!")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(mockedNavigate).toHaveBeenCalledWith("/routes");
  });
});

// Helper to ensure Vitest types are available for vi global
declare var vi: any;
