import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const SKILL_COLORS: Record<string, string> = {
  Trapeze: "bg-blue-50 text-blue-800",
  Spinnaker: "bg-purple-50 text-purple-800",
  Race: "bg-red-50 text-red-800",
  Start: "bg-red-50 text-red-800",
  Rules: "bg-green-50 text-green-800",
  Tacking: "bg-green-50 text-green-800",
  Gybing: "bg-green-50 text-green-800",
  Balance: "bg-amber-50 text-amber-800",
  Steering: "bg-amber-50 text-amber-800",
  "Rule of Road": "bg-green-50 text-green-800",
};

export function getSkillColor(skill: string): string {
  return SKILL_COLORS[skill] ?? "bg-blue-50 text-blue-800";
}

export const BOAT_TYPE_COLORS: Record<string, string> = {
  Feva: "bg-blue-50 text-blue-800",
  Pico: "bg-green-50 text-green-800",
  Topper: "bg-amber-50 text-amber-800",
  Optimist: "bg-purple-50 text-purple-800",
};

export function getBoatTypeColor(type: string): string {
  return BOAT_TYPE_COLORS[type] ?? "bg-gray-50 text-gray-800";
}

export const CONFIDENCE_COLORS: Record<string, string> = {
  High: "bg-green-50 text-green-800",
  Med: "bg-amber-50 text-amber-800",
  Low: "bg-red-50 text-red-800",
};

export function getConfidenceColor(confidence: string): string {
  return CONFIDENCE_COLORS[confidence] ?? "bg-gray-50 text-gray-800";
}

export const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  ready: { label: "Ready", className: "bg-green-50 text-green-800" },
  warn: { label: "Review", className: "bg-amber-50 text-amber-800" },
  alert: { label: "Action", className: "bg-red-50 text-red-800" },
  idle: { label: "Idle", className: "bg-gray-100 text-gray-600" },
};

export function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
}
