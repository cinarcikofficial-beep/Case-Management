"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import type { Tables, TablesInsert, TablesUpdate } from "@/types/database";

type Todo = Tables<"todos"> & {
  profiles_todos_assigned_to?: Pick<Tables<"profiles">, "full_name" | "email"> | null;
  profiles_todos_created_by?: Pick<Tables<"profiles">, "full_name" | "email"> | null;
  todo_steps?: Tables<"todo_steps">[];
};

type TodoStep = Tables<"todo_steps">;

interface UseTodosOptions {
  status?: string;
  priority?: string;
  visibility?: string;
  assignedTo?: string;
  search?: string;
  showAll?: boolean;
}

export function useTodos(options: UseTodosOptions = {}) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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

    if (options.status) query = query.eq("status", options.status);
    if (options.priority) query = query.eq("priority", options.priority);
    if (options.visibility) query = query.eq("visibility", options.visibility);
    if (options.assignedTo) query = query.eq("assigned_to", options.assignedTo);
    if (options.search) {
      query = query.ilike("title", `%${options.search}%`);
    }

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
  }, [supabase, options.status, options.priority, options.visibility, options.assignedTo, options.search]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = async (todo: TablesInsert<"todos">) => {
    const { data, error } = await supabase
      .from("todos")
      .insert(todo)
      .select()
      .single();

    if (error) throw error;
    await fetchTodos();
    return data;
  };

  const updateTodo = async (id: string, updates: TablesUpdate<"todos">) => {
    const { error } = await supabase
      .from("todos")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    await fetchTodos();
  };

  const deleteTodo = async (id: string) => {
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", id);

    if (error) throw error;
    await fetchTodos();
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    let newStatus: "pending" | "in_progress" | "completed";
    let completedAt: string | null = null;

    if (currentStatus === "pending") {
      newStatus = "in_progress";
    } else if (currentStatus === "in_progress") {
      newStatus = "completed";
      completedAt = new Date().toISOString();
    } else {
      newStatus = "pending";
    }

    await updateTodo(id, { status: newStatus, completed_at: completedAt });
  };

  const addStep = async (todoId: string, title: string) => {
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
        title,
        order_index: nextOrder,
      });

    if (error) throw error;
    await fetchTodos();
  };

  const toggleStep = async (stepId: string, isCompleted: boolean) => {
    const { error } = await supabase
      .from("todo_steps")
      .update({ is_completed: !isCompleted })
      .eq("id", stepId);

    if (error) throw error;

    const { data: step } = await supabase
      .from("todo_steps")
      .select("todo_id")
      .eq("id", stepId)
      .single();

    if (step) {
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
      }
    }

    await fetchTodos();
  };

  const deleteStep = async (stepId: string) => {
    const { error } = await supabase
      .from("todo_steps")
      .delete()
      .eq("id", stepId);

    if (error) throw error;
    await fetchTodos();
  };

  const updateStep = async (stepId: string, title: string) => {
    const { error } = await supabase
      .from("todo_steps")
      .update({ title })
      .eq("id", stepId);

    if (error) throw error;
    await fetchTodos();
  };

  return {
    todos,
    loading,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleStatus,
    addStep,
    toggleStep,
    deleteStep,
    updateStep,
    refetch: fetchTodos,
  };
}
