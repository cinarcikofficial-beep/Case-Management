"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Eye, Calendar, Pencil, Trash2 } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { KB_CATEGORIES } from "@/lib/constants";
import type { Tables } from "@/types/database";

type Article = Tables<"knowledge_base"> & {
  profiles?: Pick<Tables<"profiles">, "full_name">;
  brands?: Pick<Tables<"brands">, "name">;
  applications?: Pick<Tables<"applications">, "name">;
};

export default function ArticleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchArticle() {
      const { data, error } = await supabase
        .from("knowledge_base")
        .select(
          `
          *,
          profiles:author_id(full_name),
          brands(name),
          applications(name)
        `
        )
        .eq("id", id)
        .single();

      if (error || !data) {
        toast.error("Makale bulunamadı.");
        router.push("/knowledge-base");
        return;
      }

      // Increment view count
      await supabase
        .from("knowledge_base")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", id);

      setArticle({ ...data, view_count: (data.view_count || 0) + 1 } as Article);
      setLoading(false);
    }
    fetchArticle();
  }, [id, supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Yükleniyor...</div>
      </div>
    );
  }

  if (!article) return null;

  async function handleDelete() {
    if (!confirm(`"${article!.title}" makalesini silmek istediğinizden emin misiniz?`)) return;
    const { error } = await supabase.from("knowledge_base").delete().eq("id", id);
    if (error) {
      toast.error("Silinemedi: " + error.message);
    } else {
      toast.success("Makale silindi.");
      router.push("/knowledge-base");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/knowledge-base"
          className="p-2 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-medium">
            {article.category}
          </span>
          <h1 className="text-2xl font-bold text-zinc-100 mt-2">
            {article.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/knowledge-base/${article.id}/edit`}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white text-sm font-medium transition-all"
          >
            <Pencil className="h-4 w-4" />
            Düzenle
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-sm font-medium transition-all"
          >
            <Trash2 className="h-4 w-4" />
            Sil
          </button>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-6 mb-6 pb-6 border-b border-[#233554]/60">
          {article.profiles && (
            <div className="flex items-center gap-2">
              <UserAvatar name={article.profiles.full_name} size="sm" />
              <span className="text-sm text-zinc-400">
                {article.profiles.full_name}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Calendar className="h-3.5 w-3.5" />
            <span className="text-sm">
              {new Date(article.created_at).toLocaleDateString("tr-TR")}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Eye className="h-3.5 w-3.5" />
            <span className="text-sm">{article.view_count} görüntülenme</span>
          </div>
        </div>

        <div className="prose prose-invert prose-sm max-w-none">
          <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {article.content}
          </div>
        </div>

        {article.tags && article.tags.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#233554]/60">
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {(article.brands || article.applications) && (
          <div className="mt-4 pt-4 border-t border-[#233554]/60 flex items-center gap-4">
            {article.brands && (
              <span className="text-xs text-zinc-500">
                Marka: <span className="text-zinc-300">{article.brands.name}</span>
              </span>
            )}
            {article.applications && (
              <span className="text-xs text-zinc-500">
                Uygulama:{" "}
                <span className="text-zinc-300">{article.applications.name}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
