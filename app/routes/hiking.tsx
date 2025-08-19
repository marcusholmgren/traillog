import React, { useState } from "react";
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
import { getCurrentPosition } from "~/services/geolocation";
import { useAlert } from "~/hooks/useAlert";

function coordinatesToLineString(
  waypoints: GeolocationCoordinates[],
): GeoJSON.LineString {
  const coordinates = waypoints.map((wp) => [wp.longitude, wp.latitude]);
  return {
    type: "LineString",
    coordinates: coordinates,
  };
}

function HikingPage() {
  const [isHiking, setIsHiking] = useState(false);
  const [waypoints, setWaypoints] = useState<GeolocationCoordinates[]>([]);
  const [isPromptingName, setIsPromptingName] = useState(false);
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  const getMyPosition = (): Promise<GeolocationPosition> => 
    getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });

  const handleStartHike = async () => {
    try {
      const position = await getMyPosition();
      setWaypoints([position.coords]);
      setIsHiking(true);
    } catch (error) {
      showAlert({
        title: "Location Error",
        message: "Error getting current position. Please make sure you have enabled location services."
      });
    }
  };

  const handleAddWaypoint = async () => {
    try {
      const position = await getMyPosition();
      setWaypoints((prevWaypoints) => [...prevWaypoints, position.coords]);
    } catch (error) {
      showAlert({
        title: "Location Error",
        message: "Error getting current position. Please make sure you have enabled location services."
      });
    }
  };

  const handleStopHike = () => {
    if (waypoints.length < 2) {
      showAlert({
        title: "Waypoint Error",
        message: "You need at least 2 waypoints to save a hike."
      });
      setIsHiking(false);
      setWaypoints([]);
      return;
    }
    setIsPromptingName(true);
  };

  const handleSaveHike = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const hikeName = (formData.get("hikeName") as string) || "";

    if (!hikeName.trim()) {
      showAlert({
        title: "Validation Error",
        message: "Hike name cannot be empty."
      });
      return;
    }

    try {
      const routeGeometry = coordinatesToLineString(waypoints);
      await addRoute(hikeName, routeGeometry);
      showAlert({
        title: "Success",
        message: "Hike saved successfully!"
      });
      setIsPromptingName(false);
      setIsHiking(false);
      setWaypoints([]);
      navigate("/routes");
    } catch (error) {
      console.error("Error saving hike:", error);
      showAlert({
        title: "Save Error",
        message: "Failed to save hike. Please try again."
      });
    }
  };

  return (
    <div>
      <h1>Hiking Mode</h1>
      {!isHiking ? (
        <Button onClick={handleStartHike}>Start Hike</Button>
      ) : (
        <>
          <Button onClick={handleAddWaypoint}>Add Waypoint</Button>
          <Button color="red" onClick={handleStopHike}>
            Stop Hike
          </Button>
        </>
      )}
      <div>
        <h2>Waypoints:</h2>
        <ul>
          {waypoints.map((waypoint, index) => (
            <li key={index}>
              Lat: {waypoint.latitude}, Lon: {waypoint.longitude}
            </li>
          ))}
        </ul>
      </div>
      <Dialog open={isPromptingName} onClose={() => setIsPromptingName(false)}>
        <form onSubmit={handleSaveHike}>
          <DialogTitle>Hike Name</DialogTitle>
          <DialogDescription>
            Please enter a name for this hike to save it.
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
            <Button type="submit">Save</Button>
          </DialogActions>
        </form>
      </Dialog>
    </div>
  );
}

export default HikingPage;
