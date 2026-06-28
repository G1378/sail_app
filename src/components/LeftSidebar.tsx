"use client";

import { Users, Ship, UserCog, StickyNote } from "lucide-react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/ui/Avatar";
import type { SessionData } from "@/types";

interface LeftSidebarProps {
  session: SessionData;
  notes: string;
  onNotesChange: (val: string) => void;
  boatStats: {
    total: number;
    ready: number;
    review: number;
    byType: Record<string, number>;
  };
}

function SidebarCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="bg-white rounded-xl border border-gray-100 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {title}
        </span>
      </div>
      {children}
    </motion.div>
  );
}

function StatRow({
  label,
  value,
  badge,
  badgeClass,
}: {
  label: string;
  value?: string | number;
  badge?: string | number;
  badgeClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500">{label}</span>
      {badge !== undefined ? (
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}
        >
          {badge}
        </span>
      ) : (
        <span className="text-xs font-medium text-gray-800">{value}</span>
      )}
    </div>
  );
}

export function LeftSidebar({
  session,
  notes,
  onNotesChange,
  boatStats,
}: LeftSidebarProps) {
  const { sailors, instructors } = session;

  const stage1 = sailors.filter((s) => s.stage === 1).length;
  const stage2 = sailors.filter((s) => s.stage === 2).length;
  const stage3 = sailors.filter((s) => s.stage === 3).length;

  return (
    <aside className="order-2 w-full border-b border-gray-100 bg-gray-50 p-3 flex flex-col gap-3 lg:order-1 lg:w-56 lg:flex-shrink-0 lg:border-b-0 lg:border-r lg:max-h-none">
      {/* Sailors */}
      <SidebarCard icon={Users} title="Available Sailors">
        <StatRow label="Total" value={sailors.length} />
        <StatRow
          label="Stage 1"
          badge={stage1}
          badgeClass="bg-amber-50 text-amber-800"
        />
        <StatRow
          label="Stage 2"
          badge={stage2}
          badgeClass="bg-blue-50 text-blue-800"
        />
        <StatRow
          label="Stage 3"
          badge={stage3}
          badgeClass="bg-green-50 text-green-800"
        />
      </SidebarCard>

      {/* Boats */}
      <SidebarCard icon={Ship} title="Fleet">
        {Object.entries(boatStats.byType).map(([type, count]) => (
          <StatRow key={type} label={type + "s"} value={count} />
        ))}
        <div className="mt-2 pt-2 border-t border-gray-50">
          <StatRow
            label="Ready"
            badge={boatStats.ready}
            badgeClass="bg-green-50 text-green-800"
          />
          <StatRow
            label="Need review"
            badge={boatStats.review}
            badgeClass="bg-amber-50 text-amber-800"
          />
        </div>
      </SidebarCard>

      {/* Instructors */}
      <SidebarCard icon={UserCog} title="Instructors">
        <div className="flex flex-col gap-2">
          {instructors.map((name) => (
            <div key={name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar name={name} size="sm" />
                <span className="text-xs text-gray-700">{name}</span>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                On water
              </span>
            </div>
          ))}
        </div>
      </SidebarCard>

      {/* Notes */}
      <SidebarCard icon={StickyNote} title="Session Notes">
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add notes for the session…"
          className="w-full min-h-[72px] resize-none text-xs text-gray-700 placeholder:text-gray-300 bg-gray-50 rounded-lg border border-gray-100 p-2.5 focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-300 transition-all leading-relaxed"
        />
      </SidebarCard>
    </aside>
  );
}
