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

  const url = new URL(request.url);
  const testEmail = url.searchParams.get("test");

  const { data: cases, error } = await supabase
    .from("cases")
    .select("case_number, title, status, priority, source, customer_name, created_at, assigned_to, profiles_cases_assigned_to:assigned_to(full_name, email)")
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!cases || cases.length === 0) return NextResponse.json({ message: "No open cases" });

  const platformUrl = "https://case-management-zeta.vercel.app";
  const today = new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Dashboard ile birebir aynı renkler
  const sOpen = { bg: "#1e3a5f", text: "#60a5fa", border: "#2563eb" };
  const sProgress = { bg: "#431407", text: "#fb923c", border: "#ea580c" };
  const pLow = { bg: "#18181b", text: "#a1a1aa", border: "#3f3f46" };
  const pMedium = { bg: "#1e3a5f", text: "#60a5fa", border: "#2563eb" };
  const pHigh = { bg: "#431407", text: "#fb923c", border: "#ea580c" };
  const pUrgent = { bg: "#450a0a", text: "#f87171", border: "#dc2626" };

  const statusStyles: Record<string, { bg: string; text: string; border: string }> = { open: sOpen, in_progress: sProgress };
  const priorityStyles: Record<string, { bg: string; text: string; border: string }> = { low: pLow, medium: pMedium, high: pHigh, urgent: pUrgent };
  const statusLabel: Record<string, string> = { open: "Açık", in_progress: "İşleniyor" };
  const priorityLabel: Record<string, string> = { low: "Düşük", medium: "Orta", high: "Yüksek", urgent: "Acil" };

  const rows = cases.map((c) => {
    const profile = c.profiles_cases_assigned_to as unknown as { full_name: string } | null;
    const year = new Date(c.created_at).getFullYear();
    const num = String(c.case_number).padStart(4, "0");
    const sc = statusStyles[c.status] || sOpen;
    const pc = priorityStyles[c.priority] || pLow;

    return `<tr>
      <td style="padding:10px 14px;border-bottom:1px solid #233554;font-family:'Courier New',Consolas,monospace;font-size:12px;color:#818cf8;font-weight:700;">VT-${year}-${num}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #233554;font-size:13px;color:#e2e8f0;">${c.title}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #233554;"><span style="background:${sc.bg};color:${sc.text};padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid ${sc.border};display:inline-block;">● ${statusLabel[c.status] || c.status}</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid #233554;"><span style="background:${pc.bg};color:${pc.text};padding:3px 10px;border-radius:6px;font-size:11px;font-weight:600;border:1px solid ${pc.border};display:inline-block;">${priorityLabel[c.priority] || c.priority}</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid #233554;font-size:13px;color:${profile ? "#e2e8f0" : "#475569"};">${profile?.full_name || "Atanmamış"}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f172a;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="780" cellspacing="0" cellpadding="0" style="background:#0f172a;border-radius:12px;overflow:hidden;border:1px solid #233554;">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 36px;">
      <table width="100%" cellspacing="0" cellpadding="0"><tr>
        <td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Verytech Case Management</h1>
        <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:4px 0 0;">Günlük Vaka Raporu</p></td>
        <td align="right" valign="middle"><div style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:10px 18px;"><span style="color:rgba(255,255,255,0.6);font-size:10px;display:block;text-transform:uppercase;letter-spacing:1px;">Aktif Vaka</span><span style="color:#fff;font-size:28px;font-weight:800;display:block;">${cases.length}</span></div></td>
      </tr></table>
    </td>
  </tr>

  <!-- Info Bar -->
  <tr>
    <td style="padding:12px 36px;background:#0b111e;border-bottom:1px solid #233554;">
      <table width="100%" cellspacing="0" cellpadding="0"><tr>
        <td><span style="color:#64748b;font-size:12px;">${today}</span></td>
        <td align="right"><span style="color:#475569;font-size:11px;">Açık & İşleniyor durumundaki vakalar</span></td>
      </tr></table>
    </td>
  </tr>

  <!-- Table -->
  <tr>
    <td style="padding:0 36px;background:#0f172a;">
      <table width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border-collapse:collapse;">
        <thead>
          <tr style="background:#0b111e;">
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:1px solid #233554;">Vaka No</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:1px solid #233554;">Başlık</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:1px solid #233554;">Durum</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:1px solid #233554;">Öncelik</th>
            <th style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:1px solid #233554;">Atanan</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:28px 36px;background:#0f172a;text-align:center;">
      <a href="${platformUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:12px 36px;border-radius:8px;font-size:14px;font-weight:600;">Tüm Case'lere Ulaşmak İçin Tıklayın →</a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:16px 36px;background:#0b111e;border-top:1px solid #233554;">
      <table width="100%" cellspacing="0" cellpadding="0"><tr>
        <td><span style="color:#475569;font-size:11px;">Verytech Case Management tarafından otomatik gönderilmiştir. Her gün 09:00'da teslim edilir.</span></td>
        <td align="right"><a href="${platformUrl}" style="color:#818cf8;font-size:11px;text-decoration:none;font-weight:600;">case-management.vercel.app</a></td>
      </tr></table>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const recipients = testEmail ? [testEmail] : ["destek@verytech.com.tr", "kerim.kaplan@verytech.com.tr"];

  await transporter.sendMail({
    from: `"Verytech Case Management" <${process.env.GMAIL_USER}>`,
    to: recipients,
    subject: testEmail
      ? `[TEST] Verytech Günlük Vaka Raporu - ${new Date().toLocaleDateString("tr-TR")}`
      : `[Verytech] Günlük Vaka Raporu - ${new Date().toLocaleDateString("tr-TR")}`,
    html,
  });

  return NextResponse.json({ message: "Report sent", count: cases.length, to: recipients });
}
