import { NextRequest, NextResponse } from "next/server";

const GHL_API_KEY = process.env.GHL_API_KEY!;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID!;
const GHL_API_BASE = "https://services.leadconnectorhq.com";

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Normalize phone number
    const normalizedPhone = phone.replace(/\D/g, "");

    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number" },
        { status: 400 }
      );
    }

    // Search for contact by phone
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
      const contact = searchResult.contacts[0];
      console.log("[search-ghl-contact] Found contact:", contact.id, contact);

      // Build full address from GHL contact fields
      const addressParts = [
        contact.address1,
        contact.city,
        contact.state,
        contact.postalCode,
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ");

      return NextResponse.json({
        success: true,
        found: true,
        contactId: contact.id,
        contactName: `${contact.firstName || ""} ${contact.lastName || ""}`.trim(),
        email: contact.email || "",
        phone: contact.phone || "",
        address: fullAddress,
      });
    }

    // Contact not found
    console.log("[search-ghl-contact] No contact found for phone:", normalizedPhone);
    return NextResponse.json({
      success: true,
      found: false,
      contactId: null,
    });
  } catch (error) {
    console.error("[search-ghl-contact] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
