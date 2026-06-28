"use client";

import { ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, getSkillColor, getConfidenceColor } from "@/lib/utils";
import type { Sailor } from "@/types";

interface SailorChipProps {
  sailor: Sailor;
}

const STAGE_COLORS: Record<number, string> = {
  1: "bg-amber-50 text-amber-800",
  2: "bg-blue-50 text-blue-800",
  3: "bg-green-50 text-green-800",
  4: "bg-purple-50 text-purple-800",
};

const ROLE_ICONS: Record<string, string> = {
  Helm: "⛵",
  Crew: "🪝",
  Either: "↔",
};

function SailorChip({ sailor }: SailorChipProps) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
      transition={{ duration: 0.15 }}
      draggable
      className="flex-shrink-0 w-44 bg-white rounded-xl border border-gray-100 p-3 cursor-grab hover:border-blue-200 transition-colors"
    >
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-900">{sailor.name}</span>
        <GripVertical className="w-3 h-3 text-gray-200 mt-0.5" />
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <span
          className={cn(
            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
            STAGE_COLORS[sailor.stage] ?? "bg-gray-100 text-gray-600"
          )}
        >
          Stage {sailor.stage}
        </span>
        <span
          className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
            getConfidenceColor(sailor.confidence)
          )}
        >
          {sailor.confidence}
        </span>
      </div>

      <div className="flex items-center gap-1 mb-2">
        <span className="text-[10px] text-gray-400">
          {ROLE_ICONS[sailor.role] ?? ""} Prefers {sailor.role}
        </span>
      </div>

      <div className="flex flex-wrap gap-1">
        {sailor.skills.map((skill) => (
          <span
            key={skill}
            className={cn(
              "text-[9px] font-semibold px-1.5 py-0.5 rounded-full",
              getSkillColor(skill)
            )}
          >
            {skill}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

interface SailorPoolProps {
  sailors: Sailor[];
  isOpen: boolean;
  onToggle: () => void;
}

export function SailorPool({ sailors, isOpen, onToggle }: SailorPoolProps) {
  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-100">
      {/* Panel header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 h-11 hover:bg-gray-50 transition-colors group"
      >
        <motion.span
          animate={{ rotate: isOpen ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
          )}
        </motion.span>
        <span className="text-sm font-medium text-gray-700 flex-1 text-left">
          Sailor Pool
        </span>
        <span className="text-xs text-gray-400">
          {sailors.length} sailors · Drag onto a boat
        </span>
      </button>

      {/* Sailor chips */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 172, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="flex gap-2.5 px-5 pb-4 pt-1 overflow-x-auto h-[172px] items-start">
              {sailors.map((sailor) => (
                <SailorChip key={sailor.id} sailor={sailor} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
