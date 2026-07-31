"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Ship, ClipboardList, Wrench, UserRound, LogOut, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { roleHomePath, type UserRole } from "@/lib/useProfile";
import { loadSessions } from "@/lib/sessions";

export interface NavProfile {
  name: string;
  user_role: UserRole;
}

interface NavLinkDef {
  href: string;
  label: string;
  icon: React.ElementType;
}

/** Which top-level sections a role is allowed to see — mirrors each page's own requireRole gate */
function linksForRole(role: UserRole): NavLinkDef[] {
  const links: NavLinkDef[] = [];
  if (role === "senior_instructor") {
    links.push({ href: "/planner", label: "Planner", icon: Ship });
  }
  if (role === "senior_instructor" || role === "instructor" || role === "sailor" || role === "club_manager") {
    links.push({ href: "/sessions", label: "Sessions", icon: ClipboardList });
  }
  if (role === "senior_instructor" || role === "instructor" || role === "club_manager") {
    links.push({ href: "/roster", label: "Roster", icon: Users });
  }
  if (role === "club_manager") {
    links.push({ href: "/club-manager", label: "Club Manager", icon: Wrench });
  }
  links.push({ href: roleHomePath(role), label: "Profile", icon: UserRound });
  return links;
}

export function AppNav({ profile }: { profile: NavProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? "");
    });
    return () => { active = false; };
  }, []);

  // The nav's Planner link should jump straight into whichever session is
  // currently open, rather than the no-session (demo) board.
  useEffect(() => {
    if (profile.user_role !== "senior_instructor") return;
    let active = true;

    loadSessions()
      .then((sessions) => {
        if (!active) return;
        const now = Date.now();
        const openSessions = sessions
          .filter((s) => s.status === "open")
          .sort(
            (a, b) =>
              Math.abs(new Date(a.date).getTime() - now) -
              Math.abs(new Date(b.date).getTime() - now)
          );
        setOpenSessionId(openSessions[0]?.id ?? null);
      })
      .catch(() => {
        // No open session, or couldn't load — Planner link just falls back to the plain board
      });

    return () => { active = false; };
  }, [profile.user_role]);

  // Close the mobile menu automatically on route change
  useEffect(() => setOpen(false), [pathname]);

  const links = linksForRole(profile.user_role).map((link) =>
    link.href === "/planner" && openSessionId
      ? { ...link, href: `/planner?session=${openSessionId}` }
      : link
  );

  function isActive(href: string) {
    return pathname === href.split("?")[0] || pathname.startsWith(`${href.split("?")[0]}/`);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-sm px-4 sm:px-5">
      <div className="flex h-14 items-center gap-1">
        <Link
          href={roleHomePath(profile.user_role)}
          className="flex flex-shrink-0 items-center gap-2 mr-2"
        >
          <span className="text-xl leading-none">⛵</span>
          <span className="hidden text-sm font-semibold text-gray-900 sm:inline">
            Sail Planner
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden flex-col items-end leading-tight sm:flex">
            <span className="text-xs font-medium text-gray-700">{profile.name}</span>
            {email && <span className="text-[10px] text-gray-400">{email}</span>}
          </div>

          <button
            onClick={handleSignOut}
            className="hidden items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50 md:flex"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden border-t border-gray-100 md:hidden"
          >
            <div className="flex flex-col gap-1 py-3">
              <div className="mb-1 border-b border-gray-100 px-1 pb-2">
                <p className="text-sm font-medium text-gray-800">{profile.name}</p>
                {email && <p className="text-xs text-gray-400">{email}</p>}
              </div>

              {links.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}

              <button
                onClick={handleSignOut}
                className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
