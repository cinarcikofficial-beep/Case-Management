import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: cases, error } = await supabase
    .from("cases")
    .select("case_number, title, status, priority, source, customer_name, created_at, assigned_to, profiles_cases_assigned_to:assigned_to(full_name, email)")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!cases || cases.length === 0) {
    return NextResponse.json({ message: "No open cases found" });
  }

  const statusMap: Record<string, string> = {
    open: "Açık",
    in_progress: "İşleniyor",
  };
  const priorityMap: Record<string, string> = {
    low: "Düşük",
    medium: "Orta",
    high: "Yüksek",
    urgent: "Acil",
  };

  const platformUrl = "https://case-management-zeta.vercel.app";
  const today = new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const rows = cases
    .map((c, i) => {
      const profile = c.profiles_cases_assigned_to as unknown as { full_name: string } | null;
      const year = new Date(c.created_at).getFullYear();
      const num = String(c.case_number).padStart(4, "0");
      const bgColor = i % 2 === 0 ? "#ffffff" : "#f9fafb";
      const priorityColor: Record<string, string> = { urgent: "#dc2626", high: "#f97316", medium: "#eab308", low: "#22c55e" };
      const statusColor: Record<string, string> = { open: "#3b82f6", in_progress: "#f59e0b" };
      return `
        <tr style="background:${bgColor};">
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-family:'Courier New',monospace;font-size:13px;color:#6366f1;font-weight:600;">VT-${year}-${num}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#1f2937;">${c.title}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:12px;">
            <span style="background:${statusColor[c.status] || "#6b7280"}22;color:${statusColor[c.status] || "#6b7280"};padding:3px 10px;border-radius:12px;font-weight:600;">${statusMap[c.status] || c.status}</span>
          </td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:12px;">
            <span style="background:${priorityColor[c.priority] || "#6b7280"}22;color:${priorityColor[c.priority] || "#6b7280"};padding:3px 10px;border-radius:12px;font-weight:600;">${priorityMap[c.priority] || c.priority}</span>
          </td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:${profile ? "#1f2937" : "#9ca3af"};">${profile?.full_name || "Atanmamış"}</td>
        </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:860px;margin:0 auto;padding:0;background:#f3f4f6;">
      <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;border-radius:16px 16px 0 0;">
        <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">Verytech Case Management</h1>
        <p style="color:#c7d2fe;font-size:14px;margin:6px 0 0;">Günlük Vaka Raporu</p>
      </div>
      <div style="background:#ffffff;padding:32px 40px;border-radius:0 0 16px 16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
          <div>
            <p style="color:#6b7280;font-size:13px;margin:0;">Rapor Tarihi</p>
            <p style="color:#1f2937;font-size:15px;margin:4px 0 0;font-weight:600;">${today}</p>
          </div>
          <div style="text-align:right;">
            <p style="color:#6b7280;font-size:13px;margin:0;">Toplam Aktif Vaka</p>
            <p style="color:#4f46e5;font-size:28px;margin:4px 0 0;font-weight:800;">${cases.length}</p>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-top:8px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:12px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Vaka No</th>
              <th style="padding:12px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Başlık</th>
              <th style="padding:12px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Durum</th>
              <th style="padding:12px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Öncelik</th>
              <th style="padding:12px 14px;text-align:left;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb;">Atanan</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div style="margin-top:32px;text-align:center;">
          <a href="${platformUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
            Platforma Git →
          </a>
        </div>

        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="color:#9ca3af;font-size:11px;margin:0;">Bu otomatik rapor Verytech Case Management tarafından gönderilmiştir.</p>
          <p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">Her gün saat 09:00'da gönderilir.</p>
        </div>
      </div>
    </div>`;

  await transporter.sendMail({
    from: `"Verytech Case Management" <${process.env.GMAIL_USER}>`,
    to: ["destek@verytech.com.tr", "kerim.kaplan@verytech.com.tr"],
    subject: `[Verytech] Günlük Vaka Raporu - ${new Date().toLocaleDateString("tr-TR")}`,
    html,
  });

  return NextResponse.json({ message: "Report sent", count: cases.length });
}
