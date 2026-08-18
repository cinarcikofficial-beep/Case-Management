"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit3,
  Calendar,
  User,
  RefreshCw,
  Bell,
  Repeat,
  Loader2,
  Save,
  X,
  ListChecks,
  Check,
  Globe,
  Lock,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { TODO_STATUSES, TODO_PRIORITIES, TODO_REPEAT_TYPES, TODO_VISIBILITY } from "@/lib/constants";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from "date-fns/locale";
import type { Tables, TablesInsert } from "@/types/database";
import { toast } from "sonner";

type TodoStep = Tables<"todo_steps">;

type Todo = Tables<"todos"> & {
  profiles_todos_assigned_to?: Pick<Tables<"profiles">, "full_name" | "email"> | null;
  profiles_todos_created_by?: Pick<Tables<"profiles">, "full_name" | "email"> | null;
  todo_steps?: TodoStep[];
};

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedTodoId, setExpandedTodoId] = useState<string | null>(null);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [addingStepTo, setAddingStepTo] = useState<string | null>(null);
  const [stepSaving, setStepSaving] = useState(false);
  const [deleteStepTarget, setDeleteStepTarget] = useState<{ id: string; todoId: string } | null>(null);
  const [newTodo, setNewTodo] = useState({
    title: "",
    description: "",
    priority: "medium" as const,
    visibility: "personal" as const,
    due_date: "",
    assigned_to: "",
    reminder_date: "",
    repeat_type: "none" as const,
  });
  const supabase = createClient();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem("todo_notified");
      if (saved) {
        const arr: string[] = JSON.parse(saved);
        arr.forEach((id) => notifiedRef.current.add(id));
      }
    } catch {}
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    function checkReminders() {
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      const now = new Date();
      const nowStr = toLocalISOString(now);
      let changed = false;

      todos.forEach((todo) => {
        if (!todo.reminder_date) return;
        if (todo.status === "completed") return;
        if (notifiedRef.current.has(todo.id)) return;

        const reminderStr = fromISODate(todo.reminder_date);

        if (reminderStr <= nowStr) {
          notifiedRef.current.add(todo.id);
          changed = true;
          new Notification("Hatırlatma", {
            body: todo.title,
            icon: "/favicon.ico",
          });
        }
      });

      if (changed) {
        localStorage.setItem("todo_notified", JSON.stringify([...notifiedRef.current]));
      }
    }

    checkReminders();
    const interval = setInterval(checkReminders, 15_000);
    return () => clearInterval(interval);
  }, [todos]);

  function fromISODate(iso: string | null): string {
    if (!iso) return "";
    return iso.replace("Z", "").split("+")[0].slice(0, 16);
  }

  function toISODate(localValue: string): string {
    return localValue + ":00";
  }

  function toLocalISOString(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  const fetchTodos = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    let query = supabase
      .from("todos")
      .select(
        `*,
         profiles_todos_assigned_to:profiles!todos_assigned_to_fkey(full_name, email),
         profiles_todos_created_by:profiles!todos_created_by_fkey(full_name, email),
         todo_steps(*)
        `
      );

    if (statusFilter) query = query.eq("status", statusFilter);
    if (priorityFilter) query = query.eq("priority", priorityFilter);
    if (visibilityFilter) query = query.eq("visibility", visibilityFilter);
    if (search) query = query.ilike("title", `%${search}%`);

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (!error && data) {
      const todosWithSteps = (data as Todo[]).map((todo) => ({
        ...todo,
        todo_steps: (todo.todo_steps || []).sort((a: TodoStep, b: TodoStep) => a.order_index - b.order_index),
      }));
      setTodos(todosWithSteps);
    }
    setLoading(false);
  }, [supabase, statusFilter, priorityFilter, visibilityFilter, search]);

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name");
      if (data) setUsers(data);
    }
    fetchUsers();
  }, [supabase]);

  async function handleAddTodo(e: React.FormEvent) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    try {
      const insertData: TablesInsert<"todos"> = {
        title: newTodo.title,
        description: newTodo.description || null,
        priority: newTodo.priority,
        visibility: newTodo.visibility,
        due_date: newTodo.due_date ? new Date(newTodo.due_date + "T00:00:00").toISOString() : null,
        assigned_to: newTodo.assigned_to || null,
        reminder_date: newTodo.reminder_date ? toISODate(newTodo.reminder_date) : null,
        repeat_type: newTodo.repeat_type,
        created_by: user.id,
      };

      const { error } = await supabase.from("todos").insert(insertData);
      if (error) throw error;

      toast.success("Görev başarıyla eklendi.");
      setShowAddModal(false);
      setNewTodo({ title: "", description: "", priority: "medium", visibility: "personal", due_date: "", assigned_to: "", reminder_date: "", repeat_type: "none" });
      fetchTodos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTodo) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("todos")
        .update({
          title: editingTodo.title,
          description: editingTodo.description,
          priority: editingTodo.priority,
          visibility: editingTodo.visibility,
          due_date: editingTodo.due_date,
          assigned_to: editingTodo.assigned_to,
          reminder_date: editingTodo.reminder_date,
          repeat_type: editingTodo.repeat_type,
        })
        .eq("id", editingTodo.id);

      if (error) throw error;

      toast.success("Görev başarıyla güncellendi.");
      setEditingTodo(null);
      fetchTodos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(todo: Todo) {
    setTogglingId(todo.id);
    let newStatus: "pending" | "in_progress" | "completed";
    let completedAt: string | null = null;

    if (todo.status === "pending") {
      newStatus = "in_progress";
    } else if (todo.status === "in_progress") {
      newStatus = "completed";
      completedAt = new Date().toISOString();
    } else {
      newStatus = "pending";
    }

    const { error } = await supabase
      .from("todos")
      .update({ status: newStatus, completed_at: completedAt })
      .eq("id", todo.id);

    if (error) {
      toast.error("Durum güncellenemedi.");
    } else {
      const labels = { pending: "Bekliyor", in_progress: "Devam Ediyor", completed: "Tamamlandı" };
      toast.success(`Durum "${labels[newStatus]}" olarak güncellendi.`);
      fetchTodos();
    }
    setTogglingId(null);
  }

  function handleDelete(id: string, title: string) {
    setDeleteTarget({ id, title });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const { error } = await supabase.from("todos").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Silinemedi: " + error.message);
    } else {
      toast.success(`"${deleteTarget.title}" görevi silindi.`);
      setTodos((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
  }

  async function handleAddStep(todoId: string) {
    if (!newStepTitle.trim()) return;

    setStepSaving(true);
    try {
      const { data: existingSteps } = await supabase
        .from("todo_steps")
        .select("order_index")
        .eq("todo_id", todoId)
        .order("order_index", { ascending: false })
        .limit(1);

      const nextOrder = existingSteps && existingSteps.length > 0
        ? existingSteps[0].order_index + 1
        : 0;

      const { error } = await supabase
        .from("todo_steps")
        .insert({
          todo_id: todoId,
          title: newStepTitle.trim(),
          order_index: nextOrder,
        });

      if (error) throw error;

      toast.success("Adım eklendi.");
      setNewStepTitle("");
      setAddingStepTo(null);
      fetchTodos();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setStepSaving(false);
    }
  }

  async function handleToggleStep(step: TodoStep) {
    const { error } = await supabase
      .from("todo_steps")
      .update({ is_completed: !step.is_completed })
      .eq("id", step.id);

    if (error) {
      toast.error("Adım güncellenemedi.");
    } else {
      const { data: allSteps } = await supabase
        .from("todo_steps")
        .select("is_completed")
        .eq("todo_id", step.todo_id);

      if (allSteps && allSteps.length > 0) {
        const allDone = allSteps.every((s) => s.is_completed);
        const newStatus = allDone ? "completed" : "in_progress";
        const completedAt = allDone ? new Date().toISOString() : null;

        await supabase
          .from("todos")
          .update({ status: newStatus, completed_at: completedAt })
          .eq("id", step.todo_id);

        if (allDone) {
          toast.success("Tüm adımlar tamamlandı! Görev tamamlandı sayılır.");
        }
      }
      fetchTodos();
    }
  }

  function handleDeleteStep(id: string, todoId: string) {
    setDeleteStepTarget({ id, todoId });
  }

  async function confirmDeleteStep() {
    if (!deleteStepTarget) return;

    const { error } = await supabase
      .from("todo_steps")
      .delete()
      .eq("id", deleteStepTarget.id);

    if (error) {
      toast.error("Adım silinemedi.");
    } else {
      toast.success("Adım silindi.");
      setDeleteStepTarget(null);
      fetchTodos();
    }
  }

  const filteredTodos = todos;

  function getStepProgress(todo: Todo) {
    const steps = todo.todo_steps || [];
    if (steps.length === 0) return null;
    const completed = steps.filter((s) => s.is_completed).length;
    return { completed, total: steps.length, percent: Math.round((completed / steps.length) * 100) };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">To Do List</h1>
          <p className="text-sm text-zinc-400 mt-1">Görevlerinizi buradan yönetebilirsiniz.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTodos()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#162238]/60 border border-[#233554]/60 text-zinc-400 hover:text-white hover:border-zinc-500/60 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg hover:shadow-indigo-600/30 transition-all"
          >
            <Plus className="h-4 w-4" />
            Yeni Görev
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Görev ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all placeholder-zinc-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
          >
            <option value="">Tüm Durumlar</option>
            {Object.entries(TODO_STATUSES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
          >
            <option value="">Tüm Öncelikler</option>
            {Object.entries(TODO_PRIORITIES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
          >
            <option value="">Tüm Görünürlük</option>
            {Object.entries(TODO_VISIBILITY).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <button onClick={() => setStatusFilter(statusFilter === "pending" ? "" : "pending")} className={`glass rounded-2xl p-4 transition-all cursor-pointer text-left ${statusFilter === "pending" ? "ring-2 ring-zinc-400/50 bg-zinc-500/10" : "hover:glow-indigo"}`}>
          <div className="flex items-center gap-3">
            <div className="bg-zinc-500/10 p-2 rounded-xl">
              <AlertCircle className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Bekliyor</p>
              <p className="text-xl font-bold text-zinc-100">{todos.filter(t => t.status === "pending").length}</p>
            </div>
          </div>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === "in_progress" ? "" : "in_progress")} className={`glass rounded-2xl p-4 transition-all cursor-pointer text-left ${statusFilter === "in_progress" ? "ring-2 ring-blue-400/50 bg-blue-500/10" : "hover:glow-indigo"}`}>
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-xl">
              <Clock className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Devam Ediyor</p>
              <p className="text-xl font-bold text-zinc-100">{todos.filter(t => t.status === "in_progress").length}</p>
            </div>
          </div>
        </button>
        <button onClick={() => setStatusFilter(statusFilter === "completed" ? "" : "completed")} className={`glass rounded-2xl p-4 transition-all cursor-pointer text-left ${statusFilter === "completed" ? "ring-2 ring-green-400/50 bg-green-500/10" : "hover:glow-indigo"}`}>
          <div className="flex items-center gap-3">
            <div className="bg-green-500/10 p-2 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Tamamlandı</p>
              <p className="text-xl font-bold text-zinc-100">{todos.filter(t => t.status === "completed").length}</p>
            </div>
          </div>
        </button>
        <button onClick={() => { setStatusFilter(""); setPriorityFilter(""); setVisibilityFilter(""); setSearch(""); }} className="glass rounded-2xl p-4 transition-all cursor-pointer text-left hover:glow-indigo">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/10 p-2 rounded-xl">
              <Calendar className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-400">Gecikenler</p>
              <p className="text-xl font-bold text-zinc-100">
                {todos.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed").length}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Todo List */}
      <div className="glass rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-zinc-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Yükleniyor...
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">Görev bulunamadı.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#233554]/30">
            {filteredTodos.map((todo) => {
              const progress = getStepProgress(todo);
              const isExpanded = expandedTodoId === todo.id;

              return (
                <div key={todo.id} className={`transition-all ${todo.status === "completed" ? "bg-green-500/[0.02]" : ""}`}>
                  <div
                    className={`flex items-center gap-4 px-4 py-3 transition-all group ${
                      todo.status === "completed"
                        ? "hover:bg-green-500/[0.05]"
                        : "hover:bg-[#162238]/30"
                    }`}
                  >
                    {/* Expand Toggle */}
                    <button
                      onClick={() => setExpandedTodoId(isExpanded ? null : todo.id)}
                      className="flex-shrink-0 p-1 text-zinc-600 hover:text-zinc-400 transition-all"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    {/* Status Toggle */}
                    <button
                      onClick={() => handleToggleStatus(todo)}
                      disabled={togglingId === todo.id}
                      className="flex-shrink-0 transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                    >
                      {togglingId === todo.id ? (
                        <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
                      ) : todo.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.3)]" />
                      ) : todo.status === "in_progress" ? (
                        <Clock className="h-5 w-5 text-blue-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.3)]" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-zinc-600 hover:border-indigo-400 hover:shadow-[0_0_8px_rgba(129,140,248,0.3)] transition-all" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-medium transition-all ${
                          todo.status === "completed"
                            ? "text-zinc-500 line-through decoration-zinc-600"
                            : "text-zinc-100 group-hover:text-white"
                        }`}>
                          {todo.title}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${TODO_PRIORITIES[todo.priority]?.color} ${
                          todo.priority === "urgent" ? "animate-pulse" : ""
                        }`}>
                          {TODO_PRIORITIES[todo.priority]?.label}
                        </span>
                        {todo.visibility === "shared" ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Paylaşımlı
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-500 border border-zinc-500/30 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Kişisel
                          </span>
                        )}
                      </div>
                      {todo.description && (
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {progress && (
                          <span className={`text-xs flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${
                            progress.completed === progress.total
                              ? "text-green-400 bg-green-500/10 border border-green-500/20"
                              : "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                          }`}>
                            <ListChecks className="h-3 w-3" />
                            {progress.completed}/{progress.total} adım
                            <div className="w-12 h-1.5 bg-zinc-700 rounded-full overflow-hidden ml-1">
                              <div
                                className={`h-full rounded-full transition-all ${progress.completed === progress.total ? "bg-green-400" : "bg-blue-400"}`}
                                style={{ width: `${progress.percent}%` }}
                              />
                            </div>
                          </span>
                        )}
                        {todo.due_date && (
                          <span className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-lg ${
                            new Date(todo.due_date) < new Date() && todo.status !== "completed"
                              ? "text-red-400 bg-red-500/10 border border-red-500/20"
                              : "text-zinc-500 bg-zinc-500/5"
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {format(new Date(todo.due_date), "d MMM yyyy", { locale: tr })}
                          </span>
                        )}
                        {todo.reminder_date && (
                          <span className="text-xs text-amber-400 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <Bell className="h-3 w-3" />
                            {format(new Date(todo.reminder_date), "d MMM HH:mm", { locale: tr })}
                          </span>
                        )}
                        {todo.repeat_type && todo.repeat_type !== "none" && (
                          <span className="text-xs text-purple-400 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
                            <Repeat className="h-3 w-3" />
                            {TODO_REPEAT_TYPES[todo.repeat_type]?.label}
                          </span>
                        )}
                        {todo.profiles_todos_assigned_to && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-500/5">
                            <User className="h-3 w-3" />
                            {todo.profiles_todos_assigned_to.full_name}
                          </span>
                        )}
                        <span className="text-xs text-zinc-600">
                          {formatDistanceToNow(new Date(todo.created_at), { addSuffix: true, locale: tr })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingTodo(todo)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-[#233554]/60 transition-all"
                        title="Düzenle"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(todo.id, todo.title)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Steps Section */}
                  {isExpanded && (
                    <div className="px-4 pb-4 ml-10 space-y-2">
                      {/* Steps List */}
                      {todo.todo_steps && todo.todo_steps.length > 0 && (
                        <div className="space-y-1">
                          {todo.todo_steps.map((step) => (
                            <div
                              key={step.id}
                              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#0b111e]/40 hover:bg-[#0b111e]/60 transition-all group/step"
                            >
                              <button
                                onClick={() => handleToggleStep(step)}
                                className="flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
                              >
                                {step.is_completed ? (
                                  <Check className="h-4 w-4 text-green-400" />
                                ) : (
                                  <div className="h-4 w-4 rounded border border-zinc-600 hover:border-indigo-400 transition-all" />
                                )}
                              </button>
                              <span className={`text-sm flex-1 ${
                                step.is_completed
                                  ? "text-zinc-500 line-through decoration-zinc-600"
                                  : "text-zinc-300"
                              }`}>
                                {step.title}
                              </span>
                              <button
                                onClick={() => handleDeleteStep(step.id, todo.id)}
                                className="p-1 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/step:opacity-100 transition-all"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Step */}
                      {addingStepTo === todo.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newStepTitle}
                            onChange={(e) => setNewStepTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddStep(todo.id);
                              if (e.key === "Escape") { setAddingStepTo(null); setNewStepTitle(""); }
                            }}
                            placeholder="Adım başlığı..."
                            autoFocus
                            className="flex-1 px-3 py-2 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 transition-all"
                          />
                          <button
                            onClick={() => handleAddStep(todo.id)}
                            disabled={stepSaving || !newStepTitle.trim()}
                            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all"
                          >
                            {stepSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => { setAddingStepTo(null); setNewStepTitle(""); }}
                            className="p-2 rounded-xl bg-[#1e2e4a] text-zinc-400 hover:text-white transition-all"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingStepTo(todo.id)}
                          className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 transition-all"
                        >
                          <Plus className="h-3 w-3" />
                          Adım Ekle
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Görevi Sil"
        message={`"${deleteTarget?.title}" görevini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        confirmLabel="Sil"
        cancelLabel="İptal"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Delete Step Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteStepTarget}
        title="Adımı Sil"
        message="Bu adımı silmek istediğinize emin misiniz?"
        confirmLabel="Sil"
        cancelLabel="İptal"
        danger
        onConfirm={confirmDeleteStep}
        onCancel={() => setDeleteStepTarget(null)}
      />

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !saving && setShowAddModal(false)}>
          <div className="bg-[#0f172a] border border-[#233554]/60 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-100">Yeni Görev Ekle</h2>
              <button
                onClick={() => !saving && setShowAddModal(false)}
                disabled={saving}
                className="p-1 rounded-lg hover:bg-[#162238]/80 text-zinc-500 hover:text-white transition-all disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddTodo} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-medium">Başlık *</label>
                <input
                  type="text"
                  required
                  value={newTodo.title}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                  placeholder="Görev başlığı"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium">Açıklama</label>
                <textarea
                  value={newTodo.description}
                  onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 resize-none"
                  rows={3}
                  placeholder="Görev açıklaması"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Öncelik</label>
                  <select
                    value={newTodo.priority}
                    onChange={(e) => setNewTodo({ ...newTodo, priority: e.target.value as typeof newTodo.priority })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                  >
                    {Object.entries(TODO_PRIORITIES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Görünürlük</label>
                  <select
                    value={newTodo.visibility}
                    onChange={(e) => setNewTodo({ ...newTodo, visibility: e.target.value as typeof newTodo.visibility })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                  >
                    {Object.entries(TODO_VISIBILITY).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={newTodo.due_date}
                    onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                    <Bell className="h-3 w-3" /> Anımsatma
                  </label>
                  <input
                    type="datetime-local"
                    value={newTodo.reminder_date}
                    onChange={(e) => setNewTodo({ ...newTodo, reminder_date: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                    <Repeat className="h-3 w-3" /> Yenileme
                  </label>
                  <select
                    value={newTodo.repeat_type}
                    onChange={(e) => setNewTodo({ ...newTodo, repeat_type: e.target.value as typeof newTodo.repeat_type })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                  >
                    {Object.entries(TODO_REPEAT_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium">Atanan Kişi</label>
                <select
                  value={newTodo.assigned_to}
                  onChange={(e) => setNewTodo({ ...newTodo, assigned_to: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                >
                  <option value="">Atanmamış</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-[#1e2e4a] text-zinc-400 text-sm font-medium border border-[#2d446b]/50 hover:bg-[#233554] transition-all disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Ekleniyor..." : "Ekle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTodo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => !saving && setEditingTodo(null)}>
          <div className="bg-[#0f172a] border border-[#233554]/60 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-zinc-100">Görevi Düzenle</h2>
              <button
                onClick={() => !saving && setEditingTodo(null)}
                disabled={saving}
                className="p-1 rounded-lg hover:bg-[#162238]/80 text-zinc-500 hover:text-white transition-all disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleUpdateTodo} className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-medium">Başlık *</label>
                <input
                  type="text"
                  required
                  value={editingTodo.title}
                  onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium">Açıklama</label>
                <textarea
                  value={editingTodo.description || ""}
                  onChange={(e) => setEditingTodo({ ...editingTodo, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 resize-none"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Öncelik</label>
                  <select
                    value={editingTodo.priority}
                    onChange={(e) => setEditingTodo({ ...editingTodo, priority: e.target.value as typeof editingTodo.priority })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                  >
                    {Object.entries(TODO_PRIORITIES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Görünürlük</label>
                  <select
                    value={editingTodo.visibility}
                    onChange={(e) => setEditingTodo({ ...editingTodo, visibility: e.target.value as typeof editingTodo.visibility })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                  >
                    {Object.entries(TODO_VISIBILITY).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium">Bitiş Tarihi</label>
                  <input
                    type="date"
                    value={editingTodo.due_date ? editingTodo.due_date.split("T")[0] : ""}
                    onChange={(e) => setEditingTodo({ ...editingTodo, due_date: e.target.value ? new Date(e.target.value + "T00:00:00").toISOString() : null })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                    <Bell className="h-3 w-3" /> Anımsatma
                  </label>
                  <input
                    type="datetime-local"
                    value={fromISODate(editingTodo.reminder_date)}
                    onChange={(e) => setEditingTodo({ ...editingTodo, reminder_date: e.target.value ? toISODate(e.target.value) : null })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                    style={{ colorScheme: "dark" }}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 font-medium flex items-center gap-1.5">
                    <Repeat className="h-3 w-3" /> Yenileme
                  </label>
                  <select
                    value={editingTodo.repeat_type}
                    onChange={(e) => setEditingTodo({ ...editingTodo, repeat_type: e.target.value as typeof editingTodo.repeat_type })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                  >
                    {Object.entries(TODO_REPEAT_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium">Durum</label>
                <select
                  value={editingTodo.status}
                  onChange={(e) => setEditingTodo({ ...editingTodo, status: e.target.value as typeof editingTodo.status })}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                >
                  {Object.entries(TODO_STATUSES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 font-medium">Atanan Kişi</label>
                <select
                  value={editingTodo.assigned_to || ""}
                  onChange={(e) => setEditingTodo({ ...editingTodo, assigned_to: e.target.value || null })}
                  className="w-full mt-1 px-3 py-2.5 rounded-xl bg-[#0b111e]/60 border border-[#233554]/80 text-white text-sm focus:outline-none focus:border-indigo-500/80"
                >
                  <option value="">Atanmamış</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTodo(null)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-[#1e2e4a] text-zinc-400 text-sm font-medium border border-[#2d446b]/50 hover:bg-[#233554] transition-all disabled:opacity-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
