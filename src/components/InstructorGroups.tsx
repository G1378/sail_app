"use client";

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { motion, AnimatePresence } from "framer-motion";
import { BoatCard } from "@/components/BoatCard";
import type { Boat } from "@/types";
import { cn } from "@/lib/utils";

interface InstructorGroupsProps {
  instructors: string[];
  boats: Boat[];
  onBoatsChange: (boats: Boat[]) => void;
  onAssignInstructorToGroup?: (instructor: string, boatId: string) => void;
}

export function InstructorGroups({ instructors, boats, onBoatsChange, onAssignInstructorToGroup }: InstructorGroupsProps) {
  return (
    <div className="w-full p-3 sm:p-5 grid grid-cols-1 gap-3">
      {instructors.map((ins) => {
        const groupBoats = boats.filter((b) => b.instructor === ins);
        const { setNodeRef, isOver } = useDroppable({ id: `instructor:${ins}` });
        return (
          <div key={ins} ref={setNodeRef} className={cn("bg-white rounded-2xl border border-gray-100 p-3", isOver && "ring-2 ring-blue-200") }>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">{ins}</h4>
              <span className="text-xs text-gray-400">{groupBoats.length} boats</span>
            </div>
            <div className="space-y-3">
              {groupBoats.map((boat) => (
                <BoatCard key={boat.id} boat={boat} draggable={true} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
