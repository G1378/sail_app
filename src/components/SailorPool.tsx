"use client";

import { ChevronUp, ChevronDown, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn, getSkillColor, getConfidenceColor } from "@/lib/utils";
import type { Sailor } from "@/types";

interface SailorChipProps {
  sailor: Sailor;
  selected?: boolean;
  onSelect?: () => void;
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

function SailorChip({ sailor, selected, onSelect }: SailorChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sailor:${sailor.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  return (
      <motion.div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
        animate={{ opacity: isDragging ? 0.5 : 1 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => {
          // prevent click from interfering with drag
          if ((e as any).detail === 1) onSelect?.();
        }}
        className={cn(
          "w-full max-w-[11rem] min-w-[12rem] flex-shrink-0 rounded-xl border bg-white p-3 transition-colors cursor-grab sm:min-w-0 sm:w-44",
          "border-gray-100",
          selected ? "ring-2 ring-blue-300" : "hover:border-blue-200"
        )}
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
  selectedSailorId?: string | null;
  onSelectSailor?: (id: string) => void;
}

export function SailorPool({ sailors, isOpen, onToggle, selectedSailorId, onSelectSailor }: SailorPoolProps) {
  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-100">
      {/* Panel header */}
      <button
        onClick={onToggle}
        className="group flex h-auto w-full items-center gap-3 px-3 py-3 transition-colors hover:bg-gray-50 sm:h-11 sm:px-5"
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
        <span className="text-left text-xs text-gray-400">
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
            <div className="flex h-[172px] items-start gap-2.5 overflow-x-auto px-3 pb-4 pt-1 sm:px-5">
              {sailors.length === 0 ? (
                <div className="flex w-full h-full items-center justify-center">
                  <p className="text-xs text-gray-400 text-center px-4">
                    No sailors in the pool yet — assigned sailors will move to boats below.
                  </p>
                </div>
              ) : (
                sailors.map((sailor) => (
                  <SailorChip
                    key={sailor.id}
                    sailor={sailor}
                    selected={selectedSailorId === sailor.id}
                    onSelect={() => onSelectSailor?.(sailor.id)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
