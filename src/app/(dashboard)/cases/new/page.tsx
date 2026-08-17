"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Tables } from "@/types/database";

type Brand = Tables<"brands">;
type Application = Tables<"applications">;
type Profile = Tables<"profiles">;

type Customer = { id: string; name: string };

export default function NewCasePage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<"customer" | "internal">("customer");
  const [customerName, setCustomerName] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [brandId, setBrandId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [loading, setLoading] = useState(false);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    async function fetchData() {
      const [brandsRes, usersRes, customersRes] = await Promise.all([
        supabase.from("brands").select("*").eq("is_active", true).order("name"),
        supabase.from("profiles").select("*").eq("is_active", true),
        supabase.from("customers").select("*").eq("is_active", true).order("name"),
      ]);
      if (brandsRes.data) setBrands(brandsRes.data);
      if (usersRes.data) setUsers(usersRes.data);
      if (customersRes.data) setCustomers(customersRes.data as Customer[]);
    }
    fetchData();
  }, [supabase]);

  useEffect(() => {
    async function fetchApplications() {
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
    fetchApplications();
  }, [brandId, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Oturum açmanız gerekiyor.");
      setLoading(false);
      return;
    }

    const trimmedCustomerName = source === "customer" && customerName.trim() ? customerName.trim() : null;

    // Create or update customer record if customer name is provided
    let customerId = null;
    if (trimmedCustomerName) {
      const existingCustomer = customers.find((c) => c.name === trimmedCustomerName);
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: custData, error: custError } = await supabase
          .from("customers")
          .insert({ name: trimmedCustomerName, is_active: true })
          .select()
          .single();
        if (custError && custError.code !== "23505") {
          toast.error("Müşteri eklenemedi: " + custError.message);
        } else if (custData) {
          customerId = custData.id;
          setCustomers((prev) => [...prev, custData].sort((a, b) => a.name.localeCompare(b.name)));
          toast.success(`"${trimmedCustomerName}" müşteri olarak kaydedildi.`);
        }
      }
    }

    const { error } = await supabase.from("cases").insert({
      title,
      description,
      source,
      priority,
      brand_id: brandId || null,
      application_id: applicationId || null,
      customer_id: customerId,
      customer_name: trimmedCustomerName,
      assigned_to: assignedTo || null,
      created_by: user.id,
    });

    if (error) {
      toast.error("Vaka oluşturulurken hata oluştu: " + error.message);
    } else {
      toast.success("Vaka başarıyla oluşturuldu!");
      router.push("/dashboard");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Yeni Vaka Oluştur</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Yeni bir destek kaydı oluşturun.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-6">
        {/* Source */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium tracking-wide">
            Kaynak
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setSource("customer"); setCustomerName(""); }}
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
              onClick={() => { setSource("internal"); setCustomerName(""); }}
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

        {/* Customer Name (always visible) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-zinc-400 font-medium tracking-wide">
              Müşteri İsmi
            </label>
            {!customerName && (
              <span className="text-xs text-yellow-400">
                listede yoksa yan + ile ekleyin
              </span>
            )}
          </div>
            <div className="flex gap-2">
              <select
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
              >
                <option value="">Müşteri seçin</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  const newName = prompt("Yeni müşteri ismi ekle:", customerName || "");
                  if (newName && newName.trim()) {
                    const trimmed = newName.trim();
                    const { data, error } = await supabase
                      .from("customers")
                      .insert({ name: trimmed, is_active: true })
                      .select()
                      .single();
                    if (error) {
                      if (error.code === "23505") {
                        const existing = customers.find((c) => c.name === trimmed);
                        if (existing) {
                          setCustomerName(existing.name);
                          toast.success(`"${trimmed}" müşteri olarak seçildi.`);
                        }
                      } else {
                        toast.error("Müşteri eklenemedi: " + error.message);
                      }
                    } else if (data) {
                      setCustomers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                      setCustomerName(data.name);
                      toast.success(`"${trimmed}" müşteri olarak kaydedildi.`);
                    }
                  }
                }}
                className="px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all"
                title="Yeni müşteri ekle"
              >
                +
              </button>
              {customerName && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      const newName = prompt("Müşteri ismini düzenle:", customerName);
                      if (newName !== null && newName.trim()) {
                        const trimmed = newName.trim();
                        const existing = customers.find((c) => c.name === customerName);
                        if (existing) {
                          const { error } = await supabase
                            .from("customers")
                            .update({ name: trimmed })
                            .eq("id", existing.id);
                          if (error) {
                            toast.error("Müşteri güncellenemedi: " + error.message);
                          } else {
                            setCustomers((prev) =>
                              prev.map((c) => (c.id === existing.id ? { ...c, name: trimmed } : c))
                            );
                            setCustomerName(trimmed);
                            toast.success("Müşteri ismi güncellendi.");
                          }
                        }
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-indigo-400 transition-all"
                    title="Düzenle"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const existing = customers.find((c) => c.name === customerName);
                      if (existing && confirm(`"${existing.name}" müşterisini silmek istediğinizden emin misiniz?`)) {
                        const { error } = await supabase
                          .from("customers")
                          .update({ is_active: false })
                          .eq("id", existing.id);
                        if (error) {
                          toast.error("Müşteri silinemedi: " + error.message);
                        } else {
                          setCustomers((prev) => prev.filter((c) => c.id !== existing.id));
                          setCustomerName("");
                          toast.success("Müşteri silindi.");
                        }
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-500 hover:text-red-400 transition-all"
                    title="Sil"
                  >
                    −
                  </button>
                </>
              )}
            </div>
          </div>

        {/* Title */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium tracking-wide">
            Başlık
          </label>
          <input
            type="text"
            required
            placeholder="Vakanın kısa açıklaması"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium tracking-wide">
            Açıklama
          </label>
          <textarea
            rows={4}
            placeholder="Sorunun detaylı açıklaması..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500 resize-none"
          />
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium tracking-wide">
            Öncelik
          </label>
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

        {/* Brand & Application */}
        <div className="grid grid-cols-2 gap-4">
          {/* Brand */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium tracking-wide">
              Marka
            </label>
            <div className="flex gap-2">
              <select
                value={brandId}
                onChange={(e) => {
                  setBrandId(e.target.value);
                  setApplicationId("");
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
              >
                <option value="">Marka seçin</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  const newName = prompt("Yeni marka adı:", brandId ? brands.find((b) => b.id === brandId)?.name || "" : "");
                  if (newName && newName.trim()) {
                    const trimmed = newName.trim();
                    const existing = brands.find((b) => b.name === trimmed);
                    if (existing) {
                      setBrandId(existing.id);
                      toast.success(`"${trimmed}" markası seçildi.`);
                    } else {
                      const { data, error } = await supabase
                        .from("brands")
                        .insert({ name: trimmed, is_active: true })
                        .select()
                        .single();
                      if (error) {
                        toast.error("Marka eklenemedi: " + error.message);
                      } else if (data) {
                        setBrands((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                        setBrandId(data.id);
                        toast.success(`"${trimmed}" marka olarak kaydedildi.`);
                      }
                    }
                  }
                }}
                className="px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all"
                title="Yeni marka ekle"
              >
                +
              </button>
              {brandId && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      const current = brands.find((b) => b.id === brandId)?.name || "";
                      const newName = prompt("Marka adını düzenle:", current);
                      if (newName !== null && newName.trim()) {
                        const trimmed = newName.trim();
                        const { error } = await supabase
                          .from("brands")
                          .update({ name: trimmed })
                          .eq("id", brandId);
                        if (error) {
                          toast.error("Marka güncellenemedi: " + error.message);
                        } else {
                          setBrands((prev) =>
                            prev.map((b) => (b.id === brandId ? { ...b, name: trimmed } : b))
                          );
                          toast.success("Marka güncellendi.");
                        }
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-indigo-400 transition-all"
                    title="Düzenle"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm("Bu markayı silmek istediğinizden emin misiniz?")) {
                        const { error } = await supabase
                          .from("brands")
                          .update({ is_active: false })
                          .eq("id", brandId);
                        if (error) {
                          toast.error("Marka silinemedi: " + error.message);
                        } else {
                          setBrands((prev) => prev.filter((b) => b.id !== brandId));
                          setBrandId("");
                          setApplicationId("");
                          toast.success("Marka silindi.");
                        }
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-500 hover:text-red-400 transition-all"
                    title="Sil"
                  >
                    −
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Application */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium tracking-wide">
              Uygulama
            </label>
            <div className="flex gap-2">
              <select
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                disabled={!brandId}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all disabled:opacity-50"
              >
                <option value="">
                  {brandId ? "Uygulama seçin" : "Önce marka seçin"}
                </option>
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  if (!brandId) return;
                  const newName = prompt("Yeni uygulama adı:", applicationId ? applications.find((a) => a.id === applicationId)?.name || "" : "");
                  if (newName && newName.trim()) {
                    const trimmed = newName.trim();
                    const existing = applications.find((a) => a.name === trimmed);
                    if (existing) {
                      setApplicationId(existing.id);
                      toast.success(`"${trimmed}" uygulaması seçildi.`);
                    } else {
                      const { data, error } = await supabase
                        .from("applications")
                        .insert({ name: trimmed, brand_id: brandId, is_active: true })
                        .select()
                        .single();
                      if (error) {
                        toast.error("Uygulama eklenemedi: " + error.message);
                      } else if (data) {
                        setApplications((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
                        setApplicationId(data.id);
                        toast.success(`"${trimmed}" uygulama olarak kaydedildi.`);
                      }
                    }
                  }
                }}
                disabled={!brandId}
                className="px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all disabled:opacity-50"
                title="Yeni uygulama ekle"
              >
                +
              </button>
              {applicationId && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      const current = applications.find((a) => a.id === applicationId)?.name || "";
                      const newName = prompt("Uygulama adını düzenle:", current);
                      if (newName !== null && newName.trim()) {
                        const trimmed = newName.trim();
                        const { error } = await supabase
                          .from("applications")
                          .update({ name: trimmed })
                          .eq("id", applicationId);
                        if (error) {
                          toast.error("Uygulama güncellenemedi: " + error.message);
                        } else {
                          setApplications((prev) =>
                            prev.map((a) => (a.id === applicationId ? { ...a, name: trimmed } : a))
                          );
                          toast.success("Uygulama güncellendi.");
                        }
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-indigo-400 transition-all"
                    title="Düzenle"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm("Bu uygulamayı silmek istediğinizden emin misiniz?")) {
                        const { error } = await supabase
                          .from("applications")
                          .update({ is_active: false })
                          .eq("id", applicationId);
                        if (error) {
                          toast.error("Uygulama silinemedi: " + error.message);
                        } else {
                          setApplications((prev) => prev.filter((a) => a.id !== applicationId));
                          setApplicationId("");
                          toast.success("Uygulama silindi.");
                        }
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-500 hover:text-red-400 transition-all"
                    title="Sil"
                  >
                    −
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Assign To */}
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium tracking-wide">
            Ata
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
          >
            <option value="">Kişi seçin (opsiyonel)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href="/dashboard"
            className="px-6 py-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 text-sm font-medium hover:text-white transition-all"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg hover:shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {loading ? "Oluşturuluyor..." : "Vaka Oluştur"}
          </button>
        </div>
      </form>
    </div>
  );
}
