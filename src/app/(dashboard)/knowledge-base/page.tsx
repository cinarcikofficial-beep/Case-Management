"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Plus, Search, Eye, Tag, Pencil, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { toast } from "sonner";
import type { Tables } from "@/types/database";

type Article = Tables<"knowledge_base"> & {
  profiles?: Pick<Tables<"profiles">, "full_name">;
  brands?: Pick<Tables<"brands">, "name">;
};

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchArticles();
  }, [category]);

  async function fetchArticles() {
    setLoading(true);
    let query = supabase
      .from("knowledge_base")
      .select(
        `
        *,
        profiles:author_id(full_name),
        brands(name)
      `
      );

    if (category) query = query.eq("category", category);
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);
    }

    query = query.order("created_at", { ascending: false });

    const { data } = await query;
    if (data) setArticles(data as Article[]);
    setLoading(false);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await fetchArticles();
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" makalesini silmek istediğinizden emin misiniz?`)) return;
    const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
    if (error) {
      toast.error("Silinemedi: " + error.message);
    } else {
      toast.success("Makale silindi.");
      setArticles((prev) => prev.filter((a) => a.id !== id));
    }
  }

  const categories = [
    "Genel", "Teknik", "Sıkça Sorulan Sorular", "Kılavuz", "Sorun Giderme", "Güncelleme",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Bilgi Bankası</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Yaygın sorunlar ve çözümler için bilgi kaynakları.
          </p>
        </div>
        <Link
          href="/knowledge-base/new"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg hover:shadow-indigo-600/30 transition-all"
        >
          <Plus className="h-4 w-4" />
          Yeni Makale
        </Link>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4">
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Makale ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
          >
            <option value="">Tüm Kategoriler</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </form>
      </div>

      {/* Articles Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-zinc-400">Yükleniyor...</div>
        </div>
      ) : articles.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-zinc-500">Henüz makale bulunmuyor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/knowledge-base/${article.id}`}
              className="glass rounded-2xl p-5 hover:glow-indigo transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-medium">
                  {article.category}
                </span>
                <div className="flex items-center gap-1">
                  <div className="flex items-center gap-1 text-zinc-500">
                    <Eye className="h-3 w-3" />
                    <span className="text-[10px]">{article.view_count}</span>
                  </div>
                  <Link
                    href={`/knowledge-base/${article.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 rounded-lg hover:bg-[#162238]/80 transition-all text-zinc-500 hover:text-indigo-400"
                    title="Düzenle"
                  >
                    <Pencil className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(article.id, article.title); }}
                    className="p-1 rounded-lg hover:bg-red-500/10 transition-all text-zinc-500 hover:text-red-400"
                    title="Sil"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <h3 className="text-sm font-bold text-zinc-100 group-hover:text-indigo-400 transition-colors line-clamp-2 mb-2">
                {article.title}
              </h3>
              <p className="text-xs text-zinc-500 line-clamp-3 mb-4">
                {article.content.replace(/[#*`]/g, "").slice(0, 150)}...
              </p>
              <div className="flex items-center justify-between">
                {article.profiles && (
                  <div className="flex items-center gap-2">
                    <UserAvatar name={article.profiles.full_name} size="sm" />
                    <span className="text-xs text-zinc-500">
                      {article.profiles.full_name}
                    </span>
                  </div>
                )}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag className="h-3 w-3 text-zinc-500" />
                    <span className="text-[10px] text-zinc-500">
                      {article.tags.length}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
