"use client";

import { UserAvatar } from "@/components/shared/UserAvatar";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Tables } from "@/types/database";

export function Topbar() {
  const [user, setUser] = useState<Tables<"profiles"> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        setUser(data);
      }
    }
    getUser();
  }, [supabase]);

  return (
    <header className="h-16 border-b border-[#233554]/60 bg-[#0b111e]/80 backdrop-blur-md flex items-center justify-end px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        {user && (
          <>
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-100">
                {user.full_name}
              </p>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
            <UserAvatar name={user.full_name} email={user.email} />
          </>
        )}
      </div>
    </header>
  );
}
