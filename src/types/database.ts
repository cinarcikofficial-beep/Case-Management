export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: "admin" | "manager" | "member";
          avatar_url: string | null;
          department: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: "admin" | "manager" | "member";
          avatar_url?: string | null;
          department?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: "admin" | "manager" | "member";
          avatar_url?: string | null;
          department?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      cases: {
        Row: {
          id: string;
          case_number: number;
          title: string;
          description: string | null;
          source: "customer" | "internal";
          status: "open" | "in_progress" | "closed";
          priority: "low" | "medium" | "high" | "urgent";
          brand_id: string | null;
          application_id: string | null;
          customer_id: string | null;
          customer_name: string | null;
          created_by: string;
          assigned_to: string | null;
          resolved_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_number?: number;
          title: string;
          description?: string | null;
          source: "customer" | "internal";
          status?: "open" | "in_progress" | "closed";
          priority?: "low" | "medium" | "high" | "urgent";
          brand_id?: string | null;
          application_id?: string | null;
          customer_id?: string | null;
          customer_name?: string | null;
          created_by: string;
          assigned_to?: string | null;
          resolved_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          case_number?: number;
          title?: string;
          description?: string | null;
          source?: "customer" | "internal";
          status?: "open" | "in_progress" | "closed";
          priority?: "low" | "medium" | "high" | "urgent";
          brand_id?: string | null;
          application_id?: string | null;
          customer_id?: string | null;
          customer_name?: string | null;
          created_by?: string;
          assigned_to?: string | null;
          resolved_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      brands: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          logo_url?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      applications: {
        Row: {
          id: string;
          name: string;
          brand_id: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          brand_id: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          brand_id?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      case_notes: {
        Row: {
          id: string;
          case_id: string;
          author_id: string;
          content: string;
          is_internal: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          author_id: string;
          content: string;
          is_internal?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          author_id?: string;
          content?: string;
          is_internal?: boolean;
          created_at?: string;
        };
      };
      case_history: {
        Row: {
          id: string;
          case_id: string;
          changed_by: string;
          field_name: string;
          old_value: string | null;
          new_value: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          changed_by: string;
          field_name: string;
          old_value?: string | null;
          new_value?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          changed_by?: string;
          field_name?: string;
          old_value?: string | null;
          new_value?: string | null;
          created_at?: string;
        };
      };
      case_status_log: {
        Row: {
          id: string;
          case_id: string;
          from_status: string | null;
          to_status: string;
          changed_by: string;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          from_status?: string | null;
          to_status: string;
          changed_by: string;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          from_status?: string | null;
          to_status?: string;
          changed_by?: string;
          duration_seconds?: number | null;
          created_at?: string;
        };
      };
      knowledge_base: {
        Row: {
          id: string;
          title: string;
          content: string;
          category: string;
          brand_id: string | null;
          application_id: string | null;
          author_id: string;
          tags: string[] | null;
          is_published: boolean;
          view_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          category: string;
          brand_id?: string | null;
          application_id?: string | null;
          author_id: string;
          tags?: string[] | null;
          is_published?: boolean;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          category?: string;
          brand_id?: string | null;
          application_id?: string | null;
          author_id?: string;
          tags?: string[] | null;
          is_published?: boolean;
          view_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          case_id: string;
          author_id: string;
          content: string;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          author_id: string;
          content: string;
          parent_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          author_id?: string;
          content?: string;
          parent_id?: string | null;
          created_at?: string;
        };
      };
      todos: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: "pending" | "in_progress" | "completed";
          priority: "low" | "medium" | "high" | "urgent";
          visibility: "personal" | "shared";
          due_date: string | null;
          reminder_date: string | null;
          repeat_type: "none" | "daily" | "weekly" | "monthly" | "yearly";
          assigned_to: string | null;
          created_by: string;
          case_id: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: "pending" | "in_progress" | "completed";
          priority?: "low" | "medium" | "high" | "urgent";
          visibility?: "personal" | "shared";
          due_date?: string | null;
          reminder_date?: string | null;
          repeat_type?: "none" | "daily" | "weekly" | "monthly" | "yearly";
          assigned_to?: string | null;
          created_by: string;
          case_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: "pending" | "in_progress" | "completed";
          priority?: "low" | "medium" | "high" | "urgent";
          visibility?: "personal" | "shared";
          due_date?: string | null;
          reminder_date?: string | null;
          repeat_type?: "none" | "daily" | "weekly" | "monthly" | "yearly";
          assigned_to?: string | null;
          created_by?: string;
          case_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      todo_steps: {
        Row: {
          id: string;
          todo_id: string;
          title: string;
          is_completed: boolean;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          todo_id: string;
          title: string;
          is_completed?: boolean;
          order_index?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          todo_id?: string;
          title?: string;
          is_completed?: boolean;
          order_index?: number;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
