import { NextResponse } from "next/server";

// Cache the exchange rate for 1 hour
let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function GET() {
  try {
    // Return cached rate if still valid
    if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_DURATION) {
      return NextResponse.json({ rate: cachedRate.rate, cached: true });
    }

    // Fetch from exchangerate-api.com (free tier, no API key required)
    const response = await fetch(
      "https://open.er-api.com/v6/latest/CNY",
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; GCOffice/1.0)",
        },
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch exchange rate");
    }

    const data = await response.json();
    const thbRate = data.rates?.THB;

    if (!thbRate) {
      throw new Error("THB rate not found in response");
    }

    // Cache the rate
    cachedRate = { rate: thbRate, timestamp: Date.now() };

    return NextResponse.json({ rate: thbRate, cached: false });
  } catch (error) {
    console.error("Exchange rate fetch error:", error);

    // Return cached rate if available, even if expired
    if (cachedRate) {
      return NextResponse.json({
        rate: cachedRate.rate,
        cached: true,
        stale: true,
      });
    }

    // Fallback rate if everything fails (approximate rate)
    return NextResponse.json({
      rate: 4.8,
      cached: false,
      fallback: true,
    });
  }
}
