"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import type { Tables } from "@/types/database";

type Case = Tables<"cases"> & {
  profiles_cases_created_by?: Tables<"profiles">;
  profiles_cases_assigned_to?: Tables<"profiles">;
  brands?: Tables<"brands">;
  applications?: Tables<"applications">;
};

interface UseCasesOptions {
  status?: string;
  source?: string;
  brandId?: string;
  assignedTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export function useCases(options: UseCasesOptions = {}) {
  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchCases = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("cases")
      .select(
        `
        *,
        profiles_cases_created_by:profiles!cases_created_by_fkey(full_name, email),
        profiles_cases_assigned_to:profiles!cases_assigned_to_fkey(full_name, email),
        brands(name),
        applications(name)
      `,
        { count: "exact" }
      );

    if (options.status) query = query.eq("status", options.status);
    if (options.source) query = query.eq("source", options.source);
    if (options.brandId) query = query.eq("brand_id", options.brandId);
    if (options.assignedTo) query = query.eq("assigned_to", options.assignedTo);
    if (options.search) {
      query = query.or(`title.ilike.%${options.search}%,case_number.eq.${options.search || 0}`);
    }

    query = query.order("created_at", { ascending: false });

    if (options.limit) query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

    const { data, count, error } = await query;

    if (!error && data) {
      setCases(data as Case[]);
      setTotal(count || 0);
    }
    setLoading(false);
  }, [supabase, options.status, options.source, options.brandId, options.assignedTo, options.search, options.limit, options.offset]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return { cases, total, loading, refetch: fetchCases };
}
