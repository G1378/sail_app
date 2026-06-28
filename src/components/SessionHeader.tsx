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
    <header className="h-14 flex items-center gap-4 px-5 bg-white border-b border-gray-100 flex-shrink-0 z-10">
      {/* Brand / session title */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xl leading-none">⛵</span>
        <span className="text-sm font-semibold text-gray-900 tracking-tight">
          Today&rsquo;s Session
        </span>
      </div>

      <div className="w-px h-5 bg-gray-100 flex-shrink-0" />

      {/* Objective pill */}
      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 flex-shrink-0">
        {objective}
      </span>

      <div className="w-px h-5 bg-gray-100 flex-shrink-0" />

      {/* Weather pills */}
      <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
        {weatherItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-100 bg-gray-50 text-xs whitespace-nowrap flex-shrink-0"
            >
              <Icon className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-500">{item.label}</span>
              <span className="font-medium text-gray-800">{item.value}</span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={onGenerate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          Generate Allocation
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.97 }}
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          Save Session
        </motion.button>
      </div>
    </header>
  );
}
