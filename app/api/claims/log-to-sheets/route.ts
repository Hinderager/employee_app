import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = "1JqnB9FJ_2iYdpNKfSLhmgiZw1iVXv-8P8uBeVcmv2zc";
const SHEET_NAME = "Sheet1";

export async function POST(request: NextRequest) {
  try {
    const { date, claimId, customerName, amountSpent, updateId } = await request.json();

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

    // Get the sheet ID first
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheet = spreadsheet.data.sheets?.find(
      (s) => s.properties?.title === SHEET_NAME
    );
    const sheetId = sheet?.properties?.sheetId;

    if (sheetId === undefined) {
      return NextResponse.json(
        { success: false, error: "Sheet not found" },
        { status: 404 }
      );
    }

    // Insert a new row at row 3 (index 2, 0-based) to keep newest at top
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: 2, // Row 3 (0-indexed)
                endIndex: 3,
              },
              inheritFromBefore: false,
            },
          },
        ],
      },
    });

    // Now update the new row 3 with our data
    // Column layout: B=Status, C=Date, D=ClaimId, E=CustomerName, F=Amount
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B3:F3`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [["New", date, claimId, customerName, amountSpent]],
      },
    });

    // Add data validation dropdown for the Status cell (B3)
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            setDataValidation: {
              range: {
                sheetId: sheetId,
                startRowIndex: 2, // Row 3 (0-indexed)
                endRowIndex: 3,
                startColumnIndex: 1, // Column B (0-indexed)
                endColumnIndex: 2,
              },
              rule: {
                condition: {
                  type: "ONE_OF_LIST",
                  values: [
                    { userEnteredValue: "New" },
                    { userEnteredValue: "Done" },
                  ],
                },
                showCustomUi: true,
                strict: true,
              },
            },
          },
        ],
      },
    });

    console.log("[log-to-sheets] Inserted row at top:", {
      status: "New",
      date,
      claimId,
      customerName,
      amountSpent,
      updateId,
    });

    return NextResponse.json({ success: true, rowNumber: 3 });
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
