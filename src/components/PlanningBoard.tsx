"use client";

import { SortableContext, rectSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { BoatCard } from "@/components/BoatCard";
import type { Boat } from "@/types";

interface PlanningBoardProps {
  boats: Boat[];
  onBoatsChange: (boats: Boat[]) => void;
}

export function PlanningBoard({ boats, onBoatsChange }: PlanningBoardProps) {
  return (
    <div className="w-full p-3 sm:p-5 lg:flex-1 lg:overflow-y-auto">
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Fleet Allocation Board
          </h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {boats.length} boats · Drag to reorder
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

        <SortableContext items={boats.map((b) => b.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
            {boats.map((boat) => (
              <BoatCard key={boat.id} boat={boat} />
            ))}
          </div>
        </SortableContext>
    </div>
  );
}
