/**
 * app/api/quote/route.ts
 *
 * Next.js Route Handler — proxies quote requests to the CoW Protocol API.
 * Runs server-side, so there are no CORS issues with the CoW endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchQuote } from "@/lib/cow";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { network, sellSymbol, buySymbol, sellAmount } = body;

    if (!network || !sellSymbol || !buySymbol || !sellAmount) {
      return NextResponse.json(
        { error: "Missing required fields: network, sellSymbol, buySymbol, sellAmount" },
        { status: 400 }
      );
    }

    const result = await fetchQuote({ network, sellSymbol, buySymbol, sellAmount });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // CoW API errors often have useful text — surface them directly
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
