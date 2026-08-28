import { NextResponse } from "next/server";
import { getFxRates } from "@/lib/fx";

export async function GET() {
  try {
    const rates = await getFxRates("USD");
    return NextResponse.json(rates);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "FX unavailable" },
      { status: 502 }
    );
  }
}
