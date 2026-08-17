import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendVerificationCode } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email, type } = await req.json();

    if (!email || !email.endsWith("@verytech.com.tr")) {
      return NextResponse.json(
        { error: "Sadece @verytech.com.tr adresleriyle giriş yapabilirsiniz." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (type === "register" && existingProfile) {
      return NextResponse.json(
        {
          error:
            "Bu e-posta ile kayıtlı bir hesap var. Şifrenizi sıfırlamak için 'Şifremi Unuttum' bağlantısını kullanın.",
        },
        { status: 400 }
      );
    }

    if (type === "reset" && !existingProfile) {
      return NextResponse.json(
        {
          error:
            "Bu e-posta ile kayıtlı bir hesap bulunamadı. Önce 'Kayıt Ol' ile hesap oluşturun.",
        },
        { status: 400 }
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const { error: insertError } = await admin
      .from("verification_codes")
      .insert({
        email,
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Kod kaydedilemedi.", detail: insertError.message },
        { status: 500 }
      );
    }

    await sendVerificationCode(email, code);

    return NextResponse.json({ success: true, code });
  } catch (error) {
    console.error("Send code error:", error);
    return NextResponse.json(
      { error: "Doğrulama kodu gönderilemedi." },
      { status: 500 }
    );
  }
}
