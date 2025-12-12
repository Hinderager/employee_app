import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
  const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

// POST - Update sort order for multiple supplies
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orders } = body;

    if (!orders || !Array.isArray(orders)) {
      return NextResponse.json(
        { error: 'Orders array is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Update each supply's sort_order
    const updates = orders.map(({ id, sort_order }: { id: string; sort_order: number }) =>
      supabase
        .from('supplies_needed')
        .update({ sort_order })
        .eq('id', id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[supplies-needed/reorder] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
