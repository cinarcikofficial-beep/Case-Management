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
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { CaseTimeline } from "@/components/cases/CaseTimeline";
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
  const [noteContent, setNoteContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Edit mode state
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<CaseData["priority"]>("medium");
  const [editBrandId, setEditBrandId] = useState("");
  const [editApplicationId, setEditApplicationId] = useState("");
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editCustomerName, setEditCustomerName] = useState("");

  useEffect(() => {
    async function fetchCase() {
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

    async function fetchApplications(brandId: string) {
      if (brandId) {
        const { data } = await supabase
          .from("applications")
          .select("*")
          .eq("brand_id", brandId)
          .eq("is_active", true)
          .order("name");
        if (data) setApplications(data);
      } else {
        setApplications([]);
      }
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
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

    const { error } = await supabase
      .from("cases")
      .update({ assigned_to: userId || null })
      .eq("id", caseData.id);

    if (error) {
      toast.error("Atama güncellenirken hata oluştu.");
    } else {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
      if (caseData) {
        setCaseData({ ...caseData, assigned_to: userId || null });
      }
    }
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim() || !caseData) return;

    setSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

  async function handleSaveChanges() {
    if (!caseData) return;

    const { error } = await supabase
      .from("cases")
      .update({
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        brand_id: editBrandId || null,
        application_id: editApplicationId || null,
        assigned_to: editAssignedTo || null,
        customer_name: editCustomerName.trim() || null,
      })
      .eq("id", caseData.id);

    if (error) {
      toast.error("Değişiklikler kaydedilemedi: " + error.message);
    } else {
      toast.success("Değişiklikler kaydedildi.");
      setCaseData({
        ...caseData,
        title: editTitle,
        description: editDescription,
        priority: editPriority,
        brand_id: editBrandId || null,
        application_id: editApplicationId || null,
        assigned_to: editAssignedTo || null,
        customer_name: editCustomerName.trim() || null,
      });
      setEditMode(false);
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

  async function handleDeleteCustomer() {
    if (!editCustomerName) return;
    const existing = customers.find((c) => c.name === editCustomerName);
    if (existing && confirm(`"${existing.name}" müşterisini pasif hale getirmek istediğinizden emin misiniz?`)) {
      const { error } = await supabase
        .from("customers")
        .update({ is_active: false })
        .eq("id", existing.id);
      if (error) {
        toast.error("Müşteri güncellenemedi: " + error.message);
      } else {
        setCustomers((prev) => prev.filter((c) => c.id !== existing.id));
        setEditCustomerName("");
        toast.success("Müşteri pasif hale getirildi.");
      }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/cases"
            className="p-2 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          {editMode ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-bold bg-[#0b111e]/60 border border-[#233554]/80 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-indigo-500/80"
              />
              <button
                onClick={handleSaveChanges}
                className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-all"
                title="Kaydet"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setEditMode(false);
                  setEditTitle(caseData.title);
                  setEditDescription(caseData.description || "");
                  setEditPriority(caseData.priority);
                  setEditBrandId(caseData.brand_id || "");
                  setEditApplicationId(caseData.application_id || "");
                  setEditAssignedTo(caseData.assigned_to || "");
                  setEditCustomerName(caseData.customer_name || "");
                }}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/10 transition-all"
                title="İptal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-zinc-500">
                  VT-{new Date(caseData.created_at).getFullYear()}-
                  {String(caseData.case_number).padStart(4, "0")}
                </span>
                <StatusBadge status={caseData.status} />
                <PriorityBadge priority={caseData.priority} />
              </div>
              <h1 className="text-xl font-bold text-zinc-100 mt-1">
                {caseData.title}
              </h1>
            </div>
          )}
        </div>
        {!editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white text-sm font-medium transition-all"
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Case Info */}
        <div className="lg:col-span-1 space-y-4">
          {/* Info Card */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 tracking-wide">
              Vaka Bilgileri
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Kaynak</span>
                <div className="flex items-center gap-1.5">
                  {caseData.source === "customer" ? (
                    <Users className="h-3.5 w-3.5 text-zinc-400" />
                  ) : (
                    <Building className="h-3.5 w-3.5 text-zinc-400" />
                  )}
                  <span className="text-sm text-zinc-300">
                    {caseData.source === "customer" ? "Müşteri" : "Internal"}
                  </span>
                </div>
              </div>

              {editMode ? (
                <>
                  <div>
                    <label className="text-xs text-zinc-500">Marka</label>
                    <select
                      value={editBrandId}
                      onChange={(e) => {
                        setEditBrandId(e.target.value);
                        setEditApplicationId("");
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none"
                    >
                      <option value="">Seçin</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Uygulama</label>
                    <select
                      value={editApplicationId}
                      onChange={(e) => setEditApplicationId(e.target.value)}
                      disabled={!editBrandId}
                      className="w-full px-3 py-2 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none disabled:opacity-50"
                    >
                      <option value="">{editBrandId ? "Seçin" : "Önce marka seçin"}</option>
                      {applications.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Müşteri İsmi</label>
                    <div className="flex gap-1">
                      <select
                        value={editCustomerName}
                        onChange={(e) => setEditCustomerName(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none"
                      >
                        <option value="">Müşteri seçin</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleAddCustomer}
                        className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm"
                        title="Yeni müşteri ekle"
                      >
                        +
                      </button>
                      {editCustomerName && (
                        <button
                          type="button"
                          onClick={handleDeleteCustomer}
                          className="px-2 py-1 rounded bg-[#162238]/60 border border-[#233554]/60 text-zinc-500 hover:text-red-400 transition-all"
                          title="Sil"
                        >
                          −
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Öncelik</label>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as CaseData["priority"])}
                      className="w-full px-3 py-2 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none"
                    >
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                      <option value="urgent">Acil</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Açıklama</label>
                    <textarea
                      rows={4}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none placeholder-zinc-500 resize-none"
                      placeholder="Açıklama..."
                    />
                  </div>
                </>
              ) : (
                <>
                  {caseData.brands && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Marka</span>
                      <span className="text-sm text-zinc-300">
                        {caseData.brands.name}
                      </span>
                    </div>
                  )}

                  {caseData.applications && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Uygulama</span>
                      <span className="text-sm text-zinc-300">
                        {caseData.applications.name}
                      </span>
                    </div>
                  )}

                  {caseData.customer_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Müşteri</span>
                      <span className="text-sm text-zinc-300">
                        {caseData.customer_name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Öncelik</span>
                    <PriorityBadge priority={caseData.priority} />
                  </div>
                </>
              )}

              <div className="h-px bg-[#233554]/60" />

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Oluşturan</span>
                {caseData.profiles_cases_created_by && (
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      name={caseData.profiles_cases_created_by.full_name}
                      size="sm"
                    />
                    <span className="text-sm text-zinc-300">
                      {caseData.profiles_cases_created_by.full_name}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Atanan</span>
                {editMode ? (
                  <select
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-xs focus:outline-none"
                  >
                    <option value="">Atanmamış</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={caseData.assigned_to || ""}
                    onChange={(e) => handleAssign(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-xs focus:outline-none"
                  >
                    <option value="">Atanmamış</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="h-px bg-[#233554]/60" />

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Oluşturulma</span>
                <span className="text-sm text-zinc-300">
                  {new Date(caseData.created_at).toLocaleDateString("tr-TR")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Geçen Süre</span>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-sm text-indigo-400 font-medium">
                    {formatDistanceToNow(new Date(caseData.created_at), {
                      addSuffix: false,
                      locale: tr,
                    })}
                  </span>
                </div>
              </div>

              {caseData.resolved_at && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Çözülme</span>
                  <span className="text-sm text-green-400">
                    {new Date(caseData.resolved_at).toLocaleDateString("tr-TR")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status Change */}
          {editMode ? null : (
            allowedTransitions.length > 0 && (
              <div className="glass rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-zinc-100 tracking-wide">
                  Durum Değiştir
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allowedTransitions.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className="px-3 py-1.5 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-zinc-300 text-xs font-medium hover:border-indigo-500/50 hover:text-indigo-400 transition-all"
                    >
                      {status === "in_progress"
                        ? "İşleniyor"
                        : status === "waiting"
                        ? "Beklemede"
                        : status === "resolved"
                        ? "Çözüldü"
                        : status === "closed"
                        ? "Kapat"
                        : "Aç"}
                    </button>
                  ))}
                </div>
              </div>
            )
          )}

          {/* Description */}
          {editMode ? null : caseData.description ? (
            <div className="glass rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-zinc-100 tracking-wide">
                Açıklama
              </h3>
              <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                {caseData.description}
              </p>
            </div>
          ) : null}
        </div>

        {/* Right Column - Timeline & Notes */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add Note */}
          <form onSubmit={handleAddNote} className="glass rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-zinc-100 tracking-wide">
              Not Ekle
            </h3>
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
            <h3 className="text-sm font-bold text-zinc-100 tracking-wide mb-4">
              Aktivite Akışı
            </h3>

            <CaseTimeline caseId={caseData.id} refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
