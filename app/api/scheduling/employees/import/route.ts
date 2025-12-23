import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const HOMEBASE_API_KEY = process.env.HOMEBASE_API_KEY!;
const HOMEBASE_LOCATION_UUID = process.env.HOMEBASE_LOCATION_UUID!;
const HOMEBASE_API_URL = 'https://api.joinhomebase.com';

function getSupabase() {
  const supabaseUrl = process.env.EMPLOYEE_APP_SUPABASE_URL!;
  const supabaseKey = process.env.EMPLOYEE_APP_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey);
}

interface HomebaseEmployee {
  id: number;
  user_id?: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  job?: {
    default_role?: string;
    wage_rate?: number;
  };
  wage_rate?: number;
  status?: string;
  created_at?: string;
}

// POST - Import employees from Homebase
export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    if (!HOMEBASE_API_KEY || !HOMEBASE_LOCATION_UUID) {
      return NextResponse.json(
        { success: false, error: 'Homebase API credentials not configured' },
        { status: 500 }
      );
    }

    console.log('[employees/import] Fetching employees from Homebase...');

    // Fetch employees from Homebase
    const response = await fetch(
      `${HOMEBASE_API_URL}/locations/${HOMEBASE_LOCATION_UUID}/employees`,
      {
        headers: {
          'Authorization': `Bearer ${HOMEBASE_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[employees/import] Homebase API error:', errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch from Homebase', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const homebaseEmployees: HomebaseEmployee[] = Array.isArray(data)
      ? data
      : (data.employees || data.data || []);

    console.log(`[employees/import] Found ${homebaseEmployees.length} employees in Homebase`);

    const supabase = getSupabase();

    // Get default role (Hauler) for imported employees
    const { data: defaultRole } = await supabase
      .from('homebase_roles')
      .select('id')
      .eq('name', 'Hauler')
      .single();

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const employees = [];
    const errors: string[] = [];

    for (const hbEmp of homebaseEmployees) {
      try {
        // Skip inactive employees from Homebase
        if (hbEmp.status === 'terminated' || hbEmp.status === 'inactive') {
          skipped++;
          continue;
        }

        // Check if employee already exists
        const { data: existing } = await supabase
          .from('homebase_employees')
          .select('id')
          .eq('homebase_id', hbEmp.id)
          .single();

        const employeeData = {
          homebase_id: hbEmp.id,
          homebase_user_id: hbEmp.user_id || null,
          first_name: hbEmp.first_name,
          last_name: hbEmp.last_name,
          email: hbEmp.email || null,
          phone: hbEmp.phone || null,
          role_id: defaultRole?.id || null,
          hourly_rate: hbEmp.wage_rate || hbEmp.job?.wage_rate || 18.00,
          is_active: true,
          updated_at: new Date().toISOString(),
        };

        if (existing) {
          // Update existing employee
          const { data: updatedEmp, error } = await supabase
            .from('homebase_employees')
            .update(employeeData)
            .eq('id', existing.id)
            .select()
            .single();

          if (error) {
            errors.push(`Failed to update ${hbEmp.first_name} ${hbEmp.last_name}: ${error.message}`);
            continue;
          }

          if (updatedEmp) {
            updated++;
            employees.push(updatedEmp);
          }
        } else {
          // Insert new employee
          const { data: newEmp, error } = await supabase
            .from('homebase_employees')
            .insert(employeeData)
            .select()
            .single();

          if (error) {
            errors.push(`Failed to import ${hbEmp.first_name} ${hbEmp.last_name}: ${error.message}`);
            continue;
          }

          if (newEmp) {
            imported++;
            employees.push(newEmp);
          }
        }
      } catch (empError) {
        errors.push(`Error processing ${hbEmp.first_name} ${hbEmp.last_name}: ${empError}`);
      }
    }

    console.log(`[employees/import] Import complete: ${imported} imported, ${updated} updated, ${skipped} skipped`);

    return NextResponse.json({
      success: true,
      imported,
      updated,
      skipped,
      total_from_homebase: homebaseEmployees.length,
      employees,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[employees/import] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Preview what would be imported (dry run)
export async function GET(request: NextRequest) {
  try {
    if (!HOMEBASE_API_KEY || !HOMEBASE_LOCATION_UUID) {
      return NextResponse.json(
        { success: false, error: 'Homebase API credentials not configured' },
        { status: 500 }
      );
    }

    // Fetch employees from Homebase
    const response = await fetch(
      `${HOMEBASE_API_URL}/locations/${HOMEBASE_LOCATION_UUID}/employees`,
      {
        headers: {
          'Authorization': `Bearer ${HOMEBASE_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: 'Failed to fetch from Homebase', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const homebaseEmployees: HomebaseEmployee[] = Array.isArray(data)
      ? data
      : (data.employees || data.data || []);

    // Get existing employees
    const supabase = getSupabase();
    const { data: existingEmployees } = await supabase
      .from('homebase_employees')
      .select('homebase_id');

    const existingIds = new Set((existingEmployees || []).map(e => e.homebase_id));

    const preview = homebaseEmployees.map(emp => ({
      homebase_id: emp.id,
      name: `${emp.first_name} ${emp.last_name}`,
      email: emp.email,
      status: emp.status,
      wage_rate: emp.wage_rate || emp.job?.wage_rate,
      action: existingIds.has(emp.id) ? 'update' : 'import',
      skip: emp.status === 'terminated' || emp.status === 'inactive',
    }));

    const toImport = preview.filter(p => p.action === 'import' && !p.skip).length;
    const toUpdate = preview.filter(p => p.action === 'update' && !p.skip).length;
    const toSkip = preview.filter(p => p.skip).length;

    return NextResponse.json({
      success: true,
      preview,
      summary: {
        total: homebaseEmployees.length,
        to_import: toImport,
        to_update: toUpdate,
        to_skip: toSkip,
      },
    });
  } catch (error) {
    console.error('[employees/import] Preview error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
