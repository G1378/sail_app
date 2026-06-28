"use client";

import { useDroppable } from "@dnd-kit/core";
import { BoatCard } from "@/components/BoatCard";
import { cn } from "@/lib/utils";
import type { Boat } from "@/types";

interface PlanningBoardProps {
  boats: Boat[];
  onBoatsChange: (boats: Boat[]) => void;
  selectedInstructors: string[];
  onAssignByTap?: (boatId: string) => void;
  assignEnabled?: boolean;
}

function InstructorSection({ instructor, boats }: { instructor: string; boats: Boat[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: `instructor:${instructor}` });

  return (
    <div ref={setNodeRef} className={cn("bg-white rounded-2xl border border-gray-100 p-4", isOver && "ring-2 ring-blue-200 bg-blue-50") }>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-blue-700">{instructor}</h3>
          <p className="text-xs text-gray-500">Drag boats here to assign to this instructor</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
          {boats.length} boats
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {boats.map((boat) => (
          <BoatCard key={boat.id} boat={boat} draggable />
        ))}
      </div>
    </div>
  );
}

function UnassignedSection({ boats, onAssignByTap, assignEnabled }: { boats: Boat[]; onAssignByTap?: (boatId: string) => void; assignEnabled?: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "instructor:unassigned" });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-white rounded-2xl border p-4 transition-all duration-150",
        "border-gray-200 shadow-sm",
        "hover:border-blue-300",
        isOver && "ring-2 ring-blue-400 bg-blue-50 border-blue-300 shadow-lg"
      )}
    >
      <div className={cn(
        "mb-4 rounded-2xl border border-dashed p-4 transition-colors duration-150",
        isOver ? "border-blue-300 bg-blue-100" : "border-gray-200 bg-gray-50"
      )}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Unassigned Boats</h3>
            <p className="text-xs text-gray-500">Drag a boat onto this section to remove it from an instructor group.</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
            {boats.length} boats
          </span>
        </div>
      </div>

      <div className={cn("rounded-2xl border p-4 min-h-[200px] transition-colors duration-150", isOver ? "border-blue-300 bg-blue-100" : "border-dashed border-gray-200 bg-white")}>
        {boats.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {boats.map((boat) => (
              <BoatCard
                key={boat.id}
                boat={boat}
                onAssignSailor={() => onAssignByTap?.(boat.id)}
                assignEnabled={Boolean(assignEnabled)}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 text-center">
            Drop a boat here to unassign it.
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanningBoard({ boats, onBoatsChange, selectedInstructors, onAssignByTap, assignEnabled }: PlanningBoardProps) {
  const groupedBoats = selectedInstructors.map((teacher) => ({
    instructor: teacher,
    boats: boats.filter((boat) => boat.instructor === teacher),
  }));

  const ungroupedBoats = boats.filter(
    (boat) => !selectedInstructors.includes(boat.instructor ?? "")
  );

  return (
    <div className="w-full p-3 sm:p-5 lg:flex-1 lg:overflow-y-auto">
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Fleet Allocation Board
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {boats.length} boats · Drag to reorder or assign instructors by dragging into a group
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 sm:gap-4 sm:text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
            Ready
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            Review
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
            Action
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-gray-200" />
            Idle
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {groupedBoats.map((group) => (
          <InstructorSection
            key={group.instructor}
            instructor={group.instructor}
            boats={group.boats}
          />
        ))}

        <UnassignedSection
          boats={ungroupedBoats}
          onAssignByTap={onAssignByTap}
          assignEnabled={assignEnabled}
        />
      </div>
    </div>
  );
}
