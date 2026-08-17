export const SITE_CONFIG = {
  name: "Verytech Case Management",
  description: "Verytech Case Management & Knowledge Base",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
} as const;

export const APP_DOMAIN = "@verytech.com.tr";

export const CASE_STATUSES = {
  open: { label: "Açık", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  in_progress: { label: "İşleniyor", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  closed: { label: "Kapandı", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
} as const;

export const CASE_PRIORITIES = {
  low: { label: "Düşük", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  medium: { label: "Orta", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  high: { label: "Yüksek", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  urgent: { label: "Acil", color: "bg-red-500/20 text-red-400 border-red-500/30" },
} as const;

export const CASE_SOURCES = {
  customer: { label: "Müşteri", icon: "Users" as const },
  internal: { label: "Internal", icon: "Building" as const },
} as const;

export const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["in_progress", "closed"],
  in_progress: ["closed"],
  closed: ["open"],
};

export const KB_CATEGORIES = [
  "Genel",
  "Teknik",
  "Sıkça Sorulan Sorular",
  "Kılavuz",
  "Sorun Giderme",
  "Güncelleme",
] as const;

export const ROLES = {
  admin: { label: "Admin", description: "Tam erişim" },
  manager: { label: "Yönetici", description: "Yönetim erişimi" },
  member: { label: "Üye", description: "Standart erişim" },
} as const;
