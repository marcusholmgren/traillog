import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import type * as GeoJSON from "geojson";
import { addRoute } from '~/services/db';
import { Button } from '~/components/button';
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "~/components/dialog";
import { Input } from '~/components/input';

interface Coordinates {
  latitude: number;
  longitude: number;
}

function coordinatesToLineString(waypoints: Coordinates[]): GeoJSON.LineString {
    const coordinates = waypoints.map((wp) => [wp.longitude, wp.latitude]);
    return {
        type: "LineString",
        coordinates: coordinates,
    };
}

const HikingPage: React.FC = () => {
  const [isHiking, setIsHiking] = useState(false);
  const [waypoints, setWaypoints] = useState<Coordinates[]>([]);
  const [isPromptingName, setIsPromptingName] = useState(false);
  const navigate = useNavigate();

  const getCurrentPosition = (): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      }
    );
  });
}

const HikingPage: React.FC = () => {
      );
    });
  };

  const handleStartHike = async () => {
    try {
      const position = await getCurrentPosition();
      setWaypoints([position]);
      setIsHiking(true);
    } catch (error) {
      console.error("Error getting current position:", error);
      alert("Error getting current position. Please make sure you have enabled location services.");
    }
  };

  const handleAddWaypoint = async () => {
    try {
      const position = await getCurrentPosition();
      setWaypoints((prevWaypoints) => [...prevWaypoints, position]);
    } catch (error) {
      console.error("Error getting current position:", error);
      alert("Error getting current position. Please make sure you have enabled location services.");
    }
  };

  const handleStopHike = () => {
    if (waypoints.length < 2) {
        alert("You need at least 2 waypoints to save a hike.");
        setIsHiking(false);
  const retrieveCurrentPosition = async () => {
    try {
      const position = await getCurrentPosition();
      setWaypoints((prevWaypoints) => [...prevWaypoints, position]);
      return position;
    } catch (error) {
      console.error("Error getting current position:", error);
      alert("Error getting current position. Please make sure you have enabled location services.");
      return null;
    }
  };

  const handleStartHike = async () => {
    const position = await retrieveCurrentPosition();
    if (position) {
      setWaypoints([position]);
      setIsHiking(true);
    }
  };

  const handleAddWaypoint = async () => {
    await retrieveCurrentPosition();
  };
        return;
    }
    setIsPromptingName(true);
  };

  const handleSaveHike = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const hikeName = (formData.get("hikeName") as string) || "";

    if (!hikeName.trim()) {
        alert("Hike name cannot be empty.");
        return;
    }

    try {
        const routeGeometry = coordinatesToLineString(waypoints);
        await addRoute(hikeName, routeGeometry);
        alert("Hike saved successfully!");
        setIsPromptingName(false);
        setIsHiking(false);
        setWaypoints([]);
        navigate('/routes');
    } catch (error) {
        console.error("Error saving hike:", error);
        alert("Failed to save hike. Please try again.");
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
          <Button color="red" onClick={handleStopHike}>Stop Hike</Button>
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
      <Dialog
        open={isPromptingName}
        onClose={() => setIsPromptingName(false)}
      >
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
};

export default HikingPage;
