# Verytech Case Management & Knowledge Base - Opencode Prompt

## Proje Özeti

Verytech çalışanlarına özel, Supabase + Vercel üzerinde çalışan bir **Case Management** ve **Knowledge Base** web uygulaması geliştirilecek. Referans tasarım: https://crm-psi-rust.vercel.app/clients (koyu tema, indigo vurgular, glassmorphism efektleri).

---

## Teknoloji Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Backend/DB**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Deploy**: Vercel
- **Auth**: Supabase Auth (Email/Password + Gmail OTP doğrulama)
- **UI**: shadcn/ui bileşenleri, Lucide ikonları

---

## Tasarım Kuralları (Referans Portaldan)

```
Arka Plan: #0b111e (koyu lacivert)
Kartlar: #162238/60 (blur backdrop)
Border: #233554/60
Accent: Indigo-600 (#4f46e5)
Text: zinc-100 (başlık), zinc-400 (secondary)
Font: Geist Sans + Geist Mono
Border Radius: rounded-xl / rounded-2xl
Glassmorphism: backdrop-blur-md, border with opacity
Hover efektleri: scale(1.05), shadow glow
```

---

## Veritabanı Şeması (Supabase PostgreSQL)

### 1. profiles (Kullanıcılar)
```sql
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
```

### 2. cases (Destek Kayıtları)
```sql
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
  created_by UUID REFERENCES profiles(id) NOT NULL,
  assigned_to UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. brands (Markalar)
```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. applications (Uygulamalar)
```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. case_notes (Kronolojik Notlar)
```sql
CREATE TABLE case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. case_history (Değişiklik Geçmişi)
```sql
CREATE TABLE case_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  changed_by UUID REFERENCES profiles(id) NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 7. case_status_log (Durum Değişiklik Logları - Süre Takibi)
```sql
CREATE TABLE case_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 8. knowledge_base (Bilgi Bankası)
```sql
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
```

### 9. comments (Yorumlar)
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Sayfa Yapısı ve Rotalar

### `/` - Giriş/Kayıt Sayfası
- Verytech logosu, glassmorphism kart
- Tab ile Giriş Yap / Kayıt Ol geçişi
- Email + Şifre formu
- Sadece `@verytech.com.tr` domainli email kabul
- Kayıt sonrası Supabase Auth ile email doğrulama

### `/dashboard` - Ana Dashboard
- Sol sidebar: navigasyon menüsü
- Ana içerik: istatistik kartları
  - Açık vakalar / Çözülen vakalar / Ortalama çözüm süresi
  - Bugünkü yeni vakalar
  - Kişisel atanan vakalar
- Son aktiviteler feed'i
- Hızlı vaka oluşturma butonu

### `/cases` - Vaka Listesi
- Filtreleme: durum, kaynak, marka, uygulama, atanan, tarih aralığı
- Arama: vaka başlığı, numarası
- Tablo görünümü: vaka no, başlık, kaynak, durum, öncelik, marka, uygulama, atanan, oluşturulma tarihi
- Sıralama: tüm sütunlar için
- Toplu işlem: durum değiştirme, atama

### `/cases/new` - Yeni Vaka Oluşturma
- Form alanları:
  - **Kaynak**: Müşteri / Internal (radio button)
  - **Başlık**: text input
  - **Açıklama**: rich text editor (textarea)
  - **Marka**: select dropdown (brands tablosundan)
  - **Uygulama**: select dropdown (brand seçimine göre filtrelenir)
  - **Öncelik**: Düşük / Orta / Yüksek / Acil (radio button)
  - **Atama**: select dropdown (sistemdeki aktif üyeler)
- Oluşturan kişi otomatik `created_by` olarak atanır

### `/cases/[id]` - Vaka Detay
- **Üst Bilgi**: Vaka numarası, başlık, durum badge'i, öncelik badge'i
- **Sol Kolon**: Vaka bilgileri
  - Kaynak, marka, uygulama
  - Oluşturan kişi (avatar + isim)
  - Atanan kişi (değiştirilebilir)
  - Oluşturulma tarihi
  - Çözülme tarihi (varsa)
  - Geçen süre sayacı (hala devam ediyorsa canlı)
- **Sağ Kolon**: Aktivite akışı
  - Durum değişiklikleri
  - Notlar (kronolojik)
  - Atama değişiklikleri
  - Her işlem için zaman damgası + kullanıcı
- **Alt Kısım**: Not ekleme formu
  - Textarea + "Kaydet" butonu
  - Internal not checkbox'ı

### `/cases/[id]/edit` - Vaka Düzenleme
- Vaka oluşturma formu ile aynı, mevcut değerlerle dolu

### `/knowledge-base` - Bilgi Bankası
- Kart grid görünümü
- Filtreleme: kategori, marka, uygulama, etiketler
- Arama: başlık, içerik
- Yeni makale oluşturma butonu

### `/knowledge-base/[id]` - Makale Detay
- Başlık, içerik (markdown render), yazar, tarih
- Görüntülenme sayacı
- İlgili makaleler

### `/knowledge-base/new` - Yeni Makale
- Başlık, içerik (markdown editor), kategori, marka, uygulama, etiketler
- Yayınla/Taslak olarak kaydet

### `/settings` - Ayarlar
- Profil düzenleme
- Bildirim tercihleri

### `/admin` - Admin Paneli (sadece admin role)
- Kullanıcı yönetimi
- Marka/Uygulama yönetimi
- Sistem ayarları

---

## Supabase Auth Kurulumu

### Auth Provider: Email/Password + OTP
```typescript
// Supabase Auth config
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Kayıt
 signUp({
   email: 'user@verytech.com.tr',
   password: 'password',
   options: {
     data: {
       full_name: 'Ad Soyad',
       role: 'member'
     }
   }
 })

// Giriş
 signInWithPassword({
  email: 'user@verytech.com.tr',
  password: 'password'
})

// OTP ile giriş (opsiyonel)
signInWithOtp({
  email: 'user@verytech.com.tr'
})
```

### Row Level Security (RLS) Politikaları
```sql
-- Profil: sadece kendi profilini görebilir, admin her şeyi görebilir
-- Cases: tüm members görebilir, sadece kendi oluşturduklarını düzenleyebilir
-- Admin: tümünü düzenleyebilir
-- Knowledge Base: yayınlanmış herkes görebilir, draft'ları sadece yazar görebilir
-- Case Notes: vaka sahibi ve atanan kişi görebilir
```

---

## Supabase Realtime Entegrasyonu

```typescript
// Vaka değişikliklerini dinle
supabase
  .channel('cases')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, handleCaseChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'case_notes' }, handleNoteChange)
  .subscribe()
```

---

## Bileşen Yapısı

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Sidebar + Topbar layout
│   │   ├── page.tsx            # Dashboard ana sayfa
│   │   ├── cases/
│   │   │   ├── page.tsx        # Vaka listesi
│   │   │   ├── new/page.tsx    # Yeni vaka
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # Vaka detay
│   │   │       └── edit/page.tsx
│   │   ├── knowledge-base/
│   │   │   ├── page.tsx        # KB listesi
│   │   │   ├── new/page.tsx    # Yeni makale
│   │   │   └── [id]/page.tsx   # Makale detay
│   │   └── settings/page.tsx
│   ├── admin/
│   │   └── page.tsx
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Redirect to login
├── components/
│   ├── ui/                     # shadcn/ui bileşenleri
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── Topbar.tsx
│   ├── cases/
│   │   ├── CaseCard.tsx
│   │   ├── CaseForm.tsx
│   │   ├── CaseDetail.tsx
│   │   ├── CaseTimeline.tsx
│   │   ├── CaseFilters.tsx
│   │   └── CaseStats.tsx
│   ├── knowledge-base/
│   │   ├── ArticleCard.tsx
│   │   ├── ArticleForm.tsx
│   │   └── ArticleDetail.tsx
│   └── shared/
│       ├── StatusBadge.tsx
│       ├── PriorityBadge.tsx
│       └── UserAvatar.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── utils.ts
│   └── constants.ts
├── hooks/
│   ├── useCases.ts
│   ├── useRealtime.ts
│   └── useAuth.ts
└── types/
    └── database.ts             # Supabase generated types
```

---

## Önemli Fonksiyonlar

### Süre Hesaplama
```typescript
function calculateDuration(startDate: Date, endDate?: Date): string {
  const end = endDate || new Date()
  const diff = end.getTime() - startDate.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}sa ${minutes}dk`
}
```

### Durum Geçiş Matrisi
```
open → in_progress → waiting → resolved → closed
open → in_progress → resolved → closed
open → closed (hemen kapatma)
```

### Vaka Numarası Formatı
```
VT-{YYYY}-{XXXX}  (örn: VT-2026-0001)
```

---

## Deploy Adımları

1. `npx create-next-app@latest case-management --typescript --tailwind --app --src-dir`
2. `npx shadcn@latest init`
3. Supabase projesi oluştur
4. Yukarıdaki SQL şemalarını Supabase SQL Editor'da çalıştır
5. `.env.local` dosyasını oluştur
6. `vercel deploy` ile deploy et
7. Vercel environment variables'ları ayarla

### .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxxxx
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

---

## Uygulanacak Stillendirme Detayları

- **Login sayfası**: tam ortada glassmorphism kart, Verytech logosu üstte, tab geçişi (Giriş Yap / Kayıt Ol)
- **Sidebar**: koyu arka plan, aktif menü item'ı indigo arka plan
- **Tablolar**: koyu arka plan, hover'da hafif parlama, stripe pattern
- **Badge'ler**: durum ve öncelik renk kodları
  - Open: mavi, In Progress: turuncu, Waiting: sarı, Resolved: yeşil, Closed: gri
  - Low: gri, Medium: mavi, High: turuncu, Urgent: kırmızı
- **Formlar**: koyu input alanları, indigo focus border, placeholder zinc-500
- **Butonlar**: indigo-600 arka plan, hover'da indigo-500, shadow glow efekti
- **Responsive**: mobilde sidebar collapse, tablolarda kart görünümü

---

## Extra Özellikler

1. **Bildirimler**: Yeni vaka atandığında, durum değiştiğinde real-time bildirim
2. **Dashboard Grafiği**: Haftalık/aylık vaka istatistikleri (Chart.js veya Recharts)
3. **PDF Export**: Vaka detayını PDF olarak dışa aktarma
4. **Etiket Sistemi**: Vakalara etiket ekleme
5. **Arama**: Global arama (vakalar + knowledge base)
6. **Dark/Light Theme**: Opシyonel, varsayılan dark
7. **Vaka Zamanlayıcı**: Vaka üzerinde geçen toplam süre sayacı (canlı)
