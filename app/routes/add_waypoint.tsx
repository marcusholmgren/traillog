import { useState, useRef } from "react";
import {
  useNavigate,
  Form,
  useNavigation,
  redirect,
  useLoaderData,
} from "react-router";
import { addWaypoint } from "~/services/db";
import { Button } from "~/components/button";
import { Input } from "~/components/input";
import { Textarea } from "~/components/textarea";
import { Field, Label } from "~/components/fieldset";
import {
  ArrowLeftIcon,
  CameraIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import { coordinateFormat } from "~/services/formatter";
import { getCurrentPosition } from "~/services/geolocation";

export const clientLoader = async ({}: any) => {
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

export const clientAction = async ({ request }: any) => {
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

export default function AddWaypoint({ loaderData }: any) {
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { latitude, longitude, altitude, error } = loaderData;

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSubmitting = navigation.state === "submitting";

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    navigate(-1);
  };

  const handleCaptureImageClick = async () => {
    setImageError(null);
    if (
      "MediaStream" in window &&
      "ImageCapture" in window &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    ) {
      try {
        setIsCapturing(true);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Error using ImageCapture API:", err);
        setImageError(
          `Camera access denied or not available: ${err.message}. You can try choosing a file instead.`,
        );
        setIsCapturing(false);
      }
    } else {
      handleChooseFileClick();
      setImageError("Live camera not supported. Please choose a file.");
    }
  };

  const handleTakePhotoFromStream = async () => {
    if (streamRef.current) {
      try {
        const imageCapture = new ImageCapture(
          streamRef.current.getVideoTracks()[0],
        );
        const blob = await imageCapture.takePhoto();
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImage(reader.result as string);
          setImageError(null);
          setSuccessMessage("Image captured! Save to apply changes.");
        };
        reader.onerror = () => {
          setImageError("Failed to process captured image.");
        };
        reader.readAsDataURL(blob);
      } catch (err: any) {
        setImageError(`Could not take photo: ${err.message}`);
      } finally {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        setIsCapturing(false);
      }
    }
  };

  const handleCancelCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    setImageError(null);
  };

  const handleChooseFileClick = () => {
    setImageError(null);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImage(reader.result as string);
          setSuccessMessage("Image selected. Save to apply changes.");
        };
        reader.onerror = () => {
          setImageError("Failed to read image file.");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleRemoveImageClick = () => {
    setCapturedImage(null);
    setImageError(null);
    setSuccessMessage("Image marked for removal. Save to apply changes.");
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
          <Input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
          <Input
            type="number"
            name="altitude"
            defaultValue={altitude ?? ""}
            // onChange={(e) => setAltitude(parseFloat(e.target.value))}
          />
        </Field>
        <Field>
          <Label>Notes</Label>
          <Textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </Field>
        <input type="hidden" name="imageDataUrl" value={capturedImage ?? ""} />
        <div className="space-y-2">
          <p>Photo</p>
          {isCapturing && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-md aspect-[4/3] rounded-lg"
              ></video>
              <div className="flex gap-4 mt-4">
                <Button type="button" onClick={handleTakePhotoFromStream}>
                  Take Photo
                </Button>
                <Button
                  type="button"
                  onClick={handleCancelCamera}
                  variant="secondary"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          <div className="w-full aspect-[3/2] rounded-lg bg-slate-200 flex items-center justify-center mb-2">
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Waypoint"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <p className="text-slate-500">No image provided.</p>
            )}
          </div>
          {imageError && (
            <p className="text-red-500 text-sm pb-2">{imageError}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleCaptureImageClick}
              className="flex-grow min-w-[calc(50%-0.25rem)]"
            >
              <CameraIcon className="h-5 w-5 mr-2" />
              Open Camera
            </Button>
            <Button
              type="button"
              onClick={handleChooseFileClick}
              variant="secondary"
              className="flex-grow min-w-[calc(50%-0.25rem)]"
            >
              <PhotoIcon className="h-5 w-5 mr-2" />
              Choose from File
            </Button>
            {capturedImage && (
              <Button
                type="button"
                onClick={handleRemoveImageClick}
                variant="destructive"
                className="w-full mt-2"
              >
                Remove Image
              </Button>
            )}
          </div>
        </div>
        {error && <p className="text-red-500">{error}</p>}
        {successMessage && !error && (
          <p className="text-green-500">{successMessage}</p>
        )}{" "}
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
