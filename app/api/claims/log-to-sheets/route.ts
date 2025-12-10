import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = "1JqnB9FJ_2iYdpNKfSLhmgiZw1iVXv-8P8uBeVcmv2zc";
const SHEET_NAME = "Sheet1";

export async function POST(request: NextRequest) {
  try {
    const { date, claimId, customerName, amountSpent } = await request.json();

    if (!date || !claimId || !customerName || amountSpent === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Set up Google Sheets API authentication using OAuth
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // Append row to sheet (columns B, C, D, E starting from row 3 since headers in row 2)
    // Column A is empty, B=Date, C=Claim ID, D=Customer Name, E=Amount Spent
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B3:E`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[date, claimId, customerName, amountSpent]],
      },
    });

    console.log("[log-to-sheets] Added row:", { date, claimId, customerName, amountSpent });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[log-to-sheets] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log to Google Sheets" },
      { status: 500 }
    );
  }
}
