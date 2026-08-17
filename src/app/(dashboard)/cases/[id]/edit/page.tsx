"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Tables } from "@/types/database";

type Brand = Tables<"brands">;
type Application = Tables<"applications">;
type Profile = Tables<"profiles">;
type CaseData = Tables<"cases">;

export default function EditCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<"customer" | "internal">("customer");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [brandId, setBrandId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [caseRes, brandsRes, usersRes] = await Promise.all([
        supabase.from("cases").select("*").eq("id", id).single(),
        supabase.from("brands").select("*").eq("is_active", true),
        supabase.from("profiles").select("*").eq("is_active", true),
      ]);

      if (caseRes.data) {
        const c = caseRes.data;
        setCaseData(c);
        setTitle(c.title);
        setDescription(c.description || "");
        setSource(c.source);
        setPriority(c.priority);
        setBrandId(c.brand_id || "");
        setApplicationId(c.application_id || "");
        setAssignedTo(c.assigned_to || "");
      } else {
        toast.error("Vaka bulunamadı.");
        router.push("/dashboard");
      }

      if (brandsRes.data) setBrands(brandsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      setLoading(false);
    }
    fetchData();
  }, [id, supabase, router]);

  useEffect(() => {
    async function fetchApplications() {
      if (brandId) {
        const { data } = await supabase
          .from("applications")
          .select("*")
          .eq("brand_id", brandId)
          .eq("is_active", true);
        if (data) setApplications(data);
      } else {
        setApplications([]);
      }
    }
    fetchApplications();
  }, [brandId, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caseData) return;
    setSaving(true);

    const { error } = await supabase
      .from("cases")
      .update({
        title,
        description,
        source,
        priority,
        brand_id: brandId || null,
        application_id: applicationId || null,
        assigned_to: assignedTo || null,
      })
      .eq("id", caseData.id);

    if (error) {
      toast.error("Vaka güncellenirken hata oluştu.");
    } else {
      toast.success("Vaka güncellendi.");
      router.push(`/cases/${caseData.id}`);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Yükleniyor...</div>
      </div>
    );
  }

  if (!caseData) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/cases/${caseData.id}`}
          className="p-2 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Vakayı Düzenle</h1>
          <p className="text-sm text-zinc-400 mt-1">
            VT-{new Date(caseData.created_at).getFullYear()}-
            {String(caseData.case_number).padStart(4, "0")}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium tracking-wide">Kaynak</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setSource("customer")}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${
                source === "customer"
                  ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/50"
                  : "bg-[#0b111e]/60 text-zinc-400 border-[#233554]/80 hover:border-[#2d446b]"
              }`}
            >
              Müşteri
            </button>
            <button
              type="button"
              onClick={() => setSource("internal")}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${
                source === "internal"
                  ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/50"
                  : "bg-[#0b111e]/60 text-zinc-400 border-[#233554]/80 hover:border-[#2d446b]"
              }`}
            >
              Internal
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium tracking-wide">Başlık</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium tracking-wide">Açıklama</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500 resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium tracking-wide">Öncelik</label>
          <div className="grid grid-cols-4 gap-2">
            {(["low", "medium", "high", "urgent"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                  priority === p
                    ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/50"
                    : "bg-[#0b111e]/60 text-zinc-400 border-[#233554]/80 hover:border-[#2d446b]"
                }`}
              >
                {p === "low" ? "Düşük" : p === "medium" ? "Orta" : p === "high" ? "Yüksek" : "Acil"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium tracking-wide">Marka</label>
            <select
              value={brandId}
              onChange={(e) => { setBrandId(e.target.value); setApplicationId(""); }}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
            >
              <option value="">Marka seçin</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium tracking-wide">Uygulama</label>
            <select
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              disabled={!brandId}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all disabled:opacity-50"
            >
              <option value="">Uygulama seçin</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium tracking-wide">Ata</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
          >
            <option value="">Kişi seçin</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Link
            href={`/cases/${caseData.id}`}
            className="px-6 py-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 text-sm font-medium hover:text-white transition-all"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg hover:shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
