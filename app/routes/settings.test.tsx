import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Settings from "./settings";
import * as db from "~/services/db";
import { vi } from "vitest";
import "@testing-library/jest-dom";

const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();
let onmessageCallback: (event: { data: any }) => void = () => {};
let onerrorCallback: (error: any) => void = () => {};

vi.stubGlobal('Worker', vi.fn((url: string | URL, options?: WorkerOptions) => {
    const worker = {
        url,
        postMessage: mockPostMessage,
        terminate: mockTerminate,
        set onmessage(callback: (event: { data: any }) => void) {
            onmessageCallback = callback;
        },
        get onmessage() {
            return onmessageCallback;
        },
        set onerror(callback: (error: any) => void) {
            onerrorCallback = callback;
        },
        get onerror() {
            return onerrorCallback;
        }
    };
    return worker;
}));

// Mock file-saver or URL.createObjectURL if used directly for downloads
global.URL.createObjectURL = vi.fn(() => "mock-url");
global.URL.revokeObjectURL = vi.fn(); // Mock revokeObjectURL
const mockAnchorClick = vi.fn();

Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
  value: mockAnchorClick,
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
    it("calls worker and triggers download on export click", async () => {
      render(<Settings />);
      fireEvent.click(screen.getByRole("button", { name: /export waypoints/i }));

      await waitFor(() => expect(mockPostMessage).toHaveBeenCalledTimes(1));

      onmessageCallback({data: '{"type":"FeatureCollection","features":[]}'});

      await waitFor(() => expect(mockAnchorClick).toHaveBeenCalledTimes(1));
    });

    it("calls importWaypoints on file input change", async () => {
        const importSpy = vi.spyOn(db, 'importWaypoints');
        render(<Settings />);
        const file = new File(['{"type":"FeatureCollection","features":[]}'], "waypoints.geojson", { type: "application/json" });
        const fileInput = screen.getByTestId("import-waypoints-input");

        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => expect(importSpy).toHaveBeenCalledTimes(1));
        expect(importSpy).toHaveBeenCalledWith('{"type":"FeatureCollection","features":[]}');
    });

     it("shows error message on export failure", async () => {
      render(<Settings />);
      fireEvent.click(screen.getByRole("button", { name: /export waypoints/i }));

      await waitFor(() => expect(mockPostMessage).toHaveBeenCalledTimes(1));

      onerrorCallback(new Error("Export failed"));

      await waitFor(() => expect(screen.getByText(/an error occurred/i)).toBeInTheDocument());
    });
  });

  describe("Routes Import/Export", () => {
    it("calls worker and triggers download on export click", async () => {
        render(<Settings />);
        fireEvent.click(screen.getByRole("button", { name: /export routes/i }));

        await waitFor(() => expect(mockPostMessage).toHaveBeenCalledTimes(1));

        onmessageCallback({data: '{"type":"FeatureCollection","features":[]}'});

        await waitFor(() => expect(mockAnchorClick).toHaveBeenCalledTimes(1));
    });

    it("calls importRoutes on file input change", async () => {
        const importSpy = vi.spyOn(db, 'importRoutes');
        render(<Settings />);
        const file = new File(['[]'], "routes.json", { type: "application/json" });
        const fileInput = screen.getByTestId("import-routes-input");


        fireEvent.change(fileInput, { target: { files: [file] } });

        await waitFor(() => expect(importSpy).toHaveBeenCalledTimes(1));
        expect(importSpy).toHaveBeenCalledWith('[]');
    });

    it("shows error message on export failure", async () => {
        render(<Settings />);
        fireEvent.click(screen.getByRole("button", { name: /export routes/i }));

        await waitFor(() => expect(mockPostMessage).toHaveBeenCalledTimes(1));

        onerrorCallback(new Error("Export failed"));

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
      const clearSpy = vi.spyOn(db, 'clearAllWaypoints');
      render(<Settings />);
      fireEvent.click(screen.getByRole("button", { name: /delete all waypoints/i }));
      await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => expect(clearSpy).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
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
