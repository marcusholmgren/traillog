import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { addWaypoint } from "../services/db";

export default function AddWaypoint() {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const navigate = useNavigate();

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

    try {
      await addWaypoint({ name, latitude, longitude });
      setSuccessMessage("Waypoint saved successfully!");
      setName("");
      // Optionally navigate away or clear coordinates after successful save
      // navigate('/waypoints'); // Example: navigate to a list of waypoints
    } catch (err) {
      console.error("Error saving waypoint:", err);
      setError("Failed to save waypoint. Please try again.");
    }
  };

  const handleCancel = () => {
    navigate(-1); // Go back to the previous page
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
              required // Added required attribute
            />
          </label>
        </div>
        {error && <p className="text-red-500 px-4 py-2">{error}</p>}
        {successMessage && (
          <p className="text-green-500 px-4 py-2">{successMessage}</p>
        )}
        <div className="flex w-full grow bg-slate-50 @container py-3">
          {/* Image capture UI - keeping existing structure if needed, otherwise can be removed or adapted */}
          <div className="w-full gap-1 overflow-hidden bg-slate-50 @[480px]:gap-2 aspect-[3/2] flex">
            <div
              className="w-full bg-center bg-no-repeat bg-cover aspect-auto rounded-none flex-1"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCMiSQXTieU_81XZ3U3RaVUEh378ufxMCYTi_mn1_n2-EamIc7BhKyglQq4BOJ_w1IULjn9uU31oDroRyECb70bB6XsrrES9MuXzgxSUGF4YIVFJmiBlJlcGPThIC2dt9-o_Ab85vd4Kdd0FXecHvScSV9_aMDSdD0nJrsAcoZvfPmrYpIbmDmsDu_kviUkVWNTqXe7GS6mxYgzaguBxOI8VOBQ8jwFsL8Jj4WIhnnZ6FoHFWGmp9TkYWGRnZA4LCXTPj5bGCOWY-8')",
              }}
            ></div>
          </div>
        </div>
        <div className="flex px-4 py-3 justify-end">
          {/* This button seems related to image capture, might need to be adapted or removed if not part of waypoint saving */}
          <button
            type="button" // Specify type to prevent form submission if it's not the main save button
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#0c7ff2] text-slate-50 gap-2 pl-4 text-sm font-bold leading-normal tracking-[0.015em]"
          >
            <div
              className="text-slate-50"
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
            <span className="truncate">Capture Image</span>
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
