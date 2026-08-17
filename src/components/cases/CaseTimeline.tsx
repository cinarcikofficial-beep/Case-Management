"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Pencil, Trash2, Check, X, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

interface TimelineItem {
  id: string;
  type: "status_change" | "note" | "assignment" | "created";
  content: string;
  author: string;
  authorId?: string;
  authorEmail?: string;
  createdAt: string;
  metadata?: Record<string, string | null>;
}

interface CaseTimelineProps {
  caseId: string;
  refreshKey?: number;
  currentUserId?: string;
  onRefresh?: () => void;
}

export function CaseTimeline({ caseId, refreshKey, currentUserId, onRefresh }: CaseTimelineProps) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchTimeline() {
      const [statusLogs, notes, history] = await Promise.all([
        supabase
          .from("case_status_log")
          .select("*, profiles:changed_by(full_name, email)")
          .eq("case_id", caseId)
          .order("created_at", { ascending: true }),
        supabase
          .from("case_notes")
          .select("*, profiles:author_id(full_name, email)")
          .eq("case_id", caseId)
          .order("created_at", { ascending: true }),
        supabase
          .from("case_history")
          .select("*, profiles:changed_by(full_name, email)")
          .eq("case_id", caseId)
          .order("created_at", { ascending: true }),
      ]);

      const timelineItems: TimelineItem[] = [];

      if (statusLogs.data) {
        statusLogs.data.forEach((log) => {
          const profile = log.profiles as unknown as { full_name: string; email: string } | null;
          timelineItems.push({
            id: log.id,
            type: "status_change",
            content: log.from_status
              ? `"${log.from_status}" → "${log.to_status}" olarak değiştirildi`
              : `"${log.to_status}" durumuna ayarlandı`,
            author: profile?.full_name || "Bilinmiyor",
            authorEmail: profile?.email,
            createdAt: log.created_at,
          });
        });
      }

      if (notes.data) {
        notes.data.forEach((note) => {
          const profile = note.profiles as unknown as { full_name: string; email: string } | null;
          timelineItems.push({
            id: note.id,
            type: "note",
            content: note.content,
            author: profile?.full_name || "Bilinmiyor",
            authorId: note.author_id,
            authorEmail: profile?.email,
            createdAt: note.created_at,
            metadata: { is_internal: String(note.is_internal) },
          });
        });
      }

      if (history.data) {
        history.data.forEach((h) => {
          const profile = h.profiles as unknown as { full_name: string; email: string } | null;
          timelineItems.push({
            id: h.id,
            type: "assignment",
            content: `${h.field_name}: "${h.old_value || "boş"}" → "${h.new_value || "boş"}"`,
            author: profile?.full_name || "Bilinmiyor",
            authorEmail: profile?.email,
            createdAt: h.created_at,
          });
        });
      }

      timelineItems.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setItems(timelineItems);
      setLoading(false);
    }

    fetchTimeline();
  }, [caseId, refreshKey, supabase]);

  function handleDeleteNote(id: string) {
    setDeleteTargetId(id);
  }

  async function confirmDeleteNote() {
    if (!deleteTargetId) return;
    const { error } = await supabase.from("case_notes").delete().eq("id", deleteTargetId);
    if (error) {
      toast.error("Silinemedi: " + error.message);
    } else {
      toast.success("Not silindi.");
      setItems((prev) => prev.filter((item) => item.id !== deleteTargetId));
      setDeleteTargetId(null);
      onRefresh?.();
    }
  }

  async function handleEditNote(id: string) {
    if (!editContent.trim()) return;
    const { error } = await supabase
      .from("case_notes")
      .update({ content: editContent })
      .eq("id", id);
    if (error) {
      toast.error("Güncellenemedi: " + error.message);
    } else {
      toast.success("Not güncellendi.");
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, content: editContent } : item
        )
      );
      setEditingId(null);
      onRefresh?.();
    }
  }

  const visibleItems = items.filter((item) => {
    if (item.type === "note" && item.metadata?.is_internal === "true") {
      return item.authorId === currentUserId;
    }
    return true;
  });

  if (loading) {
    return <div className="text-zinc-500 text-sm py-4">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      {visibleItems.length === 0 ? (
        <p className="text-zinc-500 text-sm text-center py-4">
          Henüz aktivite bulunmuyor.
        </p>
      ) : (
        visibleItems.map((item, index) => (
          <div key={item.id} className="flex gap-3 group/item">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  item.type === "status_change"
                    ? "bg-blue-500/20 text-blue-400"
                    : item.type === "note"
                    ? "bg-green-500/20 text-green-400"
                    : item.type === "created"
                    ? "bg-indigo-500/20 text-indigo-400"
                    : "bg-orange-500/20 text-orange-400"
                }`}
              >
                {item.type === "status_change"
                  ? "🔄"
                  : item.type === "note"
                  ? "📝"
                  : item.type === "created"
                  ? "✨"
                  : "👤"}
              </div>
              {index < visibleItems.length - 1 && (
                <div className="w-px h-full bg-[#233554]/60 min-h-[20px]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <UserAvatar name={item.author} size="sm" />
                <span className="text-sm font-medium text-zinc-200">
                  {item.author}
                </span>
                <span className="text-xs text-zinc-500">
                  {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                    locale: tr,
                  })}
                </span>
                {item.metadata?.is_internal === "true" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    Internal
                  </span>
                )}
                {/* Edit/Delete buttons for notes */}
                {item.type === "note" && item.authorId === currentUserId && editingId !== item.id && (
                  <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 ml-auto transition-all">
                    <button
                      onClick={() => { setEditingId(item.id); setEditContent(item.content); }}
                      className="p-1 rounded-lg hover:bg-[#162238]/80 text-zinc-500 hover:text-indigo-400 transition-all"
                      title="Düzenle"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(item.id)}
                      className="p-1 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"
                      title="Sil"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
              {/* Edit mode */}
              {editingId === item.id ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    rows={3}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditNote(item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-medium transition-all"
                    >
                      <Check className="h-3 w-3" /> Kaydet
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white text-xs font-medium transition-all"
                    >
                      <X className="h-3 w-3" /> İptal
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 mt-1 whitespace-pre-wrap">
                  {item.content}
                </p>
              )}
            </div>
          </div>
        ))
      )}

      <ConfirmDialog
        open={deleteTargetId !== null}
        title="Notu Sil"
        message="Bu notu silmek istediğinizden emin misiniz?"
        confirmLabel="Sil"
        cancelLabel="İptal"
        danger
        onConfirm={confirmDeleteNote}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
