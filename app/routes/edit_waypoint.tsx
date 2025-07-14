import { type FormEvent, useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getWaypointById,
  updateWaypoint,
  type WaypointUpdate,
} from "~/services/db";
import {
  calculateCompassDirection,
  translateToShorthand,
  type ShorthandDirection,
} from "~/services/geolocation";
import { Button } from "~/components/button";
import { Input } from "~/components/input";
import { Textarea } from "~/components/textarea";
import { Field, Label } from "~/components/fieldset";
import {
  ArrowLeftIcon,
  CameraIcon,
  PhotoIcon,
  XMarkIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { Compass } from "lucide-react";

export default function EditWaypoint() {
  const { wpId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState<number | string>("");
  const [longitude, setLongitude] = useState<number | string>("");
  const [altitude, setAltitude] = useState<number | string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Compass direction state
  const [direction, setDirection] = useState<ShorthandDirection | null>(null);
  const [bearing, setBearing] = useState<number | null>(null);

  useEffect(() => {
    if (!wpId) {
      setError("Waypoint ID is missing.");
      setIsLoading(false);
      return;
    }
    const waypointId = parseInt(wpId, 10);
    if (isNaN(waypointId)) {
      setError("Invalid Waypoint ID.");
      setIsLoading(false);
      return;
    }

    const fetchWaypoint = async () => {
      try {
        const waypoint = await getWaypointById(waypointId);
        if (waypoint) {
          setName(waypoint.name);
          setNotes(waypoint.notes || "");
          setLatitude(waypoint.latitude);
          setLongitude(waypoint.longitude);
          setAltitude(
            waypoint.altitude !== undefined && waypoint.altitude !== null
              ? waypoint.altitude.toString()
              : ""
          );
          setCapturedImage(waypoint.imageDataUrl || null);

          // Get current location to calculate compass direction
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const userLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              const newBearing = calculateCompassDirection(userLocation, {
                latitude: waypoint.latitude,
                longitude: waypoint.longitude,
              });
              setBearing(newBearing);
              setDirection(translateToShorthand(newBearing));
            },
            (err) => {
              console.warn("Could not get user location for compass:", err);
            }
          );
        } else {
          setError("Waypoint not found.");
        }
      } catch (err) {
        setError("Failed to fetch waypoint data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWaypoint();
  }, [wpId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!wpId) {
      setError("Waypoint ID is missing.");
      return;
    }
    const waypointId = parseInt(wpId, 10);

    const updates: WaypointUpdate = {
      name,
      notes,
      altitude: altitude === "" ? undefined : parseFloat(altitude as string),
      imageDataUrl: capturedImage, // Add image data to updates
    };

    try {
      await updateWaypoint(waypointId, updates);
      setSuccessMessage("Waypoint updated successfully!");
      // No need to clear capturedImage here as we might want to see it persist if user stays on page
      setTimeout(() => {
        if (streamRef.current) {
          // Stop stream if navigating away
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        setIsCapturing(false);
        navigate(-1, { viewTransition: true });
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update waypoint."
      );
    }
  };

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
    navigate(-1, { viewTransition: true }); // Go back to the previous page
  };

  // Image capture logic (similar to AddWaypoint)
  const handleCaptureImageClick = async () => {
    setImageError(null);
    // Don't clear capturedImage here, user might want to keep existing if camera fails

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
        return;
      } catch (err: any) {
        console.error("Error using ImageCapture API:", err);
        setImageError(
          `Camera access denied or not available: ${err.message}. You can try choosing a file instead.`
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
          streamRef.current.getVideoTracks()[0]
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

  if (isLoading) {
    return <div className="p-4 text-center">Loading waypoint data...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-screen bg-slate-50">
      <header className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-slate-50 z-10">
        <Button onClick={handleCancel} className="p-2">
          <ArrowLeftIcon className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">Edit Waypoint</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <main className="flex-grow overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="m-4 p-3 bg-red-100 text-red-700 rounded-md">
            Error: {error}
          </div>
        )}
        {successMessage && !error && (
          <div className="m-4 p-3 bg-green-100 text-green-700 rounded-md">
            {successMessage}
          </div>
        )}

        <Field>
          <Label>Name</Label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field>
            <Label>Latitude</Label>
            <Input type="text" value={latitude} readOnly disabled />
          </Field>
          <Field>
            <Label>Longitude</Label>
            <Input type="text" value={longitude} readOnly disabled />
          </Field>
        </div>

        <Field>
          <Label>Altitude (meters)</Label>
          <Input
            type="number"
            value={altitude}
            onChange={(e) => setAltitude(e.target.value)}
            placeholder="Enter altitude"
          />
        </Field>

        {/* Compass Direction */}
        {bearing !== null && direction && (
          <Field>
            <Label>Compass Direction</Label>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-100">
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
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </Field>

        {/* Image Display and Capture Section */}
        <div className="space-y-2">
          <Label>Photo</Label>
          {isCapturing && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-md aspect-[4/3] rounded-lg"
              />
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
              <div className="text-slate-500 flex flex-col items-center">
                <MapPinIcon className="h-12 w-12" />
                <span>No image provided.</span>
              </div>
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
                <XMarkIcon className="h-5 w-5 mr-2" />
                Remove Image
              </Button>
            )}
          </div>
        </div>
      </main>

      <footer className="p-4 border-t border-slate-200 flex justify-end gap-4 sticky bottom-0 bg-slate-50">
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Waypoint"}
        </Button>
      </footer>
    </form>
  );
}
