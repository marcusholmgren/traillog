
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import AddWaypoint, { clientLoader, clientAction } from "./add_waypoint";
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

const mockDb = db as { addWaypoint: Mock };
const mockGeolocation = geolocation as { getCurrentPosition: Mock };
const mockUseImageCapture = imageCaptureHook as { useImageCapture: Mock };

const mockSuccessPosition = {
  coords: {
    latitude: 34.0522,
    longitude: -118.2437,
    altitude: 70.0,
  },
};

describe("AddWaypoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockUseImageCapture.useImageCapture.mockReturnValue({
      capturedImage: null,
      imageError: null,
      isCapturing: false,
      videoRef: { current: null },
      streamRef: { current: null },
      handleCaptureImageClick: vi.fn(),
      handleTakePhotoFromStream: vi.fn(),
      handleCancelCamera: vi.fn(),
      handleChooseFileClick: vi.fn(),
      handleRemoveImageClick: vi.fn(),
    });
  });

  describe("clientLoader", () => {
    it("should return location data on success", async () => {
      mockGeolocation.getCurrentPosition.mockResolvedValue(mockSuccessPosition);
      const response = await clientLoader({} as any);
      expect(response.latitude).toBe(mockSuccessPosition.coords.latitude);
    });

    it("should return an error message on failure", async () => {
      const error = new Error("User denied geolocation");
      mockGeolocation.getCurrentPosition.mockRejectedValue(error);
      const response = await clientLoader({} as any);
      expect(response.error).toBe(`Error getting location: ${error.message}`);
    });
  });

  describe("clientAction", () => {
    it("should save waypoint and redirect on valid data", async () => {
      const formData = new FormData();
      formData.append("name", "Test Waypoint");
      formData.append("latitude", "34.0522");
      formData.append("longitude", "-118.2437");
      const request = new Request("http://localhost", { method: "POST", body: formData });
      mockDb.addWaypoint.mockResolvedValue({ id: 1 });
      const response = await clientAction({ request } as any);
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/waypoints");
    });

    it("should return an error if name is missing", async () => {
        const formData = new FormData();
        formData.append("name", "");
        const request = new Request("http://localhost", { method: "POST", body: formData });
        const response = await clientAction({ request } as any);
        expect(response.error).toBe("Waypoint name is required.");
    });
  });

  describe("Component UI", () => {
    const mockLoaderData = {
      latitude: 34.0522,
      longitude: -118.2437,
      altitude: 70,
      error: null,
    };

    it("renders form fields and displays coordinates", () => {
      render(<AddWaypoint loaderData={mockLoaderData} actionData={null} />);
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      const coordsInput = screen.getByLabelText(/coordinates/i) as HTMLInputElement;
      expect(coordsInput.value).toBe("34.0522, -118.2437");
    });

    it("displays 'Loading...' for coordinates if data is null", () => {
      render(<AddWaypoint loaderData={{ latitude: null, longitude: null }} actionData={null} />);
      const coordsInput = screen.getByLabelText(/coordinates/i) as HTMLInputElement;
      expect(coordsInput.value).toBe("Loading...");
    });

    it("navigates back when cancel button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter initialEntries={["/"]}>
            <AddWaypoint loaderData={mockLoaderData} actionData={null} />
        </MemoryRouter>
      );
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      await user.click(cancelButton);
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });
});
