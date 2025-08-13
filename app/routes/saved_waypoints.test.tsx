import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import SavedWaypoints, { clientLoader, clientAction } from "./saved_waypoints";
import * as db from "~/services/db";

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

const mockDb = db as {
  getSavedWaypoints: Mock;
  deleteWaypoint: Mock;
};

const mockWaypoints: db.Waypoint[] = [
  {
    id: 1,
    name: "Point Alpha",
    latitude: 30,
    longitude: 40,
    createdAt: Date.now() - 2000,
    imageDataUrl: "image1.jpg",
  },
  {
    id: 2,
    name: "Point Beta",
    latitude: 31,
    longitude: 41,
    createdAt: Date.now() - 1000,
  },
];

describe("SavedWaypoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    window.alert = vi.fn();
    URL.createObjectURL = vi.fn(() => "mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  describe("clientLoader", () => {
    it("should fetch and return waypoints", async () => {
      mockDb.getSavedWaypoints.mockResolvedValue(mockWaypoints);
      const response = await clientLoader({} as any);
      expect(mockDb.getSavedWaypoints).toHaveBeenCalled();
      expect(response.waypoints).toEqual(mockWaypoints);
      expect(response.error).toBeNull();
    });
  });

  describe("clientAction", () => {
    it("should delete a waypoint and refetch the list", async () => {
      const formData = new FormData();
      formData.append("waypoint_id", "1");
      const request = new Request("http://localhost", { method: "POST", body: formData });

      mockDb.deleteWaypoint.mockResolvedValue(undefined);
      mockDb.getSavedWaypoints.mockResolvedValue([mockWaypoints[1]]);

      const response = await clientAction({ request } as any);

      expect(mockDb.deleteWaypoint).toHaveBeenCalledWith(1);
      expect(mockDb.getSavedWaypoints).toHaveBeenCalledTimes(1);
      expect(response.waypoints).toEqual([mockWaypoints[1]]);
      expect(response.error).toBeNull();
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
      render(<SavedWaypoints loaderData={{ waypoints: mockWaypoints, error: null }} actionData={null} />);
      expect(screen.getByText("Point Alpha")).toBeInTheDocument();
      expect(screen.getByText("Point Beta")).toBeInTheDocument();
      expect(screen.getByAltText("Point Alpha")).toBeInTheDocument();
    });

    it("displays empty message when there are no waypoints", () => {
        render(<SavedWaypoints loaderData={{ waypoints: [], error: null }} actionData={null} />);
        expect(screen.getByText("No waypoints saved yet.")).toBeInTheDocument();
    });

    it("handles GeoJSON export", async () => {
        const user = userEvent.setup();

        render(<SavedWaypoints loaderData={{ waypoints: mockWaypoints, error: null }} actionData={null} />);

        const mockLink = { href: "", download: "", click: vi.fn() };
        const spy = vi.spyOn(document, "createElement").mockReturnValue(mockLink as any);
        const appendSpy = vi.spyOn(document.body, "appendChild").mockImplementation(() => {});
        const removeSpy = vi.spyOn(document.body, "removeChild").mockImplementation(() => {});

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