"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface InstructorPoolProps {
  instructors: string[];
  isOpen: boolean;
  onToggle: () => void;
  selectedInstructors: string[];
  onSelectInstructor?: (name: string) => void;
}

export function InstructorPool({ instructors, isOpen, onToggle, selectedInstructors, onSelectInstructor }: InstructorPoolProps) {
  return (
    <div className="flex-shrink-0 bg-white border-t border-gray-100">
      <button
        onClick={onToggle}
        className="group flex h-auto w-full items-center gap-3 px-3 py-3 transition-colors hover:bg-gray-50 sm:h-11 sm:px-5"
      >
        <motion.span animate={{ rotate: isOpen ? 0 : 180 }} transition={{ duration: 0.2 }}>
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
          )}
        </motion.span>
        <span className="text-sm font-medium text-gray-700 flex-1 text-left">Instructors</span>
        <span className="text-left text-xs text-gray-400">{instructors.length} available</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 128, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="flex gap-2.5 overflow-x-auto px-3 pb-4 pt-1 sm:px-5">
              {instructors.map((ins) => {
                const isSelected = selectedInstructors.includes(ins);
                return (
                  <button
                    key={ins}
                    onClick={() => onSelectInstructor?.(ins)}
                    className={cn(
                      "flex items-center rounded-lg border px-3 py-2 text-sm font-medium",
                      isSelected
                        ? "ring-2 ring-blue-300 border-blue-200 bg-blue-50"
                        : "border-gray-100 bg-white hover:border-blue-200"
                    )}
                  >
                    {ins}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
