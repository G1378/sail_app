"use client";

import { useDroppable } from "@dnd-kit/core";
import { BoatCard } from "@/components/BoatCard";
import { cn } from "@/lib/utils";
import type { Boat } from "@/types";

interface GroupedBoats {
  instructor: string;
  boats: Boat[];
}

interface PlanningBoardProps {
  boats: Boat[];
  groupedBoats: GroupedBoats[];
  ungroupedBoats: Boat[];
  selectedInstructors: string[];
  onAssignByTap?: (boatId: string) => void;
  assignEnabled?: boolean;
  activeDragType?: "boat" | "sailor" | null;
  onSelectBoat?: (boatId: string) => void;
  selectedBoatId?: string | null;
  onAssignBoatToInstructor?: (instructor: string) => void;
  onRemoveFromBoard?: (boatId: string) => void;
}

function InstructorSection({
  instructor,
  boats,
  activeDragType,
  onAssignBoatToInstructor,
  selectedBoatId,
  onSelectBoat,
  boatSelectionActive,
  onRemoveFromBoard,
}: {
  instructor: string;
  boats: Boat[];
  activeDragType?: "boat" | "sailor" | null;
  onAssignBoatToInstructor?: (instructor: string) => void;
  selectedBoatId?: string | null;
  onSelectBoat?: (id: string) => void;
  boatSelectionActive?: boolean;
  onRemoveFromBoard?: (boatId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `instructor:${instructor}`,
    disabled: activeDragType !== "boat",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-white rounded-2xl border border-gray-100 p-4",
        isOver && "ring-2 ring-blue-200 bg-blue-50",
        boatSelectionActive && "ring-2 ring-blue-300 bg-blue-50/40"
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => onAssignBoatToInstructor?.(instructor)}
            className="text-left"
            disabled={!boatSelectionActive}
          >
            <h3
              className={cn(
                "text-sm font-semibold",
                boatSelectionActive
                  ? "text-blue-700 underline underline-offset-2"
                  : "text-gray-800"
              )}
            >
              {instructor}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {boatSelectionActive
                ? "Tap to assign selected boat here"
                : "Drag boats here or select a boat first"}
            </p>
          </button>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
          {boats.length} boats
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {boats.map((boat) => (
          <BoatCard
            key={boat.id}
            boat={boat}
            draggable
            onSelectBoat={onSelectBoat}
            selectedBoatId={selectedBoatId}
            onRemoveFromBoard={onRemoveFromBoard}
          />
        ))}
      </div>
    </div>
  );
}

function UnassignedSection({
  boats,
  onAssignByTap,
  assignEnabled,
  activeDragType,
  onAssignBoatToInstructor,
  onSelectBoat,
  selectedBoatId,
  boatSelectionActive,
  onRemoveFromBoard,
}: {
  boats: Boat[];
  onAssignByTap?: (boatId: string) => void;
  assignEnabled?: boolean;
  activeDragType?: "boat" | "sailor" | null;
  onAssignBoatToInstructor?: (instructor: string) => void;
  onSelectBoat?: (id: string) => void;
  selectedBoatId?: string | null;
  boatSelectionActive?: boolean;
  onRemoveFromBoard?: (boatId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "instructor:unassigned",
    disabled: activeDragType !== "boat",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-white rounded-2xl border border-gray-100 p-4",
        isOver && "ring-2 ring-blue-200 bg-blue-50"
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => onAssignBoatToInstructor?.("unassigned")}
            className="text-left"
            disabled={!boatSelectionActive}
          >
            <h3
              className={cn(
                "text-sm font-semibold",
                boatSelectionActive
                  ? "text-blue-700 underline underline-offset-2"
                  : "text-gray-800"
              )}
            >
              Unassigned Boats
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {boatSelectionActive
                ? "Tap to move selected boat here (unassign)"
                : "Select a boat to move it, or drag between groups"}
            </p>
          </button>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
          {boats.length} boats
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {boats.length > 0 ? (
          boats.map((boat) => (
            <BoatCard
              key={boat.id}
              boat={boat}
              draggable
              onAssignSailor={assignEnabled ? () => onAssignByTap?.(boat.id) : undefined}
              assignEnabled={Boolean(assignEnabled)}
              onSelectBoat={onSelectBoat}
              selectedBoatId={selectedBoatId}
              onRemoveFromBoard={onRemoveFromBoard}
            />
          ))
        ) : (
          <div
            className={cn(
              "rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 text-center min-h-[200px]",
              isOver && "border-blue-300 bg-blue-100"
            )}
          >
            Drop a boat here to unassign it.
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanningBoard({
  boats,
  groupedBoats,
  ungroupedBoats,
  selectedInstructors,
  onAssignByTap,
  assignEnabled,
  activeDragType,
  onSelectBoat,
  selectedBoatId,
  onAssignBoatToInstructor,
  onRemoveFromBoard,
}: PlanningBoardProps) {
  const boatSelectionActive = Boolean(selectedBoatId);

  return (
    <div className="w-full p-3 sm:p-5 lg:flex-1 lg:overflow-y-auto">
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Fleet Allocation Board
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {boats.length} boats ·{" "}
            {boatSelectionActive
              ? "Tap a group title to move the selected boat there"
              : "Tap a boat to select it, then tap a group title to move it"}
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
            activeDragType={activeDragType}
            onAssignBoatToInstructor={onAssignBoatToInstructor}
            selectedBoatId={selectedBoatId}
            onSelectBoat={onSelectBoat}
            boatSelectionActive={boatSelectionActive}
            onRemoveFromBoard={onRemoveFromBoard}
          />
        ))}

        <UnassignedSection
          boats={ungroupedBoats}
          onAssignByTap={onAssignByTap}
          assignEnabled={assignEnabled}
          activeDragType={activeDragType}
          onAssignBoatToInstructor={onAssignBoatToInstructor}
          onSelectBoat={onSelectBoat}
          selectedBoatId={selectedBoatId}
          boatSelectionActive={boatSelectionActive}
          onRemoveFromBoard={onRemoveFromBoard}
        />
      </div>
    </div>
  );
}
