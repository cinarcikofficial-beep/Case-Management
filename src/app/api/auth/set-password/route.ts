import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-posta ve şifre gereklidir." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalıdır." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (!existingProfile) {
      const { data: newUser, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: email.split("@")[0] },
        });

      if (createError) {
        console.error("Create user error:", createError);
        return NextResponse.json(
          { error: "Kullanıcı oluşturulamadı.", detail: createError.message },
          { status: 500 }
        );
      }

      await admin.from("profiles").insert({
        id: newUser.user.id,
        email,
        full_name: email.split("@")[0],
        role: "member",
      });
    } else {
      const { error: updateError } = await admin.auth.admin.updateUserById(
        existingProfile.id,
        { password }
      );

      if (updateError) {
        console.error("Update password error:", updateError);
        return NextResponse.json(
          { error: "Şifre güncellenemedi.", detail: updateError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Set password error:", error);
    return NextResponse.json(
      { error: "İşlem başarısız." },
      { status: 500 }
    );
  }
}
