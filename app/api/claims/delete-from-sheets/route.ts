import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

const SPREADSHEET_ID = "1JqnB9FJ_2iYdpNKfSLhmgiZw1iVXv-8P8uBeVcmv2zc";
const SHEET_NAME = "Sheet1";

export async function POST(request: NextRequest) {
  try {
    const { claimNumber } = await request.json();

    if (!claimNumber) {
      return NextResponse.json(
        { success: false, error: "Claim number is required" },
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

    // First, get the sheet ID (needed for delete requests)
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

    // Get all data from the sheet (columns B through F, starting from row 3)
    // New column layout: B=Status, C=Date, D=ClaimId, E=CustomerName, F=Amount
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B3:F`,
    });

    const rows = response.data.values || [];

    // Find row indices that match the claim number (column D is index 2 in this range)
    // Rows are 0-indexed in the array, but we need to add 3 to get the actual row number (header + offset)
    const rowsToDelete: number[] = [];
    rows.forEach((row, index) => {
      if (row[2] === claimNumber) {
        // Row number in sheet = index + 3 (since we start from row 3)
        rowsToDelete.push(index + 3);
      }
    });

    if (rowsToDelete.length === 0) {
      console.log("[delete-from-sheets] No rows found for claim:", claimNumber);
      return NextResponse.json({ success: true, rowsDeleted: 0 });
    }

    // Delete rows in reverse order (from bottom to top) to avoid index shifting
    rowsToDelete.sort((a, b) => b - a);

    const deleteRequests = rowsToDelete.map((rowNumber) => ({
      deleteDimension: {
        range: {
          sheetId: sheetId,
          dimension: "ROWS",
          startIndex: rowNumber - 1, // 0-indexed
          endIndex: rowNumber, // exclusive
        },
      },
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: deleteRequests,
      },
    });

    console.log("[delete-from-sheets] Deleted", rowsToDelete.length, "rows for claim:", claimNumber);

    return NextResponse.json({ success: true, rowsDeleted: rowsToDelete.length });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[delete-from-sheets] Error:", errorMessage);

    return NextResponse.json(
      { success: false, error: "Failed to delete from Google Sheets", details: errorMessage },
      { status: 500 }
    );
  }
}
