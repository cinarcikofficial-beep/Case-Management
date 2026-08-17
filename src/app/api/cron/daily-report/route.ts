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

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!cases || cases.length === 0) {
    return NextResponse.json({ message: "No open cases found" });
  }

  const statusMap: Record<string, string> = { open: "Açık", in_progress: "İşleniyor" };
  const priorityMap: Record<string, string> = { low: "Düşük", medium: "Orta", high: "Yüksek", urgent: "Acil" };
  const statusColor: Record<string, string> = { open: "#3b82f6", in_progress: "#f59e0b" };
  const priorityColor: Record<string, string> = { low: "#22c55e", medium: "#eab308", high: "#f97316", urgent: "#ef4444" };

  const platformUrl = "https://case-management-zeta.vercel.app";
  const today = new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const rows = cases
    .map((c) => {
      const profile = c.profiles_cases_assigned_to as unknown as { full_name: string } | null;
      const year = new Date(c.created_at).getFullYear();
      const num = String(c.case_number).padStart(4, "0");
      const sc = statusColor[c.status] || "#6b7280";
      const pc = priorityColor[c.priority] || "#6b7280";

      return `<tr>
        <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-family:'Courier New',Consolas,monospace;font-size:12px;color:#6366f1;font-weight:700;white-space:nowrap;">VT-${year}-${num}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;">${c.title}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;text-align:center;"><span style="color:${sc};font-size:12px;font-weight:600;">${statusMap[c.status] || c.status}</span></td>
        <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;text-align:center;"><span style="color:${pc};font-size:12px;font-weight:600;">${priorityMap[c.priority] || c.priority}</span></td>
        <td style="padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:${profile ? "#1e293b" : "#94a3b8"};text-align:center;">${profile?.full_name || "—"}</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="780" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 36px;">
      <table width="100%" cellspacing="0" cellpadding="0"><tr>
        <td><h1 style="color:#fff;font-size:20px;margin:0;font-weight:700;">Verytech Case Management</h1>
        <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:4px 0 0;">Günlük Vaka Raporu</p></td>
        <td align="right" valign="middle"><div style="background:rgba(255,255,255,0.15);border-radius:10px;padding:10px 18px;"><span style="color:rgba(255,255,255,0.7);font-size:10px;display:block;text-transform:uppercase;letter-spacing:1px;">Aktif Vaka</span><span style="color:#fff;font-size:28px;font-weight:800;display:block;">${cases.length}</span></div></td>
      </tr></table>
    </td>
  </tr>

  <!-- Info Bar -->
  <tr>
    <td style="padding:14px 36px;background:#f8fafc;border-bottom:1px solid #e2e8f0;">
      <table width="100%" cellspacing="0" cellpadding="0"><tr>
        <td><span style="color:#64748b;font-size:12px;">${today}</span></td>
        <td align="right"><span style="color:#94a3b8;font-size:11px;">Açık & İşleniyor durumundaki vakalar</span></td>
      </tr></table>
    </td>
  </tr>

  <!-- Table -->
  <tr>
    <td style="padding:0 36px;">
      <table width="100%" cellspacing="0" cellpadding="0" style="margin-top:16px;border-collapse:collapse;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:2px solid #e2e8f0;">Vaka No</th>
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:2px solid #e2e8f0;">Başlık</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:2px solid #e2e8f0;">Durum</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:2px solid #e2e8f0;">Öncelik</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;border-bottom:2px solid #e2e8f0;">Atanan</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:28px 36px;text-align:center;">
      <a href="${platformUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:12px 36px;border-radius:8px;font-size:14px;font-weight:600;">Tüm Case'lere Ulaşmak İçin Tıklayın →</a>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:16px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;">
      <table width="100%" cellspacing="0" cellpadding="0"><tr>
        <td><span style="color:#94a3b8;font-size:11px;">Verytech Case Management tarafından otomatik gönderilmiştir. Her gün 09:00'da teslim edilir.</span></td>
        <td align="right"><a href="${platformUrl}" style="color:#6366f1;font-size:11px;text-decoration:none;font-weight:600;">case-management.vercel.app</a></td>
      </tr></table>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const recipients = testEmail
    ? [testEmail]
    : ["destek@verytech.com.tr", "kerim.kaplan@verytech.com.tr"];

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
