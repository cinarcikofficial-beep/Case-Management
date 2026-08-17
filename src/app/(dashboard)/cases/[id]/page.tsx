"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Users,
  Building,
  Pencil,
  Send,
  Check,
  X,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { CaseTimeline } from "@/components/cases/CaseTimeline";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { STATUS_TRANSITIONS } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import type { Tables } from "@/types/database";

type CaseData = Tables<"cases"> & {
  profiles_cases_created_by?: Pick<Tables<"profiles">, "full_name" | "email">;
  profiles_cases_assigned_to?: Pick<Tables<"profiles">, "full_name" | "email">;
  brands?: Pick<Tables<"brands">, "name">;
  applications?: Pick<Tables<"applications">, "name">;
};

type Profile = Tables<"profiles">;
type Brand = Tables<"brands">;
type Application = Tables<"applications">;
type Customer = { id: string; name: string };

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [noteContent, setNoteContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<CaseData["priority"]>("medium");
  const [editBrandId, setEditBrandId] = useState("");
  const [editApplicationId, setEditApplicationId] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");

  useEffect(() => {
    async function fetchCase() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data } = await supabase
        .from("cases")
        .select("*, brands(name), applications(name)")
        .eq("id", id)
        .single();

      if (data) {
        const caseRow = data as Tables<"cases"> & {
          brands?: { name: string };
          applications?: { name: string };
        };
        const userIds = [caseRow.created_by, caseRow.assigned_to].filter(Boolean);
        const profilesRes = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        const profileMap = new Map(
          (profilesRes.data || []).map((p) => [p.id, p])
        );
        const caseDataObj = {
          ...caseRow,
          profiles_cases_created_by: profileMap.get(caseRow.created_by),
          profiles_cases_assigned_to: profileMap.get(caseRow.assigned_to),
          brands: caseRow.brands,
          applications: caseRow.applications,
        } as CaseData;
        setCaseData(caseDataObj);
        setEditTitle(caseDataObj.title);
        setEditDescription(caseDataObj.description || "");
        setEditPriority(caseDataObj.priority);
        setEditBrandId(caseDataObj.brand_id || "");
        setEditApplicationId(caseDataObj.application_id || "");
        setEditAssignedTo(caseDataObj.assigned_to || "");
        setEditCustomerName(caseDataObj.customer_name || "");
      } else {
        toast.error("Vaka bulunamadı.");
        router.push("/cases");
      }
      setLoading(false);
    }

    async function fetchDropdownData() {
      const [{ data: brandsData }, { data: usersData }, { data: customersData }] = await Promise.all([
        supabase.from("brands").select("*").eq("is_active", true).order("name"),
        supabase.from("profiles").select("*").eq("is_active", true),
        supabase.from("customers").select("*").eq("is_active", true).order("name"),
      ]);
      if (brandsData) setBrands(brandsData);
      if (usersData) setUsers(usersData);
      if (customersData) setCustomers(customersData as Customer[]);
    }

    fetchCase();
    fetchDropdownData();
  }, [id, supabase, router]);

  useEffect(() => {
    async function loadApplications() {
      if (editBrandId) {
        const { data } = await supabase
          .from("applications")
          .select("*")
          .eq("brand_id", editBrandId)
          .eq("is_active", true)
          .order("name");
        if (data) setApplications(data);
      } else {
        setApplications([]);
      }
    }
    loadApplications();
  }, [editBrandId]);

  async function handleStatusChange(newStatus: string) {
    if (!caseData) return;
    const { error } = await supabase
      .from("cases")
      .update({ status: newStatus })
      .eq("id", caseData.id);
    if (error) {
      toast.error("Durum güncellenirken hata oluştu.");
    } else {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("case_status_log").insert({
          case_id: caseData.id,
          from_status: caseData.status,
          to_status: newStatus,
          changed_by: user?.id || "",
        });
      } catch {}
      toast.success("Durum güncellendi.");
      setCaseData({ ...caseData, status: newStatus as CaseData["status"] });
      setRefreshKey((k) => k + 1);
    }
  }

  async function handleAssign(userId: string) {
    if (!caseData) return;
    const updates: Record<string, unknown> = { assigned_to: userId || null };
    if (userId && caseData.status === "open") {
      updates.status = "in_progress";
    }
    const { error } = await supabase
      .from("cases")
      .update(updates)
      .eq("id", caseData.id);
    if (error) {
      toast.error("Atama güncellenirken hata oluştu.");
    } else {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("case_history").insert({
          case_id: caseData.id,
          changed_by: user?.id || "",
          field_name: "Atama",
          old_value: caseData.assigned_to,
          new_value: userId || null,
        });
      } catch {}
      toast.success("Atama güncellendi.");
      setRefreshKey((k) => k + 1);
      setCaseData({ ...caseData, ...updates } as CaseData);
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim() || !caseData) return;
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Oturum açmanız gerekiyor.");
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from("case_notes").insert({
      case_id: caseData.id,
      author_id: user.id,
      content: noteContent,
      is_internal: isInternal,
    });
    if (error) {
      toast.error("Not eklenirken hata oluştu.");
    } else {
      toast.success("Not eklendi.");
      setNoteContent("");
      setIsInternal(false);
      setRefreshKey((k) => k + 1);
    }
    setSubmitting(false);
  }

  function startEditField(field: string) {
    if (!caseData) return;
    setEditTitle(caseData.title);
    setEditDescription(caseData.description || "");
    setEditPriority(caseData.priority);
    setEditBrandId(caseData.brand_id || "");
    setEditApplicationId(caseData.application_id || "");
    setEditAssignedTo(caseData.assigned_to || "");
    setEditCustomerName(caseData.customer_name || "");
    setEditingField(field);
  }

  function cancelEditField() {
    setEditingField(null);
  }

  async function handleSaveField(field: string) {
    if (!caseData) return;
    const updates: Record<string, unknown> = {};
    if (field === "title") updates.title = editTitle;
    if (field === "description") updates.description = editDescription;
    if (field === "priority") updates.priority = editPriority;
    if (field === "brand") { updates.brand_id = editBrandId || null; updates.application_id = null; }
    if (field === "application") updates.application_id = editApplicationId || null;
    if (field === "customer") updates.customer_name = editCustomerName.trim() || null;
    if (field === "assigned_to") updates.assigned_to = editAssignedTo || null;

    const { error } = await supabase
      .from("cases")
      .update(updates)
      .eq("id", caseData.id);

    if (error) {
      toast.error("Kaydedilemedi: " + error.message);
    } else {
      toast.success("Kaydedildi.");
      setCaseData({ ...caseData, ...updates } as CaseData);
      setEditingField(null);
      setRefreshKey((k) => k + 1);
    }
  }

  async function handleAddCustomer() {
    const newName = prompt("Yeni müşteri ismi:", editCustomerName || "");
    if (newName && newName.trim()) {
      const trimmed = newName.trim();
      const existing = customers.find((c) => c.name === trimmed);
      if (existing) {
        setEditCustomerName(existing.name);
        toast.success(`"${trimmed}" müşteri olarak seçildi.`);
      } else {
        const { data, error } = await supabase
          .from("customers")
          .insert({ name: trimmed, is_active: true })
          .select()
          .single();
        if (error) {
          if (error.code === "23505") {
            const fresh = customers.find((c) => c.name === trimmed);
            if (fresh) {
              setEditCustomerName(fresh.name);
              toast.success(`"${trimmed}" müşteri olarak seçildi.`);
            }
          } else {
            toast.error("Müşteri eklenemedi: " + error.message);
          }
        } else if (data) {
          setCustomers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
          setEditCustomerName(data.name);
          toast.success(`"${trimmed}" müşteri olarak kaydedildi.`);
        }
      }
    }
  }

  async function handleAddBrand() {
    const newName = prompt("Yeni marka ismi:");
    if (newName && newName.trim()) {
      const trimmed = newName.trim();
      const existing = brands.find((b) => b.name === trimmed);
      if (existing) {
        setEditBrandId(existing.id);
        setEditApplicationId("");
        toast.success(`"${trimmed}" marka olarak seçildi.`);
      } else {
        const { data, error } = await supabase
          .from("brands")
          .insert({ name: trimmed })
          .select()
          .single();
        if (error) {
          if (error.code === "23505") {
            const fresh = brands.find((b) => b.name === trimmed);
            if (fresh) {
              setEditBrandId(fresh.id);
              setEditApplicationId("");
              toast.success(`"${trimmed}" marka olarak seçildi.`);
            }
          } else {
            toast.error("Marka eklenemedi: " + error.message);
          }
        } else if (data) {
          setBrands((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
          setEditBrandId(data.id);
          setEditApplicationId("");
          toast.success(`"${trimmed}" marka olarak kaydedildi.`);
        }
      }
    }
  }

  async function handleAddApplication() {
    if (!editBrandId) { toast.error("Önce bir marka seçin."); return; }
    const newName = prompt("Yeni uygulama ismi:");
    if (newName && newName.trim()) {
      const trimmed = newName.trim();
      const existing = applications.find((a) => a.name === trimmed && a.brand_id === editBrandId);
      if (existing) {
        setEditApplicationId(existing.id);
        toast.success(`"${trimmed}" uygulama olarak seçildi.`);
      } else {
        const { data, error } = await supabase
          .from("applications")
          .insert({ name: trimmed, brand_id: editBrandId })
          .select()
          .single();
        if (error) {
          if (error.code === "23505") {
            const fresh = applications.find((a) => a.name === trimmed && a.brand_id === editBrandId);
            if (fresh) {
              setEditApplicationId(fresh.id);
              toast.success(`"${trimmed}" uygulama olarak seçildi.`);
            }
          } else {
            toast.error("Uygulama eklenemedi: " + error.message);
          }
        } else if (data) {
          setApplications((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
          setEditApplicationId(data.id);
          toast.success(`"${trimmed}" uygulama olarak kaydedildi.`);
        }
      }
    }
  }

  async function handleDeleteCase() {
    if (!caseData) return;
    setShowDeleteConfirm(true);
  }

  async function confirmDeleteCase() {
    if (!caseData) return;
    const caseNum = caseData.case_number;
    const { error } = await supabase.from("cases").delete().eq("id", caseData.id);
    if (error) {
      toast.error("Silinemedi: " + error.message);
    } else {
      await supabase.rpc("reset_case_number_if_needed", { p_case_number: caseNum });
      toast.success("Vaka silindi. Vaka numarası yeniden kullanıma hazır.");
      router.push("/cases");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Yükleniyor...</div>
      </div>
    );
  }

  if (!caseData) return null;

  const allowedTransitions = STATUS_TRANSITIONS[caseData.status] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/cases"
          className="p-2 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-zinc-500">
              VT-{new Date(caseData.created_at).getFullYear()}-
              {String(caseData.case_number).padStart(4, "0")}
            </span>
            <StatusBadge status={caseData.status} />
            <PriorityBadge priority={caseData.priority} />
          </div>
          {editingField === "title" ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveField("title"); if (e.key === "Escape") cancelEditField(); }}
                className="text-xl font-bold bg-[#0b111e]/60 border border-[#233554]/80 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500/80"
              />
              <button onClick={() => handleSaveField("title")} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-all"><Check className="h-4 w-4" /></button>
              <button onClick={cancelEditField} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-all"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <h1 className="text-xl font-bold text-zinc-100 mt-1 flex items-center gap-2 group">
              {caseData.title}
              <button onClick={() => startEditField("title")} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[#162238]/80 transition-all"><Pencil className="h-3.5 w-3.5 text-zinc-500" /></button>
            </h1>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Case Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 tracking-wide">Vaka Bilgileri</h3>
            <div className="space-y-3">
              {/* Kaynak */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Kaynak</span>
                <div className="flex items-center gap-1.5">
                  {caseData.source === "customer" ? <Users className="h-3.5 w-3.5 text-zinc-400" /> : <Building className="h-3.5 w-3.5 text-zinc-400" />}
                  <span className="text-sm text-zinc-300">{caseData.source === "customer" ? "Müşteri" : "Internal"}</span>
                </div>
              </div>

              {/* Marka */}
              {editingField === "brand" ? (
                <div>
                  <label className="text-xs text-zinc-500">Marka</label>
                  <div className="flex items-center gap-1">
                    <select value={editBrandId} onChange={(e) => { setEditBrandId(e.target.value); setEditApplicationId(""); }} autoFocus className="flex-1 px-3 py-2 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none">
                      <option value="">Seçin</option>
                      {brands.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                    </select>
                    <button onClick={handleAddBrand} className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm" title="Yeni marka ekle">+</button>
                    <button onClick={() => handleSaveField("brand")} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10"><Check className="h-4 w-4" /></button>
                    <button onClick={cancelEditField} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/10"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-zinc-500">Marka</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-zinc-300">{caseData.brands?.name || "—"}</span>
                    <button onClick={() => startEditField("brand")} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[#162238]/80 transition-all"><Pencil className="h-3 w-3 text-zinc-500" /></button>
                  </div>
                </div>
              )}

              {/* Uygulama */}
              {editingField === "application" ? (
                <div>
                  <label className="text-xs text-zinc-500">Uygulama</label>
                  <div className="flex items-center gap-1">
                    <select value={editApplicationId} onChange={(e) => setEditApplicationId(e.target.value)} disabled={!editBrandId} autoFocus className="flex-1 px-3 py-2 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none disabled:opacity-50">
                      <option value="">{editBrandId ? "Seçin" : "Önce marka seçin"}</option>
                      {applications.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                    </select>
                    <button onClick={handleAddApplication} className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm" title="Yeni uygulama ekle">+</button>
                    <button onClick={() => handleSaveField("application")} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10"><Check className="h-4 w-4" /></button>
                    <button onClick={cancelEditField} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/10"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-zinc-500">Uygulama</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-zinc-300">{caseData.applications?.name || "—"}</span>
                    <button onClick={() => startEditField("application")} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[#162238]/80 transition-all"><Pencil className="h-3 w-3 text-zinc-500" /></button>
                  </div>
                </div>
              )}

              {/* Müşteri */}
              {editingField === "customer" ? (
                <div>
                  <label className="text-xs text-zinc-500">Müşteri</label>
                  <div className="flex items-center gap-1">
                    <select value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} autoFocus className="flex-1 px-3 py-2 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none">
                      <option value="">Müşteri seçin</option>
                      {customers.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
                    </select>
                    <button onClick={handleAddCustomer} className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm" title="Yeni müşteri ekle">+</button>
                    <button onClick={() => handleSaveField("customer")} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10"><Check className="h-4 w-4" /></button>
                    <button onClick={cancelEditField} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/10"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-zinc-500">Müşteri</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-zinc-300">{caseData.customer_name || "—"}</span>
                    <button onClick={() => startEditField("customer")} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[#162238]/80 transition-all"><Pencil className="h-3 w-3 text-zinc-500" /></button>
                  </div>
                </div>
              )}

              {/* Öncelik */}
              {editingField === "priority" ? (
                <div>
                  <label className="text-xs text-zinc-500">Öncelik</label>
                  <div className="flex items-center gap-1">
                    <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as CaseData["priority"])} autoFocus className="flex-1 px-3 py-2 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none">
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                      <option value="urgent">Acil</option>
                    </select>
                    <button onClick={() => handleSaveField("priority")} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10"><Check className="h-4 w-4" /></button>
                    <button onClick={cancelEditField} className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/10"><X className="h-4 w-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-zinc-500">Öncelik</span>
                  <div className="flex items-center gap-1.5">
                    <PriorityBadge priority={caseData.priority} />
                    <button onClick={() => startEditField("priority")} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[#162238]/80 transition-all"><Pencil className="h-3 w-3 text-zinc-500" /></button>
                  </div>
                </div>
              )}

              <div className="h-px bg-[#233554]/60" />

              {/* Oluşturan */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Oluşturan</span>
                {caseData.profiles_cases_created_by && (
                  <div className="flex items-center gap-2">
                    <UserAvatar name={caseData.profiles_cases_created_by.full_name} size="sm" />
                    <span className="text-sm text-zinc-300">{caseData.profiles_cases_created_by.full_name}</span>
                  </div>
                )}
              </div>

              {/* Atanan */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Atanan</span>
                <select
                  value={caseData.assigned_to || ""}
                  onChange={(e) => handleAssign(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-xs focus:outline-none"
                >
                  <option value="">Atanmamış</option>
                  {users.map((u) => (<option key={u.id} value={u.id}>{u.full_name}</option>))}
                </select>
              </div>

              <div className="h-px bg-[#233554]/60" />

              {/* Oluşturulma */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Oluşturulma</span>
                <span className="text-sm text-zinc-300">{new Date(caseData.created_at).toLocaleDateString("tr-TR")}</span>
              </div>

              {/* Geçen Süre */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Geçen Süre</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-sm text-indigo-400 font-medium">
                    {formatDistanceToNow(new Date(caseData.created_at), { addSuffix: false, locale: tr })}
                  </span>
                </div>
              </div>

              {caseData.resolved_at && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Çözülme</span>
                  <span className="text-sm text-green-400">{new Date(caseData.resolved_at).toLocaleDateString("tr-TR")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Durum Değiştir */}
          <div className="glass rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 tracking-wide">Durum Değiştir</h3>
            <div className="flex flex-wrap gap-2">
              {allowedTransitions.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className="px-3 py-1.5 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-zinc-300 text-xs font-medium hover:border-indigo-500/50 hover:text-indigo-400 transition-all"
                >
                  {status === "in_progress" ? "İşleniyor" : status === "closed" ? "Kapat" : "Aç"}
                </button>
              ))}
              <button
                onClick={handleDeleteCase}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 hover:text-red-300 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="h-3 w-3" /> Vakayı Sil
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Description, Timeline & Notes */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          {caseData.description || editingField === "description" ? (
            <div className="glass rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-zinc-100 tracking-wide">Açıklama</h3>
                {editingField !== "description" && (
                  <button onClick={() => startEditField("description")} className="p-1 rounded-lg hover:bg-[#162238]/80 transition-all"><Pencil className="h-3.5 w-3.5 text-zinc-500" /></button>
                )}
              </div>
              {editingField === "description" ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none placeholder-zinc-500 resize-none"
                    placeholder="Açıklama..."
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveField("description")} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-all"><Check className="h-3 w-3" /> Kaydet</button>
                    <button onClick={cancelEditField} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white text-xs font-medium transition-all"><X className="h-3 w-3" /> İptal</button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 whitespace-pre-wrap">{caseData.description}</p>
              )}
            </div>
          ) : (
            <div className="glass rounded-2xl p-5">
              <button onClick={() => startEditField("description")} className="text-sm text-zinc-500 hover:text-zinc-300 transition-all">+ Açıklama ekle</button>
            </div>
          )}

          {/* Add Note */}
          <form onSubmit={handleAddNote} className="glass rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 tracking-wide">Not Ekle</h3>
            <textarea
              rows={3}
              placeholder="Notunuzu yazın..."
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500 resize-none"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="w-4 h-4 rounded border-[#233554] bg-[#0b111e] text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs text-zinc-400">Internal not</span>
              </label>
              <button
                type="submit"
                disabled={!noteContent.trim() || submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Gönderiliyor..." : "Gönder"}
              </button>
            </div>
          </form>

          {/* Timeline */}
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-bold text-zinc-100 tracking-wide mb-4">Aktivite Akışı</h3>
            <CaseTimeline caseId={caseData.id} refreshKey={refreshKey} currentUserId={currentUserId} onRefresh={() => setRefreshKey((k) => k + 1)} />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Vakayı Sil"
        message={`Bu kaydı silmek istediğinize emin misiniz?\n\nVaka No: VT-${caseData ? new Date(caseData.created_at).getFullYear() : ""}-${caseData ? String(caseData.case_number).padStart(4, "0") : ""}\nBaşlık: ${caseData?.title || ""}\n\nBu işlem geri alınamaz. Silinen vaka numarası yeni bir kayda verilecektir.`}
        confirmLabel="Sil"
        cancelLabel="İptal"
        danger
        onConfirm={confirmDeleteCase}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
