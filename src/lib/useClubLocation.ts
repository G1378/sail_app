"use client";

import { useState, useEffect } from "react";
import { loadClubLocation } from "@/lib/db";
import { DEFAULT_LOCATION, type WeatherLocation } from "@/lib/useWeather";

/**
 * Resolves the weather location to use: the caller's club's saved location
 * if one has been set, otherwise DEFAULT_LOCATION. Falls back silently on
 * any load error (e.g. club hasn't been migrated to have a location yet) —
 * weather is a nice-to-have, so it shouldn't ever block the page.
 */
export function useClubLocation(): WeatherLocation {
  const [location, setLocation] = useState<WeatherLocation>(DEFAULT_LOCATION);

  useEffect(() => {
    let active = true;

    loadClubLocation()
      .then((club) => {
        if (active && club) {
          setLocation({ lat: club.lat, lon: club.lon, name: club.name });
        }
      })
      .catch(() => {
        // No location set yet, or the column doesn't exist — keep the default.
      });

    return () => { active = false; };
  }, []);

  return location;
}
