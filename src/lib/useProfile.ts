"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export type UserRole = "sailor" | "instructor" | "senior_instructor" | "club_manager";

export interface UserProfile {
  id: string;
  name: string;
  user_role: UserRole;
  stage: string;
  confidence: string;
  role: string;
  skills: string[];
}

interface UseProfileOptions {
  /** If set, redirect to this path if not logged in */
  requireAuth?: string;
  /** If set, redirect to this path if role is not in the allowed list */
  requireRole?: UserRole[];
  redirectIfUnauthorised?: string;
}

export function useProfile(options: UseProfileOptions = {}) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (options.requireAuth) router.push(options.requireAuth);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("sailor_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!data) {
        // Profile not yet created — send to finish registration
        router.push("/register");
        return;
      }

      const p = data as UserProfile;
      setProfile(p);

      if (
        options.requireRole &&
        !options.requireRole.includes(p.user_role)
      ) {
        router.push(options.redirectIfUnauthorised ?? "/");
        return;
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { profile, loading };
}
