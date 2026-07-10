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

/** Sorts "Feva 2" before "Feva 10" — numeric suffix aware, not plain alphabetical */
function naturalCompare(a: string, b: string): number {
  const numA = a.match(/(\d+)\s*$/);
  const numB = b.match(/(\d+)\s*$/);
  if (numA && numB) {
    const prefixA = a.slice(0, numA.index).trim();
    const prefixB = b.slice(0, numB.index).trim();
    if (prefixA === prefixB) return parseInt(numA[1], 10) - parseInt(numB[1], 10);
  }
  return a.localeCompare(b);
}

export function FleetPool({ fleetBoats, boardedBoatIds, isOpen, onToggle, onAddBoat, addingBoatId }: FleetPoolProps) {
  const available = fleetBoats.filter((b) => !boardedBoatIds.has(b.id));

  // Group by type — each group tracks its total fleet size and its
  // still-available boats, sorted so "add" always picks the lowest number next
  const groups = new Map<string, { total: number; left: FleetBoat[] }>();
  for (const boat of fleetBoats) {
    const g = groups.get(boat.type) ?? { total: 0, left: [] };
    g.total += 1;
    groups.set(boat.type, g);
  }
  for (const boat of available) {
    groups.get(boat.type)!.left.push(boat);
  }
  for (const g of Array.from(groups.values())) {
    g.left.sort((a, b) => naturalCompare(a.name, b.name));
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
        <div className="border-t border-gray-50 px-4 pb-4 pt-3 flex flex-col gap-2">
          {fleetBoats.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              No boats in the club fleet yet. Ask your club manager to add some.
            </p>
          ) : (
            Array.from(groups.entries()).map(([type, g]) => {
              const next = g.left[0];
              return (
                <div
                  key={type}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", getBoatTypeColor(type))}>
                      {type}
                    </span>
                    <span className="text-xs text-gray-400 truncate">
                      {g.left.length} left of {g.total}
                    </span>
                  </div>
                  <button
                    onClick={() => next && onAddBoat(next.id)}
                    disabled={!next || addingBoatId === next.id}
                    className="flex-shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    {addingBoatId === next?.id ? "Adding…" : next ? `+ Add ${type} (${next.name})` : "All on board"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
