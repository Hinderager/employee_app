import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const claimNumber = formData.get("claimNumber") as string;
    const claimId = formData.get("claimId") as string | null;
    const updateId = formData.get("updateId") as string | null;
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 }
      );
    }

    const photoUrls: string[] = [];
    const uploadErrors: string[] = [];
    const photoRecords: Array<{
      claim_id?: string;
      update_id?: string;
      storage_path: string;
      file_name: string;
      file_type: string;
      file_size: number;
    }> = [];

    console.log("[upload-photos] Starting upload for", files.length, "files, claimNumber:", claimNumber, "claimId:", claimId);

    // Upload each file to Supabase Storage
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `${claimNumber}/${timestamp}_${sanitizedName}`;

      console.log("[upload-photos] Uploading file:", fileName, "size:", buffer.length);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("claim-photos")
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("[upload-photos] Storage upload error:", uploadError);
        uploadErrors.push(`${file.name}: ${uploadError.message}`);
        continue; // Skip this file but continue with others
      }

      console.log("[upload-photos] Upload successful:", uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("claim-photos")
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        photoUrls.push(urlData.publicUrl);

        // Prepare record for claim_photos table
        photoRecords.push({
          claim_id: claimId || undefined,
          update_id: updateId || undefined,
          storage_path: fileName,
          file_name: file.name,
          file_type: file.type,
          file_size: buffer.length,
        });
      }
    }

    // Insert photo records into claim_photos table
    if (photoRecords.length > 0 && claimId) {
      const recordsToInsert = photoRecords.map((r) => ({
        ...r,
        claim_id: claimId,
        update_id: updateId || null,
      }));

      const { error: insertError } = await supabase
        .from("claim_photos")
        .insert(recordsToInsert);

      if (insertError) {
        console.error("[upload-photos] DB insert error:", insertError);
        // Photos are uploaded, just failed to record - not fatal
      }
    }

    console.log(
      "[upload-photos] Uploaded",
      photoUrls.length,
      "photos for claim",
      claimNumber,
      "errors:",
      uploadErrors.length
    );

    // Return success only if at least one photo uploaded
    if (photoUrls.length === 0 && uploadErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: "All uploads failed",
        errors: uploadErrors,
        photoUrls: [],
        count: 0,
      });
    }

    return NextResponse.json({
      success: true,
      photoUrls,
      count: photoUrls.length,
      errors: uploadErrors.length > 0 ? uploadErrors : undefined,
    });
  } catch (error) {
    console.error("[upload-photos] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload photos" },
      { status: 500 }
    );
  }
}
