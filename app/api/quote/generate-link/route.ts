import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, lastName, baseUrl } = await request.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Normalize phone number and get last 4 digits
    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    const last4 = normalizedPhone.slice(-4);

    // Generate the quote URL
    const domain = baseUrl || process.env.NEXT_PUBLIC_QUOTE_DOMAIN || process.env.VERCEL_URL || "localhost:3000";
    const protocol = domain.includes("localhost") ? "http" : "https";
    const quoteUrl = `${protocol}://${domain}/quote/${last4}`;

    return NextResponse.json({
      success: true,
      quoteUrl,
      last4,
      message: `Share this link with ${lastName || "the customer"}: ${quoteUrl}`,
    });
  } catch (error) {
    console.error("Error generating quote link:", error);
    return NextResponse.json(
      { error: "Failed to generate quote link" },
      { status: 500 }
    );
  }
}
