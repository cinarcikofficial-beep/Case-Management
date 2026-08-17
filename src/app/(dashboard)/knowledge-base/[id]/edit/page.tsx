"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { KB_CATEGORIES } from "@/lib/constants";
import type { Tables } from "@/types/database";

type Brand = Tables<"brands">;
type Application = Tables<"applications">;

export default function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
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
  const [fetching, setFetching] = useState(true);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    async function fetchArticle() {
      const { data } = await supabase
        .from("knowledge_base")
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        setTitle(data.title);
        setContent(data.content);
        setCategory(data.category);
        setBrandId(data.brand_id || "");
        setApplicationId(data.application_id || "");
        setTags(data.tags?.join(", ") || "");
        setIsPublished(data.is_published);
      } else {
        toast.error("Makale bulunamadı.");
        router.push("/knowledge-base");
      }
      setFetching(false);
    }
    fetchArticle();
  }, [id, supabase, router]);

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

    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("knowledge_base")
      .update({
        title,
        content,
        category,
        brand_id: brandId || null,
        application_id: applicationId || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        is_published: isPublished,
      })
      .eq("id", id);

    if (error) {
      toast.error("Güncellenemedi: " + error.message);
    } else {
      toast.success("Makale güncellendi!");
      router.push(`/knowledge-base/${id}`);
    }
    setLoading(false);
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/knowledge-base/${id}`}
          className="p-2 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Makaleyi Düzenle</h1>
          <p className="text-sm text-zinc-400 mt-1">Makale bilgilerini güncelleyin.</p>
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
              <option value="">{brandId ? "Uygulama seçin" : "Önce marka seçin"}</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
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
            Yayınla
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Link
            href={`/knowledge-base/${id}`}
            className="px-6 py-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 text-sm font-medium hover:text-white transition-all"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg hover:shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
