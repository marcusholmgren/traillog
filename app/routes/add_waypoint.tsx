import { useEffect, useState, useRef } from "react"; // Added useRef
import { useNavigate } from "react-router";
import { addWaypoint } from "../services/db";

export default function AddWaypoint() {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState(""); // Added for potential notes
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // New state variables for image capture
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false); // To manage camera view later if needed
  const videoRef = useRef<HTMLVideoElement>(null); // For live preview
  const streamRef = useRef<MediaStream | null>(null); // To keep track of the stream

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setError(null);
        },
        (err) => {
          console.error("Error getting location:", err);
          setError(
            `Error getting location: ${err.message}. Please ensure location services are enabled and permission is granted.`
          );
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setError("Waypoint name is required.");
      return;
    }

    if (latitude === null || longitude === null) {
      setError(
        "Coordinates are required. Please ensure location services are enabled."
      );
      return;
    }

    const waypointData: any = {
      name,
      latitude,
      longitude,
      notes, // Add notes
    };

    if (capturedImage) {
      waypointData.imageDataUrl = capturedImage;
    }

    try {
      await addWaypoint(waypointData);
      setSuccessMessage("Waypoint saved successfully!");
      setName("");
      setNotes(""); // Clear notes
      setCapturedImage(null); // Clear captured image
      setImageError(null);
      // Optionally navigate away or clear coordinates after successful save
      // navigate('/waypoints'); // Example: navigate to a list of waypoints
    } catch (err) {
      console.error("Error saving waypoint:", err);
      setError("Failed to save waypoint. Please try again.");
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

  const handleCaptureImageClick = async () => {
    setImageError(null);
    setCapturedImage(null); // Clear previous image

    // Prioritize MediaStream Image Capture API
    if (
      "MediaStream" in window &&
      "ImageCapture" in window &&
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia
    ) {
      try {
        setIsCapturing(true); // Show video feed
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        // No direct takePhoto() here, user will click a button on the video feed
        return; // Keep camera open
      } catch (err: any) {
        console.error("Error using ImageCapture API:", err);
        setImageError(
          `Camera access denied or not available: ${err.message}. Falling back to file input.`
        );
        // Fallback will be triggered by the else block if this fails
        setIsCapturing(false); // Hide video feed if it failed to start
      }
    }

    // Fallback to file input if ImageCapture is not fully supported or failed
    // This part will now also be triggered if the user clicks "Capture from File"
    // or if the advanced capture fails initially.
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    // 'capture="environment"' is a hint for mobile devices to use the back camera.
    // For desktop, it will open a file picker.
    input.capture = "environment";
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedImage(reader.result as string);
          setImageError(null);
          setSuccessMessage("Image selected. You can now save the waypoint.");
        };
        reader.onerror = () => {
          console.error("Error reading file:", reader.error);
          setImageError("Failed to read image file.");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
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
          setSuccessMessage("Image captured! You can now save the waypoint.");
        };
        reader.onerror = () => {
          setImageError("Failed to process captured image.");
        };
        reader.readAsDataURL(blob);
      } catch (err: any) {
        console.error("Error taking photo from stream:", err);
        setImageError(`Could not take photo: ${err.message}`);
      } finally {
        // Stop the stream and hide video after taking photo
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
    setImageError(null); // Clear any camera related errors
  };


  return (
    // Changed div to form and added onSubmit and flex properties
    <form
      onSubmit={handleSubmit}
      className="relative flex size-full min-h-screen flex-col bg-slate-50 justify-between group/design-root overflow-x-hidden"
      style={{ fontFamily: "'Space Grotesk', 'Noto Sans', sans-serif" }}
    >
      {/* Main content area */}
      <div className="flex flex-col flex-grow">
        {" "}
        {/* Added flex-grow to allow "mt-auto" for buttons to work */}
        <div className="flex items-center bg-slate-50 p-4 pb-2 justify-between">
          <div
            className="text-[#0d141c] flex size-12 shrink-0 items-center"
            data-icon="X"
            data-size="24px"
            data-weight="regular"
            onClick={handleCancel} // Added handleCancel to X icon
            style={{ cursor: "pointer" }} // Make it look clickable
            data-testid="close-add-waypoint-button" // Added for testability
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
          </div>
          <h2 className="text-[#0d141c] text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
            New Waypoint
          </h2>
        </div>
        <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-[#0d141c] text-base font-medium leading-normal pb-2">
              Coordinates
            </p>
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141c] focus:outline-0 focus:ring-0 border-none bg-[#e7edf4] focus:border-none h-14 placeholder:text-[#49739c] p-4 text-base font-normal leading-normal"
              value={
                latitude !== null && longitude !== null
                  ? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                  : "Loading coordinates..."
              } // Formatted coordinates
              readOnly
            />
          </label>
        </div>
        {/* Removed nested form tag, main component is a form now */}
        <div className="flex max-w-[480px] flex-wrap items-end gap-4 px-4 py-3">
          <label className="flex flex-col min-w-40 flex-1">
            <p className="text-[#0d141c] text-base font-medium leading-normal pb-2">
              Name
            </p>
            <input
              placeholder="Waypoint Name"
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
              Notes (Optional)
            </p>
            <textarea
              placeholder="Enter any notes here..."
              className="form-textarea flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141c] focus:outline-0 focus:ring-0 border-none bg-[#e7edf4] focus:border-none h-28 placeholder:text-[#49739c] p-4 text-base font-normal leading-normal"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>

        {error && <p className="text-red-500 px-4 py-2">{error}</p>}
        {imageError && <p className="text-red-500 px-4 py-2">{imageError}</p>}
        {successMessage && (
          <p className="text-green-500 px-4 py-2">{successMessage}</p>
        )}

        {isCapturing && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full max-w-md aspect-[4/3] rounded-lg"
              // style={{ transform: "scaleX(-1)" }} // Removed: Mirror mode is usually for user-facing camera
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

        <div className="flex w-full grow bg-slate-50 @container py-3 px-4">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Captured waypoint"
              className="w-full aspect-[3/2] object-cover rounded-lg"
            />
          ) : (
            <div
              className="w-full bg-center bg-no-repeat bg-cover aspect-[3/2] rounded-lg flex items-center justify-center bg-gray-200"
              // Placeholder style, direct image URL removed
            >
              <p className="text-gray-500">Image preview will appear here.</p>
            </div>
          )}
        </div>

        <div className="flex px-4 py-3 justify-start gap-2">
          <button
            type="button"
            onClick={handleCaptureImageClick} // Updated onClick
            className="flex min-w-[84px] max-w-[230px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#0c7ff2] text-slate-50 gap-2 text-sm font-bold leading-normal tracking-[0.015em]"
          >
            <div
              className="text-slate-50 shrink-0" // Added shrink-0
              data-icon="Camera"
              data-size="20px"
              data-weight="regular"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20px"
                height="20px"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path d="M208,56H180.28L166.65,35.56A8,8,0,0,0,160,32H96a8,8,0,0,0-6.65,3.56L75.71,56H48A24,24,0,0,0,24,80V192a24,24,0,0,0,24,24H208a24,24,0,0,0,24-24V80A24,24,0,0,0,208,56Zm8,136a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8H80a8,8,0,0,0,6.66-3.56L100.28,48h55.43l13.63,20.44A8,8,0,0,0,176,72h32a8,8,0,0,1,8,8ZM128,88a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,88Zm0,72a28,28,0,1,1,28-28A28,28,0,0,1,128,160Z"></path>
              </svg>
            </div>
            <span className="truncate">Open Camera</span>
          </button>
           {/* Button to trigger fallback file input explicitly */}
          <button
            type="button"
            onClick={() => { // Simplified direct call to file input logic
              setImageError(null);
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              // No 'capture' attribute here to allow choosing from gallery on desktop/mobile
              input.onchange = (event) => {
                const target = event.target as HTMLInputElement;
                if (target.files && target.files.length > 0) {
                  const file = target.files[0];
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setCapturedImage(reader.result as string);
                    setImageError(null);
                    setSuccessMessage("Image selected. You can now save the waypoint.");
                  };
                  reader.onerror = () => {
                    setImageError("Failed to read image file.");
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
            className="flex min-w-[84px] max-w-[230px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-500 text-slate-50 gap-2 text-sm font-bold leading-normal tracking-[0.015em]"
          >
            <span className="truncate">Choose from File</span>
          </button>
        </div>
      </div>{" "}
      {/* End of main content area div */}
      {/* Buttons container pushed to the bottom */}
      <div className="mt-auto">
        {" "}
        {/* This will push the buttons to the bottom because parent is flex-col and flex-grow */}
        <div className="flex justify-stretch">
          <div className="flex flex-1 gap-3 flex-wrap px-4 py-3 justify-between">
            <button
              type="button"
              onClick={handleCancel}
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#e7edf4] text-[#0d141c] text-base font-bold leading-normal tracking-[0.015em]"
            >
              <span className="truncate">Cancel</span>
            </button>
            <button
              type="submit" // Type is submit, onClick is not needed as form has onSubmit
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-[#0c7ff2] text-slate-50 text-base font-bold leading-normal tracking-[0.015em]"
            >
              <span className="truncate">Save</span>
            </button>
          </div>
        </div>
        <div className="h-5 bg-slate-50"></div>
      </div>
    </form> // Closed the main form tag
  );
}
