import { NextRequest, NextResponse } from "next/server";

const GHL_API_KEY = process.env.GHL_API_KEY!;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID!;
const GHL_API_BASE = "https://services.leadconnectorhq.com";

export async function POST(request: NextRequest) {
  try {
    const { name, phone, email } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    // Split name into first and last
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Normalize phone number
    const normalizedPhone = phone ? phone.replace(/\D/g, "") : "";

    // Check if contact already exists by phone
    if (normalizedPhone) {
      const searchResponse = await fetch(
        `${GHL_API_BASE}/contacts/search/duplicate?locationId=${GHL_LOCATION_ID}&phone=${normalizedPhone}`,
        {
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`,
            Version: "2021-07-28",
          },
        }
      );

      const searchResult = await searchResponse.json();

      if (searchResult.contacts && searchResult.contacts.length > 0) {
        // Contact exists, return existing ID
        const existingContact = searchResult.contacts[0];
        console.log("[create-ghl-contact] Found existing contact:", existingContact.id);
        return NextResponse.json({
          success: true,
          contactId: existingContact.id,
          existing: true,
        });
      }
    }

    // Create new contact
    const createResponse = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        firstName,
        lastName,
        phone: normalizedPhone,
        email: email || undefined,
        tags: ["Claims Contact"],
        source: "Claims App",
      }),
    });

    const createResult = await createResponse.json();

    if (!createResponse.ok) {
      console.error("[create-ghl-contact] Failed to create:", createResult);
      return NextResponse.json(
        { success: false, error: "Failed to create GHL contact" },
        { status: 500 }
      );
    }

    const contactId = createResult.contact?.id || createResult.id;
    console.log("[create-ghl-contact] Created new contact:", contactId);

    return NextResponse.json({
      success: true,
      contactId,
      existing: false,
    });
  } catch (error) {
    console.error("[create-ghl-contact] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
