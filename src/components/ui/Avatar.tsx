"use client";

import { cn, getInitials } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-purple-100 text-purple-800",
  "bg-amber-100 text-amber-800",
  "bg-red-100 text-red-800",
  "bg-teal-100 text-teal-800",
];

function stringToColorIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}

interface AvatarProps {
  name: string;
  size?: "sm" | "md";
  className?: string;
}

export function Avatar({ name, size = "sm", className }: AvatarProps) {
  const colorClass = AVATAR_COLORS[stringToColorIndex(name)];
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full font-medium flex-shrink-0",
        size === "sm" ? "w-5 h-5 text-[10px]" : "w-7 h-7 text-xs",
        colorClass,
        className
      )}
      aria-label={name}
    >
      {getInitials(name)}
    </span>
  );
}
