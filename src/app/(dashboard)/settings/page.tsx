"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setDepartment(user.department || "");
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, department })
      .eq("id", user.id);

    if (error) {
      toast.error("Profil güncellenemedi.");
    } else {
      toast.success("Profil güncellendi.");
    }
    setLoading(false);
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Ayarlar</h1>
        <p className="text-sm text-zinc-400 mt-1">Profil bilgilerinizi düzenleyin.</p>
      </div>

      <form onSubmit={handleSave} className="glass rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <UserAvatar name={user.full_name} size="lg" />
          <div>
            <p className="text-sm font-medium text-zinc-100">{user.full_name}</p>
            <p className="text-xs text-zinc-500">{user.email}</p>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 mt-1 inline-block">
              {user.role === "admin" ? "Admin" : user.role === "manager" ? "Yönetici" : "Üye"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium tracking-wide">
              Ad Soyad
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium tracking-wide">
              Departman
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="Departmanınız"
              className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg hover:shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
