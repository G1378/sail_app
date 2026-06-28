"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Users } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { cn, getStatusConfig, getBoatTypeColor } from "@/lib/utils";
import type { Boat } from "@/types";

interface PersonRowProps {
  label: string;
  name: string | null;
}

function PersonRow({ label, name }: PersonRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </span>
      {name ? (
        <div className="flex items-center gap-1.5">
          <Avatar name={name} size="sm" />
          <span className="text-xs text-gray-800 font-medium">{name}</span>
        </div>
      ) : (
        <span className="text-xs text-gray-300 italic">— unassigned</span>
      )}
    </div>
  );
}

interface BoatCardProps {
  boat: Boat;
  onAssignSailor?: () => void;
  assignEnabled?: boolean;
  draggable?: boolean;
}

export function BoatCard({ boat, onAssignSailor, assignEnabled, draggable = true }: BoatCardProps) {
  const sortable = draggable
    ? useSortable({ id: boat.id })
    : ({} as ReturnType<typeof useSortable>);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortable as any;

  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id: boat.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusConfig = getStatusConfig(boat.status);
  const typeColor = getBoatTypeColor(boat.type);
  const capacityPct = Math.min(100, Math.round((boat.filled / boat.capacity) * 100));
  const capacityColor =
    capacityPct === 100
      ? "bg-green-400"
      : capacityPct > 0
      ? "bg-blue-400"
      : "bg-gray-200";

  return (
    <div ref={setDroppableNodeRef}>
      <motion.div
        ref={draggable ? setNodeRef : undefined}
        style={style}
        {...(draggable ? attributes : {})}
        {...(draggable ? listeners : {})}
        onClick={() => {
          if (assignEnabled && onAssignSailor) {
            onAssignSailor();
          }
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
        whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.07)" }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 select-none",
          isDragging && "shadow-xl scale-[0.98]",
          boat.status === "alert" && "border-red-100",
          boat.status === "warn" && "border-amber-100",
          isOver && "border-blue-300 bg-blue-50/70"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 leading-tight">
              {boat.name}
            </h3>
            <span
              className={cn(
                "text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block",
                typeColor
              )}
            >
              {boat.type}
            </span>
          </div>
          <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
        </div>

        {/* People */}
        <div className="flex flex-col gap-2.5">
          <PersonRow label="Helm" name={boat.helm} />
          {boat.capacity > 1 && <PersonRow label="Crew" name={boat.crew} />}
        </div>

        {/* Goal */}
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
            Goal
          </span>
          <span className="text-xs text-gray-700">{boat.goal}</span>
        </div>

        {/* Footer: capacity bar */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
          <Users className="w-3 h-3 text-gray-300 flex-shrink-0" />
          <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full", capacityColor)}
              initial={{ width: 0 }}
              animate={{ width: `${capacityPct}%` }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
            />
          </div>
          <span className="text-[10px] text-gray-400 font-medium tabular-nums">
            {boat.filled}/{boat.capacity}
          </span>
        </div>

        {/* Warning */}
        {boat.warning && (
          <div className="flex items-start gap-1.5 bg-amber-50 rounded-lg px-2.5 py-2 text-[10px] text-amber-700 font-medium">
            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            {boat.warning}
          </div>
        )}
      </motion.div>
    </div>
  );
}
