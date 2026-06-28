"use client";

import { motion } from "framer-motion";
import { BarChart3, CloudSun, Target, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Boat, Recommendation, SessionData } from "@/types";

interface RightSidebarProps {
  boats: Boat[];
  session: SessionData;
}

function SidebarCard({
  icon: Icon,
  title,
  children,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: delay ?? 0 }}
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

function RecItem({ rec }: { rec: Recommendation }) {
  const iconColor =
    rec.type === "ok"
      ? "text-green-600"
      : rec.type === "warn"
      ? "text-amber-600"
      : "text-blue-500";

  const bgColor =
    rec.type === "ok"
      ? "bg-green-50"
      : rec.type === "warn"
      ? "bg-amber-50"
      : "bg-blue-50";

  return (
    <div
      className={cn(
        "flex items-start gap-2 p-2.5 rounded-lg mb-1.5 last:mb-0",
        bgColor
      )}
    >
      <span className={cn("text-xs mt-px flex-shrink-0", iconColor)}>
        {rec.icon}
      </span>
      <span className="text-xs text-gray-600 leading-relaxed">{rec.text}</span>
    </div>
  );
}

export function RightSidebar({ boats, session }: RightSidebarProps) {
  const ready = boats.filter((b) => b.status === "ready").length;
  const warn = boats.filter((b) => b.status === "warn").length;
  const alert = boats.filter((b) => b.status === "alert").length;
  const idle = boats.filter((b) => b.status === "idle").length;

  const totalSailors = session.sailors.length;
  const assigned = boats.reduce((acc, b) => acc + b.filled, 0);
  const unassigned = totalSailors - assigned;

  return (
    <aside className="order-3 w-full border-t border-gray-100 bg-gray-50 p-3 flex flex-col gap-3 lg:w-56 lg:flex-shrink-0 lg:border-t-0 lg:border-l lg:max-h-none">
      {/* Planning Summary */}
      <SidebarCard icon={BarChart3} title="Planning Summary" delay={0.05}>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between items-center py-0.5">
            <span className="text-xs text-gray-500">Sailors assigned</span>
            <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
              {assigned}
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-xs text-gray-500">Unassigned</span>
            <span
              className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                unassigned > 0
                  ? "text-amber-700 bg-amber-50"
                  : "text-gray-500 bg-gray-100"
              )}
            >
              {unassigned}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-50 grid grid-cols-2 gap-1">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
              {ready} ready
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              {warn} review
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
              {alert} action
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
              {idle} idle
            </div>
          </div>
        </div>
      </SidebarCard>

      {/* Weather Safety */}
      <SidebarCard icon={CloudSun} title="Weather Safety" delay={0.1}>
        <div className="flex flex-col gap-1">
          {[
            { ok: true, text: "Wind within safe limits" },
            { ok: false, text: "Gusts may affect beginners" },
            { ok: true, text: "Flooding tide — easy return" },
            { ok: true, text: "No lightning risk forecast" },
          ].map(({ ok, text }) => (
            <div key={text} className="flex items-start gap-1.5 py-0.5">
              <span
                className={cn(
                  "text-xs flex-shrink-0 mt-px",
                  ok ? "text-green-600" : "text-amber-600"
                )}
              >
                {ok ? "✓" : "⚠"}
              </span>
              <span className="text-xs text-gray-600">{text}</span>
            </div>
          ))}
        </div>
      </SidebarCard>

      {/* Session Objective */}
      <SidebarCard icon={Target} title="Session Objective" delay={0.15}>
        <p className="text-xs text-gray-700 leading-relaxed">
          {session.objective}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {["Trapeze", "Spinnaker", "Advanced"].map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      </SidebarCard>

      {/* Recommendations */}
      <SidebarCard icon={Lightbulb} title="Recommendations" delay={0.2}>
        <div>
          {session.recommendations.map((rec, i) => (
            <RecItem key={i} rec={rec} />
          ))}
        </div>
      </SidebarCard>
    </aside>
  );
}
