"use client";

import { useState, useCallback, useMemo } from "react";
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { SessionHeader } from "@/components/SessionHeader";
import { LeftSidebar } from "@/components/LeftSidebar";
import { PlanningBoard } from "@/components/PlanningBoard";
import { RightSidebar } from "@/components/RightSidebar";
import { SailorPool } from "@/components/SailorPool";
import { Toast } from "@/components/ui/Toast";
import { SESSION_DATA } from "@/data/session";
import type { Boat, Sailor } from "@/types";

export default function PlannerPage() {
  const [boats, setBoats] = useState<Boat[]>(SESSION_DATA.boats);
  const [sailors, setSailors] = useState<Sailor[]>(SESSION_DATA.sailors);
  const [notes, setNotes] = useState(SESSION_DATA.notes);
  const [poolOpen, setPoolOpen] = useState(true);
    const [leftOpen, setLeftOpen] = useState(false);
    const [rightOpen, setRightOpen] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

  const [selectedSailorId, setSelectedSailorId] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2600);
  }, []);

  const handleGenerate = useCallback(() => {
    showToast("Allocation generated — review assignments on the board");
  }, [showToast]);

  const handleSave = useCallback(() => {
    showToast("Session saved successfully");
  }, [showToast]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const assignSailorToBoat = useCallback(
    (boat: Boat, sailor: Sailor) => {
      if (boat.filled >= boat.capacity) return boat;

      const updatedBoat = { ...boat };
      const hasHelm = Boolean(updatedBoat.helm);
      const hasCrew = Boolean(updatedBoat.crew);

      if (updatedBoat.capacity === 1) {
        updatedBoat.helm = sailor.name;
      } else if (
        !hasHelm &&
        (sailor.role === "Helm" || sailor.role === "Either")
      ) {
        updatedBoat.helm = sailor.name;
      } else if (!hasCrew && (sailor.role === "Crew" || sailor.role === "Either")) {
        updatedBoat.crew = sailor.name;
      } else if (!hasHelm) {
        updatedBoat.helm = sailor.name;
      } else if (!hasCrew) {
        updatedBoat.crew = sailor.name;
      }

      updatedBoat.filled = [updatedBoat.helm, updatedBoat.crew].filter(Boolean).length;
      updatedBoat.status =
        updatedBoat.filled === updatedBoat.capacity && updatedBoat.instructor
          ? "ready"
          : updatedBoat.filled > 0
          ? "warn"
          : "idle";

      if (!updatedBoat.instructor) {
        updatedBoat.warning = "No instructor assigned";
      } else if (updatedBoat.capacity > 1 && !updatedBoat.crew) {
        updatedBoat.warning = "Crew unassigned";
      } else if (!updatedBoat.helm) {
        updatedBoat.warning = "Helm unassigned";
      } else {
        updatedBoat.warning = null;
      }

      return updatedBoat;
    },
    []
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeId = String(event.active.id);
      const overId = String(event.over?.id ?? "");
      if (!overId) return;

      const isBoatSortDrag = boats.some((boat) => boat.id === activeId) && boats.some((boat) => boat.id === overId);
      if (isBoatSortDrag && activeId !== overId) {
        const oldIndex = boats.findIndex((boat) => boat.id === activeId);
        const newIndex = boats.findIndex((boat) => boat.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          setBoats((currentBoats) => arrayMove(currentBoats, oldIndex, newIndex));
        }
        return;
      }

      if (activeId.startsWith("sailor:") && boats.some((boat) => boat.id === overId)) {
        const sailorId = activeId.split(":")[1];
        const targetBoatId = overId;
        const sailor = sailors.find((s) => s.id === sailorId);
        if (!sailor) return;

        setBoats((currentBoats) =>
          currentBoats.map((boat) =>
            boat.id === targetBoatId ? assignSailorToBoat(boat, sailor) : boat
          )
        );
        setSailors((currentSailors) => currentSailors.filter((s) => s.id !== sailorId));
      }
    },
    [boats, sailors, assignSailorToBoat]
  );

  const handleAssignByTap = useCallback(
    (boatId: string) => {
      if (!selectedSailorId) return;
      const sailor = sailors.find((s) => s.id === selectedSailorId);
      if (!sailor) return;

      setBoats((currentBoats) =>
        currentBoats.map((boat) => (boat.id === boatId ? assignSailorToBoat(boat, sailor) : boat))
      );
      setSailors((currentSailors) => currentSailors.filter((s) => s.id !== selectedSailorId));
      setSelectedSailorId(null);
      showToast(`${sailor.name} assigned`);
    },
    [selectedSailorId, sailors, assignSailorToBoat, showToast]
  );

  const boatStats = useMemo(() => {
    const byType: Record<string, number> = {};
    for (const b of boats) {
      byType[b.type] = (byType[b.type] ?? 0) + 1;
    }
    return {
      total: boats.length,
      ready: boats.filter((b) => b.status === "ready").length,
      review: boats.filter(
        (b) => b.status === "warn" || b.status === "alert"
      ).length,
      byType,
    };
  }, [boats]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden overflow-y-auto bg-gray-50">
      {/* Header */}
      <SessionHeader
        session={SESSION_DATA}
        onGenerate={handleGenerate}
        onSave={handleSave}
        onOpenLeft={() => setLeftOpen(true)}
        onOpenRight={() => setRightOpen(true)}
      />

      {/* Body */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="mx-auto flex w-full max-w-full px-4 flex-1 flex-col min-h-0 lg:flex-row lg:px-0 lg:max-w-screen-2xl">
        {/* Left sidebar */}
        <LeftSidebar
          session={SESSION_DATA}
          notes={notes}
          onNotesChange={setNotes}
          boatStats={boatStats}
          hidden={!leftOpen}
          onClose={() => setLeftOpen(false)}
        />

        {/* Main content area */}
        <div className="order-1 flex w-full flex-col lg:order-2 lg:flex-1 lg:min-h-0">
          <PlanningBoard
            boats={boats}
            onBoatsChange={setBoats}
            onAssignByTap={handleAssignByTap}
            assignEnabled={Boolean(selectedSailorId)}
          />
          <SailorPool
            sailors={sailors}
            isOpen={poolOpen}
            onToggle={() => setPoolOpen((o) => !o)}
            selectedSailorId={selectedSailorId}
            onSelectSailor={(id) => setSelectedSailorId((cur) => (cur === id ? null : id))}
          />
        </div>

        {/* Right sidebar */}
        <RightSidebar
          boats={boats}
          session={SESSION_DATA}
          hidden={!rightOpen}
          onClose={() => setRightOpen(false)}
        />
      </div>
      </DndContext>

      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
