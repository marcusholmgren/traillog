import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import type * as GeoJSON from "geojson";
import { addRoute } from "~/services/db";
import { Button } from "~/components/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/components/dialog";
import { Input } from "~/components/input";
import {
  getCurrentPosition,
  calculateTotalRouteDistance,
  type Coordinates,
} from "~/services/geolocation";
import { useAlert } from "~/hooks/useAlert";
import { Alert, AlertActions, AlertDescription, AlertTitle } from "~/components/alert";
import { PageLayout } from "~/components/page-layout";
import { numberFormat } from "~/services/formatter";
import {
  PlayIcon,
  PlusIcon,
  StopIcon,
  TrashIcon,
  MapPinIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export interface HikeWaypoint {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  timestamp: number;
  label?: string;
}

export interface ActiveHikeState {
  isHiking: boolean;
  startTime: number | null;
  waypoints: HikeWaypoint[];
}

const STORAGE_KEY = "traillog_active_hike";

export function getWaypointLabel(index: number): string {
  let label = "";
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return `Point ${label}`;
}

export function loadActiveHike(): ActiveHikeState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved) as ActiveHikeState;
  } catch (e) {
    console.error("Failed to load active hike from storage", e);
    return null;
  }
}

export function saveActiveHike(state: ActiveHikeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save active hike to storage", e);
  }
}

export function clearActiveHike(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear active hike from storage", e);
  }
}

function coordinatesToLineString(
  waypoints: HikeWaypoint[]
): GeoJSON.LineString {
  const coordinates = waypoints.map((wp) => [wp.longitude, wp.latitude]);
  return {
    type: "LineString",
    coordinates: coordinates,
  };
}

function positionToHikeWaypoint(
  position: GeolocationPosition,
  index: number
): HikeWaypoint {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    altitude: position.coords.altitude,
    accuracy: position.coords.accuracy,
    timestamp: position.timestamp || Date.now(),
    label: getWaypointLabel(index),
  };
}

function HikingPage() {
  const [isHiking, setIsHiking] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [waypoints, setWaypoints] = useState<HikeWaypoint[]>([]);
  const [isPromptingName, setIsPromptingName] = useState(false);
  const [isPromptingDiscard, setIsPromptingDiscard] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");
  const { alert, showAlert } = useAlert();
  const navigate = useNavigate();

  // Load persistent hike state on mount
  useEffect(() => {
    const savedState = loadActiveHike();
    if (savedState && savedState.isHiking) {
      setIsHiking(savedState.isHiking);
      setStartTime(savedState.startTime);
      setWaypoints(savedState.waypoints || []);
    }
  }, []);

  // Sync state to localStorage whenever hiking status, start time, or waypoints change
  useEffect(() => {
    if (isHiking) {
      saveActiveHike({
        isHiking,
        startTime,
        waypoints,
      });
    }
  }, [isHiking, startTime, waypoints]);

  // Timer update for elapsed time
  useEffect(() => {
    if (!isHiking || !startTime) {
      setElapsedTime("00:00:00");
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diffMs = Math.max(0, now - startTime);
      const seconds = Math.floor((diffMs / 1000) % 60);
      const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));

      const pad = (n: number) => n.toString().padStart(2, "0");
      setElapsedTime(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isHiking, startTime]);

  const getMyPosition = (): Promise<GeolocationPosition> =>
    getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });

  const handleStartHike = async () => {
    setIsLocating(true);
    try {
      const position = await getMyPosition();
      const firstWaypoint = positionToHikeWaypoint(position, 0);
      const now = Date.now();

      setStartTime(now);
      setWaypoints([firstWaypoint]);
      setIsHiking(true);

      saveActiveHike({
        isHiking: true,
        startTime: now,
        waypoints: [firstWaypoint],
      });
    } catch (error) {
      console.error("Error getting current position:", error);
      showAlert({
        title: "Error Getting Current Position",
        message: "Please make sure you have enabled location services.",
      });
    } finally {
      setIsLocating(false);
    }
  };

  const handleAddWaypoint = async () => {
    setIsLocating(true);
    try {
      const position = await getMyPosition();
      const newWaypoint = positionToHikeWaypoint(position, waypoints.length);
      setWaypoints((prev) => {
        const nextWaypoints = [...prev, newWaypoint];
        saveActiveHike({
          isHiking: true,
          startTime,
          waypoints: nextWaypoints,
        });
        return nextWaypoints;
      });
    } catch (error) {
      console.error("Error getting current position:", error);
      showAlert({
        title: "Error Getting Current Position",
        message: "Please make sure you have enabled location services.",
      });
    } finally {
      setIsLocating(false);
    }
  };

  const handleStopHike = () => {
    if (waypoints.length < 2) {
      showAlert({
        title: "Cannot Save Hike",
        message: "You need at least 2 waypoints to save a hike route.",
      });
      return;
    }
    setIsPromptingName(true);
  };

  const handleDiscardHike = () => {
    setIsPromptingDiscard(true);
  };

  const confirmDiscardHike = () => {
    setIsHiking(false);
    setStartTime(null);
    setWaypoints([]);
    clearActiveHike();
    setIsPromptingDiscard(false);
  };

  const handleSaveHike = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const hikeName = (formData.get("hikeName") as string) || "";

    if (!hikeName.trim()) {
      showAlert({
        title: "Invalid Name",
        message: "Hike name cannot be empty.",
      });
      return;
    }

    try {
      const routeGeometry = coordinatesToLineString(waypoints);
      await addRoute(hikeName.trim(), routeGeometry);

      clearActiveHike();
      setIsHiking(false);
      setStartTime(null);
      setWaypoints([]);
      setIsPromptingName(false);

      showAlert({
        title: "Success!",
        message: "Hike saved successfully!",
        onConfirm: () => navigate("/routes"),
      });
    } catch (error) {
      console.error("Error saving hike:", error);
      showAlert({
        title: "Save Failed",
        message: "Failed to save hike. Please try again.",
      });
    }
  };

  const routeCoordinates: Coordinates[] = waypoints.map((wp) => ({
    latitude: wp.latitude,
    longitude: wp.longitude,
  }));
  const totalDistance = calculateTotalRouteDistance(routeCoordinates);

  return (
    <PageLayout
      title="Hiking Mode"
      onBack={() => navigate(-1)}
      footer={
        isHiking ? (
          <div className="grid grid-cols-2 gap-3">
            <Button
              color="green"
              onClick={handleAddWaypoint}
              disabled={isLocating}
              className="flex items-center justify-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              {isLocating ? "Locating..." : "Add Waypoint"}
            </Button>
            <Button
              color="red"
              onClick={handleStopHike}
              disabled={isLocating}
              className="flex items-center justify-center gap-2"
            >
              <StopIcon className="h-5 w-5" />
              Finish & Save
            </Button>
          </div>
        ) : (
          <Button
            color="green"
            onClick={handleStartHike}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-2 py-3 text-base"
          >
            <PlayIcon className="h-6 w-6" />
            {isLocating ? "Acquiring Position..." : "Start Hike"}
          </Button>
        )
      }
    >
      <div className="p-4 space-y-4">
        {isHiking && (
          <div className="bg-slate-900 text-white p-4 rounded-xl shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2 text-slate-300">
                <ClockIcon className="h-5 w-5 text-emerald-400" />
                <span className="text-sm font-medium">Elapsed Time</span>
              </div>
              <span className="text-xl font-mono font-bold text-emerald-400">
                {elapsedTime}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <span className="text-xs text-slate-400 block">Total Distance</span>
                <span className="text-lg font-bold text-white">
                  {numberFormat(totalDistance, "kilometer", 2)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Waypoints</span>
                <span className="text-lg font-bold text-white">
                  {waypoints.length}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={handleDiscardHike}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium"
              >
                <TrashIcon className="h-4 w-4" />
                Discard Active Hike
              </button>
            </div>
          </div>
        )}

        {!isHiking && (
          <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-slate-200">
            <MapPinIcon className="h-16 w-16 text-emerald-600 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-slate-800">Ready to Hike?</h2>
            <p className="text-sm text-slate-600 mt-1 max-w-sm mx-auto">
              Start your hike to record waypoints as you walk from Point A to Point B, C, and beyond. Your progress will be saved automatically even if you leave the app.
            </p>
          </div>
        )}

        <div>
          <h2 className="text-base font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-slate-600" />
            Waypoints Recorded ({waypoints.length})
          </h2>

          {waypoints.length === 0 ? (
            <p className="text-sm text-slate-500 italic p-4 bg-slate-50 rounded-lg text-center">
              No waypoints recorded yet. Press "Start Hike" to begin.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-xl overflow-hidden">
              {waypoints.map((wp, index) => (
                <li key={index} className="p-3.5 flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-300">
                    {index === 0 ? "A" : index === waypoints.length - 1 && index > 0 ? String.fromCharCode(65 + (index % 26)) : index + 1}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 text-sm">
                        {wp.label || getWaypointLabel(index)}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(wp.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}
                      {wp.altitude !== undefined && wp.altitude !== null && (
                        <span> | {Math.round(wp.altitude)}m alt</span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Alert for notifications */}
      {alert.isOpen && (
        <Alert open={alert.isOpen} onClose={alert.hide}>
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
          <AlertActions>
            <Button
              onClick={() => {
                alert.hide();
                if (alert.onConfirm) alert.onConfirm();
              }}
            >
              OK
            </Button>
          </AlertActions>
        </Alert>
      )}

      {/* Dialog for prompting Hike Name */}
      <Dialog open={isPromptingName} onClose={() => setIsPromptingName(false)}>
        <form onSubmit={handleSaveHike}>
          <DialogTitle>Save Hike Route</DialogTitle>
          <DialogDescription>
            Enter a name for this hike route with {waypoints.length} waypoints.
          </DialogDescription>
          <DialogBody>
            <Input
              name="hikeName"
              placeholder={`Hike with ${waypoints.length} waypoints`}
              autoFocus
            />
          </DialogBody>
          <DialogActions>
            <Button
              type="button"
              plain
              onClick={() => setIsPromptingName(false)}
            >
              Cancel
            </Button>
            <Button type="submit" color="green">
              Save Route
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog for confirming Discard */}
      <Dialog open={isPromptingDiscard} onClose={() => setIsPromptingDiscard(false)}>
        <DialogTitle>Discard Active Hike?</DialogTitle>
        <DialogDescription>
          Are you sure you want to discard your active hike? All recorded waypoints for this hike session will be cleared.
        </DialogDescription>
        <DialogActions>
          <Button
            type="button"
            plain
            onClick={() => setIsPromptingDiscard(false)}
          >
            Cancel
          </Button>
          <Button color="red" onClick={confirmDiscardHike}>
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}

export default HikingPage;
