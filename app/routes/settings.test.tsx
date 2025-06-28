import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Settings from "./settings";
import * as db from "~/services/db";
import { vi } from "vitest";
import "@testing-library/jest-dom";

// Mock the db module
vi.mock("~/services/db", async () => {
  const actual = await vi.importActual("~/services/db");
  return {
    ...actual,
    exportWaypoints: vi.fn(),
    importWaypoints: vi.fn(),
    exportRoutes: vi.fn(),
    importRoutes: vi.fn(),
    clearAllWaypoints: vi.fn(),
  };
});

// Mock file-saver or URL.createObjectURL if used directly for downloads
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn(); // Mock revokeObjectURL
const mockAnchorClick = vi.fn();
const mockAnchorRemove = vi.fn();

// Store original properties
const originalAnchorClick = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'click');
const originalAnchorRemove = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'remove');

Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
  value: mockAnchorClick,
  writable: true,
  configurable: true,
});
Object.defineProperty(HTMLAnchorElement.prototype, 'remove', {
 value: mockAnchorRemove,
 writable: true,
 configurable: true,
});


describe("Settings Page", () => {
  beforeEach(() => {
    vi.resetAllMocks(); // Reset mocks before each test
  });

  it("renders settings heading", () => {
    render(<Settings />);
    expect(screen.getByRole("heading", { name: /settings/i })).toBeInTheDocument();
  });

  describe("Waypoints Import/Export", () => {
    it("calls exportWaypoints and triggers download on export click", async () => {
      (db.exportWaypoints as vi.Mock).mockResolvedValue('{"type":"FeatureCollection","features":[]}');
      render(<Settings />);
      fireEvent.click(screen.getByRole("button", { name: /export waypoints/i }));

      await waitFor(() => expect(db.exportWaypoints).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockAnchorClick).toHaveBeenCalledTimes(1));
      // Check if success message appears (optional, based on implementation)
      // await waitFor(() => expect(screen.getByText(/operation successful/i)).toBeInTheDocument());
    });

    it("calls importWaypoints on file input change", async () => {
      render(<Settings />);
      const file = new File(['{"type":"FeatureCollection","features":[]}'], "waypoints.geojson", { type: "application/json" });
      const fileInput = screen.getByTestId("import-waypoints-input");

      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => expect(db.importWaypoints).toHaveBeenCalledTimes(1));
      expect(db.importWaypoints).toHaveBeenCalledWith('{"type":"FeatureCollection","features":[]}');
      await waitFor(() => expect(screen.getByText(/operation successful/i)).toBeInTheDocument());
    });

     it("shows error message on exportWaypoints failure", async () => {
      (db.exportWaypoints as vi.Mock).mockRejectedValue(new Error("Export failed"));
      render(<Settings />);
      fireEvent.click(screen.getByRole("button", { name: /export waypoints/i }));

      await waitFor(() => expect(db.exportWaypoints).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByText(/an error occurred/i)).toBeInTheDocument());
    });

    it("shows error message on importWaypoints failure", async () => {
      (db.importWaypoints as vi.Mock).mockRejectedValue(new Error("Import failed"));
      render(<Settings />);
      const file = new File(["invalid json"], "waypoints.geojson", { type: "application/json" });
      const fileInput = screen.getByTestId("import-waypoints-input");


      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => expect(db.importWaypoints).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByText(/an error occurred/i)).toBeInTheDocument());
    });
  });

  describe("Routes Import/Export", () => {
    it("calls exportRoutes and triggers download on export click", async () => {
      (db.exportRoutes as vi.Mock).mockResolvedValue('[]');
      render(<Settings />);
      fireEvent.click(screen.getByRole("button", { name: /export routes/i }));

      await waitFor(() => expect(db.exportRoutes).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(mockAnchorClick).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByText(/operation successful/i)).toBeInTheDocument());
    });

    it("calls importRoutes on file input change", async () => {
      render(<Settings />);
      const file = new File(['[]'], "routes.json", { type: "application/json" });
      const fileInput = screen.getByTestId("import-routes-input");


      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => expect(db.importRoutes).toHaveBeenCalledTimes(1));
      expect(db.importRoutes).toHaveBeenCalledWith('[]');
      await waitFor(() => expect(screen.getByText(/operation successful/i)).toBeInTheDocument());
    });

    it("shows error message on exportRoutes failure", async () => {
      (db.exportRoutes as vi.Mock).mockRejectedValue(new Error("Export failed"));
      render(<Settings />);
      fireEvent.click(screen.getByRole("button", { name: /export routes/i }));

      await waitFor(() => expect(db.exportRoutes).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.getByText(/an error occurred/i)).toBeInTheDocument());
    });

    it("shows error message on importRoutes failure", async () => {
        (db.importRoutes as vi.Mock).mockRejectedValue(new Error("Import failed"));
        render(<Settings />);
        const file = new File(["invalid json"], "routes.json", { type: "application/json" });
        const fileInput = screen.getByTestId("import-routes-input");

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => expect(db.importRoutes).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(screen.getByText(/an error occurred/i)).toBeInTheDocument());
    });
  });

  describe("Danger Zone", () => {
    it("opens delete confirmation dialog on 'Delete all waypoints' click", () => {
      render(<Settings />);
      fireEvent.click(screen.getByRole("button", { name: /delete all waypoints/i }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete all waypoint data/i)).toBeInTheDocument();
    });

    it("calls clearAllWaypoints and closes dialog on confirm delete", async () => {
      render(<Settings />);
      fireEvent.click(screen.getByRole("button", { name: /delete all waypoints/i }));
      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => expect(db.clearAllWaypoints).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await waitFor(() => expect(screen.getByText(/operation successful/i)).toBeInTheDocument());
    });

    it("closes dialog on cancel delete", async () => {
      render(<Settings />);
      fireEvent.click(screen.getByRole("button", { name: /delete all waypoints/i }));
      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    });
  });
});
