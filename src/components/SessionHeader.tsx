"use client";

import { Wind, Compass, Waves, CloudLightning, Zap, Save } from "lucide-react";
import { motion } from "framer-motion";
import type { SessionData } from "@/types";

interface SessionHeaderProps {
  session: SessionData;
  onGenerate: () => void;
  onSave: () => void;
}

const WEATHER_ICONS = {
  wind: Wind,
  direction: Compass,
  tide: Waves,
  gusts: CloudLightning,
};

export function SessionHeader({
  session,
  onGenerate,
  onSave,
}: SessionHeaderProps) {
  const { weather, objective } = session;

  const weatherItems = [
    {
      icon: WEATHER_ICONS.wind,
      label: "Wind",
      value: weather.windSpeed,
    },
    {
      icon: WEATHER_ICONS.direction,
      label: weather.windDirection,
      value: weather.windDegrees,
    },
    {
      icon: WEATHER_ICONS.tide,
      label: "Tide",
      value: weather.tide,
    },
    {
      icon: WEATHER_ICONS.gusts,
      label: "Gusts",
      value: weather.gusts,
    },
  ];

  return (
    <header className="z-10 flex flex-col gap-3 border-b border-gray-100 bg-white px-3 py-3 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Brand / session title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xl leading-none">⛵</span>
          <span className="text-sm font-semibold tracking-tight text-gray-900">
            Today&rsquo;s Session
          </span>
        </div>

        <div className="hidden h-5 w-px bg-gray-100 sm:block" />

        {/* Objective pill */}
        <span className="flex-shrink-0 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
          {objective}
        </span>
      </div>

      {/* Weather pills */}
      <div className="flex flex-1 flex-wrap items-center gap-2 overflow-x-auto no-scrollbar">
        {weatherItems.map((item) => {
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
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={onGenerate}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 sm:w-auto"
        >
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          Generate Allocation
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
