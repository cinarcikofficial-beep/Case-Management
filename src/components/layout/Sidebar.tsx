"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Settings,
  Shield,
  Plus,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Bilgi Bankası", href: "/knowledge-base", icon: BookOpen },
  { name: "Ayarlar", href: "/settings", icon: Settings },
];

const adminNavigation = [
  { name: "Admin", href: "/admin", icon: Shield },
];

interface SidebarProps {
  userRole?: string;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-72 bg-[#0b111e] border-r border-[#233554]/60 flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[#233554]/60 text-center">
        <Link href="/dashboard" className="flex flex-col items-center">
          <Image src="/verytech_beyaz.png" alt="Verytech" width={140} height={140} className="object-contain mb-3" />
          <h1 className="text-2xl font-bold text-white tracking-wide">
            Verytech
          </h1>
          <p className="text-sm font-semibold text-slate-300">
            Case Management & Knowledge Base
          </p>
        </Link>
      </div>

      {/* Quick Action */}
      <div className="px-4 pt-4">
        <Link
          href="/cases/new"
          className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 rounded-xl shadow-lg hover:shadow-indigo-600/30 transition-all"
        >
          <Plus className="h-4 w-4" />
          Yeni Vaka
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-[#162238]/60"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}

        {userRole === "admin" && (
          <>
            <div className="py-2">
              <div className="h-px bg-[#233554]/60" />
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-[#162238]/60"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-[#233554]/60">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-[#162238]/60 transition-all w-full"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
