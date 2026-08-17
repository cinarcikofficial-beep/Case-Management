import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "E-posta ve kod gereklidir." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: allCodes, error: listError } = await admin
      .from("verification_codes")
      .select("*")
      .eq("email", email)
      .eq("code", code)
      .eq("used", false);

    if (listError) {
      console.error("List error:", listError);
      return NextResponse.json(
        { error: "Veritabanı sorgu hatası.", detail: listError.message },
        { status: 500 }
      );
    }

    if (!allCodes || allCodes.length === 0) {
      return NextResponse.json(
        { error: "Eşleşen kod bulunamadı." },
        { status: 400 }
      );
    }

    const verificationCode = allCodes[0];
    const now = new Date();
    const expiresAt = new Date(verificationCode.expires_at);

    if (expiresAt <= now) {
      return NextResponse.json(
        { error: "Kodun süresi dolmuş." },
        { status: 400 }
      );
    }

    await admin
      .from("verification_codes")
      .update({ used: true })
      .eq("id", verificationCode.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      { error: "Doğrulama başarısız." },
      { status: 500 }
    );
  }
}
