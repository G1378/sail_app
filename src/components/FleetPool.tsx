"use client";

import { ChevronDown, ChevronUp, Sailboat } from "lucide-react";
import { cn, getBoatTypeColor } from "@/lib/utils";
import type { FleetBoat } from "@/types";

interface FleetPoolProps {
  fleetBoats: FleetBoat[];
  /** boatId of every fleet boat currently on this session's board */
  boardedBoatIds: Set<string>;
  isOpen: boolean;
  onToggle: () => void;
  onAddBoat: (boatId: string) => void;
  addingBoatId?: string | null;
}

export function FleetPool({ fleetBoats, boardedBoatIds, isOpen, onToggle, onAddBoat, addingBoatId }: FleetPoolProps) {
  const available = fleetBoats.filter((b) => !boardedBoatIds.has(b.id));

  // Group by type for the "X left of Y" summary
  const groups = new Map<string, { total: number; left: FleetBoat[] }>();
  for (const boat of fleetBoats) {
    const g = groups.get(boat.type) ?? { total: 0, left: [] };
    g.total += 1;
    groups.set(boat.type, g);
  }
  for (const boat of available) {
    groups.get(boat.type)!.left.push(boat);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 mt-4 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2">
          <Sailboat className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-900">Fleet Pool</span>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            {available.length} available
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {isOpen && (
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 flex flex-col gap-4">
          {fleetBoats.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              No boats in the club fleet yet. Ask your club manager to add some.
            </p>
          ) : (
            Array.from(groups.entries()).map(([type, g]) => (
              <div key={type}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", getBoatTypeColor(type))}>
                    {type}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {g.left.length} left of {g.total}
                  </span>
                </div>
                {g.left.length === 0 ? (
                  <p className="text-xs text-gray-300 italic pl-1">All {type}s are on the board</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {g.left.map((boat) => (
                      <div
                        key={boat.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
                      >
                        <span className="text-xs font-medium text-gray-700">{boat.name}</span>
                        <button
                          onClick={() => onAddBoat(boat.id)}
                          disabled={addingBoatId === boat.id}
                          className="flex-shrink-0 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
                        >
                          {addingBoatId === boat.id ? "Adding…" : "+ Add to board"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
