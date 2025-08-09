import { type FormEvent, useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
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
import { ArrowLeftIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { Compass } from "lucide-react";
import { useImageCapture } from "~/hooks/useImageCapture";
import { ImageCapture } from "~/components/ImageCapture";

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

  const {
    capturedImage,
    setCapturedImage,
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
  }, [wpId, setCapturedImage]);

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
        handleCancelCamera();
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
    handleCancelCamera();
    navigate(-1, { viewTransition: true }); // Go back to the previous page
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading waypoint data...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b border-slate-200">
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

        <div className="grid grid-cols-2 gap-4">
          {/* Compass Direction */}
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
              value={altitude}
              onChange={(e) => setAltitude(e.target.value)}
              placeholder="Enter altitude"
            />
          </Field>
        </div>

        <Field>
          <Label>Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
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
      </main>

      <footer className="p-4 border-t border-slate-200 flex justify-end gap-4 sticky bottom-0">
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
