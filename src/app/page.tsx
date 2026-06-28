"use client";

import { useState, useCallback, useMemo } from "react";
import { DndContext, closestCenter, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { SessionHeader } from "@/components/SessionHeader";
import { LeftSidebar } from "@/components/LeftSidebar";
import { PlanningBoard } from "@/components/PlanningBoard";
import { RightSidebar } from "@/components/RightSidebar";
import { SailorPool } from "@/components/SailorPool";
import { InstructorPool } from "@/components/InstructorPool";
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
  const [instructors, setInstructors] = useState<string[]>(SESSION_DATA.instructors);
  const [instructorPoolOpen, setInstructorPoolOpen] = useState(true);
  const [selectedInstructors, setSelectedInstructors] = useState<string[]>([]);
  const [instructorGroups, setInstructorGroups] = useState<Record<string, string[]>>({});
  const [activeDragType, setActiveDragType] = useState<"boat" | "sailor" | null>(null);
  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null);

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
      setActiveDragType(null);
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

      if (activeId.startsWith("sailor:") && overId.startsWith("boat-drop:")) {
        const sailorId = activeId.split(":")[1];
        const targetBoatId = overId.split(":")[1];
        const sailor = sailors.find((s) => s.id === sailorId);
        if (!sailor) return;

        setBoats((currentBoats) =>
          currentBoats.map((boat) =>
            boat.id === targetBoatId ? assignSailorToBoat(boat, sailor) : boat
          )
        );
        setSailors((currentSailors) => currentSailors.filter((s) => s.id !== sailorId));
        return;
      }

      if (boats.some((b) => b.id === activeId) && overId.startsWith("boat-drop:")) {
        const targetBoatId = overId.split(":")[1];
        const targetBoat = boats.find((boat) => boat.id === targetBoatId);
        if (!targetBoat) return;

        const instructorName = targetBoat.instructor;

        setBoats((currentBoats) =>
          currentBoats.map((boat) =>
            boat.id === activeId
              ? { ...boat, instructor: instructorName }
              : boat
          )
        );

        setInstructorGroups((currentGroups) => {
          const nextGroups = Object.fromEntries(
            Object.entries(currentGroups).map(([key, ids]) => [
              key,
              ids.filter((id) => id !== activeId),
            ])
          );

          if (instructorName) {
            nextGroups[instructorName] = Array.from(
              new Set([...(nextGroups[instructorName] ?? []), activeId])
            );
          }

          Object.keys(nextGroups).forEach((key) => {
            if (nextGroups[key].length === 0) {
              delete nextGroups[key];
            }
          });

          return nextGroups;
        });

        return;
      }

      // instructor group drop: accept boat being dragged into instructor group
      if (boats.some((b) => b.id === activeId) && overId.startsWith("instructor:")) {
        const instructorName = overId.split(":")[1];

        setBoats((currentBoats) =>
          currentBoats.map((boat) =>
            boat.id === activeId
              ? { ...boat, instructor: instructorName === "unassigned" ? null : instructorName }
              : boat
          )
        );

        setInstructorGroups((currentGroups) => {
          const nextGroups = Object.fromEntries(
            Object.entries(currentGroups).map(([key, ids]) => [
              key,
              ids.filter((id) => id !== activeId),
            ])
          );

          if (instructorName !== "unassigned") {
            nextGroups[instructorName] = Array.from(
              new Set([...(nextGroups[instructorName] ?? []), activeId])
            );
          }

          Object.keys(nextGroups).forEach((key) => {
            if (nextGroups[key].length === 0) {
              delete nextGroups[key];
            }
          });

          return nextGroups;
        });

        return;
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

  const handleAssignBoatToInstructor = useCallback(
    (instructorName: string) => {
      if (!selectedBoatId) return;

      setBoats((currentBoats) =>
        currentBoats.map((boat) =>
          boat.id === selectedBoatId ? { ...boat, instructor: instructorName === "unassigned" ? null : instructorName } : boat
        )
      );

      setInstructorGroups((currentGroups) => {
        const nextGroups = Object.fromEntries(
          Object.entries(currentGroups).map(([key, ids]) => [key, ids.filter((id) => id !== selectedBoatId)])
        );

        if (instructorName !== "unassigned") {
          nextGroups[instructorName] = Array.from(new Set([...(nextGroups[instructorName] ?? []), selectedBoatId]));
        }

        Object.keys(nextGroups).forEach((key) => {
          if (nextGroups[key].length === 0) {
            delete nextGroups[key];
          }
        });

        return nextGroups;
      });

      setSelectedBoatId(null);
      showToast(
        instructorName === "unassigned" ? "Boat unassigned" : `Boat assigned to ${instructorName}`
      );
    },
    [selectedBoatId, showToast]
  );


  const BOAT_TYPE_ORDER = ["Feva", "Pico", "Topper", "Optimist"] as const;
  const boatStats = useMemo(() => {
    const byType: Partial<Record<string, number>> = {};
    for (const b of boats) {
      byType[b.type] = (byType[b.type] ?? 0) + 1;
    }
    const byTypeOrdered = BOAT_TYPE_ORDER
      .filter((t) => byType[t] !== undefined)
      .map((t) => [t, byType[t]!] as [string, number]);
    return {
      total: boats.length,
      ready: boats.filter((b) => b.status === "ready").length,
      review: boats.filter(
        (b) => b.status === "warn" || b.status === "alert"
      ).length,
      byType: Object.fromEntries(byTypeOrdered),
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => {
          const activeId = String(event.active.id);
          setActiveDragType(activeId.startsWith("sailor:") ? "sailor" : boats.some((b) => b.id === activeId) ? "boat" : null);
        }} onDragEnd={handleDragEnd}>
        <SortableContext items={boats.map((b) => b.id)} strategy={rectSortingStrategy}>
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
            groupedBoats={selectedInstructors.map((instructor) => ({
              instructor,
              boats: boats.filter((boat) =>
                (instructorGroups[instructor] ?? []).includes(boat.id)
              ),
            }))}
            ungroupedBoats={boats.filter(
              (boat) => !Object.values(instructorGroups).flat().includes(boat.id)
            )}
            selectedInstructors={selectedInstructors}
            onAssignByTap={handleAssignByTap}
            assignEnabled={Boolean(selectedSailorId)}
            activeDragType={activeDragType}
            onSelectBoat={(id) => setSelectedBoatId((cur) => (cur === id ? null : id))}
            selectedBoatId={selectedBoatId}
            onAssignBoatToInstructor={handleAssignBoatToInstructor}
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
              setSelectedInstructors((current) =>
                current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
              )
            }
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
        </SortableContext>
      </DndContext>

      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
