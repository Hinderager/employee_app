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

    // Refresh the access token
    await oauth2Client.getAccessToken();

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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[log-to-sheets] Error:", errorMessage);

    // Check for common issues and provide helpful messages
    let userMessage = "Failed to log to Google Sheets";
    if (errorMessage.includes("API has not been used") || errorMessage.includes("is disabled")) {
      userMessage = "Google Sheets API not enabled. Enable it at: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview";
    } else if (errorMessage.includes("invalid_grant") || errorMessage.includes("Token has been expired")) {
      userMessage = "Google OAuth token expired. Re-authenticate with Google.";
    } else if (errorMessage.includes("PERMISSION_DENIED")) {
      userMessage = "Permission denied. Check that the Google account has access to the spreadsheet.";
    }

    return NextResponse.json(
      { success: false, error: userMessage, details: errorMessage },
      { status: 500 }
    );
  }
}
