import { ArrowDownOnSquareIcon, EyeIcon, MapIcon, TrashIcon } from "@heroicons/react/24/outline";
import {
  isRouteErrorResponse,
  useFetcher,
  useNavigate,
  useNavigation,
  useRouteError,
} from "react-router";
import {
  Alert,
  AlertActions,
  AlertBody,
  AlertDescription,
  AlertTitle,
} from "~/components/alert";
import { Button } from "~/components/button";
import { EntityPageLayout } from "~/components/entity-page-layout";
import { ResourceList } from "~/components/resource-list";
import { useAlert } from "~/hooks/useAlert";
import {
  deleteRoute as dbDeleteRoute,
  getSavedRoutes,
  type Route as dbRoute,
} from "~/services/db";
import type { Route } from "./+types/saved_routes";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const routes = await getSavedRoutes();
  return { routes };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const formData = await request.formData();
  const routeId = formData.get("routeId");
  if (typeof routeId === "string") {
    await dbDeleteRoute(Number(routeId));
    return { ok: true };
  }
  return { ok: false, error: "Invalid routeId" };
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <EntityPageLayout pageTitle="Error">
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Oops! </strong>
        <span className="block sm:inline">
          {isRouteErrorResponse(error) ? error.data : "Something went wrong."}
        </span>
      </div>
    </EntityPageLayout>
  );
}

export default function SavedRoutesPage({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const navigate = useNavigate();
  const { routes } = loaderData;
  const fetcher = useFetcher();
  const navigation = useNavigation();
  const { alert, showAlert } = useAlert();

  const isLoading = navigation.state === "loading";

  const handleCreateNewRoute = () => {
    navigate("/routes/create");
  };

  const handleViewRouteOnMap = (route: dbRoute) => {
    try {
      if (
        !route.geometry ||
        !route.geometry.coordinates ||
        route.geometry.coordinates.length < 2
      ) {
        showAlert({
          title: "Cannot View Route",
          message:
            "Route does not have enough coordinates to display on the map.",
        });
        return;
      }
      const coordinatesString = route.geometry.coordinates
        .map((coordPair) => `${coordPair[0]},${coordPair[1]}`)
        .join(";");
      navigate(
        `/map?waypoints=${coordinatesString}&routeName=${encodeURIComponent(
          route.name,
        )}`,
      );
    } catch (e) {
      console.error("Failed to prepare route for viewing on map", e);
      showAlert({
        title: "Error",
        message: "Could not prepare route for map viewing. Please try again.",
      });
    }
  };

  const handleExportRoutesToGeoJSON = async () => {
    const worker = new Worker(new URL('../workers/export-routes.worker.ts', import.meta.url), { type: 'module' });

    worker.onmessage = (event) => {
      const jsonString = event.data;
      const blob = new Blob([jsonString], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = "routes.geojson";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);
      worker.terminate();
    };

    worker.onerror = (error) => {
      console.error("Error exporting to GeoJSON:", error);
      showAlert({
        title: "Export Failed",
        message: "Failed to export routes. See console for details."
      });
      worker.terminate();
    };

    worker.postMessage("export");
  };

  const renderRouteItem = (route: dbRoute) => (
    <div className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50">
      <div className="flex-grow">
        <h2 className="font-bold text-blue-700">{route.name}</h2>
        <p className="text-sm text-slate-500">
          Points: {route.geometry?.coordinates?.length ?? 0} | Created:{" "}
          {new Date(route.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          plain
          onClick={() => handleViewRouteOnMap(route)}
          aria-label={`View route ${route.name} on map`}
          className="p-2 text-slate-600 hover:text-blue-600"
        >
          <EyeIcon className="h-5 w-5" />
        </Button>
        <fetcher.Form
          method="post"
          onSubmit={(event) => {
            if (!confirm("Are you sure you want to delete this route?")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="routeId" value={route.id} />
          <Button
            plain
            type="submit"
            aria-label={`Delete route ${route.name}`}
            className="p-2 text-slate-600 hover:text-red-600"
          >
            <TrashIcon className="h-5 w-5" />
          </Button>
        </fetcher.Form>
      </div>
    </div>
  );

  const emptyStateContent = (
    <div className="text-center p-8">
      <MapIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-slate-700 mb-2">
        No Saved Routes Yet
      </h2>
      <p className="text-slate-500 mb-6">
        It looks like you haven't saved any routes. Create one now!
      </p>
      <Button color="green" onClick={handleCreateNewRoute}>
        Create New Route
      </Button>
    </div>
  );

  const pageFooter = (
    <>
      <Button
        onClick={handleExportRoutesToGeoJSON}
        className="w-full flex items-center justify-center gap-2"
      >
        <ArrowDownOnSquareIcon className="h-5 w-5" />
        Export all to GeoJSON
      </Button>
    </>
  );

  return (
    <EntityPageLayout
      pageTitle="Saved Routes"
      onAdd={handleCreateNewRoute}
      addLabel="Create New Route"
      footerContent={pageFooter}
    >
      <ResourceList
        items={routes}
        renderItem={renderRouteItem}
        isLoading={isLoading}
        error={null} // Error is handled by ErrorBoundary
        emptyStateMessage={emptyStateContent}
        itemKey="id"
        itemClassName=""
      />
      {alert.isOpen && (
        <Alert open={alert.isOpen} onClose={alert.hide}>
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
          <AlertActions>
            <Button onClick={alert.hide}>OK</Button>
          </AlertActions>
        </Alert>
      )}
    </EntityPageLayout>
  );
}
