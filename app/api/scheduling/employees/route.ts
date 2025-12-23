import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
  const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

// GET - Fetch all employees
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('is_active');
    const isManager = searchParams.get('is_manager');
    const roleId = searchParams.get('role_id');

    const supabase = getSupabase();

    let query = supabase
      .from('homebase_employees')
      .select(`
        *,
        role:homebase_roles(*)
      `)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    // Apply filters
    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    } else {
      // Default to active only
      query = query.eq('is_active', true);
    }

    if (isManager !== null) {
      query = query.eq('is_manager', isManager === 'true');
    }

    if (roleId) {
      query = query.eq('role_id', roleId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[scheduling/employees] Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch employees', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, employees: data || [], total: data?.length || 0 },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('[scheduling/employees] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      first_name,
      last_name,
      email,
      phone,
      role_id,
      hourly_rate,
      employment_type,
      is_manager,
      pin_code,
    } = body;

    // Validation
    if (!first_name?.trim() || !last_name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'First name and last name are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('homebase_employees')
      .insert({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        role_id: role_id || null,
        hourly_rate: hourly_rate || 18.00,
        employment_type: employment_type || 'full_time',
        is_manager: is_manager || false,
        pin_code: pin_code || null,
      })
      .select(`
        *,
        role:homebase_roles(*)
      `)
      .single();

    if (error) {
      console.error('[scheduling/employees] Insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create employee', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, employee: data });
  } catch (error) {
    console.error('[scheduling/employees] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update employee
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Build update object
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'role_id',
      'hourly_rate', 'employment_type', 'is_manager', 'is_admin',
      'is_active', 'pin_code', 'profile_photo_url'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (typeof updates[field] === 'string') {
          updateData[field] = updates[field].trim() || null;
        } else {
          updateData[field] = updates[field];
        }
      }
    }

    const { data, error } = await supabase
      .from('homebase_employees')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        role:homebase_roles(*)
      `)
      .single();

    if (error) {
      console.error('[scheduling/employees] Update error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update employee', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, employee: data });
  } catch (error) {
    console.error('[scheduling/employees] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete employee (set is_active = false)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const hardDelete = searchParams.get('hard') === 'true';

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    if (hardDelete) {
      // Hard delete - remove from database
      const { error } = await supabase
        .from('homebase_employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[scheduling/employees] Delete error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to delete employee', details: error.message },
          { status: 500 }
        );
      }
    } else {
      // Soft delete - set is_active = false
      const { error } = await supabase
        .from('homebase_employees')
        .update({ is_active: false, termination_date: new Date().toISOString().split('T')[0] })
        .eq('id', id);

      if (error) {
        console.error('[scheduling/employees] Soft delete error:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to deactivate employee', details: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[scheduling/employees] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
