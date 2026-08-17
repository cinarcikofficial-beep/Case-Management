"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef } from "react";

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  onInsert?: (payload: unknown) => void;
  onUpdate?: (payload: unknown) => void;
  onDelete?: (payload: unknown) => void;
}

export function useRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
}: UseRealtimeOptions) {
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase.channel(`${table}-changes`);

    if (onInsert) {
      channel.on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter },
        onInsert
      );
    }
    if (onUpdate) {
      channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table, filter },
        onUpdate
      );
    }
    if (onDelete) {
      channel.on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table, filter },
        onDelete
      );
    }

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase, table, filter, onInsert, onUpdate, onDelete]);

  return channelRef;
}
