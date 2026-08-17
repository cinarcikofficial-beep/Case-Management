"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KB_CATEGORIES } from "@/lib/constants";
import type { Tables } from "@/types/database";

type Brand = Tables<"brands">;
type Application = Tables<"applications">;

export default function NewArticlePage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Genel");
  const [brandId, setBrandId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [tags, setTags] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase
        .from("brands")
        .select("*")
        .eq("is_active", true);
      if (data) setBrands(data);
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
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Oturum açmanız gerekiyor.");
      setLoading(false);
      return;
    }

    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { error } = await supabase.from("knowledge_base").insert({
      title,
      content,
      category,
      brand_id: brandId || null,
      application_id: applicationId || null,
      author_id: user.id,
      tags: tagsArray.length > 0 ? tagsArray : null,
      is_published: isPublished,
    });

    if (error) {
      toast.error("Makale oluşturulurken hata oluştu.");
    } else {
      toast.success("Makale başarıyla oluşturuldu!");
      router.push("/knowledge-base");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/knowledge-base"
          className="p-2 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Yeni Makale Oluştur</h1>
          <p className="text-sm text-zinc-400 mt-1">Bilgi bankasına yeni bir makale ekleyin.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium tracking-wide">Başlık</label>
          <input
            type="text"
            required
            placeholder="Makale başlığı"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium tracking-wide">İçerik</label>
          <textarea
            rows={12}
            required
            placeholder="Makale içeriği (markdown destekler)..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500 resize-none font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium tracking-wide">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
            >
              {KB_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium tracking-wide">Etiketler</label>
            <input
              type="text"
              placeholder="virgülle ayırın"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium tracking-wide">Marka</label>
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
                  <option key={b.id} value={b.id}>{b.name}</option>
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
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium tracking-wide">Uygulama</label>
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
                  <option key={a.id} value={a.id}>{a.name}</option>
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

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="published"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="w-4 h-4 rounded border-[#233554] bg-[#0b111e] text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="published" className="text-sm text-zinc-400">
            Hemen yayınla
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Link
            href="/knowledge-base"
            className="px-6 py-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 text-sm font-medium hover:text-white transition-all"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg hover:shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {loading ? "Oluşturuluyor..." : "Makale Oluştur"}
          </button>
        </div>
      </form>
    </div>
  );
}
