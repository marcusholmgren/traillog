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
    }
    navigate(-1);
  };

  const handleCaptureImage = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setImageError("Could not access camera.");
    }
  };

  const handleTakePhoto = async () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL("image/jpeg"));
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      setIsCapturing(false);
    }
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

        <div className="space-y-2">
          <label>Photo</label>
          <div className="flex items-center gap-4">
            <Button type="button" onClick={handleCaptureImage}>
              <CameraIcon className="h-5 w-5 mr-2" />
              Take Photo
            </Button>
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured waypoint"
                className="h-20 w-20 rounded-lg object-cover"
              />
            )}
          </div>
        </div>

        {error && <p className="text-red-500">{error}</p>}
        {imageError && <p className="text-red-500">{imageError}</p>}
        {successMessage && <p className="text-green-500">{successMessage}</p>}
      </main>

      {isCapturing && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            className="w-full h-full object-cover"
          ></video>
          <div className="absolute bottom-4 flex gap-4">
            <Button onClick={handleTakePhoto}>Take Photo</Button>
            <Button onClick={() => setIsCapturing(false)}>
              <XMarkIcon className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}

      <footer className="p-4 border-t border-slate-200 flex justify-end gap-4">
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Waypoint</Button>
      </footer>
    </form>
  );
}
