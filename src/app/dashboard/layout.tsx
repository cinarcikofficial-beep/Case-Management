"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userRole, setUserRole] = useState<string>("member");
  const [checking, setChecking] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      if (!sessionStorage.getItem("session_active")) {
        await supabase.auth.signOut();
        router.replace("/login");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (data) setUserRole(data.role);
      setChecking(false);
    }

    checkAuth();
  }, [supabase, router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-slate-400 text-sm">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar userRole={userRole} />
      <div className="flex-1 ml-72 flex flex-col">
        <Topbar />
        <main className="p-6 flex-1">{children}</main>
        <footer className="px-6 py-4 border-t border-[#233554]/30">
          <p className="text-xs text-zinc-600 text-center">@2026 - Designed By Kerim KAPLAN</p>
        </footer>
      </div>
    </div>
  );
}
