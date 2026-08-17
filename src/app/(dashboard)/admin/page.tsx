"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Users, FolderOpen, Settings, Plus } from "lucide-react";
import type { Tables } from "@/types/database";

type Profile = Tables<"profiles">;
type Brand = Tables<"brands">;
type Application = Tables<"applications">;

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"users" | "brands" | "applications">("users");
  const [users, setUsers] = useState<Profile[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [usersRes, brandsRes, appsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("brands").select("*").order("name"),
      supabase.from("applications").select("*, brands(name)").order("name"),
    ]);
    if (usersRes.data) setUsers(usersRes.data);
    if (brandsRes.data) setBrands(brandsRes.data);
    if (appsRes.data) setApplications(appsRes.data as Application[]);
    setLoading(false);
  }

  async function handleUpdateRole(userId: string, role: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);
    if (error) toast.error("Rol güncellenemedi.");
    else {
      toast.success("Rol güncellendi.");
      fetchData();
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !isActive })
      .eq("id", userId);
    if (error) toast.error("Durum güncellenemedi.");
    else {
      toast.success("Durum güncellendi.");
      fetchData();
    }
  }

  async function handleAddBrand(name: string) {
    if (!name.trim()) return;
    const { error } = await supabase.from("brands").insert({ name: name.trim() });
    if (error) toast.error("Marka eklenemedi: " + error.message);
    else {
      toast.success("Marka eklendi.");
      fetchData();
    }
  }

  async function handleDeleteBrand(brand: Brand) {
    const confirmed = confirm(
      `"${brand.name}" markasını silmek istediğinizden emin misiniz?\nBu işlem geri alınamaz ve bağlı uygulamalar da silinecektir.`
    );
    if (!confirmed) return;

    const { error } = await supabase.from("brands").delete().eq("id", brand.id);
    if (error) toast.error("Marka silinemedi: " + error.message);
    else {
      toast.success("Marka silindi.");
      fetchData();
    }
  }

  async function handleAddApplication(name: string, brandId: string) {
    if (!name.trim() || !brandId) return;
    const { error } = await supabase
      .from("applications")
      .insert({ name: name.trim(), brand_id: brandId });
    if (error) toast.error("Uygulama eklenemedi: " + error.message);
    else {
      toast.success("Uygulama eklendi.");
      fetchData();
    }
  }

  async function handleDeleteApplication(app: Application & { brands?: Pick<Brand, "name"> }) {
    const confirmed = confirm(
      `"${app.name}" uygulamasını silmek istediğinizden emin misiniz?\nBu işlem geri alınamaz.`
    );
    if (!confirmed) return;

    const { error } = await supabase.from("applications").delete().eq("id", app.id);
    if (error) toast.error("Uygulama silinemedi: " + error.message);
    else {
      toast.success("Uygulama silindi.");
      fetchData();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Admin Paneli</h1>
        <p className="text-sm text-zinc-400 mt-1">Sistem yönetimi ve yapılandırma.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "users" as const, label: "Kullanıcılar", icon: Users },
          { key: "brands" as const, label: "Markalar", icon: FolderOpen },
          { key: "applications" as const, label: "Uygulamalar", icon: Settings },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/50"
                : "bg-[#162238]/60 text-zinc-400 border border-[#233554]/60 hover:text-white"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#233554]/60">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Kullanıcı</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">E-posta</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Rol</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">Durum</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[#233554]/30 table-row-hover">
                  <td className="px-4 py-3 text-sm text-zinc-100">{user.full_name}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                      className="px-2 py-1 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-xs focus:outline-none"
                    >
                      <option value="member">Üye</option>
                      <option value="manager">Yönetici</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${user.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                      {user.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                      className="text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      {user.is_active ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Brands Tab */}
      {activeTab === "brands" && (
        <BrandManager brands={brands} onAdd={handleAddBrand} onDelete={handleDeleteBrand} />
      )}

      {/* Applications Tab */}
      {activeTab === "applications" && (
        <ApplicationManager
          applications={applications}
          brands={brands}
          onAdd={handleAddApplication}
          onDelete={handleDeleteApplication}
        />
      )}
    </div>
  );
}

function BrandManager({
  brands,
  onAdd,
  onDelete,
}: {
  brands: Brand[];
  onAdd: (name: string) => void;
  onDelete: (brand: Brand) => void;
}) {
  const [newBrand, setNewBrand] = useState("");

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Yeni marka adı"
          value={newBrand}
          onChange={(e) => setNewBrand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAdd(newBrand);
              setNewBrand("");
            }
          }}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500"
        />
        <button
          onClick={() => { onAdd(newBrand); setNewBrand(""); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all"
        >
          <Plus className="h-4 w-4" />
          Ekle
        </button>
      </div>
      <div className="space-y-2">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="flex items-center justify-between p-3 rounded-xl bg-[#0b111e]/40 border border-[#233554]/40"
          >
            <span className="text-sm text-zinc-100">{brand.name}</span>
            <button
              onClick={() => onDelete(brand)}
              className="px-2 py-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-lg font-bold"
              title="Sil"
            >
              −
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationManager({
  applications,
  brands,
  onAdd,
  onDelete,
}: {
  applications: (Application & { brands?: Pick<Brand, "name"> })[];
  brands: Brand[];
  onAdd: (name: string, brandId: string) => void;
  onDelete: (app: Application & { brands?: Pick<Brand, "name"> }) => void;
}) {
  const [newApp, setNewApp] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none"
        >
          <option value="">Marka seçin</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Yeni uygulama adı"
          value={newApp}
          onChange={(e) => setNewApp(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && selectedBrand) {
              onAdd(newApp, selectedBrand);
              setNewApp("");
            }
          }}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500"
        />
        <button
          onClick={() => { if (selectedBrand) { onAdd(newApp, selectedBrand); setNewApp(""); } }}
          disabled={!selectedBrand}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Ekle
        </button>
      </div>
      <div className="space-y-2">
        {applications.map((app) => (
          <div
            key={app.id}
            className="flex items-center justify-between p-3 rounded-xl bg-[#0b111e]/40 border border-[#233554]/40"
          >
            <div>
              <span className="text-sm text-zinc-100">{app.name}</span>
              <span className="text-xs text-zinc-500 ml-2">
                ({app.brands?.name || "Bilinmeyen Marka"})
              </span>
            </div>
            <button
              onClick={() => onDelete(app)}
              className="px-2 py-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all text-lg font-bold"
              title="Sil"
            >
              −
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
