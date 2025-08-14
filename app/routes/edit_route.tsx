import { Form, redirect, useNavigate, useNavigation } from "react-router";
import type { Route } from "./+types/edit_route";
import { getRouteById, updateRouteName, type Route as DbRoute } from "~/services/db";
import { Button } from "~/components/button";
import { Input } from "~/components/input";
import { Field, Label } from "~/components/fieldset";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export const clientLoader = async ({ params }: Route.ClientLoaderArgs) => {
  const routeId = parseInt(params.routeId, 10);
  if (isNaN(routeId)) {
    return { error: "Invalid Route ID." };
  }

  try {
    const route = await getRouteById(routeId);
    if (!route) {
      return { error: "Route not found." };
    }
    return { route, error: null };
  } catch (err) {
    return { error: "Failed to fetch route data." };
  }
};

export const clientAction = async ({
  request,
  params,
}: Route.ClientActionArgs) => {
  const routeId = parseInt(params.routeId, 10);
  if (isNaN(routeId)) {
    return { error: "Invalid Route ID." };
  }

  const formData = await request.formData();
  const name = formData.get("name") as string;

  if (!name.trim()) {
    return { error: "Route name is required." };
  }

  try {
    await updateRouteName(routeId, name);
    return redirect(`/routes`);
  } catch (err) {
    return { error: "Failed to update route name." };
  }
};

export default function EditRoute({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const { route, error: loaderError } = loaderData;
  const { error: actionError } = actionData || {};
  const error = loaderError || actionError;

  const handleCancel = () => {
    navigate(-1);
  };

  if (!route) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-lg font-bold">Error</h1>
        <p>{error || "An unknown error occurred."}</p>
      </div>
    );
  }

  return (
    <Form method="post" className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b border-slate-200">
        <Button onClick={handleCancel} className="p-2">
          <ArrowLeftIcon className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Edit Route</h1>
        <div className="w-10" />
      </header>

      <main className="flex-grow overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-100 text-red-700 rounded-md">
            Error: {error}
          </div>
        )}

        <Field>
          <Label>Name</Label>
          <Input
            type="text"
            name="name"
            defaultValue={route.name}
            required
          />
        </Field>
      </main>

      <footer className="p-4 border-t border-slate-200 flex justify-end gap-4 sticky bottom-0">
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </footer>
    </Form>
  );
}
