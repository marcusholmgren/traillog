import { NavLink } from "react-router";
import { useState, useEffect } from "react";
import {
  getWaypointCount,
  getTotalDistance,
  getRecentTreks,
} from "../services/statistics";
import { type Route } from "../services/db";

export function Welcome() {
  const [waypointCount, setWaypointCount] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [recentTreks, setRecentTreks] = useState<Route[]>([]);

  useEffect(() => {
    async function fetchData() {
      const count = await getWaypointCount();
      const distance = await getTotalDistance();
      const treks = await getRecentTreks();
      setWaypointCount(count);
      setTotalDistance(distance);
      setRecentTreks(treks);
    }
    fetchData();
  }, []);

  return (
    <main className="flex-1">
      <section className="bg-blue-600 text-white text-center py-20">
        <h1 className="text-5xl font-bold mb-4">Unleash Your Inner Explorer</h1>
        <p className="text-xl mb-8">
          Your ultimate companion for planning, tracking, and reliving your
          adventures.
        </p>
        <NavLink
          to="/routes/create"
          className="bg-white text-blue-600 font-bold py-3 px-8 rounded-full"
        >
          Plan Your Adventure
        </NavLink>
      </section>

      <section className="py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Trekking Statistics</h2>
          <div className="flex justify-center gap-16">
            <div>
              <p className="text-4xl font-bold">{totalDistance} km</p>
              <p className="text-gray-600">Total Distance</p>
            </div>
            <div>
              <p className="text-4xl font-bold">{waypointCount}</p>
              <p className="text-gray-600">Waypoints Saved</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-100 py-16">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Recent Treks</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {recentTreks.map((trek) => (
              <div
                key={trek.id}
                className="bg-white p-6 rounded-lg shadow-md"
              >
                <h3 className="text-xl font-bold mb-2">{trek.name}</h3>
                <p className="text-gray-600">
                  A trek created on {new Date(trek.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Start Your Next Adventure?
        </h2>
        <NavLink
          to="/routes/create"
          className="bg-blue-600 text-white font-bold py-3 px-8 rounded-full"
        >
          Plan a New Trek
        </NavLink>
      </section>
    </main>
  );
}
