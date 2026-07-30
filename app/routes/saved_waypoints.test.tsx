import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import SavedWaypoints, { clientLoader, clientAction } from "./saved_waypoints";
import * as db from "~/services/db";

const mockPostMessage = vi.fn();
const mockTerminate = vi.fn();
let onmessageCallback: (event: { data: any }) => void = () => {};
let onerrorCallback: (error: any) => void = () => {};

class MockWorker {
    url: string | URL;
    postMessage = mockPostMessage;
    terminate = mockTerminate;

    constructor(url: string | URL, options?: WorkerOptions) {
        this.url = url;
    }

    set onmessage(callback: (event: { data: any }) => void) {
        onmessageCallback = callback;
    }
    
    get onmessage() {
        return onmessageCallback;
    }

    set onerror(callback: (error: any) => void) {
        onerrorCallback = callback;
    }

    get onerror() {
        return onerrorCallback;
    }
}

vi.stubGlobal('Worker', MockWorker);


// Mock dependencies
vi.mock("~/services/db", async () => {
    const actual = await vi.importActual("~/services/db");
    return {
      ...actual,
      getSavedWaypoints: vi.fn(),
      deleteWaypoint: vi.fn(),
    };
  });

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
    NavLink: (props: any) => <a {...props}>{props.children}</a>,
  };
});

const mockDb = db as unknown as {
  getSavedWaypoints: Mock;
  deleteWaypoint: Mock;
};

const mockWaypoints: db.Waypoint[] = [
  { id: 1, latitude: 10, longitude: 20, name: "Point Alpha", imageDataUrl: "image1.png", createdAt: Date.now() },
  { id: 2, latitude: 30, longitude: 40, name: "Point Beta", createdAt: Date.now() },
];

describe("SavedWaypoints Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    window.confirm = vi.fn(() => true);
    URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  describe("clientLoader", () => {
    it("should fetch and return waypoints", async () => {
      mockDb.getSavedWaypoints.mockResolvedValue(mockWaypoints);

      const response = await clientLoader({ params: {} } as any);

      expect(mockDb.getSavedWaypoints).toHaveBeenCalled();
      expect(response.waypoints).toEqual(mockWaypoints);
    });

    it("should return an error message if fetching fails", async () => {
        mockDb.getSavedWaypoints.mockRejectedValue(new Error("DB error"));
  
        const response = await clientLoader({ params: {} } as any);
  
        expect(response.error).toBe("Failed to load waypoints. Please try again.");
        expect(response.waypoints).toEqual([]);
      });
  });

  describe("clientAction", () => {
    it("should delete a waypoint and return updated list", async () => {
      const formData = new FormData();
      formData.append("waypoint_id", "1");
      const request = new Request("http://localhost", { method: "POST", body: formData });

      mockDb.deleteWaypoint.mockResolvedValue(undefined);
      mockDb.getSavedWaypoints.mockResolvedValue([mockWaypoints[1]]);

      const response = await clientAction({ request } as any);

      expect(mockDb.deleteWaypoint).toHaveBeenCalledWith(1);
      expect(mockDb.getSavedWaypoints).toHaveBeenCalled();
      expect(response.waypoints).toEqual([mockWaypoints[1]]);
    });

    it("should return an error if waypoint_id is missing", async () => {
        const formData = new FormData();
        const request = new Request("http://localhost", { method: "POST", body: formData });
  
        mockDb.getSavedWaypoints.mockResolvedValue(mockWaypoints);

        const response = await clientAction({ request } as any);

        expect(response.error).toBe("Invalid Waypoint ID.");
        expect(response.waypoints).toEqual(mockWaypoints);
    });

    it("should return an error if deletion fails", async () => {
        const formData = new FormData();
        formData.append("waypoint_id", "1");
        const request = new Request("http://localhost", { method: "POST", body: formData });
  
        mockDb.deleteWaypoint.mockRejectedValue(new Error("DB error"));
        mockDb.getSavedWaypoints.mockResolvedValue(mockWaypoints);

        const response = await clientAction({ request } as any);
        expect(response.error).toBe("Failed to delete waypoint. Please try again.");
        expect(response.waypoints).toEqual(mockWaypoints);
    });
  });

  describe("Component UI", () => {
    it("displays waypoints from loaderData", () => {
      render(<SavedWaypoints {...({ loaderData: { waypoints: mockWaypoints }, actionData: undefined } as any)} />);
      expect(screen.getByText("Point Alpha")).toBeInTheDocument();
      expect(screen.getByText("Point Beta")).toBeInTheDocument();
      expect(screen.getByAltText("Point Alpha")).toBeInTheDocument();
    });

    it("displays empty message when there are no waypoints", () => {
        render(<SavedWaypoints {...({ loaderData: { waypoints: [] }, actionData: undefined } as any)} />);
        expect(screen.getByText("No waypoints saved yet.")).toBeInTheDocument();
    });

    it("handles GeoJSON export", async () => {
        const user = userEvent.setup();

        render(<SavedWaypoints {...({ loaderData: { waypoints: mockWaypoints }, actionData: undefined } as any)} />);

        const mockLink = { href: "", download: "", click: vi.fn() };
        const spy = vi.spyOn(document, "createElement").mockReturnValue(mockLink as any);
        const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
        const removeSpy = vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);

        await user.click(screen.getByText(/export all to geojson/i));

        await waitFor(() => expect(mockPostMessage).toHaveBeenCalledTimes(1));

        onmessageCallback({data: '{"type":"FeatureCollection","features":[]}'});

        await waitFor(() => expect(mockLink.click).toHaveBeenCalled());

        spy.mockRestore();
        appendSpy.mockRestore();
        removeSpy.mockRestore();
    });
  });
});