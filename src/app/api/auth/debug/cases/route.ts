import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: cases, error: casesError } = await admin
      .from("cases")
      .select("*, brands(name), profiles!inner(id, full_name)")
      .limit(10);

    const { data: brands, error: brandsError } = await admin
      .from("brands")
      .select("*");

    const { data: apps, error: appsError } = await admin
      .from("applications")
      .select("*");

    return NextResponse.json({
      cases: {
        count: cases?.length || 0,
        error: casesError?.message || null,
        data: cases?.slice(0, 5) || [],
      },
      brands: {
        count: brands?.length || 0,
        error: brandsError?.message || null,
        data: brands || [],
      },
      applications: {
        count: apps?.length || 0,
        error: appsError?.message || null,
        data: apps || [],
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
