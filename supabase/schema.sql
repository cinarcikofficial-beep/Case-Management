-- Verytech Case Management & Knowledge Base
-- Supabase PostgreSQL Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. PROFILES (Kullanıcılar)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member')),
  avatar_url TEXT,
  department TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. BRANDS (Markalar)
-- =============================================
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. APPLICATIONS (Uygulamalar)
-- =============================================
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. CUSTOMERS (Müşteriler)
-- =============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_customers_name_active ON customers(name, is_active) WHERE is_active = true;

-- =============================================
-- 5. CASES (Destek Kayıtları)
-- =============================================
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number SERIAL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL CHECK (source IN ('customer', 'internal')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  brand_id UUID REFERENCES brands(id),
  application_id UUID REFERENCES applications(id),
  customer_id UUID REFERENCES customers(id),
  customer_name TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. CASE_NOTES (Kronolojik Notlar)
-- =============================================
CREATE TABLE case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. CASE_HISTORY (Değişiklik Geçmişi)
-- =============================================
CREATE TABLE case_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  changed_by UUID REFERENCES profiles(id) NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 8. CASE_STATUS_LOG (Durum Değişiklik Logları - Süre Takibi)
-- =============================================
CREATE TABLE case_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 9. KNOWLEDGE_BASE (Bilgi Bankası)
-- =============================================
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id),
  application_id UUID REFERENCES applications(id),
  author_id UUID REFERENCES profiles(id) NOT NULL,
  tags TEXT[],
  is_published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 10. COMMENTS (Yorumlar)
-- =============================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 11. TODOS (Yapılacaklar)
-- =============================================
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  visibility TEXT NOT NULL DEFAULT 'personal' CHECK (visibility IN ('personal', 'shared')),
  due_date TIMESTAMPTZ,
  reminder_date TIMESTAMPTZ,
  repeat_type TEXT NOT NULL DEFAULT 'none' CHECK (repeat_type IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id) NOT NULL,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_todos_status ON todos(status);
CREATE INDEX idx_todos_assigned_to ON todos(assigned_to);
CREATE INDEX idx_todos_created_by ON todos(created_by);
CREATE INDEX idx_todos_due_date ON todos(due_date);
CREATE INDEX idx_todos_created_at ON todos(created_at DESC);
CREATE INDEX idx_todos_visibility ON todos(visibility);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos: Users can view own and assigned" ON todos FOR SELECT USING (
  (visibility = 'shared') OR
  (auth.uid() = created_by) OR
  (auth.uid() = assigned_to) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Todos: Users can create" ON todos FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Todos: Users can update own or assigned" ON todos FOR UPDATE USING (
  auth.uid() = created_by OR auth.uid() = assigned_to OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "Todos: Users can delete own" ON todos FOR DELETE USING (
  auth.uid() = created_by OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON todos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TODO_STEPS (Görev Alt Adımları)
-- =============================================
CREATE TABLE todo_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id UUID REFERENCES todos(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_todo_steps_todo_id ON todo_steps(todo_id);

ALTER TABLE todo_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todo Steps: Users can view" ON todo_steps FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_steps.todo_id
    AND (
      todos.visibility = 'shared' OR
      auth.uid() = todos.created_by OR
      auth.uid() = todos.assigned_to OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    )
  )
);
CREATE POLICY "Todo Steps: Users can create" ON todo_steps FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_steps.todo_id
    AND (
      auth.uid() = todos.created_by OR
      auth.uid() = todos.assigned_to OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    )
  )
);
CREATE POLICY "Todo Steps: Users can update" ON todo_steps FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_steps.todo_id
    AND (
      auth.uid() = todos.created_by OR
      auth.uid() = todos.assigned_to OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    )
  )
);
CREATE POLICY "Todo Steps: Users can delete" ON todo_steps FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM todos
    WHERE todos.id = todo_steps.todo_id
    AND (
      auth.uid() = todos.created_by OR
      auth.uid() = todos.assigned_to OR
      EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
    )
  )
);

-- =============================================
-- 12. VERIFICATION_CODES (E-posta Doğrulama Kodları)
-- =============================================
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_codes_email ON verification_codes(email);
CREATE INDEX idx_verification_codes_code ON verification_codes(code);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verification Codes: Service role only" ON verification_codes FOR ALL USING (true);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_created_by ON cases(created_by);
CREATE INDEX idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);
CREATE INDEX idx_case_notes_case_id ON case_notes(case_id);
CREATE INDEX idx_case_history_case_id ON case_history(case_id);
CREATE INDEX idx_case_status_log_case_id ON case_status_log(case_id);
CREATE INDEX idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX idx_knowledge_base_author ON knowledge_base(author_id);
CREATE INDEX idx_comments_case_id ON comments(case_id);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_status_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles, update only their own
CREATE POLICY "Profiles: Users can view all" ON profiles FOR SELECT USING (true);
CREATE POLICY "Profiles: Users can update own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles: Admin full access" ON profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Cases: All authenticated users can read, creators can update their own
CREATE POLICY "Cases: Users can view all" ON cases FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Cases: Users can create" ON cases FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Cases: Users can update own" ON cases FOR UPDATE USING (
  auth.uid() = created_by OR auth.uid() = assigned_to OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Brands: All can read, admin can manage
CREATE POLICY "Brands: Users can view" ON brands FOR SELECT USING (true);
CREATE POLICY "Brands: Admin manage" ON brands FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Applications: All can read, admin can manage
CREATE POLICY "Applications: Users can view" ON applications FOR SELECT USING (true);
CREATE POLICY "Applications: Admin manage" ON applications FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Customers: All can read, anyone can create, anyone can update, anyone can delete
CREATE POLICY "Customers: Users can view active" ON customers FOR SELECT USING (is_active = true);
CREATE POLICY "Customers: Users can create" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers: Users can update" ON customers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Customers: Users can delete" ON customers FOR DELETE USING (true);

-- Case Notes: Users can read notes on cases they have access to
CREATE POLICY "Case Notes: Users can view" ON case_notes FOR SELECT USING (true);
CREATE POLICY "Case Notes: Users can create" ON case_notes FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Case History: Read only for all
CREATE POLICY "Case History: Users can view" ON case_history FOR SELECT USING (true);
CREATE POLICY "Case History: System can insert" ON case_history FOR INSERT WITH CHECK (auth.uid() = changed_by);

-- Case Status Log: Read only for all
CREATE POLICY "Case Status Log: Users can view" ON case_status_log FOR SELECT USING (true);
CREATE POLICY "Case Status Log: System can insert" ON case_status_log FOR INSERT WITH CHECK (auth.uid() = changed_by);

-- Knowledge Base: Published for all, drafts only for author
CREATE POLICY "KB: Published for all" ON knowledge_base FOR SELECT USING (
  is_published = true OR auth.uid() = author_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);
CREATE POLICY "KB: Users can create" ON knowledge_base FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "KB: Users can update own" ON knowledge_base FOR UPDATE USING (
  auth.uid() = author_id OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
);

-- Comments: Users can read comments on cases they have access to
CREATE POLICY "Comments: Users can view" ON comments FOR SELECT USING (true);
CREATE POLICY "Comments: Users can create" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Vaka numarasını sıfırlama fonksiyonu (silinen vakadan sonra)
CREATE OR REPLACE FUNCTION reset_case_number_if_needed(p_case_number INT)
RETURNS VOID AS $$
DECLARE
  current_val INT;
  max_val INT;
BEGIN
  SELECT last_value INTO current_val FROM cases_case_number_seq;
  SELECT COALESCE(MAX(case_number), 0) INTO max_val FROM cases;
  IF p_case_number >= current_val THEN
    PERFORM setval('cases_case_number_seq', GREATEST(max_val, p_case_number - 1));
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
