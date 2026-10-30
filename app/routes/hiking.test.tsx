import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, it, expect, beforeEach, test, vi, type Mock } from "vitest";
import HikingPage, { loadActiveHike, saveActiveHike, clearActiveHike } from "./hiking";
import * as db from "~/services/db";
import * as geolocation from "~/services/geolocation";

// Mock db module
vi.mock("~/services/db", async () => {
  const actual = await vi.importActual("~/services/db");
  return {
    ...actual,
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

function createMockPosition(lat: number, lon: number, alt = 50, accuracy = 10, timestamp = Date.now()): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lon,
      altitude: alt,
      accuracy: accuracy,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      toJSON: () => ({}),
    },
    timestamp,
    toJSON: () => ({}),
  };
}

describe("HikingPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    (db.addRoute as unknown as Mock).mockResolvedValue(1);
  });

  test("renders initial state when no active hike is saved", () => {
    render(
      <MemoryRouter>
        <HikingPage />
      </MemoryRouter>
    );

    expect(screen.getByText("Hiking Mode")).toBeInTheDocument();
    expect(screen.getByText("Ready to Hike?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start Hike" })).toBeInTheDocument();
    expect(screen.getByText("Waypoints Recorded (0)")).toBeInTheDocument();
  });

  test("starts hike and persists initial waypoint to localStorage", async () => {
    const mockPosition = createMockPosition(37.7749, -122.4194, 50, 10, 1600000000000);

    vi.spyOn(geolocation, "getCurrentPosition").mockResolvedValue(mockPosition);

    render(
      <MemoryRouter>
        <HikingPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: "Start Hike" }));

    await waitFor(() => {
      expect(screen.getByText("Elapsed Time")).toBeInTheDocument();
      expect(screen.getByText("Add Waypoint")).toBeInTheDocument();
      expect(screen.getByText("Finish & Save")).toBeInTheDocument();
      expect(screen.getByText("Waypoints Recorded (1)")).toBeInTheDocument();
      expect(screen.getByText("Point A")).toBeInTheDocument();
    });

    const saved = loadActiveHike();
    expect(saved).not.toBeNull();
    expect(saved?.isHiking).toBe(true);
    expect(saved?.waypoints.length).toBe(1);
    expect(saved?.waypoints[0].latitude).toBe(37.7749);
    expect(saved?.waypoints[0].longitude).toBe(-122.4194);
  });

  test("restores active hike session from localStorage on mount", async () => {
    const savedHike = {
      isHiking: true,
      startTime: Date.now() - 60000,
      waypoints: [
        {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 50,
          accuracy: 10,
          timestamp: Date.now() - 60000,
          label: "Point A",
        },
        {
          latitude: 37.7750,
          longitude: -122.4195,
          altitude: 55,
          accuracy: 10,
          timestamp: Date.now() - 30000,
          label: "Point B",
        },
      ],
    };

    saveActiveHike(savedHike);

    render(
      <MemoryRouter>
        <HikingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Waypoints Recorded (2)")).toBeInTheDocument();
      expect(screen.getByText("Point A")).toBeInTheDocument();
      expect(screen.getByText("Point B")).toBeInTheDocument();
      expect(screen.getByText("Add Waypoint")).toBeInTheDocument();
      expect(screen.getByText("Finish & Save")).toBeInTheDocument();
    });
  });

  test("adds subsequent waypoints to active hike", async () => {
    const initialHike = {
      isHiking: true,
      startTime: Date.now() - 120000,
      waypoints: [
        {
          latitude: 37.7749,
          longitude: -122.4194,
          altitude: 50,
          accuracy: 10,
          timestamp: Date.now() - 120000,
          label: "Point A",
        },
      ],
    };

    saveActiveHike(initialHike);

    const secondPosition = createMockPosition(37.7760, -122.4200, 60, 5);

    vi.spyOn(geolocation, "getCurrentPosition").mockResolvedValue(secondPosition);

    render(
      <MemoryRouter>
        <HikingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Waypoints Recorded (1)")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Add Waypoint" }));

    await waitFor(() => {
      expect(screen.getByText("Waypoints Recorded (2)")).toBeInTheDocument();
      expect(screen.getByText("Point B")).toBeInTheDocument();
    });

    const saved = loadActiveHike();
    expect(saved?.waypoints.length).toBe(2);
    expect(saved?.waypoints[1].label).toBe("Point B");
  });

  test("finishes hike, prompts for route name, saves to IndexedDB and clears active hike state", async () => {
    const activeHike = {
      isHiking: true,
      startTime: Date.now() - 120000,
      waypoints: [
        {
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: Date.now() - 120000,
          label: "Point A",
        },
        {
          latitude: 37.7760,
          longitude: -122.4200,
          timestamp: Date.now() - 60000,
          label: "Point B",
        },
      ],
    };

    saveActiveHike(activeHike);

    render(
      <MemoryRouter>
        <HikingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Finish & Save")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Finish & Save" }));

    await waitFor(() => {
      expect(screen.getByText("Save Hike Route")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Hike with 2 waypoints"), {
      target: { value: "Mountain Trail Hike" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save Route" }));

    await waitFor(() => {
      expect(db.addRoute).toHaveBeenCalledWith("Mountain Trail Hike", {
        type: "LineString",
        coordinates: [
          [-122.4194, 37.7749],
          [-122.4200, 37.7760],
        ],
      });
      expect(screen.getByText("Success!")).toBeInTheDocument();
    });

    // Verify localStorage active hike was cleared
    expect(loadActiveHike()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    expect(mockedNavigate).toHaveBeenCalledWith("/routes");
  });

  test("allows discarding active hike session", async () => {
    const activeHike = {
      isHiking: true,
      startTime: Date.now() - 120000,
      waypoints: [
        {
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: Date.now() - 120000,
          label: "Point A",
        },
      ],
    };

    saveActiveHike(activeHike);

    render(
      <MemoryRouter>
        <HikingPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Discard Active Hike")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Discard Active Hike"));

    await waitFor(() => {
      expect(screen.getByText("Discard Active Hike?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));

    await waitFor(() => {
      expect(screen.getByText("Ready to Hike?")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Start Hike" })).toBeInTheDocument();
    });

    expect(loadActiveHike()).toBeNull();
  });
});
