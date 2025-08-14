import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { MemoryRouter } from "react-router";
import * as db from "~/services/db";
import SavedRoutesPage, { clientAction, clientLoader } from "./saved_routes";

// Mock dependencies
vi.mock("~/services/db");

const mockNavigate = vi.fn();
const mockSubmit = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useNavigation: () => ({ state: "idle" }),
    useFetcher: () => ({
      submit: mockSubmit,
      Form: ({ children, ...props }: { children: React.ReactNode }) => (
        <form {...props}>{children}</form>
      ),
    }),
  };
});

const mockDb = db as {
  getSavedRoutes: Mock;
  deleteRoute: Mock;
};

const mockRoutesData: db.Route[] = [
  {
    id: 1,
    name: "Scenic Drive",
    geometry: {
      type: "LineString",
      coordinates: [
        [10, 10],
        [11, 11],
        [12, 12],
      ],
    },
    createdAt: Date.now() - 10000,
  },
  {
    id: 2,
    name: "City Tour",
    geometry: {
      type: "LineString",
      coordinates: [
        [20, 20],
        [21, 21],
      ],
    },
    createdAt: Date.now() - 5000,
  },
];

describe("SavedRoutesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockSubmit.mockClear();
    window.confirm = vi.fn(() => true);
  });

  describe("clientLoader", () => {
    it("should fetch and return routes", async () => {
      mockDb.getSavedRoutes.mockResolvedValue(mockRoutesData);
      const response = await clientLoader({ params: {} } as any);
      expect(mockDb.getSavedRoutes).toHaveBeenCalled();
      expect(response.routes).toEqual(mockRoutesData);
    });
  });

  describe("clientAction", () => {
    it("should delete a route", async () => {
      const formData = new FormData();
      formData.append("routeId", "1");
      const request = new Request("http://localhost", {
        method: "POST",
        body: formData,
      });

      mockDb.deleteRoute.mockResolvedValue(undefined);

      const response = await clientAction({ request } as any);

      expect(mockDb.deleteRoute).toHaveBeenCalledWith(1);
      expect(response.ok).toBe(true);
    });
  });

  describe("Component UI", () => {
    it("displays routes from loaderData", () => {
      render(
        <MemoryRouter>
          <SavedRoutesPage
            loaderData={{ routes: mockRoutesData }}
            actionData={undefined}
          />
        </MemoryRouter>
      );
      expect(screen.getByText("Scenic Drive")).toBeInTheDocument();
      expect(screen.getByText("City Tour")).toBeInTheDocument();
    });

    it("displays empty message when there are no routes", () => {
      render(
        <MemoryRouter>
          <SavedRoutesPage
            loaderData={{ routes: [] }}
            actionData={undefined}
          />
        </MemoryRouter>
      );
      expect(screen.getByText("No Saved Routes Yet")).toBeInTheDocument();
    });

    it("calls delete action when delete button is clicked", async () => {
      render(
        <MemoryRouter>
          <SavedRoutesPage
            loaderData={{ routes: mockRoutesData }}
            actionData={undefined}
          />
        </MemoryRouter>
      );
      const deleteButton = screen.getAllByLabelText(/Delete route/i)[0];
      const form = deleteButton.closest('form');
      expect(form).not.toBeNull();
      if (form) {
        fireEvent.submit(form);
      }
      expect(window.confirm).toHaveBeenCalled();
    });
  });
});