"use client";

import { useState, useCallback, useMemo } from "react";
import { SessionHeader } from "@/components/SessionHeader";
import { LeftSidebar } from "@/components/LeftSidebar";
import { PlanningBoard } from "@/components/PlanningBoard";
import { RightSidebar } from "@/components/RightSidebar";
import { SailorPool } from "@/components/SailorPool";
import { Toast } from "@/components/ui/Toast";
import { SESSION_DATA } from "@/data/session";
import type { Boat } from "@/types";

export default function PlannerPage() {
  const [boats, setBoats] = useState<Boat[]>(SESSION_DATA.boats);
  const [notes, setNotes] = useState(SESSION_DATA.notes);
  const [poolOpen, setPoolOpen] = useState(true);
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: "",
  });

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
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <SessionHeader
        session={SESSION_DATA}
        onGenerate={handleGenerate}
        onSave={handleSave}
      />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <LeftSidebar
          session={SESSION_DATA}
          notes={notes}
          onNotesChange={setNotes}
          boatStats={boatStats}
        />

        {/* Main content area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <PlanningBoard boats={boats} onBoatsChange={setBoats} />
          <SailorPool
            sailors={SESSION_DATA.sailors}
            isOpen={poolOpen}
            onToggle={() => setPoolOpen((o) => !o)}
          />
        </div>

        {/* Right sidebar */}
        <RightSidebar boats={boats} session={SESSION_DATA} />
      </div>

      {/* Toast */}
      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
