import { type FormEvent, useEffect, useState } from "react";
import type { Route } from "./+types/edit_waypoint";
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

    const updates: WaypointUpdate = { name, notes };

    try {
      await updateWaypoint(waypointId, updates);
      setSuccessMessage("Waypoint updated successfully!");
      setTimeout(() => {
        navigate(-1); // Go back to the previous page
      }, 1500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update waypoint."
      );
    }
  };

  const handleCancel = () => {
    navigate(-1); // Go back to the previous page
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading waypoint data...</div>;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex size-full min-h-screen flex-col bg-slate-50 justify-between group/design-root overflow-x-hidden"
    >
      <div>
        <div className="flex items-center bg-slate-50 p-4 pb-2 justify-between">
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
        {/* Static map image - can be removed or replaced if dynamic map is needed */}
        <div className="flex w-full grow bg-slate-50 @container py-3">
          <div className="w-full gap-1 overflow-hidden bg-slate-50 @[480px]:gap-2 aspect-[3/2] flex">
            <div
              className="w-full bg-center bg-no-repeat bg-cover aspect-auto rounded-none flex-1"
              style={{
                backgroundImage:
                  "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDHGMkN9JXfjkuyVMgqHkiUu30rOdEcWf_kC9e6eiuokA4JvIoi3IFyf_HTbwV0_3ojFbxEn6ipxDKt97ShBirh5orB9qzOmcZdovMRoqSkbdMChWyasc1exQCd8INeZFmX8NTrtZAJcUX8kLO6tVhncQG95XCFnt36wnr3N_rWhxhFvAupTDmCeeFDQ62LrxOWZt3M8XcI8Ma4zsD5bltXlqovn36k8HdYko9rVw0Xr0BOXdQXPA8leleNX7PM6IgEdsmzEnfmzt8')",
              }}
            ></div>
          </div>
        </div>
        <div className="flex justify-stretch">
          <div className="flex flex-1 gap-3 flex-wrap px-4 py-3 justify-between">
            {/* The "Remove" button is not implemented in this subtask */}
            <button
              type="button"
              onClick={handleCancel}
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#e7edf4] text-[#0d141c] text-sm font-bold leading-normal tracking-[0.015em]"
            >
              <span className="truncate">Cancel</span>
            </button>
            <button
              type="submit"
              className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-[#0c7ff2] text-slate-50 text-sm font-bold leading-normal tracking-[0.015em]"
              disabled={isLoading}
            >
              <span className="truncate">Save</span>
            </button>
          </div>
        </div>
      </div>
      {/* Bottom navigation - can be kept or removed as per broader app design */}
      <div>
        <div className="flex gap-2 border-t border-[#e7edf4] bg-slate-50 px-4 pb-3 pt-2">
          {/* Navigation links here, simplified for brevity */}
          <a
            className="just flex flex-1 flex-col items-center justify-end gap-1 rounded-full text-[#0d141c]"
            href="/"
          >
            <div className="text-[#0d141c] flex h-8 items-center justify-center">
              {/* Icon MapTrifold */}
              <svg
                width="24px"
                height="24px"
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
