import { useEffect } from "react";
import type { Route } from "./+types/add_waypoint";
import { useNavigate, Form, redirect, useNavigation } from "react-router";
import { addWaypoint } from "~/services/db";
import { Button } from "~/components/button";
import { Input } from "~/components/input";
import { Textarea } from "~/components/textarea";
import { Field, Label } from "~/components/fieldset";
import { ArrowLeftIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { coordinateFormat } from "~/services/formatter";
import { useImageCapture } from "~/hooks/useImageCapture";
import { ImageCapture } from "~/components/ImageCapture";
import { getCurrentPosition } from "~/services/geolocation";

export const clientLoader = async ({}: Route.ClientLoaderArgs) => {
  try {
    const position = await getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });
    const { latitude, longitude, altitude } = position.coords;
    return {
      latitude,
      longitude,
      altitude,
      error: null,
    };
  } catch (err: any) {
    console.error("Error getting location:", err);
    return {
      latitude: null,
      longitude: null,
      altitude: null,
      error: `Error getting location: ${err.message}`,
    };
  }
};

export const clientAction = async ({ request }: Route.ClientActionArgs) => {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const latitude = parseFloat(formData.get("latitude") as string);
  const longitude = parseFloat(formData.get("longitude") as string);
  const altitude = formData.get("altitude")
    ? parseFloat(formData.get("altitude") as string)
    : undefined;
  const notes = formData.get("notes") as string;
  const imageDataUrl = formData.get("imageDataUrl") as string | undefined;

  if (!name.trim()) {
    return { error: "Waypoint name is required." };
  }
  if (isNaN(latitude) || isNaN(longitude)) {
    return { error: "Coordinates are required." };
  }

  try {
    await addWaypoint({
      name,
      latitude,
      longitude,
      altitude,
      notes,
      imageDataUrl,
    });
    return redirect("/waypoints");
  } catch (err) {
    console.error("Error saving waypoint:", err);
    return { error: "Failed to save waypoint." };
  }
};

export default function AddWaypoint({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { latitude, longitude, altitude, error } = loaderData;
  const isSubmitting = navigation.state === "submitting";

  const {
    capturedImage,
    imageError,
    isCapturing,
    videoRef,
    streamRef,
    handleCaptureImageClick,
    handleTakePhotoFromStream,
    handleCancelCamera,
    handleChooseFileClick,
    handleRemoveImageClick,
  } = useImageCapture();

  useEffect(() => {
    handleCancelCamera(); // Ensure camera UI is hidden
  });

  const handleCancel = () => {
    handleCancelCamera(); // Ensure camera UI is hidden
    navigate(-1);
  };

  return (
    <Form method="post" className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b border-slate-200">
        <Button onClick={handleCancel} className="p-2">
          <ArrowLeftIcon className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">New Waypoint</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-grow overflow-y-auto p-4 space-y-4">
        <Field>
          <Label>Name</Label>
          <Input type="text" name="name" required />
        </Field>
        <Field>
          <Label>Coordinates</Label>
          <Input
            type="text"
            name="coordinates"
            value={
              latitude !== null && longitude !== null
                ? `${coordinateFormat(latitude, 6)}, ${coordinateFormat(
                    longitude,
                    6,
                  )}`
                : "Loading..."
            }
            readOnly
          />
          <input type="hidden" name="latitude" value={latitude ?? ""} />
          <input type="hidden" name="longitude" value={longitude ?? ""} />
        </Field>
        <Field>
          <Label>Altitude (meters)</Label>
          <Input type="number" name="altitude" defaultValue={altitude ?? ""} />
        </Field>
        <Field>
          <Label>Notes</Label>
          <Textarea name="notes" rows={4} />
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

      <footer className="p-4 border-t border-slate-200 flex justify-end gap-4">
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Waypoint"}
        </Button>
      </footer>
    </Form>
  );
}
