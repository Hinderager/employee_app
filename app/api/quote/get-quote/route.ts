import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { phone, lastName } = await request.json();

    if (!phone || !lastName) {
      return NextResponse.json(
        { error: "Phone number and last name are required" },
        { status: 400 }
      );
    }

    // Normalize phone number (remove all non-digits)
    const normalizedPhone = phone.replace(/\D/g, "");
    const last4 = normalizedPhone.slice(-4);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the most recent job for this phone number
    const { data: jobs, error } = await supabase
      .from("move_quote")
      .select("*")
      .ilike("form_data->>phone", `%${last4}%`)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch quote" },
        { status: 500 }
      );
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json(
        { error: "No quote found for this phone number" },
        { status: 404 }
      );
    }

    // Find the job that matches the last name
    const matchingJob = jobs.find((job) => {
      const formData = job.form_data;
      const jobLastName = formData.lastName?.toLowerCase() || "";
      return jobLastName === lastName.toLowerCase();
    });

    if (!matchingJob) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Return the quote data
    return NextResponse.json({
      success: true,
      quote: matchingJob.form_data,
      jobNumber: matchingJob.job_number,
      createdAt: matchingJob.created_at,
      updatedAt: matchingJob.updated_at,
    });
  } catch (error) {
    console.error("Error fetching quote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
