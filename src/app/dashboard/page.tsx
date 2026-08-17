"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  FolderOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Users,
  Building,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PriorityBadge } from "@/components/shared/PriorityBadge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { CASE_STATUSES, CASE_SOURCES } from "@/lib/constants";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import type { Tables } from "@/types/database";
import { toast } from "sonner";

type Case = Tables<"cases"> & {
  profiles_cases_created_by?: Pick<Tables<"profiles">, "full_name" | "email">;
  profiles_cases_assigned_to?: Pick<Tables<"profiles">, "full_name" | "email">;
  brands?: Pick<Tables<"brands">, "name">;
  applications?: Pick<Tables<"applications">, "name">;
  customer_name?: string | null;
};

export default function DashboardPage() {
  const [stats, setStats] = useState({
    openCases: 0,
    resolvedCases: 0,
    todayCases: 0,
    myCases: 0,
  });
  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState<"all" | "me" | "none" | string>("all");
  const [assignableUsers, setAssignableUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const limit = 10;
  const supabase = createClient();

  useEffect(() => {
    async function fetchStats() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const [openRes, resolvedRes, todayRes, myRes] = await Promise.all([
        supabase
          .from("cases")
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "in_progress"]),
        supabase
          .from("cases")
          .select("*", { count: "exact", head: true })
          .eq("status", "closed"),
        supabase
          .from("cases")
          .select("*", { count: "exact", head: true })
          .gte(
            "created_at",
            new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          ),
        user
          ? supabase
              .from("cases")
              .select("*", { count: "exact", head: true })
              .eq("assigned_to", user.id)
              .in("status", ["open", "in_progress"])
          : { count: 0 },
      ]);

      setStats({
        openCases: openRes.count || 0,
        resolvedCases: resolvedRes.count || 0,
        todayCases: todayRes.count || 0,
        myCases: myRes.count || 0,
      });
      setLoadingStats(false);
    }

    fetchStats();
  }, [supabase]);

  const fetchCases = useCallback(async () => {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Oturum açmanız gerekiyor.");
      return;
    }

    let query = supabase
      .from("cases")
      .select("*, brands(name), customer_name", { count: "exact" });

    if (statusFilter) query = query.eq("status", statusFilter);
    if (sourceFilter) query = query.eq("source", sourceFilter);
    if (assignedFilter === "none" && !activeStatFilter) {
      query = query.is("assigned_to", null);
    } else if (assignedFilter !== "all" && assignedFilter !== "none" && !activeStatFilter) {
      query = query.eq("assigned_to", assignedFilter);
    }
    let brandIds: string[] | null = null;
    let applicationIds: string[] | null = null;
    if (search) {
      const [brandRes, appRes] = await Promise.all([
        supabase.from("brands").select("id").ilike("name", `%${search}%`),
        supabase.from("applications").select("id").ilike("name", `%${search}%`),
      ]);
      brandIds = (brandRes.data || []).map((b) => b.id);
      applicationIds = (appRes.data || []).map((a) => a.id);
    }

    if (search) {
      const parts = [
        "title.ilike.%" + search + "%",
        "customer_name.ilike.%" + search + "%",
        "description.ilike.%" + search + "%",
      ];
      if (brandIds && brandIds.length > 0) parts.push("brand_id.in.(" + brandIds.join(",") + ")");
      if (applicationIds && applicationIds.length > 0) parts.push("application_id.in.(" + applicationIds.join(",") + ")");
      query = query.or(parts.join(","));
    }

    if (activeStatFilter === "today") {
      query = query.gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      );
    } else if (activeStatFilter === "myCases") {
      query = query.eq("assigned_to", user.id);
    } else if (activeStatFilter === "open") {
      query = query.in("status", ["open", "in_progress"]);
    }

    const dbSortFields: Record<string, string> = {
      case_number: "case_number",
      title: "title",
      source: "source",
      status: "status",
      priority: "priority",
      created_at: "created_at",
    };

    const dbField = dbSortFields[sortField];
    if (dbField) {
      query = query.order(dbField, { ascending: sortAsc });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    query = query.range(page * limit, page * limit + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      toast.error("Vakalar yüklenemedi: " + error.message);
      setCases([]);
    } else if (data) {
      const casesData = data as Case[];
      const userIds = Array.from(
        new Set([
          ...casesData.map((c) => c.created_by).filter(Boolean),
          ...casesData.map((c) => c.assigned_to).filter(Boolean),
        ])
      );
      const profilesRes = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      const profileMap = new Map(
        (profilesRes.data || []).map((p) => [p.id, p])
      );
      const enrichedCases = casesData.map((c) => ({
        ...c,
        profiles_cases_created_by: profileMap.get(c.created_by),
        profiles_cases_assigned_to: profileMap.get(c.assigned_to),
      }));

      if (sortField === "brand") {
        enrichedCases.sort((a, b) => {
          const aName = a.brands?.name || "";
          const bName = b.brands?.name || "";
          return sortAsc ? aName.localeCompare(bName) : bName.localeCompare(aName);
        });
      } else if (sortField === "assigned_to") {
        enrichedCases.sort((a, b) => {
          const aName = a.profiles_cases_assigned_to?.full_name || "";
          const bName = b.profiles_cases_assigned_to?.full_name || "";
          return sortAsc ? aName.localeCompare(bName) : bName.localeCompare(aName);
        });
      }

      setCases(enrichedCases);
      setTotal(count || 0);
    }

    setLoading(false);
  }, [supabase, statusFilter, sourceFilter, assignedFilter, search, page, activeStatFilter, sortField, sortAsc]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name");
      if (data) setAssignableUsers(data);
    }
    fetchUsers();
  }, [supabase]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
  }

  const totalPages = Math.ceil(total / limit);

  const handleStatClick = (type: string) => {
    setPage(0);
    setSearch("");
    setSourceFilter("");
    setAssignedFilter("all");
    if (type === "today" || type === "myCases" || type === "open") {
      setStatusFilter("");
      setActiveStatFilter(activeStatFilter === type ? null : type);
    } else {
      setActiveStatFilter(null);
      setStatusFilter(statusFilter === type ? "" : type);
    }
  };

  const statCards = [
    {
      title: "Açık Vakalar",
      value: stats.openCases,
      icon: FolderOpen,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      type: "open",
      active: activeStatFilter === "open",
    },
    {
      title: "Bugünkü Vakalar",
      value: stats.todayCases,
      icon: Clock,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
      type: "today",
      active: activeStatFilter === "today",
    },
    {
      title: "Kapanan Vakalar",
      value: stats.resolvedCases,
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/10",
      type: "closed",
      active: statusFilter === "closed",
    },
    {
      title: "Bana Atanan",
      value: stats.myCases,
      icon: AlertCircle,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
      type: "myCases",
      active: activeStatFilter === "myCases",
    },
  ];

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSourceFilter("");
    setAssignedFilter("all");
    setActiveStatFilter(null);
    setPage(0);
  };

  const hasActiveFilter = search || statusFilter || sourceFilter || assignedFilter !== "all" || activeStatFilter;

  function handleSort(field: string) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
    setPage(0);
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-zinc-600" />;
    return sortAsc ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />;
  }

  if (loadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Hoş geldiniz, genel duruma buradan ulaşabilirsiniz.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchCases()}
            className="p-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white transition-all"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            href="/cases/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg hover:shadow-indigo-600/30 transition-all"
          >
            <Plus className="h-4 w-4" />
            Yeni Vaka
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <button
            key={card.title}
            onClick={() => handleStatClick(card.type)}
            className={`glass rounded-2xl p-5 hover:glow-indigo transition-all text-left cursor-pointer ${
              card.active
                ? "ring-2 ring-indigo-500/50 bg-indigo-500/10"
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400 font-medium tracking-wide">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-zinc-100 mt-2">
                  {card.value}
                </p>
              </div>
              <div className={`${card.bg} p-3 rounded-xl`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4">
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Vaka ara... (başlık, müşteri, açıklama, marka, uygulama)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setActiveStatFilter(null);
              setPage(0);
            }}
            className="px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(CASE_STATUSES).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
          >
            <option value="">Tüm Kaynaklar</option>
            {Object.entries(CASE_SOURCES).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>

          <select
            value={assignedFilter}
            onChange={(e) => {
              setAssignedFilter(e.target.value);
              setActiveStatFilter(null);
              setPage(0);
            }}
            className="px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
          >
            <option value="all">Tüm Atamalar</option>
            <option value="none">Atanmamış</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>

          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-[#1e2e4a] text-white text-sm font-medium border border-[#2d446b]/50 hover:bg-[#233554] transition-all"
          >
            <Filter className="h-4 w-4" />
          </button>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium border border-red-500/30 hover:bg-red-500/20 transition-all"
            >
              <X className="h-4 w-4" />
              Temizle
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#233554]/60">
                <th onClick={() => handleSort("case_number")} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 transition-colors select-none">
                  <div className="flex items-center gap-1.5">Vaka No <SortIcon field="case_number" /></div>
                </th>
                <th onClick={() => handleSort("title")} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 transition-colors select-none">
                  <div className="flex items-center gap-1.5">Başlık <SortIcon field="title" /></div>
                </th>
                <th onClick={() => handleSort("source")} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 transition-colors select-none">
                  <div className="flex items-center gap-1.5">Kaynak <SortIcon field="source" /></div>
                </th>
                <th onClick={() => handleSort("status")} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 transition-colors select-none">
                  <div className="flex items-center gap-1.5">Durum <SortIcon field="status" /></div>
                </th>
                <th onClick={() => handleSort("priority")} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 transition-colors select-none">
                  <div className="flex items-center gap-1.5">Öncelik <SortIcon field="priority" /></div>
                </th>
                <th onClick={() => handleSort("brand")} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 transition-colors select-none">
                  <div className="flex items-center gap-1.5">Marka <SortIcon field="brand" /></div>
                </th>
                <th onClick={() => handleSort("assigned_to")} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 transition-colors select-none">
                  <div className="flex items-center gap-1.5">Atanan <SortIcon field="assigned_to" /></div>
                </th>
                <th onClick={() => handleSort("created_at")} className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider cursor-pointer hover:text-zinc-200 transition-colors select-none">
                  <div className="flex items-center gap-1.5">Tarih <SortIcon field="created_at" /></div>
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Geçen Süre
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-12 text-zinc-500"
                  >
                    Yükleniyor...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-12 text-zinc-500"
                  >
                    Vaka bulunamadı.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-[#233554]/30 table-row-hover transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${c.id}`}
                        className="text-sm font-mono text-indigo-400 hover:text-indigo-300"
                      >
                        VT-{new Date(c.created_at).getFullYear()}-
                        {String(c.case_number).padStart(4, "0")}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/cases/${c.id}`}
                        className="text-sm text-zinc-100 hover:text-indigo-400 transition-colors"
                      >
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {c.source === "customer" ? (
                          <Users className="h-3.5 w-3.5 text-zinc-500" />
                        ) : (
                          <Building className="h-3.5 w-3.5 text-zinc-500" />
                        )}
                        <span className="text-sm text-zinc-400">
                          {c.source === "customer"
                            ? c.customer_name || "Müşteri"
                            : "Internal"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={c.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-400">
                        {c.brands?.name || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.profiles_cases_assigned_to ? (
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            name={c.profiles_cases_assigned_to.full_name}
                            size="sm"
                          />
                          <span className="text-sm text-zinc-400">
                            {c.profiles_cases_assigned_to.full_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-500">
                          Atanmamış
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-500">
                        {new Date(c.created_at).toLocaleDateString("tr-TR")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-indigo-400 font-medium">
                        {c.status === "closed"
                          ? formatDistanceToNow(new Date(c.created_at), { addSuffix: false, locale: tr })
                          : formatDistanceToNow(new Date(c.created_at), { addSuffix: false, locale: tr })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#233554]/60">
            <p className="text-xs text-zinc-500">
              Toplam {total} kayıt | Sayfa {page + 1} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg bg-[#1e2e4a] text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg bg-[#1e2e4a] text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
