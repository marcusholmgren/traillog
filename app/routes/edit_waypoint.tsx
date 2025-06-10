import { type FormEvent, useEffect, useState, useRef } from "react"; // Added useRef
// import type { Route } from "./+types/edit_waypoint";
import { useNavigate, useParams } from "react-router";
import {
  getWaypointById,
  updateWaypoint,
  type Waypoint,
  type WaypointUpdate,
} from "../services/db";

export default function EditWaypoint() {
  //const { data } = loaderData;
  const { wpId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [latitude, setLatitude] = useState<number | string>("");
  const [longitude, setLongitude] = useState<number | string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New state for image handling
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

    getWaypointById(waypointId)
      .then((waypoint) => {
        if (waypoint) {
          setName(waypoint.name);
          setNotes(waypoint.notes || "");
          setLatitude(waypoint.latitude);
          setLongitude(waypoint.longitude);
          setCapturedImage(waypoint.imageDataUrl || null); // Load existing image
        } else {
          setError("Waypoint not found.");
        }
      })
      .catch(() => {
        setError("Failed to fetch waypoint data.");
      })
      .finally(() => {
        setIsLoading(false);
      });
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
      imageDataUrl: capturedImage, // Add image data to updates
    };

    try {
      await updateWaypoint(waypointId, updates);
      setSuccessMessage("Waypoint updated successfully!");
      // No need to clear capturedImage here as we might want to see it persist if user stays on page
      setTimeout(() => {
        if (streamRef.current) { // Stop stream if navigating away
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCapturing(false);
        navigate(-1);
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
    navigate(-1); // Go back to the previous page
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
      streamRef.current.getTracks().forEach(track => track.stop());
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
    <form
      onSubmit={handleSubmit}
      className="relative flex size-full min-h-screen flex-col bg-slate-50 justify-between group/design-root overflow-x-hidden"
    >
      {/* Main content wrapper */}
      <div className="flex-grow pb-20"> {/* Added padding-bottom to prevent overlap with sticky footer */}
        <div className="flex items-center bg-slate-50 p-4 pb-2 justify-between sticky top-0 z-10">
          <button
            type="button"
            onClick={handleCancel}
            className="text-[#0d141c] flex size-12 shrink-0 items-center"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24px"
              height="24px"
              fill="currentColor"
              viewBox="0 0 256 256"
            >
              <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"></path>
            </svg>
          </button>
          <h2 className="text-[#0d141c] text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
            Edit Waypoint
          </h2>
        </div>

        {error && (
          <div className="m-4 p-3 bg-red-100 text-red-700 rounded-md">
            Error: {error}
          </div>
        )}
        {successMessage && (
          <div className="m-4 p-3 bg-green-100 text-green-700 rounded-md">
            {successMessage}
          </div>
        )}

        {/* Form Fields */}
        <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-[#0d141c] text-base font-medium leading-normal pb-2">
              Name
            </p>
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141c] focus:outline-0 focus:ring-0 border-none bg-[#e7edf4] focus:border-none h-14 placeholder:text-[#49739c] p-4 text-base font-normal leading-normal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-[#0d141c] text-base font-medium leading-normal pb-2">
              Latitude
            </p>
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141c] focus:outline-0 focus:ring-0 border-none bg-[#e0e0e0] focus:border-none h-14 placeholder:text-[#49739c] p-4 text-base font-normal leading-normal"
              value={latitude}
              readOnly
              disabled
            />
          </label>
        </div>
        <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-[#0d141c] text-base font-medium leading-normal pb-2">
              Longitude
            </p>
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141c] focus:outline-0 focus:ring-0 border-none bg-[#e0e0e0] focus:border-none h-14 placeholder:text-[#49739c] p-4 text-base font-normal leading-normal"
              value={longitude}
              readOnly
              disabled
            />
          </label>
        </div>
        <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-[#0d141c] text-base font-medium leading-normal pb-2">
              Notes
            </p>
            <textarea
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141c] focus:outline-0 focus:ring-0 border-none bg-[#e7edf4] focus:border-none min-h-36 placeholder:text-[#49739c] p-4 text-base font-normal leading-normal"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            ></textarea>
          </label>
        </div>

        {/* Image Display and Capture Section */}
        <div className="px-4 py-3">
          <p className="text-[#0d141c] text-base font-medium leading-normal pb-2">
            Waypoint Image
          </p>
          {isCapturing && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full max-w-md aspect-[4/3] rounded-lg"
              ></video>
              <div className="flex gap-4 mt-4">
                <button
                  type="button"
                  onClick={handleTakePhotoFromStream}
                  className="flex items-center justify-center rounded-lg h-12 px-5 bg-green-500 text-white font-bold"
                >
                  Take Photo
                </button>
                <button
                  type="button"
                  onClick={handleCancelCamera}
                  className="flex items-center justify-center rounded-lg h-12 px-5 bg-red-500 text-white font-bold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="w-full aspect-[3/2] rounded-lg bg-gray-200 flex items-center justify-center mb-2">
            {capturedImage ? (
              <img
                src={capturedImage}
                alt="Waypoint"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <p className="text-gray-500">No image provided.</p>
            )}
          </div>
          {imageError && (
            <p className="text-red-500 text-sm pb-2">{imageError}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCaptureImageClick}
              className="flex-grow min-w-[calc(50%-0.25rem)] h-10 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-bold items-center justify-center"
            >
              Open Camera
            </button>
            <button
              type="button"
              onClick={handleChooseFileClick}
              className="flex-grow min-w-[calc(50%-0.25rem)] h-10 px-4 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-bold items-center justify-center"
            >
              Choose from File
            </button>
            {capturedImage && (
              <button
                type="button"
                onClick={handleRemoveImageClick}
                className="w-full h-10 mt-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold items-center justify-center"
              >
                Remove Image
              </button>
            )}
          </div>
        </div>
        {/* End of Image Display and Capture Section */}
      </div> {/* End of Main content wrapper */}

      {/* Sticky Footer for Save/Cancel Buttons */}
      <div className="sticky bottom-0 left-0 right-0 bg-slate-50 py-3 border-t border-[#e7edf4] z-10">
        <div className="flex flex-1 gap-3 flex-wrap px-4 justify-between">
            <button
              type="button"
              onClick={handleCancel}
              className="flex min-w-[84px] flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#e7edf4] text-[#0d141c] text-base font-bold leading-normal tracking-[0.015em]"
            >
              <span className="truncate">Cancel</span>
            </button>
            <button
              type="submit"
              className="flex min-w-[84px] flex-1 cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#0c7ff2] text-slate-50 text-base font-bold leading-normal tracking-[0.015em]"
              disabled={isLoading}
            >
              <span className="truncate">Save Waypoint</span>
            </button>
          </div>
        </div>
    </form>
  );
}
// Ensure this is removed or commented out if not used.
// export const loader: LoaderFunction = async ({ params }) => {
//   const waypointId = parseInt(params.wpId || "", 10);
//   if (isNaN(waypointId)) {
//     throw new Response("Not Found", { status: 404 });
//   }
//   const waypoint = await getWaypointById(waypointId);
//   if (!waypoint) {
//     throw new Response("Not Found", { status: 404 });
//   }
//   return waypoint; // Return type should match what component expects or use json(waypoint)
// };

                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M228.92,49.69a8,8,0,0,0-6.86-1.45L160.93,63.52,99.58,32.84a8,8,0,0,0-5.52-.6l-64,16A8,8,0,0,0,24,56V200a8,8,0,0,0,9.94,7.76l61.13-15.28,61.35,30.68A8.15,8.15,0,0,0,160,224a8,8,0,0,0,1.94-.24l64-16A8,8,0,0,0,232,200V56A8,8,0,0,0,228.92,49.69ZM96,176a8,8,0,0,0-1.94.24L40,189.75V62.25L95.07,48.48l.93.46Zm120,17.75-55.07,13.77-.93-.46V80a8,8,0,0,0,1.94-.23L216,66.25Z"></path>
              </svg>
            </div>
          </a>
          {/* Other nav items can follow */}
        </div>
        <div className="h-5 bg-slate-50"></div>
      </div>
    </form>
  );
}
