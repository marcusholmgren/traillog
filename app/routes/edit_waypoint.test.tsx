import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { MemoryRouter } from "react-router";
import EditWaypoint, { clientLoader, clientAction } from "./edit_waypoint";
import * as db from "~/services/db";
import * as geolocation from "~/services/geolocation";
import * as imageCaptureHook from "~/hooks/useImageCapture";

// Mock dependencies
vi.mock("~/services/db");
vi.mock("~/services/geolocation");
vi.mock("~/hooks/useImageCapture");

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useNavigation: () => ({ state: "idle" }),
    Form: ({ children, ...props }: { children: React.ReactNode }) => (
      <form {...props}>{children}</form>
    ),
  };
});

const mockDb = db as { getWaypointById: Mock; updateWaypoint: Mock };
const mockGeolocation = geolocation as { 
    getCurrentPosition: Mock; 
    calculateCompassDirection: Mock;
    translateToShorthand: Mock;
};
const mockUseImageCapture = imageCaptureHook as { useImageCapture: Mock };

const mockWaypoint = {
  id: 1,
  name: "Test Waypoint",
  latitude: 34.0522,
  longitude: -118.2437,
  notes: "Some notes",
  imageDataUrl: "data:image/png;base64,initial_image",
};

describe("EditWaypoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockUseImageCapture.useImageCapture.mockReturnValue({
      capturedImage: null,
      setCapturedImage: vi.fn(),
      imageError: null,
      isCapturing: false,
      videoRef: { current: null },
      handleCaptureImageClick: vi.fn(),
      handleTakePhotoFromStream: vi.fn(),
      handleCancelCamera: vi.fn(),
      handleChooseFileClick: vi.fn(),
      handleRemoveImageClick: vi.fn(),
    });
    mockGeolocation.getCurrentPosition.mockResolvedValue({
      coords: { latitude: 35, longitude: -120 },
    } as any);
    mockGeolocation.calculateCompassDirection.mockReturnValue(123.45);
    mockGeolocation.translateToShorthand.mockReturnValue("SE");
  });

  describe("clientLoader", () => {
    it("should return waypoint and compass data on success", async () => {
      mockDb.getWaypointById.mockResolvedValue(mockWaypoint);
      const response = await clientLoader({ params: { wpId: "1" } } as any);
      expect(response.waypoint).toEqual(mockWaypoint);
      expect(response.error).toBeNull();
      expect(response.bearing).toBe(123.45);
      expect(response.direction).toBe("SE");
    });

    it("should return an error if waypoint not found", async () => {
      mockDb.getWaypointById.mockResolvedValue(undefined);
      const response = await clientLoader({ params: { wpId: "99" } } as any);
      expect(response.waypoint).toBeUndefined();
      expect(response.error).toBe("Waypoint not found.");
    });

    it("should return an error for an invalid ID", async () => {
      const response = await clientLoader({ params: { wpId: "abc" } } as any);
      expect(response.error).toBe("Invalid Waypoint ID.");
    });
  });

  describe("clientAction", () => {
    it("should update waypoint and redirect on valid data", async () => {
      const formData = new FormData();
      formData.append("name", "Updated Name");
      formData.append("notes", "Updated notes");
      const request = new Request("http://localhost", { method: "POST", body: formData });

      const response = await clientAction({ request, params: { wpId: "1" } } as any);

      expect(mockDb.updateWaypoint).toHaveBeenCalledWith(1, {
        name: "Updated Name",
        notes: "Updated notes",
        altitude: undefined,
        imageDataUrl: null, // formData.get returns null for missing fields
      });
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/waypoints");
    });

    it("should return an error if name is missing", async () => {
      const formData = new FormData();
      formData.append("name", "");
      const request = new Request("http://localhost", { method: "POST", body: formData });
      const response = await clientAction({ request, params: { wpId: "1" } } as any);
      expect(response.error).toBe("Waypoint name is required.");
    });
  });

  describe("Component UI", () => {
    const mockLoaderData = {
      waypoint: mockWaypoint,
      bearing: 123,
      direction: "SE",
      error: null,
    };

    it("renders form fields with default values from loaderData", () => {
      render(<EditWaypoint loaderData={mockLoaderData} actionData={null} />);
      expect(screen.getByLabelText(/name/i)).toHaveValue(mockWaypoint.name);
      expect(screen.getByLabelText(/notes/i)).toHaveValue(mockWaypoint.notes);
      expect(screen.getByLabelText(/latitude/i)).toHaveValue(String(mockWaypoint.latitude));
    });

    it("displays an error if loaderData contains an error", () => {
      render(<EditWaypoint loaderData={{ error: "Waypoint not found." }} actionData={null} />);
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(screen.getByText("Waypoint not found.")).toBeInTheDocument();
    });

    it("displays an error if actionData contains an error", () => {
        render(<EditWaypoint loaderData={mockLoaderData} actionData={{ error: "Update failed."}} />);
        expect(screen.getByText("Error: Update failed.")).toBeInTheDocument();
    });

    it("navigates back when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <EditWaypoint loaderData={mockLoaderData} actionData={null} />
        </MemoryRouter>
      );
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it("initializes image capture with image from loaderData", () => {
        const setCapturedImage = vi.fn();
        mockUseImageCapture.useImageCapture.mockReturnValueOnce({ setCapturedImage });
        render(<EditWaypoint loaderData={mockLoaderData} actionData={null} />);
        expect(setCapturedImage).toHaveBeenCalledWith(mockWaypoint.imageDataUrl);
    });
  });
});