import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
  const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

// GET - Fetch all roles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('is_active');

    const supabase = getSupabase();

    let query = supabase
      .from('homebase_roles')
      .select('*')
      .order('sort_order', { ascending: true });

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    } else {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[scheduling/roles] Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch roles', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, roles: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('[scheduling/roles] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color, hourly_rate, sort_order } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Role name is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('homebase_roles')
      .insert({
        name: name.trim(),
        color: color || '#3B82F6',
        hourly_rate: hourly_rate || null,
        sort_order: sort_order || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[scheduling/roles] Insert error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create role', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, role: data });
  } catch (error) {
    console.error('[scheduling/roles] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update role
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const updateData: Record<string, unknown> = {};
    const allowedFields = ['name', 'color', 'hourly_rate', 'sort_order', 'is_active'];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    const { data, error } = await supabase
      .from('homebase_roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[scheduling/roles] Update error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update role', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, role: data });
  } catch (error) {
    console.error('[scheduling/roles] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete role
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Role ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Soft delete - just deactivate
    const { error } = await supabase
      .from('homebase_roles')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('[scheduling/roles] Delete error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete role', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[scheduling/roles] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
