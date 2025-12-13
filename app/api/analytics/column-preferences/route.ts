import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.EMPLOYEE_APP_SUPABASE_URL!,
    process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!
  );
}

// Get column preferences for a specific table
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    const userIdentifier = searchParams.get('userId') || 'default';

    if (!tableName) {
      return NextResponse.json(
        { success: false, error: 'Table name is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { data: preferences, error } = await supabase
      .from('analytics_column_preferences')
      .select('visible_columns, column_order')
      .eq('user_identifier', userIdentifier)
      .eq('table_name', tableName)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('[analytics/column-preferences] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        tableName,
        visibleColumns: preferences?.visible_columns || null,
        columnOrder: preferences?.column_order || null,
      },
    });
  } catch (error) {
    console.error('[analytics/column-preferences] GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Save column preferences
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableName, visibleColumns, columnOrder, userIdentifier = 'default' } = body;

    if (!tableName) {
      return NextResponse.json(
        { success: false, error: 'Table name is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('analytics_column_preferences')
      .upsert({
        user_identifier: userIdentifier,
        table_name: tableName,
        visible_columns: visibleColumns || [],
        column_order: columnOrder || [],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_identifier,table_name',
      });

    if (error) {
      console.error('[analytics/column-preferences] Error saving:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences saved successfully',
    });
  } catch (error) {
    console.error('[analytics/column-preferences] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Reset preferences to default
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table');
    const userIdentifier = searchParams.get('userId') || 'default';

    if (!tableName) {
      return NextResponse.json(
        { success: false, error: 'Table name is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await supabase
      .from('analytics_column_preferences')
      .delete()
      .eq('user_identifier', userIdentifier)
      .eq('table_name', tableName);

    if (error) {
      console.error('[analytics/column-preferences] Error deleting:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to reset preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences reset to default',
    });
  } catch (error) {
    console.error('[analytics/column-preferences] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
