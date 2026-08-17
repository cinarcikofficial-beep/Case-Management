import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: codes, error: codesError } = await admin
      .from("verification_codes")
      .select("*")
      .limit(5);

    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, email")
      .limit(3);

    return NextResponse.json({
      verification_codes: {
        exists: !codesError,
        error: codesError?.message || null,
        count: codes?.length || 0,
        sample: codes?.slice(0, 2) || [],
      },
      profiles: {
        exists: !profilesError,
        error: profilesError?.message || null,
        count: profiles?.length || 0,
      },
      env: {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
