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
  const priorityColor: Record<string, string> = {
    urgent: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" },
    high: { bg: "#fff7ed", text: "#ea580c", border: "#fed7aa" },
    medium: { bg: "#fefce8", text: "#ca8a04", border: "#fef08a" },
    low: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  };
  const statusColor: Record<string, { bg: string; text: string; border: string }> = {
    open: { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
    in_progress: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  };

  const platformUrl = "https://case-management-zeta.vercel.app";
  const today = new Date().toLocaleDateString("tr-TR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const rows = cases
    .map((c, i) => {
      const profile = c.profiles_cases_assigned_to as unknown as { full_name: string } | null;
      const year = new Date(c.created_at).getFullYear();
      const num = String(c.case_number).padStart(4, "0");
      const bgColor = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      const sc = statusColor[c.status] || { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
      const pc = (priorityColor[c.priority] || { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" }) as { bg: string; text: string; border: string };

      return `
        <tr style="background:${bgColor};">
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-family:'Courier New',monospace;font-size:13px;color:#6366f1;font-weight:700;">VT-${year}-${num}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;font-weight:500;">${c.title}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
            <span style="background:${sc.bg};color:${sc.text};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid ${sc.border};display:inline-block;">${statusMap[c.status] || c.status}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
            <span style="background:${pc.bg};color:${pc.text};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid ${pc.border};display:inline-block;">${priorityMap[c.priority] || c.priority}</span>
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:13px;color:${profile ? "#1e293b" : "#94a3b8"};font-weight:${profile ? "500" : "400"};">${profile?.full_name || "Atanmamış"}</td>
        </tr>`;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;background:#ffffff;font-family:'Segoe UI',Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;">
        <tr>
          <td align="center" style="padding:40px 20px;">
            <table role="presentation" width="820" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08),0 4px 12px rgba(0,0,0,0.04);">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 50%,#a855f7 100%);padding:36px 44px;">
                  <table width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:800;letter-spacing:-0.3px;">Verytech Case Management</h1>
                        <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:6px 0 0;font-weight:400;">Günlük Vaka Raporu</p>
                      </td>
                      <td align="right" valign="top">
                        <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:12px 20px;display:inline-block;">
                          <p style="color:rgba(255,255,255,0.7);font-size:11px;margin:0;text-transform:uppercase;letter-spacing:1px;">Aktif Vaka</p>
                          <p style="color:#ffffff;font-size:32px;margin:2px 0 0;font-weight:800;">${cases.length}</p>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Date Bar -->
              <tr>
                <td style="background:#f8fafc;padding:16px 44px;border-bottom:1px solid #e2e8f0;">
                  <table width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <span style="color:#64748b;font-size:13px;">${today}</span>
                      </td>
                      <td align="right">
                        <span style="color:#94a3b8;font-size:12px;">Open & İşleniyor</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Table -->
              <tr>
                <td style="padding:0 44px;">
                  <table width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;">
                    <thead>
                      <tr>
                        <th style="padding:12px 16px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;border-bottom:2px solid #e2e8f0;background:#f8fafc;">Vaka No</th>
                        <th style="padding:12px 16px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;border-bottom:2px solid #e2e8f0;background:#f8fafc;">Başlık</th>
                        <th style="padding:12px 16px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;border-bottom:2px solid #e2e8f0;background:#f8fafc;">Durum</th>
                        <th style="padding:12px 16px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;border-bottom:2px solid #e2e8f0;background:#f8fafc;">Öncelik</th>
                        <th style="padding:12px 16px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.8px;font-weight:700;border-bottom:2px solid #e2e8f0;background:#f8fafc;">Atanan</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rows}
                    </tbody>
                  </table>
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="padding:36px 44px;text-align:center;">
                  <a href="${platformUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);color:#ffffff;text-decoration:none;padding:16px 44px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.2px;box-shadow:0 4px 14px rgba(79,70,229,0.35);">
                    Tüm Case'lere Ulaşmak İçin Tıklayın →
                  </a>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;padding:24px 44px;border-top:1px solid #e2e8f0;">
                  <table width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <p style="color:#94a3b8;font-size:12px;margin:0;">Bu otomatik rapor Verytech Case Management tarafından gönderilmiştir.</p>
                        <p style="color:#94a3b8;font-size:11px;margin:4px 0 0;">Her gün saat 09:00'da gönderilir.</p>
                      </td>
                      <td align="right">
                        <a href="${platformUrl}" style="color:#6366f1;font-size:12px;text-decoration:none;font-weight:600;">case-management.vercel.app</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>
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
