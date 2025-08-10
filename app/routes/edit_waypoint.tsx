import { useEffect } from "react";
import type { Route } from "./+types/edit_waypoint";
import { Form, redirect, useNavigate, useNavigation } from "react-router";
import {
  getWaypointById,
  updateWaypoint,
  type WaypointUpdate,
} from "~/services/db";
import {
  calculateCompassDirection,
  getCurrentPosition,
  translateToShorthand,
} from "~/services/geolocation";
import { Button } from "~/components/button";
import { Input } from "~/components/input";
import { Textarea } from "~/components/textarea";
import { Field, Label } from "~/components/fieldset";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Compass } from "lucide-react";
import { useImageCapture } from "~/hooks/useImageCapture";
import { ImageCapture } from "~/components/ImageCapture";

export const clientLoader = async ({ params }: Route.ClientLoaderArgs) => {
  const waypointId = parseInt(params.wpId, 10);
  if (isNaN(waypointId)) {
    return { error: "Invalid Waypoint ID." };
  }

  try {
    const waypoint = await getWaypointById(waypointId);
    if (!waypoint) {
      return { error: "Waypoint not found." };
    }

    // Fetch user location for compass calculation
    let bearing = null;
    let direction = null;
    try {
      const position = await getCurrentPosition({ timeout: 3000 });
      const userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      bearing = calculateCompassDirection(userLocation, {
        latitude: waypoint.latitude,
        longitude: waypoint.longitude,
      });
      direction = translateToShorthand(bearing);
    } catch (err) {
      console.warn("Could not get user location for compass:", err);
    }

    return { waypoint, bearing, direction, error: null };
  } catch (err) {
    return { error: "Failed to fetch waypoint data." };
  }
};

export const clientAction = async ({
  request,
  params,
}: Route.ClientActionArgs) => {
  const waypointId = parseInt(params.wpId, 10);
  if (isNaN(waypointId)) {
    return { error: "Invalid Waypoint ID." };
  }

  const formData = await request.formData();
  const name = formData.get("name") as string;
  const altitudeStr = formData.get("altitude") as string | null;
  const notes = formData.get("notes") as string;
  const imageDataUrl = formData.get("imageDataUrl") as string | null;

  if (!name.trim()) {
    return { error: "Waypoint name is required." };
  }

  const updates: WaypointUpdate = {
    name,
    notes,
    altitude: altitudeStr ? parseFloat(altitudeStr) : undefined,
    imageDataUrl: imageDataUrl,
  };

  try {
    await updateWaypoint(waypointId, updates);
    return redirect(`/waypoints`);
  } catch (err) {
    return { error: "Failed to update waypoint." };
  }
};

export default function EditWaypoint({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const { waypoint, bearing, direction, error: loaderError } = loaderData;
  const { error: actionError } = actionData || {};
  const error = loaderError || actionError;

  const {
    capturedImage,
    setCapturedImage,
    imageError,
    isCapturing,
    videoRef,
    handleCaptureImageClick,
    handleTakePhotoFromStream,
    handleCancelCamera,
    handleChooseFileClick,
    handleRemoveImageClick,
  } = useImageCapture();

  useEffect(() => {
    if (waypoint?.imageDataUrl) {
      setCapturedImage(waypoint.imageDataUrl);
    }
  }, [waypoint?.imageDataUrl, setCapturedImage]);

  const handleCancel = () => {
    handleCancelCamera();
    navigate(-1);
  };

  if (!waypoint) {
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
        <h1 className="text-lg font-bold">Edit Waypoint</h1>
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
            defaultValue={waypoint.name}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Latitude</Label>
            <Input type="text" value={waypoint.latitude} readOnly disabled />
          </Field>
          <Field>
            <Label>Longitude</Label>
            <Input type="text" value={waypoint.longitude} readOnly disabled />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {bearing !== null && direction && (
            <Field>
              <Label>Compass Direction</Label>
              <div className="flex items-center gap-4 p-4 rounded-lg">
                <Compass
                  className="h-10 w-10 text-slate-500"
                  style={{ transform: `rotate(${bearing - 45}deg)` }}
                />
                <div className="text-lg font-semibold">
                  {direction} ({Math.round(bearing)}°)
                </div>
              </div>
            </Field>
          )}
          <Field>
            <Label>Altitude (meters)</Label>
            <Input
              type="number"
              name="altitude"
              defaultValue={waypoint.altitude ?? ""}
              placeholder="Enter altitude"
            />
          </Field>
        </div>

        <Field>
          <Label>Notes</Label>
          <Textarea name="notes" defaultValue={waypoint.notes || ""} rows={4} />
        </Field>

        <ImageCapture
          capturedImage={capturedImage}
          imageError={imageError}
          isCapturing={isCapturing}
          videoRef={videoRef}
          handleCaptureImageClick={handleCaptureImageClick}
          handleChooseFileClick={handleChooseFileClick}
          handleRemoveImageClick={handleRemoveImageClick}
          handleTakePhotoFromStream={handleTakePhotoFromStream}
          handleCancelCamera={handleCancelCamera}
        />
        <input hidden name="imageDataUrl" value={capturedImage ?? undefined} />
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
