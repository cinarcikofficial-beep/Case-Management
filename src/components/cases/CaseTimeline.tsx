"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface TimelineItem {
  id: string;
  type: "status_change" | "note" | "assignment" | "created";
  content: string;
  author: string;
  authorEmail?: string;
  createdAt: string;
  metadata?: Record<string, string | null>;
}

interface CaseTimelineProps {
  caseId: string;
  refreshKey?: number;
}

export function CaseTimeline({ caseId, refreshKey }: CaseTimelineProps) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) {
    return <div className="text-zinc-500 text-sm py-4">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-zinc-500 text-sm text-center py-4">
          Henüz aktivite bulunmuyor.
        </p>
      ) : (
        items.map((item, index) => (
          <div key={item.id} className="flex gap-3">
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
              {index < items.length - 1 && (
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
              </div>
              <p className="text-sm text-zinc-400 mt-1 whitespace-pre-wrap">
                {item.content}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
