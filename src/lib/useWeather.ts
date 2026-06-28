"use client";

import { useState, useEffect } from "react";
import type { WeatherData } from "@/types";

export interface WeatherLocation {
  lat: number;
  lon: number;
  name: string;
}

// Default to Brighton, UK — change to your club's coordinates
export const DEFAULT_LOCATION: WeatherLocation = {
  lat: 50.8225,
  lon: -0.1372,
  name: "Brighton",
};

type WeatherState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: WeatherData; fetchedAt: Date }
  | { status: "error"; message: string };

// Converts a wind degree bearing to a compass direction string
function degreesToCompass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

export function useWeather(location: WeatherLocation = DEFAULT_LOCATION): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: "loading" });

  useEffect(() => {
    setState({ status: "loading" });

    const params = new URLSearchParams({
      latitude: String(location.lat),
      longitude: String(location.lon),
      current: [
        "wind_speed_10m",
        "wind_gusts_10m",
        "wind_direction_10m",
        "weather_code",
      ].join(","),
      wind_speed_unit: "kn",
      timezone: "auto",
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params}`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        const c = json.current;
        if (!c) throw new Error("Unexpected response shape");

        const windSpeed: number = Math.round(c.wind_speed_10m ?? 0);
        const gusts: number = Math.round(c.wind_gusts_10m ?? 0);
        const dirDeg: number = Math.round(c.wind_direction_10m ?? 0);
        const dirLabel = degreesToCompass(dirDeg);

        const data: WeatherData = {
          windSpeed: `${windSpeed} kn`,
          windDirection: dirLabel,
          windDegrees: `${dirDeg}°`,
          gusts: `Up to ${gusts} kn`,
          // Open-Meteo free tier doesn't include tide data —
          // keep the placeholder; swap for a tide API if needed
          tide: "See local tide tables",
        };

        setState({ status: "ok", data, fetchedAt: new Date() });
      })
      .catch((err) => {
        setState({ status: "error", message: String(err.message ?? err) });
      });
  }, [location.lat, location.lon]);

  return state;
}
