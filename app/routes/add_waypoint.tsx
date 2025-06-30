import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { addWaypoint } from "../services/db";
import { Button } from "~/components/button";
import { Input } from "~/components/input";
import { Textarea } from "~/components/textarea";
import { Field, Label } from "~/components/fieldset";
import {
  ArrowLeftIcon,
  CameraIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function AddWaypoint() {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setAltitude(position.coords.altitude);
      },
      (err) => {
        console.error("Error getting location:", err);
        setError(`Error getting location: ${err.message}`);
      }
    );
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Waypoint name is required.");
      return;
    }
    if (latitude === null || longitude === null) {
      setError("Coordinates are required.");
      return;
    }

    try {
      await addWaypoint({
        name,
        latitude,
        longitude,
        altitude,
        notes,
        imageDataUrl: capturedImage,
      });
      setSuccessMessage("Waypoint saved successfully!");
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      console.error("Error saving waypoint:", err);
      setError("Failed to save waypoint.");
    }
  };

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null; // Also nullify the ref
    }
    setIsCapturing(false); // Ensure camera UI is hidden
    navigate(-1);
  };

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-screen">
      <header className="flex items-center justify-between p-4 border-b border-slate-200">
        <Button onClick={handleCancel} className="p-2">
          <ArrowLeftIcon className="h-6 w-6" />
        </Button>
        <h1 className="text-lg font-bold">New Waypoint</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-grow overflow-y-auto p-4 space-y-4">
        <Field className="">
          <Label>Name</Label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <Field>
          <Label>Coordinates</Label>
          <Input
            type="text"
            value={
              latitude !== null && longitude !== null
                ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                : "Loading..."
            }
            readOnly
          />
        </Field>

        <Field>
          <Label>Altitude (meters)</Label>
          <Input
            type="number"
            value={altitude ?? ""}
            onChange={(e) => setAltitude(parseFloat(e.target.value))}
          />
        </Field>

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
              ></video>
              <div className="flex gap-4 mt-4">
                <Button
                  type="button"
                  onClick={handleTakePhotoFromStream}
                  // className="flex items-center justify-center rounded-lg h-12 px-5 bg-green-500 text-white font-bold"
                >
                  Take Photo
                </Button>
                <Button
                  type="button"
                  onClick={handleCancelCamera}
                  variant="secondary"
                  // className="flex items-center justify-center rounded-lg h-12 px-5 bg-red-500 text-white font-bold"
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
        {/* End of Image Display and Capture Section */}

        {error && <p className="text-red-500">{error}</p>}
        {successMessage && !error && <p className="text-green-500">{successMessage}</p>} {/* Display success only if no general error */}
      </main>

      {/* Removed old isCapturing block as it's integrated above */}

      <footer className="p-4 border-t border-slate-200 flex justify-end gap-4">
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Waypoint</Button>
      </footer>
    </form>
  );
}
