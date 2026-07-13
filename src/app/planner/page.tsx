"use client";

import { useState, useCallback, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { SessionHeader }  from "@/components/SessionHeader";
import { LeftSidebar }    from "@/components/LeftSidebar";
import { PlanningBoard }  from "@/components/PlanningBoard";
import { RightSidebar }   from "@/components/RightSidebar";
import { SailorPool }     from "@/components/SailorPool";
import { InstructorPool } from "@/components/InstructorPool";
import { FleetPool }      from "@/components/FleetPool";
import { Toast }          from "@/components/ui/Toast";
import { SESSION_CONFIG } from "@/data/session";
import {
  loadBoats,
  loadFleetBoats,
  loadSessionBoats,
  addBoatToSession,
  removeBoatFromSession,
  loadSailors,
  loadSailorsFromSession,
  loadInstructors,
  loadInstructorsFromSession,
  saveBoat,
  saveSessionBoat,
  saveBoatOrder,
  saveSessionBoatOrder,
  removeSailorFromPool,
} from "@/lib/db";
import type { Boat, Sailor, FleetBoat } from "@/types";
import { useProfile } from "@/lib/useProfile";

// ── Loading / error screens ────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <span className="text-4xl animate-bounce">⛵</span>
        <p className="text-sm font-medium">Loading session data…</p>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
        <span className="text-4xl">⚠️</span>
        <p className="text-sm font-semibold text-gray-800">Failed to load session data</p>
        <p className="text-xs text-gray-500 font-mono bg-gray-100 rounded px-3 py-2 w-full break-all">{message}</p>
        <button
          onClick={onRetry}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Retry
        </button>
        <p className="text-xs text-gray-400">
          Make sure <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set in{" "}
          <code>.env.local</code>
        </p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────

function PlannerPageInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const { profile, loading: profileLoading } = useProfile({
    requireAuth: "/login",
    requireRole: ["senior_instructor"],
    redirectIfUnauthorised: "/signup",
  });

  // ── DB state ──
  const [dbStatus, setDbStatus] = useState<"loading" | "ready" | "error">("loading");
  const [dbError, setDbError] = useState("");

  // ── App state ──
  const [boats, setBoats]           = useState<Boat[]>([]);
  const [fleetBoats, setFleetBoats] = useState<FleetBoat[]>([]);
  const [sailors, setSailors]       = useState<Sailor[]>([]);
  const [instructors, setInstructors] = useState<string[]>([]);
  const [notes, setNotes]           = useState(SESSION_CONFIG.notes);

  const [poolOpen, setPoolOpen]               = useState(true);
  const [leftOpen, setLeftOpen]               = useState(false);
  const [rightOpen, setRightOpen]             = useState(false);
  const [instructorPoolOpen, setInstructorPoolOpen] = useState(true);
  const [fleetPoolOpen, setFleetPoolOpen]     = useState(true);
  const [addingBoatId, setAddingBoatId]       = useState<string | null>(null);

  const [selectedSailorId, setSelectedSailorId]     = useState<string | null>(null);
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
  const [instructorGroups, setInstructorGroups]     = useState<Record<string, string[]>>({});
  const [activeDragType, setActiveDragType]         = useState<"boat" | "sailor" | null>(null);
  const [selectedBoatId, setSelectedBoatId]         = useState<string | null>(null);

  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  // Persist a boat's mutable state to the right table depending on whether
  // this is a session-scoped board or the legacy global board.
  const persistBoat = useCallback(
    (boat: Boat) => (sessionId ? saveSessionBoat(boat) : saveBoat(boat)),
    [sessionId]
  );
  const persistBoatOrder = useCallback(
    (ordered: Boat[]) => (sessionId ? saveSessionBoatOrder(ordered) : saveBoatOrder(ordered)),
    [sessionId]
  );

  // ── Load from Supabase ─────────────────────────────────────
  const loadAll = useCallback(async () => {
    setDbStatus("loading");
    try {
      const [loadedBoats, loadedFleetBoats, loadedSailors, loadedInstructors] = await Promise.all([
        sessionId ? loadSessionBoats(sessionId) : loadBoats(),
        loadFleetBoats(),
        sessionId ? loadSailorsFromSession(sessionId) : loadSailors(),
        sessionId ? loadInstructorsFromSession(sessionId) : loadInstructors(),
      ]);
      setBoats(loadedBoats);
      setFleetBoats(loadedFleetBoats);
      setSailors(loadedSailors);
      setInstructors(loadedInstructors);

      // Re-derive instructorGroups from boat.instructor field
      const groups: Record<string, string[]> = {};
      for (const boat of loadedBoats) {
        if (boat.instructor) {
          groups[boat.instructor] = [...(groups[boat.instructor] ?? []), boat.id];
        }
      }
      setInstructorGroups(groups);
      setDbStatus("ready");
    } catch (err: unknown) {
      setDbError(err instanceof Error ? err.message : String(err));
      setDbStatus("error");
    }
  }, [sessionId]);

  useEffect(() => {
    if (profileLoading || !profile) return;
    loadAll();
  }, [loadAll, profileLoading, profile]);

  // ── Toast helper ──────────────────────────────────────────
  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2600);
  }, []);

  // ── Handlers ──────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    showToast("Auto-allocation coming soon");
  }, [showToast]);

  const handleSave = useCallback(async () => {
    try {
      await Promise.all(boats.map(persistBoat));
      showToast("Session saved ✓");
    } catch {
      showToast("Save failed — check connection");
    }
  }, [boats, persistBoat, showToast]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const assignSailorToBoat = useCallback((boat: Boat, sailor: Sailor): Boat => {
    const filled = boat.assignedSailors.filter(Boolean).length;
    if (filled >= boat.capacity) return boat;

    const seats = [...boat.assignedSailors];

    if (seats.length === 2) {
      // Preserve helm/crew role preference for 2-seat boats
      if (!seats[0] && (sailor.role === "Helm" || sailor.role === "Either")) {
        seats[0] = sailor.name;
      } else if (!seats[1] && (sailor.role === "Crew" || sailor.role === "Either")) {
        seats[1] = sailor.name;
      } else if (!seats[0]) {
        seats[0] = sailor.name;
      } else if (!seats[1]) {
        seats[1] = sailor.name;
      }
    } else {
      // Any other capacity — fill the first empty seat
      const emptyIndex = seats.findIndex((s) => !s);
      if (emptyIndex !== -1) seats[emptyIndex] = sailor.name;
    }

    const newFilled = seats.filter(Boolean).length;
    const updatedBoat: Boat = {
      ...boat,
      assignedSailors: seats,
      status:
        newFilled === boat.capacity && boat.instructor
          ? "ready"
          : newFilled > 0
          ? "warn"
          : "idle",
    };

    if (!updatedBoat.instructor)          updatedBoat.warning = "No instructor assigned";
    else if (newFilled < boat.capacity)   updatedBoat.warning = `${boat.capacity - newFilled} seat${boat.capacity - newFilled !== 1 ? "s" : ""} unassigned`;
    else                                  updatedBoat.warning = null;

    return updatedBoat;
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDragType(null);
      const activeId = String(event.active.id);
      const overId   = String(event.over?.id ?? "");
      if (!overId) return;

      // ── Boat reorder ──
      const isBoatSort = boats.some((b) => b.id === activeId) && boats.some((b) => b.id === overId);
      if (isBoatSort && activeId !== overId) {
        const oldIndex = boats.findIndex((b) => b.id === activeId);
        const newIndex = boats.findIndex((b) => b.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(boats, oldIndex, newIndex);
          setBoats(reordered);
          await persistBoatOrder(reordered).catch(() => {});
        }
        return;
      }

      // ── Sailor → boat ──
      if (activeId.startsWith("sailor:") && overId.startsWith("boat-drop:")) {
        const sailorId    = activeId.split(":")[1];
        const targetBoatId = overId.split(":")[1];
        const sailor = sailors.find((s) => s.id === sailorId);
        if (!sailor) return;

        const updatedBoats = boats.map((b) =>
          b.id === targetBoatId ? assignSailorToBoat(b, sailor) : b
        );
        setBoats(updatedBoats);
        setSailors((cur) => cur.filter((s) => s.id !== sailorId));

        const updatedBoat = updatedBoats.find((b) => b.id === targetBoatId)!;
        await Promise.all([persistBoat(updatedBoat), removeSailorFromPool(sailorId)]).catch(() => {});
        return;
      }

      // ── Boat → instructor group (drag onto another boat) ──
      if (boats.some((b) => b.id === activeId) && overId.startsWith("boat-drop:")) {
        const targetBoat = boats.find((b) => b.id === overId.split(":")[1]);
        if (!targetBoat) return;
        const instructorName = targetBoat.instructor;

        const updatedBoats = boats.map((b) =>
          b.id === activeId ? { ...b, instructor: instructorName } : b
        );
        setBoats(updatedBoats);
        setInstructorGroups((cur) => rebuildGroup(cur, activeId, instructorName));
        await persistBoat(updatedBoats.find((b) => b.id === activeId)!).catch(() => {});
        return;
      }

      // ── Boat → instructor section drop zone ──
      if (boats.some((b) => b.id === activeId) && overId.startsWith("instructor:")) {
        const instructorName = overId.split(":")[1];
        const resolved = instructorName === "unassigned" ? null : instructorName;

        const updatedBoats = boats.map((b) =>
          b.id === activeId ? { ...b, instructor: resolved } : b
        );
        setBoats(updatedBoats);
        setInstructorGroups((cur) => rebuildGroup(cur, activeId, resolved));
        await persistBoat(updatedBoats.find((b) => b.id === activeId)!).catch(() => {});
        return;
      }
    },
    [boats, sailors, assignSailorToBoat, persistBoat, persistBoatOrder]
  );

  const handleAssignByTap = useCallback(
    async (boatId: string) => {
      if (!selectedSailorId) return;
      const sailor = sailors.find((s) => s.id === selectedSailorId);
      if (!sailor) return;

      const updatedBoats = boats.map((b) =>
        b.id === boatId ? assignSailorToBoat(b, sailor) : b
      );
      setBoats(updatedBoats);
      setSailors((cur) => cur.filter((s) => s.id !== selectedSailorId));
      setSelectedSailorId(null);
      showToast(`${sailor.name} assigned`);

      const updatedBoat = updatedBoats.find((b) => b.id === boatId)!;
      await Promise.all([persistBoat(updatedBoat), removeSailorFromPool(selectedSailorId)]).catch(() => {});
    },
    [selectedSailorId, sailors, boats, assignSailorToBoat, showToast, persistBoat]
  );

  const handleAssignBoatToInstructor = useCallback(
    async (instructorName: string) => {
      if (!selectedBoatId) return;
      const resolved = instructorName === "unassigned" ? null : instructorName;

      const updatedBoats = boats.map((b) =>
        b.id === selectedBoatId ? { ...b, instructor: resolved } : b
      );
      setBoats(updatedBoats);
      setInstructorGroups((cur) => rebuildGroup(cur, selectedBoatId, resolved));
      setSelectedBoatId(null);
      showToast(resolved ? `Boat assigned to ${resolved}` : "Boat unassigned");

      await persistBoat(updatedBoats.find((b) => b.id === selectedBoatId)!).catch(() => {});
    },
    [selectedBoatId, boats, showToast, persistBoat]
  );

  const handleAddBoatToSession = useCallback(
    async (fleetBoatId: string) => {
      if (!sessionId) return;
      const fleetBoat = fleetBoats.find((b) => b.id === fleetBoatId);
      if (!fleetBoat) return;
      setAddingBoatId(fleetBoatId);
      try {
        const newBoat = await addBoatToSession(sessionId, fleetBoatId, fleetBoat.capacity);
        setBoats((cur) => [...cur, newBoat]);
        showToast(`${fleetBoat.name} added to the board`);
      } catch {
        showToast("Failed to add boat — check connection");
      } finally {
        setAddingBoatId(null);
      }
    },
    [sessionId, fleetBoats, showToast]
  );

  const handleRemoveBoatFromBoard = useCallback(
    async (boatId: string) => {
      if (!sessionId) return; // legacy no-session board has no fleet pool to return boats to
      const boat = boats.find((b) => b.id === boatId);
      if (!boat) return;
      setBoats((cur) => cur.filter((b) => b.id !== boatId));
      setInstructorGroups((cur) => rebuildGroup(cur, boatId, null));
      if (selectedBoatId === boatId) setSelectedBoatId(null);
      try {
        await removeBoatFromSession(boatId);
        showToast(`${boat.name} returned to the fleet pool`);
      } catch {
        showToast("Failed to remove boat — check connection");
      }
    },
    [boats, sessionId, selectedBoatId, showToast]
  );

  // ── Derived data ──────────────────────────────────────────
  const BOAT_TYPE_ORDER = ["Feva", "Pico", "Topper", "Optimist"] as const;
  const boatStats = useMemo(() => {
    const byType: Partial<Record<string, number>> = {};
    for (const b of boats) byType[b.type] = (byType[b.type] ?? 0) + 1;
    const byTypeOrdered = BOAT_TYPE_ORDER
      .filter((t) => byType[t] !== undefined)
      .map((t) => [t, byType[t]!] as [string, number]);
    return {
      total:  boats.length,
      ready:  boats.filter((b) => b.status === "ready").length,
      review: boats.filter((b) => b.status === "warn" || b.status === "alert").length,
      byType: Object.fromEntries(byTypeOrdered),
    };
  }, [boats]);

  const sessionForSidebars = useMemo(() => ({
    objective:       SESSION_CONFIG.objective,
    date:            SESSION_CONFIG.date,
    weather:         SESSION_CONFIG.weatherFallback,
    boats,
    sailors,
    instructors,
    recommendations: SESSION_CONFIG.recommendations,
    notes,
  }), [boats, sailors, instructors, notes]);

  // ── Render ────────────────────────────────────────────────
  if (profileLoading || !profile) return <LoadingScreen />;
  if (dbStatus === "loading") return <LoadingScreen />;
  if (dbStatus === "error")   return <ErrorScreen message={dbError} onRetry={loadAll} />;

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden overflow-y-auto bg-gray-50">
      {/* Session context banner — shown when opened from a session */}
      {sessionId && (
        <div className="bg-blue-600 px-4 py-2 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-white">
            📋 Planning from session sign-ups · {sailors.length} sailor{sailors.length !== 1 ? "s" : ""} loaded
          </p>
          <a href="/planner" className="text-xs text-blue-200 hover:text-white underline flex-shrink-0">
            Clear session
          </a>
        </div>
      )}

      <SessionHeader
        session={sessionForSidebars}
        onGenerate={handleGenerate}
        onSave={handleSave}
        onOpenLeft={() => setLeftOpen(true)}
        onOpenRight={() => setRightOpen(true)}
        onOpenSessions={() => window.location.href = "/sessions"}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => {
          const activeId = String(event.active.id);
          setActiveDragType(
            activeId.startsWith("sailor:") ? "sailor"
            : boats.some((b) => b.id === activeId) ? "boat"
            : null
          );
        }}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={boats.map((b) => b.id)} strategy={rectSortingStrategy}>
          <div className="mx-auto flex w-full max-w-full px-4 flex-1 flex-col min-h-0 lg:flex-row lg:px-0 lg:max-w-screen-2xl">
            <LeftSidebar
              session={sessionForSidebars}
              notes={notes}
              onNotesChange={setNotes}
              boatStats={boatStats}
              hidden={!leftOpen}
              onClose={() => setLeftOpen(false)}
            />

            <div className="order-1 flex w-full flex-col lg:order-2 lg:flex-1 lg:min-h-0">
              <PlanningBoard
                boats={boats}
                groupedBoats={selectedInstructors.map((instructor) => ({
                  instructor,
                  boats: boats.filter((b) =>
                    (instructorGroups[instructor] ?? []).includes(b.id)
                  ),
                }))}
                ungroupedBoats={boats.filter(
                  (b) => !Object.values(instructorGroups).flat().includes(b.id)
                )}
                selectedInstructors={selectedInstructors}
                onAssignByTap={handleAssignByTap}
                assignEnabled={Boolean(selectedSailorId)}
                activeDragType={activeDragType}
                onSelectBoat={(id) => setSelectedBoatId((cur) => (cur === id ? null : id))}
                selectedBoatId={selectedBoatId}
                onAssignBoatToInstructor={handleAssignBoatToInstructor}
                onRemoveFromBoard={sessionId ? handleRemoveBoatFromBoard : undefined}
              />
              <SailorPool
                sailors={sailors}
                isOpen={poolOpen}
                onToggle={() => setPoolOpen((o) => !o)}
                selectedSailorId={selectedSailorId}
                onSelectSailor={(id) => setSelectedSailorId((cur) => (cur === id ? null : id))}
              />
              <InstructorPool
                instructors={instructors}
                isOpen={instructorPoolOpen}
                onToggle={() => setInstructorPoolOpen((o) => !o)}
                selectedInstructors={selectedInstructors}
                onSelectInstructor={(name) =>
                  setSelectedInstructors((cur) =>
                    cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]
                  )
                }
              />
              {sessionId && (
                <FleetPool
                  fleetBoats={fleetBoats}
                  boardedBoatIds={new Set(boats.map((b) => b.boatId).filter((id): id is string => Boolean(id)))}
                  isOpen={fleetPoolOpen}
                  onToggle={() => setFleetPoolOpen((o) => !o)}
                  onAddBoat={handleAddBoatToSession}
                  addingBoatId={addingBoatId}
                />
              )}
            </div>

            <RightSidebar
              boats={boats}
              session={sessionForSidebars}
              hidden={!rightOpen}
              onClose={() => setRightOpen(false)}
            />
          </div>
        </SortableContext>
      </DndContext>

      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PlannerPageInner />
    </Suspense>
  );
}

// ── Helpers ───────────────────────────────────────────────────

/** Rebuild instructorGroups after a boat changes instructor */
function rebuildGroup(
  current: Record<string, string[]>,
  boatId: string,
  instructorName: string | null
): Record<string, string[]> {
  const next = Object.fromEntries(
    Object.entries(current).map(([k, ids]) => [k, ids.filter((id) => id !== boatId)])
  );
  if (instructorName) {
    next[instructorName] = Array.from(new Set([...(next[instructorName] ?? []), boatId]));
  }
  Object.keys(next).forEach((k) => { if (next[k].length === 0) delete next[k]; });
  return next;
}
