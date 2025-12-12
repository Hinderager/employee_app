import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getSupabase() {
  const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
  const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

// GET - Fetch all incomplete chores
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showCompleted = searchParams.get('showCompleted') === 'true';

    const supabase = getSupabase();

    let query = supabase
      .from('chores')
      .select('*')
      .order('created_at', { ascending: false });

    if (!showCompleted) {
      query = query.eq('completed', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[chores] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch chores', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, chores: data || [] },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('[chores] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new chore
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
      .from('chores')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        created_by: created_by || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[chores] Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create chore', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, chore: data });
  } catch (error) {
    console.error('[chores] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update chore (edit or mark complete)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, description, completed, completed_by } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Chore ID is required' },
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
      .from('chores')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[chores] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update chore', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, chore: data });
  } catch (error) {
    console.error('[chores] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a chore
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Chore ID is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('chores')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[chores] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete chore', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[chores] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
