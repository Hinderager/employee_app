import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
  const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

// GET - Fetch all incomplete supplies
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showCompleted = searchParams.get('showCompleted') === 'true';

    const supabase = getSupabase();

    let query = supabase
      .from('supplies_needed')
      .select('*')
      .order('created_at', { ascending: false });

    if (!showCompleted) {
      query = query.eq('completed', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[supplies-needed] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch supplies', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, supplies: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('[supplies-needed] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new supply request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, created_by } = body;

    if (!title || title.trim() === '') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('supplies_needed')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        created_by: created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[supplies-needed] Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create supply request', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, supply: data });
  } catch (error) {
    console.error('[supplies-needed] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update supply (edit or mark complete)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, description, completed, completed_by } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Supply ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Build update object based on what's provided
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      updateData.title = title.trim();
    }
    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }
    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completed_by = completed_by || null;
      updateData.completed_at = completed ? new Date().toISOString() : null;
    }

    const { data, error } = await supabase
      .from('supplies_needed')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[supplies-needed] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update supply', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, supply: data });
  } catch (error) {
    console.error('[supplies-needed] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a supply request
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Supply ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('supplies_needed')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[supplies-needed] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete supply', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[supplies-needed] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
