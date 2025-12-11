import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

const SPREADSHEET_ID = "1JqnB9FJ_2iYdpNKfSLhmgiZw1iVXv-8P8uBeVcmv2zc";
const SHEET_NAME = "Sheet1";

// Initialize Supabase client (Employee App Claims Supabase)
const supabase = createClient(
  process.env.EMPLOYEE_APP_CLAIMS_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.EMPLOYEE_APP_CLAIMS_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // Set up Google Sheets API authentication using OAuth
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    await oauth2Client.getAccessToken();
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    // Get the sheet metadata
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
    // B=Status, C=Date, D=ClaimId, E=CustomerName, F=Amount
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B3:F`,
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No rows to process",
        processed: 0,
        deleted: 0,
      });
    }

    // Find rows where Status (column B, index 0) is "Done"
    const rowsToDelete: number[] = [];
    const claimUpdatesToMark: { claimId: string; amount: number }[] = [];

    rows.forEach((row, index) => {
      const status = row[0]; // Column B - Status
      const claimId = row[2]; // Column D - ClaimId
      const amount = parseFloat(row[4]) || 0; // Column F - Amount

      if (status === "Done" && claimId) {
        // Row number in sheet = index + 3 (since we start from row 3)
        rowsToDelete.push(index + 3);
        claimUpdatesToMark.push({ claimId, amount });
      }
    });

    if (rowsToDelete.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No 'Done' rows to process",
        processed: 0,
        deleted: 0,
      });
    }

    // Mark claim_updates as sheets_done in Supabase
    // We'll match by claim_number and amount_spent
    let markedCount = 0;
    for (const item of claimUpdatesToMark) {
      // Find the claim by claim_number
      const { data: claim } = await supabase
        .from("claims")
        .select("id")
        .eq("claim_number", item.claimId)
        .single();

      if (claim) {
        // Mark matching updates as done (match by claim_id and amount)
        const { data: updatedRows, error: updateError } = await supabase
          .from("claim_updates")
          .update({ sheets_done: true })
          .eq("claim_id", claim.id)
          .eq("amount_spent", item.amount)
          .eq("sheets_done", false)
          .select();

        if (!updateError && updatedRows && updatedRows.length > 0) {
          markedCount += updatedRows.length;
        }
      }
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

    console.log(
      `[sync-sheets] Processed ${claimUpdatesToMark.length} items, marked ${markedCount} in Supabase, deleted ${rowsToDelete.length} rows`
    );

    return NextResponse.json({
      success: true,
      message: `Synced ${rowsToDelete.length} completed items`,
      processed: claimUpdatesToMark.length,
      markedInSupabase: markedCount,
      deletedFromSheets: rowsToDelete.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[sync-sheets] Error:", errorMessage);

    return NextResponse.json(
      { success: false, error: "Failed to sync sheets", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET endpoint to check for pending "Done" items without processing
export async function GET() {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    await oauth2Client.getAccessToken();
    const sheets = google.sheets({ version: "v4", auth: oauth2Client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B3:F`,
    });

    const rows = response.data.values || [];
    const doneCount = rows.filter((row) => row[0] === "Done").length;
    const newCount = rows.filter((row) => row[0] === "New").length;

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      newItems: newCount,
      doneItems: doneCount,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
