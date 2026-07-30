"use client";

import { Wind, Compass, Waves, CloudLightning, Zap, Save, Menu, List, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useWeather } from "@/lib/useWeather";
import { useClubLocation } from "@/lib/useClubLocation";
import type { SessionData, WeatherData } from "@/types";

interface SessionHeaderProps {
  session: SessionData;
  onGenerate: () => void;
  onSave: () => void;
  onOpenLeft?: () => void;
  onOpenRight?: () => void;
}

const WEATHER_ICONS = {
  wind: Wind,
  direction: Compass,
  tide: Waves,
  gusts: CloudLightning,
};

function buildWeatherItems(weather: WeatherData) {
  return [
    { icon: WEATHER_ICONS.wind,      label: "Wind",            value: weather.windSpeed },
    { icon: WEATHER_ICONS.direction, label: weather.windDirection, value: weather.windDegrees },
    { icon: WEATHER_ICONS.tide,      label: "Tide",            value: weather.tide },
    { icon: WEATHER_ICONS.gusts,     label: "Gusts",           value: weather.gusts },
  ];
}

// Skeleton pill shown while loading
function WeatherSkeleton() {
  return (
    <>
      {[80, 72, 96, 88].map((w) => (
        <div
          key={w}
          className="flex-shrink-0 h-7 rounded-full bg-gray-100 animate-pulse"
          style={{ width: w }}
        />
      ))}
    </>
  );
}

export function SessionHeader({
  session,
  onGenerate,
  onSave,
  onOpenLeft,
  onOpenRight,
}: SessionHeaderProps) {
  const clubLocation = useClubLocation();
  const weatherState = useWeather(clubLocation);

  // Decide which weather data to display
  const displayWeather =
    weatherState.status === "ok" ? weatherState.data : session.weather;

  const weatherItems = buildWeatherItems(displayWeather);
  const isLive = weatherState.status === "ok";
  const isLoading = weatherState.status === "loading";
  const isError = weatherState.status === "error";

  return (
    <header className="z-10 flex flex-col gap-3 border-b border-gray-100 bg-white px-3 py-3 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:gap-4">
      {/* Mobile sidebar toggles */}
      <div className="flex items-center gap-2 lg:hidden">
        <button
          onClick={onOpenLeft}
          aria-label="Open left sidebar"
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={onOpenRight}
          aria-label="Open right sidebar"
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
        >
          <List className="h-5 w-5" />
        </button>
      </div>

      {/* Title + objective */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl leading-none">⛵</span>
          <span className="text-sm font-semibold tracking-tight text-gray-900">
            Today&rsquo;s Session
          </span>
        </div>

        <div className="hidden h-5 w-px bg-gray-100 sm:block" />

        <span className="flex-shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          {session.objective}
        </span>
      </div>

      {/* Weather pills */}
      <div className="flex flex-1 flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
        {isLoading ? (
          <WeatherSkeleton />
        ) : (
          weatherItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs whitespace-nowrap"
              >
                <Icon className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-gray-500">{item.label}</span>
                <span className="font-medium text-gray-800">{item.value}</span>
              </div>
            );
          })
        )}

        {/* Live / error indicator */}
        {isLive && (
          <div
            title={`Live · ${clubLocation.name} · updated ${(weatherState as any).fetchedAt?.toLocaleTimeString()}`}
            className="flex flex-shrink-0 items-center gap-1 rounded-full border border-green-100 bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
        )}
        {isError && (
          <div
            title={`Weather fetch failed — showing fallback data`}
            className="flex flex-shrink-0 items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700"
          >
            <RefreshCw className="h-3 w-3" />
            Offline
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={onGenerate}
          title="Auto-allocation coming soon"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 sm:w-auto"
        >
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          Auto-Allocate
          <span className="ml-0.5 text-[9px] font-semibold rounded px-1 py-0.5 bg-gray-100 text-gray-400">
            SOON
          </span>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={onSave}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
        >
          <Save className="h-3.5 w-3.5" />
          Save Session
        </motion.button>
      </div>
    </header>
  );
}
