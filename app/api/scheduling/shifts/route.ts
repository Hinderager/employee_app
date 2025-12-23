import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
  const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

// GET - Fetch shifts for a date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const employeeId = searchParams.get('employee_id');
    const isPublished = searchParams.get('is_published');

    // Validate required params
    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    let query = supabase
      .from('homebase_shifts')
      .select(`
        *,
        employee:homebase_employees(*),
        role:homebase_roles(*)
      `)
      .gte('shift_date', startDate)
      .lte('shift_date', endDate)
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true });

    // Apply filters
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (isPublished !== null) {
      query = query.eq('is_published', isPublished === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('[scheduling/shifts] Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch shifts', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        shifts: data || [],
        date_range: { start: startDate, end: endDate },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('[scheduling/shifts] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new shift
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      role_id,
      shift_date,
      start_time,
      end_time,
      break_minutes,
      workiz_job_id,
      notes,
      created_by,
    } = body;

    // Validation
    if (!employee_id || !shift_date || !start_time || !end_time) {
      return NextResponse.json(
        { success: false, error: 'employee_id, shift_date, start_time, and end_time are required' },
        { status: 400 }
      );
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json(
        { success: false, error: 'Invalid time format. Use HH:MM format.' },
        { status: 400 }
      );
    }

    // Validate end time is after start time
    if (start_time >= end_time) {
      return NextResponse.json(
        { success: false, error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Check for overlapping shifts
    const { data: existing } = await supabase
      .from('homebase_shifts')
      .select('id')
      .eq('employee_id', employee_id)
      .eq('shift_date', shift_date)
      .neq('status', 'cancelled');

    // Simple overlap check - could be more sophisticated
    if (existing && existing.length > 0) {
      // For now, allow multiple shifts per day but log warning
      console.log(`[scheduling/shifts] Employee ${employee_id} already has ${existing.length} shift(s) on ${shift_date}`);
    }

    const { data, error } = await supabase
      .from('homebase_shifts')
      .insert({
        employee_id,
        role_id: role_id || null,
        shift_date,
        start_time,
        end_time,
        break_minutes: break_minutes || 0,
        workiz_job_id: workiz_job_id || null,
        notes: notes || null,
        status: 'scheduled',
        is_published: false,
        created_by: created_by || null,
      })
      .select(`
        *,
        employee:homebase_employees(*),
        role:homebase_roles(*)
      `)
      .single();

    if (error) {
      console.error('[scheduling/shifts] Insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create shift', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, shift: data });
  } catch (error) {
    console.error('[scheduling/shifts] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update shift
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Shift ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Build update object
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'employee_id', 'role_id', 'shift_date', 'start_time', 'end_time',
      'break_minutes', 'workiz_job_id', 'status', 'notes', 'is_published'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    // Handle publishing
    if (updates.is_published === true) {
      updateData.published_at = new Date().toISOString();
      updateData.published_by = updates.published_by || null;
    }

    const { data, error } = await supabase
      .from('homebase_shifts')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        employee:homebase_employees(*),
        role:homebase_roles(*)
      `)
      .single();

    if (error) {
      console.error('[scheduling/shifts] Update error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update shift', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, shift: data });
  } catch (error) {
    console.error('[scheduling/shifts] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete shift
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Shift ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('homebase_shifts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[scheduling/shifts] Delete error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete shift', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[scheduling/shifts] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
